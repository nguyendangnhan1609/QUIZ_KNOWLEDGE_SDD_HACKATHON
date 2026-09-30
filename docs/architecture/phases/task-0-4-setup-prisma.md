# Task 0.4 — Setup Prisma ORM (Setup Guide)

Status: v1.0
Last Updated: 2026-05-09
Parent: [`phase-0-project-setup.md`](./phase-0-project-setup.md) — Task 0.4
Stack: Prisma **7.8.0** · PostgreSQL · `prisma-client-js` (legacy) generator · `prisma.config.ts` runtime config · pnpm 11

This task installs Prisma, defines a placeholder `Health` model, and proves the singleton client type-checks. Real domain models land in Phase 1.

---

## 0. Why this guide diverges from older tutorials

Prisma 7 (released late 2025) made breaking changes vs. v6:

| What changed | v6 (old guides assume) | v7 (this guide) |
|---|---|---|
| Connection URL location | `datasource db { url = env("DATABASE_URL") }` in `schema.prisma` | `datasource: { url: process.env["DATABASE_URL"] }` in **`prisma.config.ts`** |
| `directUrl` field | Supported in `schema.prisma` datasource | **Removed.** Not in schema, not in `prisma.config.ts`. Keep `DIRECT_URL` env var for Phase 1 migration tooling. |
| Default generator | `prisma-client-js` → outputs to `node_modules/@prisma/client`; URL-based connection works out of the box | New default `prisma-client` → outputs to `src/generated/prisma`; constructor **requires** either `accelerateUrl` (Prisma Accelerate) or a driver `adapter`. Direct URL via `DATABASE_URL` is no longer a first-class path. |
| `prisma init` artifacts | `prisma/schema.prisma` + `.env` | **Plus** `prisma.config.ts` (with sample `prisma+postgres://` URL pointing at a managed Prisma Postgres dev server) |

**Decision for this project:** stick with `prisma-client-js` (still supported, traditional URL flow, AI-training-data-friendly). Document `directUrl` as a Phase 1 open question.

---

## 1. Pre-flight: pnpm 11 build-script gate

Same flow as Task 0.3. After `pnpm add prisma @prisma/client`, pnpm 11 will refuse subsequent installs until the build scripts for `@prisma/engines` and `prisma` are approved.

From `quiz-knowledge/`:

```powershell
pnpm approve-builds --all
```

If `approve-builds --all` reports "no packages awaiting approval," check `pnpm-workspace.yaml` — pnpm may have written `set this to true or false` placeholders. Replace each with `true`:

```yaml
# quiz-knowledge/pnpm-workspace.yaml
allowBuilds:
  '@prisma/engines': true
  prisma: true
  msw: true
  sharp: true
  unrs-resolver: true
```

Then `pnpm install` to actually run the build scripts.

---

## 2. Install Prisma + dotenv

```powershell
pnpm add @prisma/client          # runtime
pnpm add -D prisma dotenv        # CLI + .env loader for prisma.config.ts
```

Versions installed: `prisma@7.8.0`, `@prisma/client@7.8.0`, `dotenv@17.4.2`.

> **Why dotenv?** `prisma.config.ts` requires `import "dotenv/config";` so the CLI can read `.env`. Prisma 7 no longer auto-loads `.env` — that responsibility was delegated to user code.

---

## 3. Run `prisma init`

```powershell
pnpm prisma init
```

This creates:

```
quiz-knowledge/
├── prisma/
│   └── schema.prisma          ← minimal: generator + datasource (provider only)
├── prisma.config.ts            ← TS config: schema path, migrations path, datasource.url
└── .env                        ← sample with prisma+postgres://localhost:51213/... URL
```

> **Don't keep the sample `prisma+postgres://` URL.** It points at a managed Prisma Postgres dev server. We're using Supabase. Replace as in §4.

---

## 4. Configure for Supabase Postgres (or any vanilla Postgres)

### 4.1 `prisma/schema.prisma` (final state)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Health {
  id Int @id @default(autoincrement())
}
```

**Notes:**
- `provider = "prisma-client-js"` (NOT `"prisma-client"`) — keeps URL-based connection without an adapter.
- No `output =` line — defaults to `node_modules/@prisma/client`, so imports stay `import { PrismaClient } from "@prisma/client"`.
- No `url =` or `directUrl =` in the datasource block — Prisma 7 rejects them in schema.prisma.
- `Health` is replaced wholesale in Phase 1.

### 4.2 `prisma.config.ts` (final state)

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

**Notes:**
- `directUrl` is not a valid field in `defineConfig.datasource` (TS error if added).
- `DIRECT_URL` env var stays defined in `.env` for Phase 1 migration tooling — it'll be consumed via `--shadow-database-url` flag or a custom migrate driver when that work happens.

### 4.3 `.env` (final state)

```env
# Phase 0 placeholder values — real Supabase URLs land in Task 0.6.
# DATABASE_URL = pooled connection (port 6543 + ?pgbouncer=true&connection_limit=1 in Supabase).
# DIRECT_URL   = direct connection (port 5432) — required for `prisma migrate`.

DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/quizdb?schema=public"
DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/quizdb?schema=public"
```

`.env` is already gitignored by `quiz-knowledge/.gitignore` line 34 (`.env*`).

---

## 5. Singleton client at `src/lib/db/prisma.ts`

Standard Next.js pattern (one `globalThis` cache to avoid hot-reload connection storms):

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Path alias `@/lib/db/prisma` resolves to `src/lib/db/prisma.ts` via `tsconfig.json` paths.

---

## 6. Validation Steps

### 6.1 `prisma generate` succeeds

```powershell
pnpm prisma generate
```

Expected: `✔ Generated Prisma Client (v7.8.0) to .\node_modules\.pnpm\@prisma+client@7.8.0_…\node_modules\@prisma\client in <Nms>`. Exit code 0.

### 6.2 `prisma format` returns no diff

```powershell
pnpm prisma format
```

Expected: `Formatted prisma\schema.prisma in <Nms> 🚀`. Exit code 0.

### 6.3 Smoke API route type-checks

Create `src/app/api/_test/route.ts`:

```ts
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  void prisma;
  return Response.json({ ok: true });
}
```

Run:

```powershell
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit code 0.

### 6.4 Cleanup the smoke route

```powershell
Remove-Item -Recurse -Force src/app/api/_test
Remove-Item -Recurse -Force .next       # clears stale generated route types
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit code 0.

---

## 7. Common Pitfalls

| Symptom | Fix |
|---|---|
| `error: The datasource property 'directUrl' is no longer supported in schema files` | Remove `directUrl` from `prisma/schema.prisma`. Keep `DIRECT_URL` in `.env` — usage moves to migration tooling in Phase 1. |
| `error: ... 'url' ... is no longer supported` (or similar) | Remove `url = env(...)` from `schema.prisma`. Set it in `prisma.config.ts` `datasource: { url: process.env["DATABASE_URL"] }`. |
| `'directUrl' does not exist in type` (TS error in `prisma.config.ts`) | `prisma/config`'s `defineConfig().datasource` only accepts `url` and `shadowDatabaseUrl`. Skip `directUrl`. |
| `Property 'accelerateUrl' is missing` (TS error in `src/lib/db/prisma.ts`) | You're using the new `prisma-client` generator. Switch `schema.prisma` generator to `prisma-client-js`. |
| `[ERR_PNPM_IGNORED_BUILDS] @prisma/engines, prisma` after install | Run `pnpm approve-builds --all`; if it reports "no packages," manually flip the `set this to true or false` placeholders in `pnpm-workspace.yaml` to `true` and `pnpm install`. |
| `import { PrismaClient } from "@prisma/client"` resolves but type errors at construction | Confirm the generator is `prisma-client-js`, not `prisma-client`. Re-run `pnpm prisma generate` after switching. |

---

## 8. Definition of Done

Task 0.4 is complete when **all** of the following are true:

- [ ] `prisma`, `@prisma/client`, `dotenv` are in `package.json`.
- [ ] `prisma/schema.prisma` exists with `prisma-client-js` generator, postgres datasource (provider only), and a `Health` placeholder model.
- [ ] `prisma.config.ts` exists with dotenv import and `datasource.url` from `process.env["DATABASE_URL"]`.
- [ ] `.env` has `DATABASE_URL` and `DIRECT_URL` placeholder values (gitignored).
- [ ] `src/lib/db/prisma.ts` exports a `prisma` singleton that imports from `@prisma/client`.
- [ ] `pnpm prisma generate` exits 0.
- [ ] `pnpm prisma format` exits 0 with no diff.
- [ ] A temporary `src/app/api/_test/route.ts` importing `prisma` type-checks (`tsc --noEmit` → 0), then is **deleted before commit**.
- [ ] `.next/` cleared after the smoke route is removed.
- [ ] `pnpm-workspace.yaml` lists `@prisma/engines: true` and `prisma: true` under `allowBuilds`.

When all checked, proceed to **Task 0.5 — Setup Supabase** (manual web-UI work, parallelizable).

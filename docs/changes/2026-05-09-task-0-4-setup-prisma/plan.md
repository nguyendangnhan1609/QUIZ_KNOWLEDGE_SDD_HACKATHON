# Plan — Task 0.4 (Setup Prisma ORM)

Date: 2026-05-09
Slug: `2026-05-09-task-0-4-setup-prisma`
Driver: Continuation of Phase 0 after Task 0.3 (commit `5d06973`). User asked "tiếp tục".

## Goal

Install Prisma in `quiz-knowledge/`, configure for Postgres with placeholder URLs, prove `prisma generate` works, expose a singleton client at `src/lib/db/prisma.ts`, and capture the substantial Prisma 7 breaking-change friction for the next teammate / AI session.

## Decisions made during execution

| Point | Decision | Reason |
|---|---|---|
| Prisma 7.8.0 vs downgrade to 6.x | **Accept v7** | Already installed via `@latest`; v7 is a superset for our limited Phase 0 needs once configured. |
| New `prisma-client` generator vs legacy `prisma-client-js` | **Use legacy `prisma-client-js`** | New generator's PrismaClient constructor requires `accelerateUrl` (Prisma Accelerate) or a driver adapter. We want traditional URL-based connection without Accelerate. Legacy generator is still supported and produces TS-friendly output at `node_modules/@prisma/client`. |
| `url = env(...)` in schema.prisma vs `prisma.config.ts` | **Move to `prisma.config.ts`** | v7 rejects `url =` in schema's datasource block. CLI error: "Move connection URLs to `prisma.config.ts`." |
| `directUrl = env(...)` | **Drop entirely from Prisma config; keep `DIRECT_URL` env var** | v7 dropped `directUrl` from both schema and `prisma.config.ts` types. Document for Phase 1 migrations to consume via `--shadow-database-url` flag or migrate driver. |
| Generator output path | **Default (`node_modules/@prisma/client`)** | Keeps imports as `from "@prisma/client"`. Avoids the v7 default `src/generated/prisma` which would require path-alias updates everywhere. |
| Add `dotenv` dep | **Yes (devDependency)** | `prisma.config.ts` requires `import "dotenv/config";`; v7 stopped auto-loading `.env`. |
| `pnpm-workspace.yaml` allowBuilds entries | Manually flip `set this to true or false` placeholders to `true` for `@prisma/engines` and `prisma` | `pnpm approve-builds --all` reported "no packages awaiting approval" but the yaml still had unflipped placeholders. Manual edit + `pnpm install` did the trick. |
| Add Prisma scripts (`db:generate`, `db:format`) to `package.json` | **No, defer to Task 0.7 (DX)** | Stay scoped. |

## What was actually executed (in order)

1. `pnpm add @prisma/client` → `@prisma/client@7.8.0`. pnpm warned IGNORED_BUILDS for `@prisma/engines, prisma`.
2. `pnpm add -D prisma` → `prisma@7.8.0`. Same warning.
3. `pnpm approve-builds --all` → "no packages awaiting approval" (false negative).
4. Read `pnpm-workspace.yaml` → found unflipped placeholders. Edited to `true`.
5. `pnpm install` → all postinstall scripts ran. Exit 0.
6. `pnpm prisma init` → created `prisma/schema.prisma`, `prisma.config.ts`, and `.env` (with sample `prisma+postgres://localhost:51213/...` URL).
7. Edited `prisma/schema.prisma` to use `prisma-client-js` generator + `Health` model.
8. Edited `prisma.config.ts` — initially kept `directUrl` then removed it after TS error.
9. Replaced the `.env` sample URL with traditional Postgres placeholders (`postgresql://placeholder:...`) — added `DIRECT_URL` for symmetry.
10. Wrote `src/lib/db/prisma.ts` singleton (initially imported from `@/generated/prisma/client` per the v7 default; later switched to `@prisma/client` after the generator switch).
11. Iterated through three Prisma validation errors:
    - `directUrl is no longer supported in schema files` → moved both URLs to `prisma.config.ts`.
    - `'directUrl' does not exist in type` (TS error in `prisma.config.ts`) → dropped `directUrl` from config.
    - `Property 'accelerateUrl' is missing` (TS error in singleton) → switched generator from `prisma-client` → `prisma-client-js`.
12. `pnpm prisma generate` → 0.
13. `pnpm prisma format` → 0.
14. Created `src/app/api/_test/route.ts` smoke route importing `prisma`. `tsc --noEmit` → 0.
15. Removed `src/app/api/_test`, `src/generated/` (stale from earlier generator), `.next/`. Re-ran `tsc --noEmit` → 0.

## What was NOT done

- No git commit yet — pending end-of-task review.
- No `db:generate` / `db:format` package scripts (Task 0.7 / Phase 1).
- No `directUrl` configuration. `DIRECT_URL` env var stays defined but unused. Phase 1 migration step decides how to consume it.
- No move of `prisma` from devDependencies to dependencies (correct as-is).
- No real Supabase connection test — placeholders only. Real test in Task 0.6 / Phase 1.

## Files

- Created:
  - `quiz-knowledge/prisma/schema.prisma`
  - `quiz-knowledge/prisma.config.ts`
  - `quiz-knowledge/.env` (gitignored)
  - `quiz-knowledge/src/lib/db/prisma.ts`
  - `docs/architecture/phases/task-0-4-setup-prisma.md`
  - `docs/changes/2026-05-09-task-0-4-setup-prisma/plan.md` (this)
  - `docs/changes/2026-05-09-task-0-4-setup-prisma/acceptance.md`
- Modified:
  - `quiz-knowledge/package.json` (deps: `@prisma/client`, `prisma`, `dotenv`)
  - `quiz-knowledge/pnpm-lock.yaml`
  - `quiz-knowledge/pnpm-workspace.yaml` (allowBuilds: `@prisma/engines: true`, `prisma: true`)
  - `quiz-knowledge/.gitignore` (added `/src/generated/prisma` line — Prisma init's contribution)
  - `docs/architecture/phases/phase-0-project-setup.md` (Task 0.4 section rewritten for Prisma 7 reality)

## Open Issues

| ID | Description |
|---|---|
| OI-task04.A | **`directUrl` strategy unresolved.** Prisma 7 dropped the field from both schema.prisma and `prisma.config.ts` `datasource` typing. `DIRECT_URL` env var is set but unused. Phase 1 migration step must decide: (a) pass via `--shadow-database-url` CLI flag, (b) write a custom migrate driver in `prisma.config.ts`, or (c) re-evaluate after a future Prisma 7.x patch reintroduces the field. |
| OI-task04.B | **Generator choice — `prisma-client-js` (legacy) vs `prisma-client` (new with adapter).** Phase 6/7 deployment may eventually want the new generator + a driver adapter (e.g., `@prisma/adapter-pg`) for edge-runtime compatibility. Re-evaluate when Vercel deploy work begins. |
| OI-task04.C | **`/src/generated/prisma` line in `quiz-knowledge/.gitignore`** is dead since we use `prisma-client-js` (outputs to `node_modules`). Leaving as defensive in case we revisit OI-task04.B. |
| OI-task04.D | `pnpm approve-builds --all` does **not** flip the `set this to true or false` placeholders that pnpm 11 writes for newly-installed native packages. Manual edit + `pnpm install` is the deterministic path. Document in onboarding. |
| OI-task04.E | The `prisma+postgres://` sample URL written by `prisma init` looks like real credentials but is actually a managed-Prisma-Postgres dev-server URL. Anyone reviewing PRs needs to know it's harmless. Mention in the PR template if/when one is added. |

## Spec impact

None.

## Checkpoints

- [x] @prisma/client + prisma + dotenv installed
- [x] pnpm 11 allowBuilds gate cleared (workspace.yaml flipped to true)
- [x] schema.prisma migrated to v7 form: generator = prisma-client-js, no url/directUrl in datasource
- [x] prisma.config.ts simplified: datasource.url from process.env only
- [x] .env replaced with traditional Postgres placeholder URLs
- [x] src/lib/db/prisma.ts singleton importing from @prisma/client
- [x] prisma generate exits 0
- [x] prisma format exits 0
- [x] Smoke API route imports prisma; tsc --noEmit exits 0
- [x] Smoke route deleted, .next/ cleared, final tsc --noEmit exits 0
- [x] phase-0-project-setup.md Task 0.4 rewritten for Prisma 7 reality
- [x] task-0-4-setup-prisma.md detail guide created
- [x] OI-task04.A–E catalogued
- [ ] **NOT done:** git commit — awaiting authorization

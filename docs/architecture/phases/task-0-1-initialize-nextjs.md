# Task 0.1 — Initialize Next.js Project (Setup Guide)

Status: v1.0
Last Updated: 2026-05-09
Parent: [`phase-0-project-setup.md`](./phase-0-project-setup.md) — Task 0.1
Stack: Next.js 16 (App Router) · TypeScript · TailwindCSS v4 · ESLint · Turbopack · `src/` directory · `pnpm`

> **Version note (post-execution):** the repo was specced as Next.js 15 + Tailwind v3, but `pnpm create next-app@latest` on 2026-05-09 resolved to **Next 16.2.6 + React 19.2.4 + Tailwind v4**. Decision was made (option A) to accept the latest. This guide reflects that. Key implications: Tailwind v4 uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`) and **does not generate a `tailwind.config.ts`**.

This guide is the executable, copy-paste version of Task 0.1. Read it once; run it in order.

> **Decision update (supersedes earlier draft):** the project enables `src/` and Turbopack from scaffold time. This overrides the earlier "src/: No" line in [`phase-0-project-setup.md`](./phase-0-project-setup.md) §Task 0.1 — the parent doc has been updated to match. `technical-design.md` §14 still shows the older root-level layout; tracked as **OI-task01.A**.

---

## 0. Prerequisites

Run these first. If any fails, fix it before scaffolding.

```bash
node --version       # need ≥ 18.18.0; recommend 20.x LTS
pnpm --version       # need ≥ 9.0.0
git --version        # any recent
```

If `pnpm` is missing:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

If Node is older than 18.18, install Node 20 LTS via your version manager (`nvm`, `fnm`, `volta`).

---

## 1. Terminal Commands

### Single-shot scaffold (preferred — no interactive prompts)

**Bash / Zsh:**

```bash
pnpm create next-app@latest quiz-knowledge \
  --ts \
  --eslint \
  --tailwind \
  --src-dir \
  --app \
  --turbopack \
  --import-alias "@/*" \
  --use-pnpm
```

**PowerShell (Windows — your environment):**

```powershell
pnpm create next-app@latest quiz-knowledge `
  --ts `
  --eslint `
  --tailwind `
  --src-dir `
  --app `
  --turbopack `
  --import-alias "@/*" `
  --use-pnpm
```

Or as one line (works in any shell):

```bash
pnpm create next-app@latest quiz-knowledge --ts --eslint --tailwind --src-dir --app --turbopack --import-alias "@/*" --use-pnpm
```

### Enter the project and verify

```bash
cd quiz-knowledge
pnpm install      # safe re-run; create-next-app already installed
pnpm dev          # http://localhost:3000
```

### Optional: initialize git immediately

`create-next-app` already runs `git init`. To set the initial branch and prepare for GitHub:

```bash
git checkout -b main
git add -A
git commit -m "chore(0): scaffold Next.js 15 (TS, Tailwind, App Router, Turbopack, src/)"
```

### Optional cleanup commands (run after first successful boot)

```bash
# Remove the Next.js logo + sample SVGs we won't use
rm public/next.svg public/vercel.svg public/file.svg public/window.svg public/globe.svg
```

PowerShell equivalent:

```powershell
Remove-Item public/next.svg, public/vercel.svg, public/file.svg, public/window.svg, public/globe.svg
```

(See §4 for the full cleanup pass.)

---

## 2. Recommended CLI Options

If you prefer running `pnpm create next-app@latest quiz-knowledge` interactively (no flags), answer **exactly** like this:

```
✔ Would you like to use TypeScript?                          → Yes
✔ Would you like to use ESLint?                              → Yes
✔ Would you like to use Tailwind CSS?                        → Yes
✔ Would you like your code inside a `src/` directory?        → Yes
✔ Would you like to use App Router? (recommended)            → Yes
✔ Would you like to use Turbopack for `next dev`?            → Yes
✔ Would you like to customize the import alias (`@/*`)?      → Yes
✔ What import alias would you like configured?               → @/*
```

Why each:

| Option | Why Yes |
|---|---|
| TypeScript | Required by spec; non-negotiable. |
| ESLint | Catches obvious mistakes; minimal cost at hackathon scale. |
| Tailwind | Locked stack. |
| `src/` | Cleaner top-level (config files don't live next to code); aligns with this phase's revised structure. |
| App Router | Required by spec — Route Handlers + RSC. |
| Turbopack | Faster dev refresh (~5–10× over webpack); zero downside for hackathon. Note: `next build` still uses webpack as of Next 15 — that's fine. |
| Import alias `@/*` | Resolves to `./src/*` automatically. Standard pattern. |

---

## 3. Recommended Initial Folder Structure

### Immediately after `create-next-app` (Task 0.1 complete)

```
quiz-knowledge/
├── .eslintrc.json         (or eslint.config.mjs in newer versions)
├── .gitignore             (Next.js defaults; .env*.local already ignored)
├── README.md
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   ├── file.svg           ← deletable in cleanup
│   ├── globe.svg          ← deletable
│   ├── next.svg           ← deletable
│   ├── vercel.svg         ← deletable
│   └── window.svg         ← deletable
└── src/
    └── app/
        ├── favicon.ico
        ├── globals.css
        ├── layout.tsx
        └── page.tsx
```

### Target structure (after Task 0.7 — Create Folder Structure)

For context only — Tasks 0.4 / 0.7 will materialize these. Do **not** create them now.

```
quiz-knowledge/
├── prisma/                          ← Task 0.4
│   └── schema.prisma
├── public/
└── src/
    ├── app/
    │   ├── api/                     ← Task 0.7
    │   ├── layout.tsx               ← edited in Task 0.9
    │   ├── page.tsx                 ← edited in Task 0.9
    │   ├── globals.css
    │   └── favicon.ico
    ├── components/                  ← Task 0.7
    │   ├── ui/                      ← Task 0.3 (shadcn)
    │   └── shared/
    └── lib/                         ← Task 0.7
        ├── ai/
        ├── parsers/
        ├── randomization/
        ├── services/
        ├── db/
        ├── schemas/
        ├── storage/
        ├── config/                  ← env.ts in Task 0.6
        ├── utils/
        └── errors.ts
└── types/                           ← optional shared TS types
```

### Folder purposes (one line each — used in Task 0.7)

| Path | Holds |
|---|---|
| `src/app/` | Routes (RSC + Client). Co-locate `_components/` per route. |
| `src/app/api/` | Next.js Route Handlers — thin HTTP layer. |
| `src/components/ui/` | shadcn primitives. Don't hand-edit. |
| `src/components/shared/` | Cross-cutting components. |
| `src/lib/ai/` | OpenAI client, chunker, prompts, generation orchestration. |
| `src/lib/parsers/` | PDF / DOCX / Markdown text extractors. |
| `src/lib/randomization/` | Pure Fisher–Yates utilities (used client-side in Phase 4). |
| `src/lib/services/` | Documents / Quizzes / Attempts / Analytics orchestration. |
| `src/lib/db/` | Prisma singleton + repositories. |
| `src/lib/schemas/` | Zod schemas (api.ts, ai.ts, common.ts). |
| `src/lib/storage/` | Supabase server client. |
| `src/lib/config/env.ts` | Type-safe env validation via `@t3-oss/env-nextjs`. |
| `src/lib/utils/` | Tiny helpers. |
| `src/lib/errors.ts` | `AppError` + error codes. |
| `prisma/` | Schema + migrations. Lives at repo root, not in `src/`. |

> **Path alias.** `@/*` resolves to `./src/*`. Examples:
> - `@/lib/db/prisma` → `./src/lib/db/prisma.ts`
> - `@/components/ui/button` → `./src/components/ui/button.tsx`

---

## 4. Initial Cleanup Recommendations

The default `create-next-app` output ships marketing chrome (logo links, demo cards). Strip it now so the welcome page is a clean canvas for Task 0.9.

### Files to delete

```
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
```

(Keep `public/favicon.ico` if Next put one there. Otherwise leave `src/app/favicon.ico`.)

### Replace `src/app/page.tsx`

Default page.tsx is ~50 lines of demo content. Replace it with a one-liner welcome:

```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Quiz Knowledge — scaffold ready</h1>
    </main>
  );
}
```

(Task 0.9 will replace this again with a proper app shell. This intermediate version exists so we know the scaffold rendered correctly.)

### Simplify `src/app/globals.css`

Tailwind v4 uses a single `@import` (not the v3 three-directive form). The default `create-next-app` output adds `:root` color vars, `@theme inline` font tokens, dark-mode media query, and a body fallback. For Phase 0, strip everything but the import — shadcn (Task 0.3) will rewrite this file with its own theme variables. Final state:

```css
/* src/app/globals.css */
@import "tailwindcss";
```

> **Tailwind v4 specifics.** No `tailwind.config.ts` is created. Content is auto-discovered. PostCSS plugin is `@tailwindcss/postcss` (already wired in `postcss.config.mjs`). v3 idioms like `@apply` and the `content:` glob still work but are not needed for MVP.

### Leave alone (do NOT touch yet)

- `src/app/layout.tsx` — Task 0.9 reworks this in full.
- `tailwind.config.ts` — defaults are fine; verify `content` glob covers `./src/**/*.{ts,tsx}`.
- `next.config.ts` — empty default; Task 0.9 may add metadata, nothing earlier.
- `tsconfig.json` — `paths: { "@/*": ["./src/*"] }` is set by `--src-dir`. Don't override.
- `package.json` `"dev": "next dev --turbopack"` — keep. Don't remove `--turbopack`.

---

## 5. Validation Steps

Run all four. Don't proceed to Task 0.2 until each passes.

### 5.1 App runs

```bash
pnpm dev
```

**Expected:** terminal logs

```
   ▲ Next.js 15.x.x (Turbopack)
   - Local:        http://localhost:3000
 ✓ Ready in <Xs>
```

Open `http://localhost:3000` in a browser. You should see the welcome heading from §4 (or the default Next.js page if cleanup is deferred).

### 5.2 Tailwind works

Edit `src/app/page.tsx` temporarily:

```tsx
<h1 className="text-2xl font-semibold bg-blue-500 text-white p-4 rounded">
  Quiz Knowledge — scaffold ready
</h1>
```

**Expected:** browser shows the heading on a blue background with white text and rounded corners.

Revert the test classes after confirming.

### 5.3 App Router works

The presence of `src/app/page.tsx` rendering at `/` already proves App Router is wired. Sanity-check by adding a new segment.

> **Bug-fix note:** an earlier draft used `src/app/_smoke/`. **Don't** — Next.js App Router treats any folder prefixed with `_` as a **private folder** that's excluded from routing. A request to `/_smoke` will return 404. Use a name without the underscore.

```bash
mkdir -p src/app/smoke
```

Create `src/app/smoke/page.tsx`:

```tsx
export default function Smoke() {
  return <p>app router ok</p>;
}
```

Visit `http://localhost:3000/smoke` — should render `app router ok`.

Delete the smoke folder before moving on:

```bash
rm -rf src/app/smoke
```

PowerShell:

```powershell
Remove-Item -Recurse -Force src/app/smoke
```

Then clear the Next.js dev type cache (`.next/dev/types/...` caches the route's type defs and TSC will fail until cleared):

```powershell
Remove-Item -Recurse -Force .next
```

### 5.4 TypeScript works

```bash
pnpm tsc --noEmit
```

**Expected:** exits with code 0, no errors.

If you see "Cannot find module '@/...'" errors, re-check `tsconfig.json` has:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

### 5.5 (Bonus) Turbopack confirmation

In the `pnpm dev` startup log, look for the literal token `(Turbopack)` next to the Next.js version line, e.g.:

```
▲ Next.js 16.2.6 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in 1777ms
```

> **Next 16 note.** Turbopack is the **default** dev runner in Next.js 16. The `--turbopack` flag is no longer required in the `dev` script — `"dev": "next dev"` already uses Turbopack. (In Next 15 the flag was required.)

### 5.6 (Bonus) pnpm 11 ignored-builds warning — non-blocking

Pnpm 11 may emit `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: sharp@0.34.5, unrs-resolver@1.11.1` after install. These are post-install native build scripts:

- `sharp` — image optimization for `next/image` (production only).
- `unrs-resolver` — ESLint module resolver.

Neither is required for dev or for our MVP feature path. To silence the warning, add to `package.json`:

```json
"pnpm": {
  "onlyBuiltDependencies": ["sharp", "unrs-resolver"]
}
```

Then run `pnpm rebuild`. If the warning persists on subsequent installs, ignore — it doesn't affect correctness.

---

## 6. Git Commit Recommendation

After §5 passes:

```bash
git add -A
git commit -m "chore(0): scaffold Next.js 15 (TS, Tailwind, App Router, Turbopack, src/)"
```

Why this checkpoint matters:

- Marks the **last point at which a fresh clone yields a runnable app with zero secrets**.
- Anything after this commit will start adding dependencies, env wiring, DB calls. If something breaks downstream, `git diff` against this commit isolates the problem to one task.
- Your CI / Vercel preview (if connected later) will re-validate from this baseline.

---

## 7. Common Setup Pitfalls

### 7.1 Node.js version

| Symptom | Fix |
|---|---|
| `Unsupported engine` warning during `pnpm create next-app` | Upgrade to Node 20 LTS. Next.js 15 requires ≥ 18.18, but 20 is the safe lane. |
| `ReferenceError: fetch is not defined` | Node < 18 — upgrade. |
| Native module compile errors (esbuild, swc) | Often Node 16; upgrade to 20. |

Use `nvm use 20`, `fnm use 20`, or `volta install node@20`.

### 7.2 Turbopack

| Symptom | Fix |
|---|---|
| `--turbopack` flag missing from dev script (Next 15) | Manually edit `package.json`: `"dev": "next dev --turbopack"`. **Not needed on Next 16+** — Turbopack is default. |
| Some webpack-only library breaks under Turbopack | Drop `--turbopack` for that one debugging session: `pnpm next dev`. The Vercel build still works because production uses webpack. |
| HMR seems slower than expected | First boot includes module discovery. Subsequent edits are fast. Don't conclude after one save. |
| Production build fails | Turbopack is dev-only as of Next 15. `next build` always uses webpack. Most "Turbopack-broke-prod" reports are actually unrelated build issues. |

### 7.3 Tailwind v4

| Symptom | Fix |
|---|---|
| Tailwind classes don't apply at all | `@import "tailwindcss";` missing from `src/app/globals.css`, or `globals.css` not imported in `src/app/layout.tsx` (default import is at top of layout — verify). |
| Mixing v3 and v4 syntax | v4 uses `@import "tailwindcss"`. The v3 trio `@tailwind base; @tailwind components; @tailwind utilities;` does NOT work in v4. |
| Looking for `tailwind.config.ts` | v4 doesn't generate one. Content is auto-discovered from imports. If you need custom theme tokens, add an `@theme {…}` block inside `globals.css`. |
| `@apply` rules undefined | The rule must reference real Tailwind utilities, e.g. `@apply text-base font-medium`. |
| IntelliSense not autocompleting in VS Code | Install the **Tailwind CSS IntelliSense** extension (≥ v0.12 for v4 support). |

### 7.4 App Router

| Symptom | Fix |
|---|---|
| 404 on a route I just created | File must be named lowercase `page.tsx`, not `Page.tsx` or `index.tsx`. App Router is case-sensitive on these names. |
| Page exports a default function but still 404 | Component must be the **default export**, not named export. Server Components are the default — no `'use client'` unless you actually need it. |
| `'use client'` in `layout.tsx` breaks the build | Layouts should be RSC. If you need a client provider, create a separate `<Providers>` component (client) and import it from the RSC layout. |
| `metadata` export doesn't apply | `metadata` must be exported from a **server** component file (no `'use client'`). |
| `params`/`searchParams` typed incorrectly | In Next.js 15, `params` and `searchParams` are now async (`Promise<...>`). `await` them in your route handler / page. |

### 7.5 `src/` directory specifics

| Symptom | Fix |
|---|---|
| `@/...` imports resolve to wrong path | `tsconfig.json` `paths` must point to `./src/*`, not `./*`. Verify after scaffold. |
| New files outside `src/` not picked up by Tailwind | Update `content` in `tailwind.config.ts`. Default after `--src-dir` is `./src/**/*.{ts,tsx}` — anything outside `src/` (rare) needs an additional glob. |
| Confusion between `app/` (root) and `src/app/` | With `--src-dir`, **only** `src/app/` exists. Any tutorial showing root-level `app/` predates 13.5 or skips `src/`. |

---

## Done

When all of §5 passes and the commit from §6 is on the branch, Task 0.1 is complete. Proceed to Task 0.2 — Configure TailwindCSS.

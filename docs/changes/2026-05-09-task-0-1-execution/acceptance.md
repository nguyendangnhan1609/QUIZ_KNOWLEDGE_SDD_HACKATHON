# Acceptance — Task 0.1 Actual Execution + Stack Pivot

Date: 2026-05-09
Slug: `2026-05-09-task-0-1-execution`

## Acceptance criteria

### A — Scaffold materialized

- [x] `quiz-knowledge/` directory exists at repo root.
- [x] `src/app/{layout.tsx, page.tsx, globals.css, favicon.ico}` present.
- [x] `tsconfig.json` `paths` resolves `@/*` → `./src/*`.
- [x] `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `package.json`, `pnpm-lock.yaml` present.
- [x] `node_modules` populated.
- [x] Versions installed: Next 16.2.6, React 19.2.4, Tailwind v4.3.0, TypeScript 5.9.3.

### B — Cleanup applied (per guide §4)

- [x] `public/{file,globe,next,vercel,window}.svg` deleted.
- [x] `src/app/page.tsx` replaced with the one-line welcome.
- [x] `src/app/globals.css` simplified to `@import "tailwindcss";`.

### C — Validation passed (per guide §5)

- [x] §5.1 App runs — banner shows `Next.js 16.2.6 (Turbopack)`, `localhost:3000` returns 200 with the welcome heading.
- [x] §5.2 Tailwind v4 — `bg-blue-500 ... rounded` injected and visible in rendered HTML.
- [x] §5.3 App Router — `/smoke` route returns 200 with "app router ok" (after fixing `_smoke` → `smoke`).
- [x] §5.4 TypeScript — `node node_modules/typescript/bin/tsc --noEmit` exits 0.
- [x] §5.5 Turbopack — confirmed in startup banner.

### D — Test artifacts cleaned

- [x] `src/app/page.tsx` reverted to clean welcome.
- [x] `src/app/smoke/` removed.
- [x] Dev server killed.
- [x] `dev.log`, `dev.err.log` removed.
- [x] `pnpm-workspace.yaml` (single-package, not needed) removed.
- [x] `.next/` cleared so stale type defs from `smoke` don't poison `tsc`.

### E — Docs reconciled with actual stack

- [x] `technical-design.md` §2: framework now reads "Next.js 16 (App Router)" with version-pivot note; styling reads "TailwindCSS v4 + shadcn/ui" with v4 specifics note.
- [x] `implementation-plan.md` §4 Phase Goal: dropped hard "15" reference.
- [x] `phase-0-project-setup.md` Task 0.1 Technical Requirements: lists Next 16, Tailwind v4, Turbopack-as-default; cross-links the detail guide.
- [x] `task-0-1-initialize-nextjs.md`:
  - [x] Header banner: stack reads "Next.js 16 · Tailwind v4".
  - [x] §4 globals.css simplification: v4 `@import "tailwindcss"` (not v3 directive trio).
  - [x] §5.3 smoke route: bug fixed (`_smoke` → `smoke`); added `.next/` cache clear note.
  - [x] §5.5 Turbopack: noted default in Next 16.
  - [x] §5.6 added: pnpm 11 ignored-builds non-blocking warning + workaround.
  - [x] §7.2 Turbopack pitfall: `--turbopack` flag is no-op in Next 16+.
  - [x] §7.3 Tailwind: rewritten for v4 (no `tailwind.config.ts`, no v3 directive trio).

### F — Items deliberately NOT done

- [x] **No git commit** — explicit rule ("NEVER commit unless user asks"). Scaffold + doc edits sit in working tree, ready for commit when authorized.
- [x] **No `pnpm approve-builds` interactive run** — silenced via `package.json` config; warning persists cosmetically but is non-blocking.
- [x] **No re-scaffold to Next 15** — option A accepted.
- [x] **No update to product spec** — spec was version-agnostic; nothing to change.
- [x] **No update to outer git repo / `.git` reconciliation** — flagged as OI-task01-exec.E.

### G — SDD compliance

- [x] All doc edits in `docs/architecture/...` (living).
- [x] Per-change deliverables in `docs/changes/2026-05-09-task-0-1-execution/`.
- [x] No destructive operations (rm of generated artifacts, not user code).
- [x] Open Issues catalogued (OI-task01-exec.A–F).
- [x] Spec untouched.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-task01-exec.A | Task 0.2 needs Tailwind v4 idioms |
| OI-task01-exec.B | Verify shadcn CLI smoothness on v4 in Task 0.3 |
| OI-task01-exec.C | `next.config.ts` empty; populate as needed in later phases |
| OI-task01-exec.D | Sweep older docs for stale `tailwind.config.ts` references |
| OI-task01-exec.E | Inner `quiz-knowledge/.git` vs outer repo decision |
| OI-task01-exec.F | pnpm 11 ignored-builds warning persists despite config |

## Done

All acceptance criteria checked. Phase 0 Task 0.1 is complete on disk; the next move is **Task 0.2 — Configure TailwindCSS**, adapted for v4 (largely a verification step since v4 needs no config file).

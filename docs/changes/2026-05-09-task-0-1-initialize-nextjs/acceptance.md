# Acceptance — Task 0.1 Setup Guide + `src/` + Turbopack pivot

Date: 2026-05-09
Slug: `2026-05-09-task-0-1-initialize-nextjs`

## Acceptance criteria

### A — New setup guide present and complete

`docs/architecture/phases/task-0-1-initialize-nextjs.md` must contain:

- [x] §0 Prerequisites (Node, pnpm, git versions + corepack note)
- [x] §1 Terminal Commands (Bash + PowerShell + single-line variants; cleanup commands)
- [x] §2 Recommended CLI Options (✔ list with rationale per option)
- [x] §3 Recommended Initial Folder Structure (post-init + post-Task-0.7 + folder-purpose table + alias note)
- [x] §4 Initial Cleanup Recommendations (delete list, replacement page.tsx, simplified globals.css, "do not touch" list)
- [x] §5 Validation Steps (5 checks: app runs, Tailwind, App Router, TypeScript, Turbopack)
- [x] §6 Git Commit Recommendation (message + why this checkpoint matters)
- [x] §7 Common Setup Pitfalls (Node version, Turbopack, Tailwind, App Router, `src/` specifics)

### B — All required outputs from the user prompt covered

- [x] All commands are copy-paste ready (Bash + PowerShell variants).
- [x] CLI options use the exact ✔ format requested.
- [x] Folder structure includes `src/app`, `src/components`, `src/lib`, `src/types` (the user's "src/components", "src/services", "src/lib", "src/types", "src/prompts" map: `services/` → `src/lib/services/`; `prompts/` → `src/lib/ai/prompts.ts`; `db/` → `src/lib/db/`).
- [x] Cleanup section explicitly lists files to delete and how to simplify `globals.css`.
- [x] Validation includes commands and expected results for every check.
- [x] Git commit recommendation is included.
- [x] Pitfalls cover Node, Turbopack, Tailwind, App Router (plus `src/` specifics as bonus).

### C — `phase-0-project-setup.md` stays internally consistent

- [x] Task 0.1 lists `src/` directory: **Yes** and Turbopack: **Yes**.
- [x] Task 0.1 acceptance criteria reference `(Turbopack)` token and `paths: { "@/*": ["./src/*"] }`.
- [x] Task 0.7 folder tree is rooted under `src/`; `prisma/` and `public/` remain at repo root.
- [x] Task 0.7 folder-purposes table prefixes every code path with `src/`.
- [x] Task 0.7 acceptance asserts `src/lib/foo/bar.ts` resolves via `@/lib/foo/bar`.
- [x] Tasks 0.2 through 0.9 references to `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/api/_test/route.ts`, `lib/db/prisma.ts`, `lib/config/env.ts`, `lib/utils.ts` all updated to `src/...`.
- [x] Task 0.6 `grep` target updated to `src/`.
- [x] §6 Pitfalls reference `src/app/api/<route>/route.ts`.
- [x] §7 DoD references `src/lib/*`.

### D — Audit on `phase-0-project-setup.md`

Searched for residual root-level paths: only matches that remain are intentional (alias references like `@/lib/db/prisma`, prose like `lib/utils.ts` from shadcn — already updated to `src/lib/utils.ts`).

### E — Items deliberately NOT changed

- [x] `technical-design.md` §14 folder tree — still shows root-level layout. **OI-task01.A** opened. Out of scope for this phase.
- [x] `implementation-plan.md` — alias-based references stay correct. No edit needed.
- [x] `product-spec.md` — no path content. Untouched.
- [x] No new dependencies introduced.
- [x] No actual `pnpm create next-app` was run by this phase — that is the developer's job following the guide.

### F — SDD compliance

- [x] New living doc placed under `docs/architecture/phases/`.
- [x] Surgical edits to existing living doc are documented in this folder's `plan.md`.
- [x] Per-change deliverables placed under `docs/changes/2026-05-09-task-0-1-initialize-nextjs/`.
- [x] No destructive operations.
- [x] No spec edits.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-task01.A | `technical-design.md` §14 must be updated to `src/`-prefixed layout for consistency with Phase 0 |
| OI-task01.B | Whether to move `prisma/` under `src/` (currently at repo root by convention) |
| OI-task01.C | This format establishes the per-task detail-doc pattern; intentional adoption decision needed for remaining tasks |

## Done

All acceptance criteria checked. The team can now follow `docs/architecture/phases/task-0-1-initialize-nextjs.md` step-by-step to scaffold the project, and Phase 0 docs are internally consistent with the `src/` + Turbopack decision.

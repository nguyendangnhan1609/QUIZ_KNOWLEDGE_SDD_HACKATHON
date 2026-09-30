# Plan — Task 0.1 Setup Guide + `src/` + Turbopack pivot

Date: 2026-05-09
Slug: `2026-05-09-task-0-1-initialize-nextjs`
Driver: User request to implement Task 0.1 with **`src/` directory enabled** and **Turbopack enabled**.
Sources used:
- `docs/architecture/phases/phase-0-project-setup.md` (existing Phase 0 breakdown)
- `docs/architecture/implementation-plan.md` v1.1
- `docs/architecture/technical-design.md` v1.0

## Goal

Two outputs in one phase:

1. **New file** `docs/architecture/phases/task-0-1-initialize-nextjs.md` — the executable, copy-paste setup guide for Task 0.1, sized as a single onboarding doc.
2. **Surgical update** to `docs/architecture/phases/phase-0-project-setup.md` so Phase 0 stays internally consistent: Task 0.1 + Task 0.7 + the folder-purposes table all reflect the new `src/` layout.

## Conflict resolved

The user's new requirements (`src/` directory: **Yes**, Turbopack: **Yes**) directly contradicted the earlier draft of `phase-0-project-setup.md` Task 0.1 ("`src/` directory: No (we use `app/` at root, per technical-design §14)"). User's later instruction is authoritative.

| Field | Earlier draft | New decision |
|---|---|---|
| `src/` directory | No | **Yes** |
| Turbopack flag | not mentioned | **Yes** (`--turbopack`) |
| Import alias resolution | `@/*` → `./*` | `@/*` → `./src/*` |
| `prisma/`, `public/` location | repo root | repo root (unchanged) |
| `app/`, `components/`, `lib/`, `types/` location | repo root | **under `src/`** |

## Concrete changes

### 1. New file — `docs/architecture/phases/task-0-1-initialize-nextjs.md`

Sections per the user's prompt:

- §0 Prerequisites (Node, pnpm, git versions + corepack note)
- §1 Terminal Commands (Bash, PowerShell, one-liner; cleanup commands)
- §2 Recommended CLI Options (interactive answers + rationale per option)
- §3 Recommended Initial Folder Structure (immediately-after-init + post-Task-0.7 future state + folder purpose table + alias note)
- §4 Initial Cleanup Recommendations (delete sample SVGs; replace `page.tsx`; simplify `globals.css`; "do not touch" list)
- §5 Validation Steps (5 checks: app runs, Tailwind, App Router, TypeScript, Turbopack confirmation)
- §6 Git Commit Recommendation
- §7 Common Setup Pitfalls (Node, Turbopack, Tailwind, App Router, `src/` specifics)

### 2. Updates to `docs/architecture/phases/phase-0-project-setup.md`

| Edit | Section |
|---|---|
| Task 0.1 Technical Requirements: `src/` → Yes; Turbopack → Yes; alias resolves to `./src/*`; cross-link to detail guide | §3 Task 0.1 |
| Task 0.1 Acceptance Criteria: `(Turbopack)` token check; `tsconfig` paths point to `./src/*`; smoke segment under `src/app/_smoke` | §3 Task 0.1 |
| Task 0.7 folder tree: rooted under `src/` (with `prisma/`, `public/` kept at repo root) | §3 Task 0.7 |
| Task 0.7 folder purposes table: every code path prefixed with `src/`; alias note appended | §3 Task 0.7 |
| Task 0.7 Acceptance: `src/lib/foo/bar.ts` → `@/lib/foo/bar` resolution check | §3 Task 0.7 |
| Path-bearing references in Tasks 0.2, 0.3, 0.4, 0.6, 0.8, 0.9: `lib/utils.ts`, `lib/db/prisma.ts`, `lib/config/env.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/api/_test/route.ts` → `src/...` | §3 Task 0.2–0.9 |
| Task 0.6 grep target: `app/ lib/ components/` → `src/` | §3 Task 0.6 |
| Pitfalls table reference: `app/api/<route>/route.ts` → `src/app/api/<route>/route.ts` | §6 Next.js App Router |
| DoD: ".gitkeep files in every empty folder from `lib/*`" → `src/lib/*` | §7 Definition of Done |

### 3. NOT updated in this phase

- `docs/architecture/technical-design.md` §14 (folder structure tree) — still shows root-level `app/`, `components/`, `lib/`. Inconsistent with the new `src/`-based layout. **Tracked as OI-task01.A.** Rationale: scope of this prompt is "implement Task 0.1", not "refactor the technical design doc". Update is small but should be a separate phase to keep traceability clean.
- `docs/architecture/implementation-plan.md` — references to file paths are alias-based (`@/lib/...`) and remain correct since `@/*` resolves to `./src/*`. No edits needed.
- `docs/product_spec_ai_knowledge_assessment_platform.md` — no path content. Unchanged.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-task01.A | `technical-design.md` §14 folder structure still shows root-level `app/`, `components/`, `lib/`. Update to `src/`-prefixed layout for consistency with the new Phase 0 setup. |
| OI-task01.B | If the team later wants to move `prisma/` under `src/` for symmetry, that's a separate decision; current convention keeps it at repo root. |
| OI-task01.C | The `task-0-1-initialize-nextjs.md` format establishes the per-task detail-doc pattern. If we adopt this for tasks 0.2–0.10 and Phases 1–7, expect 70+ files. Acceptable, but worth being intentional about. |

## Files

- Created: `docs/architecture/phases/task-0-1-initialize-nextjs.md`
- Updated: `docs/architecture/phases/phase-0-project-setup.md` (Task 0.1 + Task 0.7 + scattered path references + DoD)
- Created: `docs/changes/2026-05-09-task-0-1-initialize-nextjs/plan.md` (this file)
- Created: `docs/changes/2026-05-09-task-0-1-initialize-nextjs/acceptance.md`

## Spec impact

None.

## Checkpoints

- [x] Conflict between earlier draft and new requirement explicitly resolved
- [x] Task 0.1 setup guide written with all 7 user-requested sections (+ §0 prerequisites)
- [x] phase-0-project-setup.md kept internally consistent with `src/`-based layout
- [x] All `app/*` → `src/app/*` references updated
- [x] All `lib/*` → `src/lib/*` references updated
- [x] No edits to technical-design.md (deferred via OI-task01.A)
- [x] No new dependencies introduced
- [x] plan.md written
- [x] acceptance.md written

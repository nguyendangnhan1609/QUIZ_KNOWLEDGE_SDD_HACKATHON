# Plan — Phase 0 Task Breakdown

Date: 2026-05-09
Slug: `2026-05-09-phase-0-task-breakdown`
Driver: User request to expand `implementation-plan.md` §4 (Phase 0) into a 10-task execution doc.
Sources used:
- `docs/architecture/implementation-plan.md` v1.1 (§4)
- `docs/architecture/technical-design.md` v1.0 (§13.2 env validation, §14 folder structure)
- `docs/product_spec_ai_knowledge_assessment_platform.md` v1.1 (no direct dependence; respected)

## Goal

Produce a new file `docs/architecture/phases/phase-0-project-setup.md` that:
- breaks Phase 0 into the 10 specified tasks,
- gives each task the canonical 9-field shape (ID, title, objective, requirements, dependencies, acceptance, validation, complexity, AI opportunity),
- provides execution order, commit strategy, pitfalls, and a definition of done,
- preserves the v1.1 implementation-plan corrections (no `.env.example` deliverable, no "green CI", Vercel deploy stays out of Phase 0 sub-tasks).

## File location

- `docs/architecture/phases/phase-0-project-setup.md` — new subfolder `phases/` to host the upcoming Phase 1–7 task-breakdown docs without crowding `docs/architecture/`.

## Task coverage

All 10 required tasks present:

- 0.1 Initialize Next.js Project
- 0.2 Configure TailwindCSS
- 0.3 Setup shadcn/ui
- 0.4 Setup Prisma ORM
- 0.5 Setup Supabase
- 0.6 Configure Environment Variables
- 0.7 Create Folder Structure
- 0.8 Setup Code Quality Tools
- 0.9 Setup Base UI Layout
- 0.10 Verify Local Development Environment

All required outer sections (1–7) present:

- §1 Phase Overview (purpose, outcome, why setup matters)
- §2 Setup Goals
- §3 Task Breakdown (the 10 tasks)
- §4 Recommended Execution Order (ASCII dep graph + wall-clock estimate)
- §5 Recommended Git Commit Strategy (naming, frequency, examples)
- §6 Common Setup Pitfalls (Prisma, Supabase, Next.js, Tailwind, shadcn)
- §7 Definition of Done (Code / Layout / Integrations / Hygiene + out-of-scope reminders)

## Decisions inherited (not re-litigated)

- Stack locked: Next.js 15 + TS + Tailwind + shadcn/ui + Prisma + Supabase + OpenAI.
- Folder layout matches `technical-design.md` §14.
- Env validation via `@t3-oss/env-nextjs` with the six keys from `technical-design.md` §13.2.
- No `.env.example` deliverable (per implementation-plan v1.1 review fix F3).
- No "green CI" deliverable (per implementation-plan v1.1 review fix F3).
- Vercel deployment is **not** a Phase 0 sub-task — captured as an optional milestone after 0.10 passes; canonical home is `implementation-plan.md` §16.
- `sonner` (not `toast`) is the shadcn toast component.
- `pnpm` is the package manager.

## What this doc does NOT do

- Doesn't redefine product requirements (spec stays v1.1).
- Doesn't reopen architectural decisions from `technical-design.md`.
- Doesn't introduce CI / observability / monitoring setup.
- Doesn't deploy to Vercel as a sub-task.
- Doesn't write the real Prisma schema (deferred to Phase 1) or any business logic.

## Open Issues forwarded

- **OI-phase0.A** — VS Code-specific recommendations (`.vscode/settings.json`) live in 0.8. If the team uses different editors, that file becomes noise. Acceptable for hackathon.
- **OI-phase0.B** — `prettier-plugin-tailwindcss` is marked optional. Recommend enabling once the team feels stable.
- **OI-phase0.C** — Phase 1–7 task-breakdown docs follow this format. Establish that as the standard now so AI assistants have a stable template.

## Files

- Created: `docs/architecture/phases/phase-0-project-setup.md`
- Created: `docs/changes/2026-05-09-phase-0-task-breakdown/plan.md` (this file)
- Created: `docs/changes/2026-05-09-phase-0-task-breakdown/acceptance.md`

## Spec impact

None. Spec v1.1 unchanged.

## Checkpoints

- [x] All 10 tasks drafted with the canonical 9-field structure
- [x] All 7 outer sections present
- [x] Execution order graph + wall-clock estimate included
- [x] Pitfalls table covers all 5 stacks (Prisma, Supabase, Next.js, Tailwind, shadcn)
- [x] DoD includes out-of-scope reminders matching v1.1 review decisions
- [x] No new dependencies beyond those already in the stack
- [x] Open Issues catalogued (OI-phase0.A–C)
- [x] plan.md written
- [x] acceptance.md written

# Acceptance — Phase 0 Task Breakdown

Date: 2026-05-09
Slug: `2026-05-09-phase-0-task-breakdown`
Affected document: `docs/architecture/phases/phase-0-project-setup.md`

## Acceptance criteria

### A — Section coverage

- [x] §1 Phase Overview (purpose, expected outcome, why setup matters for future phases)
- [x] §2 Setup Goals (10-item bullet list)
- [x] §3 Task Breakdown (10 tasks)
- [x] §4 Recommended Execution Order (with dependency rationale + wall-clock estimate)
- [x] §5 Recommended Git Commit Strategy (naming, frequency, examples, branching)
- [x] §6 Common Setup Pitfalls (Prisma, Supabase, Next.js App Router, Tailwind, shadcn — each with mitigations)
- [x] §7 Definition of Done (Code / Layout / Integrations / Hygiene + out-of-scope reminders)

### B — Each of the 10 tasks uses the canonical structure

For each of Tasks 0.1 → 0.10:

- [x] Task ID (`Task 0.N`)
- [x] Task Title
- [x] Objective
- [x] Technical Requirements
- [x] Dependencies
- [x] Acceptance Criteria
- [x] Validation Steps
- [x] Estimated Complexity (Low / Medium / High)
- [x] AI Coding Opportunity

Verified for all 10 tasks.

### C — Required tasks present and minimally specified

- [x] 0.1 — Initialize Next.js Project (create-next-app, App Router, TypeScript, ESLint covered)
- [x] 0.2 — Configure TailwindCSS (global styles, verification, folder strategy covered)
- [x] 0.3 — Setup shadcn/ui (installation, base components, theme covered)
- [x] 0.4 — Setup Prisma ORM (installation, schema init, client generation covered)
- [x] 0.5 — Setup Supabase (project creation, DB connection, env vars, storage bucket covered)
- [x] 0.6 — Configure Environment Variables (.env.local structure, naming conventions, secret handling covered)
- [x] 0.7 — Create Folder Structure (app/, components/, services/ via lib/services/, lib/, db/ via lib/db/, types/; each folder's purpose explained — `prompts/` is housed under `lib/ai/prompts.ts` per technical-design)
- [x] 0.8 — Setup Code Quality Tools (Prettier, linting, formatting; optional Tailwind class sort)
- [x] 0.9 — Setup Base UI Layout (root layout, navigation placeholder, responsive container, app shell covered)
- [x] 0.10 — Verify Local Development Environment (6-point smoke check)

### D — Faithful to source documents

- [x] Stack matches `implementation-plan.md` v1.1 and `technical-design.md` v1.0.
- [x] Folder structure matches `technical-design.md` §14.
- [x] Env vars match `technical-design.md` §13.2.
- [x] No deliverables that contradict implementation-plan v1.1 (no `.env.example` promise, no "green CI").
- [x] Vercel deploy is **not** listed as a Phase 0 sub-task (matches the canonical milestone in implementation-plan §16).
- [x] No new dependencies beyond the locked stack.

### E — Hackathon-fit

- [x] Tasks sized for ~10–20 min each, total wall-clock ~75–110 min.
- [x] Tasks ordered for one-person serial execution and two-person parallelization.
- [x] Pitfall table is concrete (per stack), not generic project management advice.
- [x] DoD includes negative reminders ("do NOT do these in Phase 0") to block scope creep.

### F — SDD compliance

- [x] Living architecture doc placed under `docs/architecture/phases/` (subfolder under `docs/architecture/`).
- [x] Per-change deliverables placed under `docs/changes/2026-05-09-phase-0-task-breakdown/`.
- [x] No edits to spec.
- [x] No edits to `technical-design.md` or `implementation-plan.md`.
- [x] No destructive operations.

## Items deliberately not included

- **Vercel deploy** — not a Phase 0 sub-task. Optional milestone after 0.10. Owner of the deploy step: implementation-plan.md §16.
- **CI workflow** — explicitly removed from Phase 0 scope per implementation-plan v1.1 review fix F3.
- **`.env.example`** — explicitly removed per same fix.
- **Prisma schema content** — owned by Phase 1.
- **Any business logic / API routes / AI integration** — owned by Phases 2–6.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-phase0.A | VS Code settings file may not fit teams using other editors |
| OI-phase0.B | `prettier-plugin-tailwindcss` flagged optional; revisit |
| OI-phase0.C | This doc establishes the format for Phase 1–7 task breakdowns |

## Done

All acceptance criteria checked. `docs/architecture/phases/phase-0-project-setup.md` is the team's executable Phase 0 task list.

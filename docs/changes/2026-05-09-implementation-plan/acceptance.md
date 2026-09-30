# Acceptance — Implementation Plan v1.0

Date: 2026-05-09
Slug: `2026-05-09-implementation-plan`
Affected document: `docs/architecture/implementation-plan.md`

## Acceptance criteria

### A — Section coverage

- [x] §1 Implementation Strategy (philosophy, MVP-first, incremental, risk minimization, hackathon optimization, phase + end-to-end rationale)
- [x] §2 Development Phases Overview (table with #, name, objective, complexity, dependencies, deliverables; covers Phases 0–7)
- [x] §3 Detailed Phase Breakdown format (template introduced before §4–§11)
- [x] §4 Phase 0 — Project Setup (Next.js, TS, Tailwind, shadcn, Prisma, Supabase, env, lint, format, git; deps + folder init)
- [x] §5 Phase 1 — Database & Infrastructure (schema, migrations, Supabase setup, bucket, relationships, seed; migration + local vs prod)
- [x] §6 Phase 2 — Document Upload & Parsing (UI, API, Storage, PDF, DOCX, MD, normalization, validation; libs, size, failures)
- [x] §7 Phase 3 — AI Quiz Generation (prompt, chunking, OpenAI, retry, JSON validation, persistence, hallucination, cost; sequence + libs + arch)
- [x] §8 Phase 4 — Quiz Engine (token gen, public routes, randomization, grading integrity; pseudocode + notes)
- [x] §9 Phase 5 — Submission & Scoring (API, grading, score calc, persistence, dup prevention, validation; edge cases + errors)
- [x] §10 Phase 6 — Analytics (API, aggregation, table, accuracy, charts; recommended viz + lightweight approach)
- [x] §11 Phase 7 — UI Polish & Demo Prep (loading/error/empty/responsive, seed, flow, presentation; judging priorities)
- [x] §12 Git Workflow (branching, commits, PRs; lightweight)
- [x] §13 AI Coding Workflow (context, components, APIs, validation, hallucination — comprehensive)
- [x] §14 Task Granularity (split rules, organization, examples)
- [x] §15 Testing (units, integration, manual; not overengineered)
- [x] §16 Deployment (Vercel, env, prod DB, prod storage, order; release checklist)
- [x] §17 Final MVP Checklist (functional, non-functional, UX, demo)

### B — Each phase (4–11) uses the canonical structure

- [x] Phase Goal
- [x] Tasks
- [x] Deliverables
- [x] Dependencies
- [x] Acceptance Criteria
- [x] Risks
- [x] AI-Assisted Development Opportunities

Verified for all 8 phases.

### C — Faithful to source documents

- [x] Stack matches spec + design (Next.js 15, Supabase, Prisma, OpenAI, Tailwind/shadcn, Vercel).
- [x] Identity model uses incremental INT + cuid2 (per spec v1.1 §8.3 and design Q1).
- [x] Generation is synchronous with AbortController 55s, retry once with gpt-4o (per design §7).
- [x] Upload is proxied through Route Handler (per design Q3).
- [x] Identifier collision uses UNIQUE + `_yyyyMMddHHmmss` suffix retry (per spec §8.5 and design §12.2).
- [x] No new dependencies introduced beyond design §2.
- [x] No new tables or schema changes.
- [x] No reopening of decisions previously approved.

### D — Hackathon discipline

- [x] Time budget realistic for < 3 days, 2-person team.
- [x] Stub-first / parallelize / commit-often guidance throughout.
- [x] Risk-mitigation table at strategy level + per-phase risks.
- [x] AI-assisted patterns clearly distinguished from anti-patterns.
- [x] Manual testing checklist usable in 10 minutes.

### E — Implementation-readiness

- [x] Concrete commands present (`pnpm create next-app@latest`, `pnpm prisma migrate deploy`, etc.).
- [x] Concrete env-var list with where-to-source guidance.
- [x] Concrete pseudocode for grading and randomization.
- [x] Concrete prompt examples for AI coding.
- [x] Final MVP checklist contains testable items, not vague goals.

### F — SDD compliance

- [x] Living plan placed under `docs/architecture/` per CLAUDE.md §3.
- [x] Per-change deliverables under `docs/changes/2026-05-09-implementation-plan/`.
- [x] No edits to product spec.
- [x] No destructive operations.
- [x] Open Issues catalogued (OI-impl.A–C).

## Out of scope (intentionally absent)

- Test infrastructure beyond `vitest` for pure-logic units.
- CI/CD pipeline beyond Vercel auto-deploy.
- Monitoring / alerting / observability tools.
- Pre-launch performance benchmarking suite.
- Authentication, RBAC, multi-tenant, async generation lifecycle (per spec non-goals + deferrals).

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-impl.A | Fallback if 30s SLA can't be met: reduce `questionCount` rather than going async |
| OI-impl.B | Dashboard polling vs manual refresh decision |
| OI-impl.C | Whether to include `vitest` at all under hackathon time pressure |

## Done

All acceptance criteria checked. `docs/architecture/implementation-plan.md` is ready as the team's execution roadmap.

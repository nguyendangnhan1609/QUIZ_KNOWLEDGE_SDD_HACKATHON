# Plan — Implementation Plan v1.0

Date: 2026-05-09
Slug: `2026-05-09-implementation-plan`
Driver: User request to produce `implementation-plan.md` covering 17 specified sections.
Sources used:
- `docs/product_spec_ai_knowledge_assessment_platform.md` v1.1
- `docs/architecture/technical-design.md` v1.0 (post-rollback to Vercel)

## Goal

Produce an executable, hackathon-grade implementation roadmap that:
- sequences the technical design into 8 phases (Phase 0–7),
- gives every phase the same shape (goal, tasks, deliverables, dependencies, acceptance, risks, AI opportunities),
- bakes in the SDD discipline already established in this repo (no scope creep, locked stack, OI tracking),
- is usable verbatim as input to AI coding assistants.

## File location

- `docs/architecture/implementation-plan.md` (living delivery roadmap; placed under `docs/architecture/` per CLAUDE.md §3 since the existing rule set only permits `docs/architecture/` and `docs/standards/` for living docs).

## Section coverage map

All 17 prompt-required sections are implemented:

| § | Section | Notable content |
|---|---|---|
| 1 | Implementation Strategy | Philosophy, MVP-first rules, risk table, phase rationale |
| 2 | Phases Overview | Phase table + rough person-hour budget for 2-person team < 3 days |
| 3 | Detailed Phase Breakdown — format | Template intro for §4–§11 |
| 4 | Phase 0 — Project Setup | Concrete `pnpm` install commands, shadcn one-shot, env wiring |
| 5 | Phase 1 — DB & Infra | Prisma migration workflow, local vs prod DB, no-auto-seed policy |
| 6 | Phase 2 — Upload & Parsing | Per-format parser tasks, error-mode table, `pdf-parse` ESM gotcha |
| 7 | Phase 3 — AI Generation | 6-step strict implementation order; Zod retry; cost cap; persistence transaction |
| 8 | Phase 4 — Quiz Engine | Server-side randomization; `no-store` cache; pseudocode verbatim from design |
| 9 | Phase 5 — Submission & Scoring | Grading code, identifier-collision retry pattern, edge-case table |
| 10 | Phase 6 — Analytics | One-service-function design; raw SQL for question accuracy; lightweight viz |
| 11 | Phase 7 — Polish & Demo | UX checklist + judge-impact ranking + demo backup recording |
| 12 | Git Workflow | Lightweight trunk-based; hot-fix rules in last 4h |
| 13 | AI Coding Workflow | Context contract (4 things), patterns/anti-patterns, hallucinated-architecture counter table |
| 14 | Task Granularity | 1–3h rule, file-boundary heuristic, prompt-header stub |
| 15 | Testing | Pure logic + Zod schemas only; manual checklist |
| 16 | Deployment | Vercel + Supabase + env table + first-time + per-demo release checklist |
| 17 | Final MVP Checklist | Functional / non-functional / UX / demo gates |

## Decisions inherited from prior phases (not re-litigated)

- Tech stack: Next.js 15 + Supabase + Prisma + OpenAI + Tailwind/shadcn + Vercel.
- Identity model: incremental internal INT + cuid2 public token.
- Generation mode: synchronous, with `AbortController` 55s, single retry to `gpt-4o`.
- Upload path: proxied through Next.js Route Handler.
- Identifier collision: UNIQUE + `_yyyyMMddHHmmss` suffix retry.
- Spec v1.1 unchanged.

## What this plan does NOT do

- Doesn't reopen architecture decisions.
- Doesn't include test infrastructure beyond `vitest` for pure logic.
- Doesn't define a CI/CD pipeline beyond Vercel auto-deploy.
- Doesn't propose monitoring/alerting (out of MVP scope).
- Doesn't introduce any new dependencies beyond those listed in technical-design.md §2.

## Open Issues forwarded

- **OI-impl.A** — If Phase 3 cannot keep generation under 30s for the chosen demo PDF, fall back to a smaller `questionCount` rather than enabling async. Track in OI; don't redesign.
- **OI-impl.B** — Phase 7 polling vs manual refresh on dashboard. Recommendation is manual refresh; revisit if real users complain.
- **OI-impl.C** — Whether to add `vitest` to the project at all. Currently recommended for pure-logic units; if time-pressed, drop entirely and rely on manual checklist.

## Files

- Created: `docs/architecture/implementation-plan.md`
- Created: `docs/changes/2026-05-09-implementation-plan/plan.md` (this file)
- Created: `docs/changes/2026-05-09-implementation-plan/acceptance.md`

## Spec impact

None. Spec v1.1 unchanged.

## Checkpoints

- [x] All 17 sections drafted
- [x] Cross-references to spec v1.1 and technical-design v1.0 are accurate
- [x] No new architectural decisions introduced (only sequencing of existing ones)
- [x] Open Issues catalogued (OI-impl.A–C)
- [x] plan.md written
- [x] acceptance.md written

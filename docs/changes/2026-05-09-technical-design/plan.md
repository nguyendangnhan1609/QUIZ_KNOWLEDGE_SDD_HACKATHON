# Plan — Technical Design v1.0

Date: 2026-05-09
Slug: `2026-05-09-technical-design`
Driver: User request to produce `technical-design.md` covering 16 specified sections.
Spec basis: `docs/product_spec_ai_knowledge_assessment_platform.md` v1.1.

## Goal

Produce a complete, implementation-ready technical design document for the MVP, locked to:
- Tech stack: Next.js 15 + Supabase + Prisma + OpenAI + Tailwind/shadcn + Vercel.
- Spec v1.1 decisions: incremental internal IDs, `createdAt` for cleanup hook, identifier collision via timestamp suffix, public dashboard sharable by design, no preview UI, no async lifecycle in MVP.

## Locked architecture decisions

User-approved on 2026-05-09:

| # | Decision | Choice |
|---|---|---|
| Q1 / #6 | Internal ID vs public token | **Tách**: autoincrement INT internal + `cuid2` token in URLs |
| Q2 / #1 | Generation mode | **Synchronous** (no queue, no state machine) |
| Q3 / #10 | Upload path | **Proxy through Next.js Route Handler**; note migration to signed URL when files exceed Vercel Pro body limit |

Other locked design choices (selected during plan stage, no objection):

- OpenAI: `gpt-4o-mini` primary, `gpt-4o` fallback on JSON validation failure.
- Chunking: tiktoken token-bucket ~3000 tokens/chunk, target 1.5× requested questions for sampling headroom.
- Randomization: server-side Fisher-Yates for both question subset and option order; stable IDs throughout.
- Validation: Zod for both API bodies and AI output, schemas shared client/server.
- Identifier collision: enforce via `UNIQUE(quizId, identifier)`, retry once with `_yyyyMMddHHmmss` suffix.
- Vercel runtime: Node (not edge), Pro plan for 60s function timeout.
- Public ID library: `@paralleldrive/cuid2`.

## Inputs read

- `docs/product_spec_ai_knowledge_assessment_platform.md` v1.1
- `docs/product_spec_ai_knowledge_assessment_platform_review.md`
- `.claude/CLAUDE.md`, `.claude/rules/00-safety.md`

## Files

- Created: `docs/architecture/technical-design.md` (living architecture doc)
- Created: `docs/changes/2026-05-09-technical-design/plan.md` (this file)
- Created: `docs/changes/2026-05-09-technical-design/acceptance.md`

## Section coverage map

All 16 prompt-required sections are present and implementation-oriented:

| § | Section | Notable content |
|---|---|---|
| 1 | System Architecture | ASCII high-level + 2 request-flow diagrams + responsibility table |
| 2 | Technology Stack | Full table with rationale for every dependency |
| 3 | Frontend Architecture | Routes table + components + state strategy + folder layout |
| 4 | Backend Architecture | Layered shape + AppError pattern + folder layout |
| 5 | Database Design | Prisma schema for 6 tables (incl. `options` split) + indexes + ER diagram |
| 6 | Document Processing | Per-format parser code excerpts + error map |
| 7 | AI Quiz Generation | End-to-end flow + chunker code + system/user prompts + Zod schema + retry logic + cost estimate |
| 8 | Randomization Engine | Pseudocode + grading-integrity argument + anti-cheating in/out scope |
| 9 | API Design | 5 endpoints with request/response examples + error codes |
| 10 | Security | 11-row controls table |
| 11 | Performance | 11-row levers table tied to spec §9 targets |
| 12 | Error Handling | Error code enum + per-failure behavior + retry policy |
| 13 | Deployment | Diagram + env table + workflow |
| 14 | Folder Structure | Full tree |
| 15 | Development Workflow | Setup, branching, migrations, env checklist, hackathon tips |
| 16 | Future Scalability | 9-row roadmap with isolation analysis |

## Open Issues forwarded to design doc

- OI-design.A — Difficulty filtering in dashboard (post-MVP).
- OI-design.B — Lock `questionCount` at quiz creation vs request param.
- OI-design.C — Identifier suffix 1-second resolution edge case.
- OI-design.D — Cleanup job deferred per spec F8.
- OI-design.E — Migrate to signed-URL upload when needed.
- OI-design.F — Rate limit cross-instance accuracy requires Upstash.

## Out of scope (consistent with spec)

- Async generation lifecycle (spec F7 deferred).
- Retention/deletion policy beyond capturing `createdAt` (spec F8 deferred).
- Quantitative DoD (spec F9 deferred).
- Authentication / RBAC / multi-tenant (spec §5 non-goals).

## Checkpoints

- [x] User approved 3 binding decisions (Q1, Q2, Q3)
- [x] All 16 sections drafted
- [x] Spec v1.1 decisions reflected (IDs, createdAt, identifier collision, dashboard share, no preview UI)
- [x] Architecture doc written to `docs/architecture/technical-design.md`
- [x] plan.md written
- [x] acceptance.md written

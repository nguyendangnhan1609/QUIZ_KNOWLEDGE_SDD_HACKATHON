# Acceptance — Technical Design v1.0

Date: 2026-05-09
Slug: `2026-05-09-technical-design`
Target document: `docs/architecture/technical-design.md`

## Acceptance criteria

The deliverable is accepted when **all** of the following hold.

### A — Section coverage (per user prompt)

- [x] §1 System Architecture (high-level diagram, request flow, component responsibilities)
- [x] §2 Technology Stack (table with rationale)
- [x] §3 Frontend Architecture (App Router structure, components, state, folder structure)
- [x] §4 Backend Architecture (route structure, services, validation, errors, async, folder structure)
- [x] §5 Database Design (5+ tables with columns, types, relationships, indexes, purpose; Prisma schema; ER diagram)
- [x] §6 File Upload & Document Processing (flow, formats, parsers, error handling)
- [x] §7 AI Quiz Generation (chunking, prompts, generation flow, JSON validation, retry, hallucination prevention, token optimization, schema, example prompt)
- [x] §8 Quiz Randomization (selection, shuffle, grading integrity, pseudocode, anti-cheating)
- [x] §9 API Design (5 endpoints with request/response, validation, errors)
- [x] §10 Security (token strategy, validation, file sanitization, AI validation, abuse prevention)
- [x] §11 Performance (large docs, async, indexing, cost, latency)
- [x] §12 Error Handling (per-failure behavior, retry strategy)
- [x] §13 Deployment (Vercel, env vars, Supabase, OpenAI, workflow)
- [x] §14 Folder Structure (complete tree)
- [x] §15 Development Workflow (setup, branching, migrations, env)
- [x] §16 Future Scalability (auth, teams, RAG, analytics, LMS — without overengineering MVP)

### B — Spec v1.1 alignment

- [x] Internal autoincrement `id` + public `cuid2` token reflected in `Quiz` model (`publicToken`, `resultsToken`).
- [x] `createdAt` on `Document` and `Quiz`; `quizzes.createdAt` index documented for future cleanup.
- [x] Identifier-collision rule (UNIQUE + `_yyyyMMddHHmmss` suffix retry) reflected in §5 schema, §8 grading flow, §9 attempts API, §12 error handling.
- [x] Public dashboard sharable by design — no auth — consistent with §10 Security and §13 deployment notes.
- [x] No preview UI — manager validates via quiz link and regenerates per §3, §6.1 of spec.
- [x] Document scope: AI-readable text-based formats; no hard page/token limit beyond defensive 15MB.

### C — Locked technical decisions

- [x] Q1 (separate INT + cuid2): present in §5 schema and §9 API design.
- [x] Q2 (synchronous generation): explicit in §1 architecture, §4 async section, §11 performance, §13 deployment.
- [x] Q3 (proxy upload): explicit in §6 with note on migration to signed URL (also tracked as OI-design.E).

### D — Implementation-readiness

- [x] Prisma schema is complete and migration-ready.
- [x] Zod schemas for both API bodies and AI output included.
- [x] OpenAI prompt template included verbatim.
- [x] Pseudocode for chunking, randomization, retry logic.
- [x] Folder structure listed in full.
- [x] Env-var validation example included.
- [x] Setup commands provided.

### E — SDD compliance

- [x] Living architecture doc placed under `docs/architecture/` (per CLAUDE.md §3).
- [x] Per-change deliverables under `docs/changes/2026-05-09-technical-design/` (per CLAUDE.md §3).
- [x] Open Issues catalogued (OI-design.A through OI-design.F).
- [x] No spec edits performed (spec is unchanged in this phase).
- [x] No destructive operations.

## Out-of-scope (intentionally absent)

Per spec deferrals, the design doc explicitly does not specify:

- Async generation lifecycle / job state machine (spec F7).
- Retention/deletion policy beyond capturing `createdAt` (spec F8).
- Quantitative DoD / quality gates (spec F9).
- Authentication, RBAC, multi-tenant (spec §5 non-goals).

These are addressed in §16 Future Scalability as additive paths only.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-design.A | Difficulty filtering in dashboard |
| OI-design.B | `questionCount` request-param vs locked-at-creation |
| OI-design.C | Identifier suffix 1-second resolution edge case |
| OI-design.D | Cleanup job for stale quizzes |
| OI-design.E | Migrate proxy upload to signed URL beyond body-size limit |
| OI-design.F | Rate-limit accuracy across Vercel instances |

## Done

All acceptance criteria checked. `docs/architecture/technical-design.md` is ready for the next phase (implementation kickoff).

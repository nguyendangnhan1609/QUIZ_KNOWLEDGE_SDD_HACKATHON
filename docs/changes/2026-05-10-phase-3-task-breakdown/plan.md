# Phase 3 Task Breakdown — Plan

Date: 2026-05-10  
Slug: `phase-3-task-breakdown`  
Mode: SDD (documentation-only deliverable; no code changes)

---

## 1. Scope

Author the executable task list for **Phase 3 — AI Quiz Generation** as a living architecture document, mirroring the format of [`phase-1-database-infrastructure.md`](../../architecture/phases/phase-1-database-infrastructure.md) and [`phase-2-document-upload-parsing.md`](../../architecture/phases/phase-2-document-upload-parsing.md).

The deliverable converts the high-level Phase 3 plan in [`implementation-plan.md`](../../architecture/implementation-plan.md) §7 plus the technical contracts in [`technical-design.md`](../../architecture/technical-design.md) §7 into a numbered task list that an engineer (or AI) can execute task-by-task without re-reading source materials each time.

### Out of scope

- No code changes (no parser, route, service, or UI work).
- No edits to `implementation-plan.md` or `technical-design.md` — corrections to those documents are tracked as downstream Open Issues to be addressed in separate change deliverables.
- No edits to `phase-1-database-infrastructure.md` or `phase-2-document-upload-parsing.md` (their drift vs. the applied schema is captured as OI-3.D below).

---

## 2. Files to read

- `docs/architecture/implementation-plan.md` §7 — Phase 3 plan, locked contract.
- `docs/architecture/technical-design.md` §7 — AI quiz generation pipeline (workflow, chunker, prompts, schemas, retry, persistence).
- `docs/architecture/phases/phase-2-document-upload-parsing.md` — task-doc format reference.
- `docs/architecture/phases/phase-1-database-infrastructure.md` — task-doc format reference.
- `quiz-knowledge/prisma/schema.prisma` — authoritative schema for field naming in §Task 3.6 persistence example.
- `quiz-knowledge/src/lib/config/env.ts` — env-var convention (used to specify the new `QUESTION_BANK_MULTIPLIER`).

---

## 3. Files to create / update

| Path | Action | Purpose |
|---|---|---|
| `docs/changes/2026-05-10-phase-3-task-breakdown/plan.md` | create | This file. |
| `docs/changes/2026-05-10-phase-3-task-breakdown/acceptance.md` | create | Done criteria for the documentation deliverable itself. |
| `docs/architecture/phases/phase-3-ai-quiz-generation.md` | create | Main deliverable: 13-task breakdown for Phase 3. |

No other files modified.

---

## 4. Resolved Open Issues (decisions for this deliverable)

The plan-mode review surfaced three contradictions / gaps. User decisions:

### OI-3.A — Bank size formula → **A3 (configurable env var)**

- Phase 3 doc defines `bankSize = QUESTION_BANK_MULTIPLIER × questionCount`.
- Default = `2` (preserves implementation-plan's "Contract locked" intent).
- Env var validated via Zod: `z.coerce.number().int().min(1).max(3).default(2)`.
- Setup Goals checklist will require this env var to be added to `lib/config/env.ts` before Phase 3 implementation begins.

### OI-3.B — Generate Quiz form route → **B2 (two routes, redirect)**

- Phase 3 §Task 3.8 places the form at `/manager/quizzes/new?documentId=…`.
- Matches the redirect already specified in `phase-2-document-upload-parsing.md` §Task 2.1.
- No code drift; only `implementation-plan.md` §7 needs eventual correction (downstream OI).

### OI-3.C — `Question` / `Document` field naming → **C1 (trust applied schema)**

- Phase 3 doc uses the names that exist in `prisma/schema.prisma` today: `Question.text`, `Question.orderIndex`, `Option.text`, `Option.orderIndex`, `Document.textContent`, `Document.filename`, `Document.mimeType`, `Document.charCount`.
- The schema migration was applied in commit `5cefaee`; renaming columns now would force a destructive migration with no benefit.
- Drift in older phase docs is captured as OI-3.D below.

---

## 5. Open Issues (downstream — out of scope this phiên, tracked for follow-up)

| ID | Description | Affects | Resolution path |
|---|---|---|---|
| **OI-3.A1** | `implementation-plan.md` §7 says "Bank size persisted = `2 × questionCount`" (locked); `technical-design.md` §7.1 says budget = `× 1.5`, persist `× 1`. Phase 3 doc replaces both with `QUESTION_BANK_MULTIPLIER × questionCount` (default 2). Both source docs need a small rewrite to match. | `implementation-plan.md` §7, `technical-design.md` §7.1 | Separate doc-only change: `docs/changes/<date>-phase-3-bank-multiplier-alignment/`. |
| **OI-3.B1** | `implementation-plan.md` §7 task line "`Generate Quiz` form on `/manager/new`" contradicts Phase 2's redirect target. | `implementation-plan.md` §7 | Same downstream change as OI-3.A1 (one alignment PR). |
| **OI-3.D** | `phase-1-database-infrastructure.md` Task 1.4 lists `Question.body` / `displayOrder` (not in schema). `phase-2-document-upload-parsing.md` Task 2.4 lists `Document.title` / `text` / `uploadedFileName` / `documentType` (not in schema). Confusing for newcomers. | `phase-1-…`, `phase-2-…` task docs | Separate doc-only change: `docs/changes/<date>-phase-docs-schema-realignment/`. |

These three OIs do **not** block Phase 3 implementation — they are documentation drift only. They will be surfaced in §8 of the Phase 3 doc so future readers see them at the right time.

---

## 6. Checkpoints

1. ✅ Read all source materials (implementation-plan §7, technical-design §7, both phase doc templates, applied schema, env config).
2. ✅ Resolve OI-3.A / 3.B / 3.C with user (decisions A3 / B2 / C1).
3. ⬜ Create `plan.md` (this file) and `acceptance.md` under `docs/changes/2026-05-10-phase-3-task-breakdown/`.
4. ⬜ Create `docs/architecture/phases/phase-3-ai-quiz-generation.md` with 13 tasks, dependency graph, commit strategy, pitfalls, definition of done, and §8 Open Issues.
5. ⬜ Verify cross-references resolve (links to `technical-design.md` sections, schema file, env config, sibling phase docs).
6. ⬜ Confirm no source files (`implementation-plan.md`, `technical-design.md`, prior phase docs) were edited.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Phase 3 doc drifts from technical-design as both evolve. | §8 Open Issues catalogues the alignment debt explicitly so it cannot be silently lost. |
| Decision A3 (env multiplier) introduces a degree of freedom that Phase 5 (participant attempts) doesn't expect. | Setup Goals call out that randomization §8 must read `bank.length`, not assume `2 × N`. Future Phase 5 doc inherits this constraint via cross-reference. |
| Schema drift (OI-3.D) confuses Phase 3 implementer who reads Phase 1 first. | Phase 3 doc states the authoritative source is `prisma/schema.prisma`, and provides the concrete field names inline in §Task 3.6 example code. |

---

## 8. Definition of Done

See [`acceptance.md`](./acceptance.md).

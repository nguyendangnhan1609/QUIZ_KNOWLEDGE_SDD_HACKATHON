# Phase 3 Task Breakdown — Acceptance

Date: 2026-05-10  
Slug: `phase-3-task-breakdown`

This deliverable is **documentation only**. Acceptance is verified against the structure, content, and cross-references of the produced files — not by running code.

---

## 1. Files exist

- [ ] `docs/changes/2026-05-10-phase-3-task-breakdown/plan.md`
- [ ] `docs/changes/2026-05-10-phase-3-task-breakdown/acceptance.md`
- [ ] `docs/architecture/phases/phase-3-ai-quiz-generation.md`

---

## 2. Phase 3 doc structure parity

`phase-3-ai-quiz-generation.md` mirrors the section structure of [`phase-2-document-upload-parsing.md`](../../architecture/phases/phase-2-document-upload-parsing.md):

- [ ] §1 Phase Overview (purpose, expected outcome, why future phases depend on this).
- [ ] §2 Setup Goals (≥ 10 checkbox items including the new `QUESTION_BANK_MULTIPLIER` env var).
- [ ] §3 Task Breakdown — exactly **13** tasks numbered 3.0 through 3.12.
- [ ] §4 Recommended Execution Order with dependency graph + rationale + wall-clock estimate.
- [ ] §5 Recommended Git Commit Strategy.
- [ ] §6 Common Phase 3 Pitfalls (table-grouped by category).
- [ ] §7 Definition of Done.
- [ ] §8 Open Issues (catalogues OI-3.A1, OI-3.B1, OI-3.D).

Each task in §3 must include all eight standard fields:

- [ ] Objective
- [ ] Technical Requirements
- [ ] Pitfalls (where relevant)
- [ ] Dependencies
- [ ] Acceptance Criteria
- [ ] Validation Steps
- [ ] Estimated Complexity
- [ ] AI Coding Opportunity

---

## 3. Decisions reflected

### OI-3.A — A3: configurable bank multiplier

- [ ] §1 Phase Overview "Contract" subsection states: bank size = `QUESTION_BANK_MULTIPLIER × questionCount`, default `2`.
- [ ] §2 Setup Goals lists adding `QUESTION_BANK_MULTIPLIER` to `lib/config/env.ts` (server-side env, `z.coerce.number().int().min(1).max(3).default(2)`).
- [ ] §3 Task Breakdown includes the env-var addition as part of the orchestration task (3.5) or a dedicated config sub-step.
- [ ] §3 Task 3.5 (`generateQuestions` orchestration) reads the multiplier from `env.QUESTION_BANK_MULTIPLIER`, not a hardcoded `2`.
- [ ] §3 Task 3.6 (persistence) persists exactly `bankSize = QUESTION_BANK_MULTIPLIER × questionCount` rows.

### OI-3.B — B2: two routes

- [ ] §3 Task 3.8 form lives at `/manager/quizzes/new?documentId=…`, NOT `/manager/new`.
- [ ] No instruction in any task to merge upload + generate onto a single page.

### OI-3.C — C1: trust applied schema

- [ ] §3 Task 3.6 persistence example uses `Question.text`, `Question.orderIndex`, `Question.difficulty`, `Option.text`, `Option.orderIndex`, `Option.isCorrect`.
- [ ] No occurrence of `Question.body`, `Question.displayOrder`, `Option.body` in the doc.
- [ ] References to Document fields use `filename`, `mimeType`, `textContent`, `charCount` (matching schema), not `title` / `uploadedFileName` / `documentType`.

---

## 4. Cross-references resolve

- [ ] Every reference to `technical-design.md §7.X` in the Phase 3 doc points to a real subsection (§7.1 through §7.10).
- [ ] Every reference to `implementation-plan.md §7` is qualified ("locked contract overridden by OI-3.A — see §8") so newcomers don't act on stale content.
- [ ] Cross-link to `prisma/schema.prisma` is present in §Task 3.6.
- [ ] Cross-link to `phase-2-document-upload-parsing.md` is present where Phase 3 depends on Phase 2 outputs.

---

## 5. Open Issues catalogued

§8 of the Phase 3 doc lists exactly these three Open Issues with their full context:

- [ ] **OI-3.A1** — implementation-plan §7 + technical-design §7.1 alignment with the env-multiplier model.
- [ ] **OI-3.B1** — implementation-plan §7 form-route line.
- [ ] **OI-3.D** — Phase 1/Phase 2 task-doc field naming drift vs. applied schema.

Each entry includes: description, affected files, suggested resolution path. None of them blocks Phase 3 execution.

---

## 6. Source files unchanged

- [ ] `git status` shows **no modifications** to `docs/architecture/implementation-plan.md`.
- [ ] `git status` shows **no modifications** to `docs/architecture/technical-design.md`.
- [ ] `git status` shows **no modifications** to `docs/architecture/phases/phase-1-database-infrastructure.md`.
- [ ] `git status` shows **no modifications** to `docs/architecture/phases/phase-2-document-upload-parsing.md`.
- [ ] `git status` shows **no modifications** to any file outside `docs/`.

---

## 7. SDD safety checklist

- [ ] No destructive command suggested in any deliverable file.
- [ ] No code edits executed during this phase of work.
- [ ] All ambiguities surfaced as Open Issues (none silently resolved by guess).
- [ ] User explicitly approved A3 / B2 / C1 prior to file creation.

---

## 8. Definition of Done

This deliverable is complete when **all** boxes in §1–§7 above are ticked AND the user has reviewed `phase-3-ai-quiz-generation.md` end-to-end.

# Acceptance — Apply Review Decisions to Implementation Plan

Date: 2026-05-09
Slug: `2026-05-09-implementation-plan-review-updates`
Affected document: `docs/architecture/implementation-plan.md` → v1.1

## Acceptance criteria

### A — Change A: `questionCount` contract (F1 + Open Q1)

- [x] §7 Phase Goal explicitly states bank size = `2 × questionCount`.
- [x] §7 Validation strategy requires ≥ `2 × questionCount` valid questions; partial publishing forbidden.
- [x] §7 Error recovery includes the pool-shortfall failure path (`502 AI_GEN_FAILED`).
- [x] §7 Acceptance Criteria includes "persists exactly 20 questions when `questionCount = 10`".
- [x] §7 Stub-first step references `2 × questionCount`.

### B — Change B: `questionAccuracy` no-data vs 0% (F2 + Open Q2)

- [x] §10 raw SQL uses `COUNT(aa.id)` and `FILTER (WHERE aa.id IS NOT NULL)` so missing rows yield `correctRate = NULL`.
- [x] §10 `attemptCount` is exposed in the result shape.
- [x] §10 visualizations section instructs UI to render "No attempts yet" muted label when `attemptCount === 0`.
- [x] §10 Acceptance includes the "never shown → 'No attempts yet'" assertion.
- [x] §17 UX checklist item added for the same.

### C — Change C: Phase 0 deliverable/task alignment (F3)

- [x] §2 Phases Overview row for Phase 0 no longer says "green CI".
- [x] §4 Phase 0 Deliverables no longer lists `.env.example`.

### D — Change D: Phase 1 preview seed acceptance dropped (F4 + Open Q4)

- [x] §5 Phase 1 Acceptance no longer references "Vercel preview deployment".
- [x] §5 Phase 1 Acceptance now says "from a local script".

### E — Change E: Single source of truth for randomization (F5 + Open Q3)

- [x] §8 Phase Goal states browser never sees `isCorrect`.
- [x] §8 Tasks: `GET /api/quizzes/[token]` returns the full bank, `isCorrect`-stripped.
- [x] §8 Tasks: `<QuizForm>` (client) runs Fisher-Yates over bank + per-question option shuffle.
- [x] §8 Implementation notes: `Cache-Control: no-store` is on the API; randomization is client-side.
- [x] §8 Acceptance: "exactly questionCount out of `2 × questionCount` bank"; curl + DevTools assertions for `isCorrect` absence.
- [x] §17 Functional checklist updated for bank size and display count.

### F — Change F: Demo strategy is pre-generate (F6)

- [x] §11 Demo prep replaces live-generation with pre-generation.
- [x] §11 Live-generation is now an explicit contingency only.
- [x] §11 Performance pass no longer warms `GET /api/quizzes/{token}`.
- [x] §11 Risks rewritten so primary mitigation is "pre-generated quiz".
- [x] §16.6 Release checklist replaces the warm-up step with a "demo quiz is pre-generated" step + "≥ 3 dummy attempts" item.

### G — F7 verified (no source edit)

- [x] File is valid UTF-8.
- [x] 0 null bytes.
- [x] No BOM.
- [x] Arrows and em-dashes encoded correctly as multibyte UTF-8.
- [x] Reviewer's mojibake is captured as a renderer-side issue in the per-change plan, not a source defect.

### H — Header / version

- [x] Version bumped 1.0 → 1.1.
- [x] Last Updated stays 2026-05-09.

### I — SDD compliance

- [x] Living plan edited in place under `docs/architecture/`.
- [x] Per-change deliverables placed under `docs/changes/2026-05-09-implementation-plan-review-updates/`.
- [x] No spec edits.
- [x] No destructive operations.
- [x] No new dependencies introduced.
- [x] OI-impl.D / E / F catalogued in this folder's `plan.md`.

## Items deliberately left unchanged

- `technical-design.md` is not edited in this phase. The randomization-side change (Change E) creates a divergence with `technical-design.md` §8, captured as **OI-impl.D**. A separate phase should reconcile.
- Prisma schema is not edited. The new contract (`bank = 2 × questionCount`) does not require schema changes — `Quiz.questionCount` already represents the per-attempt count.
- Phase 2 (Upload), Phase 5 (Submission/Scoring), §12–§15 (workflow guidance, testing) are unchanged.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-impl.D | Reconcile `technical-design.md` §8 with client-side randomization decision |
| OI-impl.E | `2 × questionCount` is now part of the contract; revisit if requirement changes |
| OI-impl.F | UX copy for the pool-shortfall error (`502 AI_GEN_FAILED`) |

## Done

All acceptance criteria checked. `docs/architecture/implementation-plan.md` v1.1 is the new execution roadmap, consistent with the user's review decisions.

# Plan — Apply Review Decisions to Implementation Plan

Date: 2026-05-09
Slug: `2026-05-09-implementation-plan-review-updates`
Driver: `docs/architecture/implementation-plan-review.md`
Target: `docs/architecture/implementation-plan.md` → bumped to v1.1

## Goal

Apply every review decision recorded in the review document into the canonical implementation plan, while preserving the existing locked architectural decisions (spec v1.1, technical-design v1.0).

## Decision → change map

| # | Review item | Decision | Change | Sections touched |
|---|---|---|---|---|
| F1 | Phase 3/4/5 contract on `questionCount` | UI inputs `questionCount`; AI generates **exactly `2 × questionCount`** valid questions; bank stored | A | §2 (overview), §7 (Phase 3) |
| F2 | `questionAccuracy` 0% vs no-data | Distinguish `no data` from `0% correct` via `attemptCount` + `FILTER` | B | §10 (Phase 6) |
| F3 | Phase 0 deliverables ≠ tasks | Drop "green CI" + `.env.example` from deliverables/overview | C | §2 (overview), §4 (Phase 0) |
| F4 | Phase 1 acceptance on preview seeded row | Drop the preview-seed acceptance | D | §5 (Phase 1) |
| F5 | Phase 4 duplicate API + page randomization | Server returns full bank (no `isCorrect`); client randomizes selection + option order | E | §8 (Phase 4) |
| F6 | Warm-up targets wrong endpoint | Demo uses **pre-generated** quiz; live AI off the critical path | F | §11 (Phase 7), §16 (release checklist) |
| F7 | Mojibake in user's renderer | Verified: file is clean UTF-8 (48,918 B, 0 null bytes, valid decode). No source change. | (logged) | n/a |

## Concrete edits applied

### Change A — `questionCount` contract (F1 + Open Q1)

- §2 Phases Overview: Phase 0 row deliverable trimmed.
- §7 Phase 3 Goal: now states `quiz.questionCount` is the per-attempt count; bank size = `2 × questionCount`. Generation is **strict**: short pool → fail.
- §7 Tasks: orchestration budget targets `2 × questionCount`; persistence stores all of them; UI form has explicit `questionCount` input (default 10, min 5, max 30).
- §7 Validation strategy: replaced "fail if total < requested * 0.6" with "require ≥ 2 × questionCount, else fail whole request — no partial publish".
- §7 Error recovery table: chunk drops are allowed; pool shortfall returns 502 `AI_GEN_FAILED` with hint to upload a richer doc or lower `questionCount`.
- §7 Acceptance: now explicit "persists exactly 20 questions when questionCount=10".
- §7 Stub-first step says "return `2 × questionCount` hardcoded questions".

### Change B — `questionAccuracy` distinguishes no-data vs 0% (F2 + Open Q2)

- §10 Phase 6 raw SQL replaced with `attemptCount` column + `FILTER (WHERE aa.id IS NOT NULL)` so missing rows produce `correctRate = NULL`.
- Added explanation block under the SQL describing why the shape changed.
- §10 Recommended visualizations: bar component now shows "No attempts yet" muted label when `attemptCount === 0` instead of a 0%-width bar.
- §10 Acceptance: added "a question never shown across the 3 test submissions renders as 'No attempts yet', not '0%'".
- §17 Final MVP Checklist UX section: added bullet to verify the no-data vs 0% distinction.

### Change C — Phase 0 deliverable/task alignment (F3)

- §2 Phases Overview: Phase 0 deliverable column dropped "green CI" → now reads "Running Next.js on Vercel + linked Supabase".
- §4 Phase 0 Deliverables: dropped `.env.example committed with placeholder values`.

### Change D — Phase 1 acceptance no longer references preview seed (F4 + Open Q4)

- §5 Phase 1 Acceptance Criteria: replaced "returns the seeded row from a Vercel preview deployment" with "from a local script returns the locally seeded row".

### Change E — Single source of truth for randomization (F5 + Open Q3)

- §8 Phase 4 Goal: explicit "browser never sees `isCorrect`"; bank held server-side, randomization client-side.
- §8 Tasks rewritten: `GET /api/quizzes/[token]` returns the **full bank** (`2 × questionCount` items) with `isCorrect` stripped; `app/q/[token]/page.tsx` is a thin RSC; `<QuizForm>` (client) does Fisher-Yates over the bank + per-question option shuffle.
- §8 "How randomization works" updated to 3-step client flow.
- §8 Implementation notes: `Cache-Control: no-store` moved to the API; randomization runs client-side; server `findUnique` in page is a 404 gate.
- §8 Acceptance Criteria: added "exactly questionCount questions out of `2 × questionCount` bank"; tightened the no-`isCorrect` check to curl + DevTools.
- §17 Final MVP Checklist Functional section: added bullet about exact bank size and exact display count.

### Change F — Demo strategy: pre-generate, don't warm-up the wrong path (F6)

- §11 Phase 7 Demo prep section: replaced live-generation steps with **pre-generate** strategy; live generation only as contingency, with a corrected warm-up note targeting the upload/generate page (not GET `/api/quizzes/{token}`).
- §11 Phase 7 Performance pass: removed the cold-start warm advice on `GET /api/quizzes/{token}`.
- §11 Phase 7 Risks: rewritten — primary mitigation is "pre-generated quiz puts AI off the critical path".
- §16.6 Release checklist: replaced "Function warmed (one curl to `/api/quizzes/{token}` 2 min before demo)" with explicit "Demo quiz is pre-generated on production" + "≥ 3 dummy attempts already submitted".

### F7 — Encoding verification (no source change)

- Verified `docs/architecture/implementation-plan.md`: 48,918 B, 0 null bytes, valid UTF-8, no BOM. Arrows (`→`) and em-dashes (`—`) present as proper UTF-8 multibyte sequences.
- The mojibake the reviewer observed (`窶・`, `竊・`, `竕･`) is a renderer-side artifact (likely a CP932/Shift-JIS interpretation of UTF-8), not a source defect.
- Recommendation captured here, no edit to the source file. If the AI coding assistant pipeline starts misreading the file, switch the renderer/locale.

### Header bump

- Version: 1.0 → 1.1.
- Last Updated: 2026-05-09 (same day, no change).

## What did NOT change

- Spec v1.1 (untouched).
- `technical-design.md` (untouched in this phase). Note: the F5 decision moves randomization from server-side (per design §8) to client-side. This is captured here as an OI for the technical design to follow up.
- Prisma schema (no change required — `Quiz.questionCount` semantics unchanged).
- API contract shapes (response of `GET /api/quizzes/{token}` always returned a stripped bank; the change is *which side* runs Fisher-Yates).
- `lib/services/attempts.ts` grading logic and identifier-collision handling.
- Phases 2 (upload), 5 (submission), 12–15 (workflow / AI workflow / granularity / testing).

## Open Issues forwarded

- **OI-impl.D** — `technical-design.md` §8 still describes server-side randomization. Either update the design doc to match (preferred) or document the client-side override here as a deliberate divergence. Currently captured in this plan only.
- **OI-impl.E** — Bank persistence size is now part of the public contract (`2 × questionCount`). If a future requirement asks "bank should be 3×" or "configurable", revisit and update both this plan and the design.
- **OI-impl.F** — The pool shortfall error path (`502 AI_GEN_FAILED` when validated questions < `2 × questionCount`) needs UX copy. Default placeholder: "Couldn't generate enough questions. Try a longer document or lower the question count."

## Files

- Updated: `docs/architecture/implementation-plan.md` (§2, §4, §5, §7, §8, §10, §11, §16, §17; version → 1.1)
- Created: `docs/changes/2026-05-09-implementation-plan-review-updates/plan.md` (this file)
- Created: `docs/changes/2026-05-09-implementation-plan-review-updates/acceptance.md`

## Spec impact

None. Spec v1.1 unchanged.

## Checkpoints

- [x] All 7 review findings addressed (F1–F6 applied as edits; F7 verified)
- [x] All 4 Open Questions answered in the plan text
- [x] No new dependencies introduced
- [x] No edits to spec
- [x] No destructive operations
- [x] OI-impl.D / E / F catalogued
- [x] plan.md written
- [x] acceptance.md written

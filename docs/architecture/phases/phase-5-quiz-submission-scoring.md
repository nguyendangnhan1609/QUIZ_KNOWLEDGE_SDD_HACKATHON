# Phase 5 - Quiz Submission & Scoring (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, Section 9  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, Sections 1.3, 8.3, 8.4, 9.4, 12  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1  
Authoritative schema: [`quiz-knowledge/prisma/schema.prisma`](../../../quiz-knowledge/prisma/schema.prisma)

This is the executable task list for Phase 5. Each task is sized to be a single AI prompt or a single 30-60 minute block of work.

> **Read Section 8 Open Issues before starting.** This phase intentionally updates the older "submit by `publicToken` only" flow. Because Phase 4 now issues persisted `QuizSession` records, scoring must happen against the issued session, not against a fresh quiz lookup that may no longer match what the participant saw.

---

## 1. Phase Overview

### Purpose

Turn a live participant quiz session into a persisted scored attempt that:

- validates the submitted answers against the issued session,
- scores server-side only,
- handles anonymous identifiers safely,
- persists `Attempt` and `AttemptAnswer` rows transactionally,
- returns a clean submission result for the participant UI.

Phase 5 is about **trusted scoring and durable attempt storage**. It should consume the Phase 4 session contract exactly as issued. No re-randomization, no client-side grading, no dependency on browser memory.

### Expected outcome

After Phase 5:

- A participant can submit a completed or partially answered quiz session.
- The server validates the submission against the stored `QuizSession`.
- The score is derived from the server-side answer mapping, not from client claims.
- The system persists one `Attempt` row and one `AttemptAnswer` row per issued question.
- Duplicate identifiers on the same quiz succeed via one timestamp-suffix retry.
- The participant is redirected to `/quiz/<publicToken>/done` and sees the final score.
- `/q/<publicToken>/done` remains available as a compatibility redirect.

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Submission identifier | `sessionToken` | Score the exact issued session, not a reloaded quiz |
| Public route after submit | `/quiz/[token]/done` | Aligns with Phase 4 canonical route |
| Legacy route support | `/q/[token]/done` redirects to `/quiz/[token]/done` | Existing links should not break |
| Grading truth | Persisted session payload from Phase 4 | Stable, server-side, not client-controlled |
| Answer identity | `questionId` + `selectedOptionId` | Stable IDs survive shuffle |
| Unanswered question | `selectedOptionId: null` | Counted wrong, not rejected |
| Identifier uniqueness | `@@unique([quizId, identifier])` on `Attempt` | Prevents ambiguous analytics rows |
| Collision strategy | One retry with `_yyyyMMddHHmmss` suffix | Lightweight, deterministic MVP behavior |
| Persistence boundary | One Prisma transaction | Avoid partial attempts |
| Cache policy | `no-store` for submit responses | Avoid stale retry artifacts |

### Phase 5 architecture decision

The older implementation plan and technical design described this submit flow:

1. client sends `publicToken`,
2. server resolves quiz,
3. server validates answers against quiz rows,
4. server scores by joining `Option.isCorrect`.

This Phase 5 document replaces that with:

1. client sends `sessionToken`,
2. server resolves the issued `QuizSession`,
3. server validates submitted answers against that session payload,
4. server scores against the session's stored correct mapping,
5. server persists the attempt rows against `quizId`.

That is the correct follow-on from Phase 4 because it:

- scores the exact question subset and option order the participant saw,
- prevents refresh / reroll mismatch bugs,
- keeps the submit payload small,
- gives Phase 6 analytics a clean "what was shown vs what was answered" story.

### Submission payload shape

Use types under `src/types/attempt`.

```ts
export type SubmittedAnswer = {
  questionId: number;
  selectedOptionId: number | null;
};

export type SubmitAttemptInput = {
  sessionToken: string;
  identifier: string;
  answers: SubmittedAnswer[];
};

export type SubmitAttemptResult = {
  attemptId: number;
  quizId: number;
  publicToken: string;
  score: number;
  total: number;
  identifier: string;
};
```

### Why this setup matters for future phases

- **Phase 6 (Analytics Dashboard)** can trust the `attempt_answers` rows because they refer to the exact issued session questions.
- **Phase 7 (Demo prep)** benefits from stable retake behavior and predictable done-page URLs.
- **Future anti-cheating work** can build on `sessionToken` without redesigning the submit contract.

---

## 2. Setup Goals

- [ ] Create a dedicated submission domain under `src/services/attempt`.
- [ ] Create pure scoring helpers under `src/services/scoring`.
- [ ] Add `src/types/attempt` for submission and result contracts.
- [ ] Add `submitAttemptSchema` using `sessionToken`, `identifier`, and `answers[]`.
- [ ] Implement one trusted submission service that validates, scores, and persists in one flow.
- [ ] Add identifier collision retry logic using a timestamp suffix.
- [ ] Add `/quiz/[token]/done` result page and `/q/[token]/done` compatibility redirect.
- [ ] Add tests for answer validation, scoring integrity, invalid session handling, and collision handling.

---

## 3. Target Folder Structure

This phase should keep submission, scoring, and done-page concerns separate.

```text
quiz-knowledge/
  src/
    services/
      attempt/
        submit-attempt.ts
        validate-submission.ts
        persist-attempt.ts
        identifier-collision.ts
      scoring/
        score-session-answers.ts
        answer-maps.ts
    app/
      api/
        attempts/
          route.ts
      quiz/
        [token]/
          done/
            page.tsx
      q/
        [token]/
          done/
            page.tsx      # compatibility redirect
    types/
      attempt/
        submission.ts
        result.ts
    lib/
      utils/
        timestamp.ts
      session/
        session-submit-guards.ts
```

### Folder rules

- `src/services/attempt` owns orchestration, validation, collision handling, and persistence.
- `src/services/scoring` owns pure scoring logic only.
- `src/lib/session` owns reusable session-shape guards that protect submit-time validation.
- `src/app/api/attempts/route.ts` stays thin and HTTP-only.
- The done page should render results only. It should not try to re-grade or re-read full session payloads.

---

## 4. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 5.1 - Design Submission & Scoring Architecture

**Objective.** Lock the submission contract so the team does not mix quiz-level validation, session-level validation, and client-reported scoring.

**Technical Requirements.**

Document and implement the following architecture decisions:

- **Submission strategy:** submit against `sessionToken`, not `publicToken`.
- **Validation strategy:** validate answers against the persisted Phase 4 session payload.
- **Scoring strategy:** score from server-side correct mapping only.
- **Persistence strategy:** persist `Attempt` and `AttemptAnswer[]` in one transaction.
- **Result strategy:** return a small payload for the done page and future analytics.

Scoring lifecycle:

1. Participant submits `sessionToken`, `identifier`, and `answers[]`.
2. Server resolves the session and associated `quizId`.
3. Server validates question and option membership against the issued session.
4. Server computes `score`.
5. Server inserts `Attempt`.
6. Server inserts `AttemptAnswer` rows for every issued question.
7. Server returns `{ attemptId, score, total, identifier, publicToken }`.

Do not let the API trust:

- answer count claimed by the client without verifying session size,
- `publicToken` as the scoring root,
- option correctness from the browser,
- client-side "all answered" state.

**Dependencies.**

- Phase 4 complete with persisted `QuizSession`.

**Acceptance Criteria.**

- The team agrees that scoring is session-based.
- The submission flow is defined end-to-end before coding.
- Layer separation is explicit:
  - submission layer,
  - validation layer,
  - scoring layer,
  - persistence layer,
  - API layer,
  - result UI layer.

**Validation Steps.**

1. Walk the flow for:
   - normal submit,
   - tampered payload,
   - duplicate identifier,
   - partially unanswered submit.
2. Verify all four scenarios have deterministic server behavior.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Medium. AI can draft the service skeletons, but the contract should be human-locked first.

---

### Task 5.2 - Define Submission API Contract

**Objective.** Standardize the request and response payloads for `POST /api/attempts`.

**Technical Requirements.**

Create the canonical request contract:

```ts
const submitAttemptSchema = z.object({
  sessionToken: z.string().min(10),
  identifier: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\p{L}0-9 ._-]+$/u),
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      selectedOptionId: z.number().int().positive().nullable(),
    }),
  ),
});
```

Response contract:

```json
{
  "data": {
    "attemptId": 501,
    "publicToken": "cuid2...",
    "score": 7,
    "total": 10,
    "identifier": "nd_thanh"
  }
}
```

Error contract:

- `400 INVALID_INPUT`
- `400 ANSWER_COUNT_MISMATCH`
- `404 QUIZ_SESSION_NOT_FOUND`
- `410 QUIZ_SESSION_EXPIRED`
- `409 ATTEMPT_PERSIST_FAILED`
- `500 INTERNAL`

This phase supersedes the older `publicToken`-based submit body. Do not keep both contracts active unless there is a deliberate migration shim.

**Dependencies.**

- Task 5.1 contract decision.

**Acceptance Criteria.**

- The request schema uses `sessionToken`.
- `identifier` is trimmed and regex-validated.
- `selectedOptionId` may be `null`.
- The response contains only result fields needed by the UI.

**Validation Steps.**

1. Parse a valid payload with one unanswered question.
2. Reject an empty identifier.
3. Reject invalid characters in identifier.
4. Reject missing `sessionToken`.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. This is mostly mechanical schema work.

---

### Task 5.3 - Implement Session Submission Validation Service

**Objective.** Validate that a submit payload refers to the exact issued session and only to the questions/options it contains.

**Technical Requirements.**

Create `src/services/attempt/validate-submission.ts`.

Validation rules:

- `sessionToken` resolves to an existing `QuizSession`.
- Session is not expired.
- Session is not already completed if Phase 4 persisted `completedAt`.
- `answers.length === session.questionCount`.
- Submitted `questionId`s exactly match the issued session questions.
- No duplicate `questionId` in the submission.
- `selectedOptionId`, when present, belongs to the corresponding issued question.

Recommended service output:

```ts
type ValidatedSubmission = {
  quizId: number;
  publicToken: string;
  questionCount: number;
  sessionToken: string;
  sessionQuestions: Array<{
    questionId: number;
    correctOptionId?: number;
    correctAnswerIndex: number;
    options: Array<{ optionId: number; text: string }>;
  }>;
  normalizedAnswers: Array<{
    questionId: number;
    selectedOptionId: number | null;
  }>;
};
```

Implementation notes:

- Build maps once:
  - `questionId -> session question`
  - `questionId -> allowed optionIds`
- Normalize unanswered questions to explicit `selectedOptionId: null`.
- Reject impossible states early with typed `AppError`s.

Do not validate against the full quiz bank. Validate against the issued session only.

**Dependencies.**

- Task 5.2 submit schema.
- Phase 4 session payload contract.

**Acceptance Criteria.**

- Tampered `questionId` is rejected.
- Tampered `selectedOptionId` is rejected.
- Duplicate `questionId` is rejected.
- Unanswered questions are allowed when count and membership are otherwise valid.

**Validation Steps.**

1. Submit a valid answer set -> validation passes.
2. Replace one `questionId` with another quiz's question -> 400.
3. Reuse the same `questionId` twice -> 400.
4. Set one `selectedOptionId` to an option from a different question -> 400.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. This is map-based validation logic with clear rules.

---

### Task 5.4 - Implement Server-Side Scoring Engine

**Objective.** Score answers using the server-side session mapping, never browser state.

**Technical Requirements.**

Create `src/services/scoring/score-session-answers.ts`.

Recommended signature:

```ts
type ScoreInput = {
  sessionQuestions: Array<{
    questionId: number;
    correctOptionId?: number;
    correctAnswerIndex: number;
    options: Array<{ optionId: number; text: string }>;
  }>;
  answers: Array<{
    questionId: number;
    selectedOptionId: number | null;
  }>;
};

type ScoreResult = {
  score: number;
  total: number;
  gradedAnswers: Array<{
    questionId: number;
    selectedOptionId: number | null;
    isCorrect: boolean;
  }>;
};
```

Scoring rules:

- If `selectedOptionId` is `null`, `isCorrect = false`.
- If `selectedOptionId === correctOptionId`, `isCorrect = true`.
- Otherwise `isCorrect = false`.
- `total = session.questionCount`.

Do not re-query `Option.isCorrect` in the happy path if the session already stores the answer mapping. Phase 4 persisted that specifically to avoid drift.

If the session payload stores only `correctAnswerIndex`, derive `correctOptionId` once from the stored option order before grading.

**Dependencies.**

- Task 5.3 validated submission output.

**Acceptance Criteria.**

- All-correct submission scores full marks.
- All-wrong scores zero.
- Partial and unanswered submissions score correctly.
- Grading logic is pure and deterministic.

**Validation Steps.**

1. Run against a fixture session with known answers.
2. Verify `score`, `total`, and per-answer `isCorrect`.
3. Temporarily scramble one expected correct option and confirm the test fails.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Pure scoring logic plus tests is ideal AI work.

---

### Task 5.5 - Implement Identifier Collision Handling

**Objective.** Ensure anonymous participants can reuse the same displayed identifier without breaking persistence.

**Technical Requirements.**

Create:

- `src/services/attempt/identifier-collision.ts`
- `src/lib/utils/timestamp.ts`

Timestamp helper contract:

```ts
export function formatYmdHms(date: Date): string {
  // yyyyMMddHHmmss
}
```

Collision handling rules:

- First insert attempt uses the raw identifier.
- If Prisma unique violation occurs on `(quizId, identifier)`:
  - append `_yyyyMMddHHmmss`,
  - retry once.
- If the second insert also collides:
  - throw `ATTEMPT_PERSIST_FAILED` with 409.

Do not:

- pre-check in application code and trust it,
- loop forever,
- append random suffixes,
- mutate the identifier before the first insert.

Database uniqueness must remain the source of truth.

**Dependencies.**

- Existing `Attempt @@unique([quizId, identifier])`.

**Acceptance Criteria.**

- First submit with an identifier persists unchanged.
- Second submit on the same quiz with the same identifier succeeds with suffix.
- One retry only.
- Collision logic is isolated, not duplicated inside the main service.

**Validation Steps.**

1. Submit twice with the same identifier.
2. Confirm the second stored identifier ends with `_yyyyMMddHHmmss`.
3. Simulate a second-collision path in tests and confirm 409.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** Medium. AI can code it quickly, but the "one retry only" rule must be enforced.

---

### Task 5.6 - Persist Attempt Transactionally

**Objective.** Persist the scored attempt and per-question answers as one atomic write.

**Technical Requirements.**

Create `src/services/attempt/persist-attempt.ts`.

Persistence rules:

- Insert one `Attempt` row:
  - `quizId`
  - final `identifier`
  - `score`
  - `totalQuestions`
- Insert one `AttemptAnswer` row per issued question:
  - `attemptId`
  - `questionId`
  - `selectedOptionId`
  - `isCorrect`
- Use a single Prisma `$transaction`.
- If Phase 4 added `QuizSession.completedAt`, set it inside the same transaction.

Recommended flow:

```ts
await prisma.$transaction(async (tx) => {
  const attempt = await createAttemptWithCollisionHandling(tx, ...);

  await tx.attemptAnswer.createMany({
    data: gradedAnswers.map((answer) => ({
      attemptId: attempt.id,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
    })),
  });

  await tx.quizSession.update(...optional completion mark...);

  return attempt;
});
```

Implementation note:

- `createMany` is fine here because `attemptId` is known after the first insert.
- Every issued session question must produce one `AttemptAnswer` row, even if unanswered.

**Dependencies.**

- Task 5.4 scoring output.
- Task 5.5 collision handling.

**Acceptance Criteria.**

- Exactly one `Attempt` row is created per successful submit.
- Exactly `session.questionCount` `AttemptAnswer` rows are created.
- Unanswered questions persist with `selectedOptionId: null`.
- Failed persistence does not leave partial rows behind.

**Validation Steps.**

1. Submit a valid attempt and inspect DB rows.
2. Count `attempt_answers` for the new attempt -> equals total questions.
3. Force a failure inside the transaction and confirm rollback.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Standard Prisma transaction work.

---

### Task 5.7 - Create Attempt Submission Service

**Objective.** Compose validation, scoring, collision handling, and persistence into one trusted application service.

**Technical Requirements.**

Create `src/services/attempt/submit-attempt.ts`.

Service responsibilities:

- parse normalized input from the route,
- validate session and answers,
- score the answers,
- persist the attempt,
- return a small result payload.

Recommended service output:

```ts
type SubmitAttemptServiceResult = {
  attemptId: number;
  publicToken: string;
  score: number;
  total: number;
  identifier: string;
};
```

This service should be the only place that orchestrates:

- session lookup,
- membership validation,
- scoring,
- persistence.

The route handler should not know how any of those pieces work.

**Dependencies.**

- Tasks 5.3 through 5.6.

**Acceptance Criteria.**

- One service call handles the full happy path.
- The service returns the final stored identifier.
- The service never trusts correctness from the browser.
- All major failure modes map cleanly to typed errors.

**Validation Steps.**

1. Call the service from a temporary script with a known session fixture.
2. Confirm score and returned identifier.
3. Tamper the payload and confirm the service throws the expected `AppError`.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Good orchestration target once the helper APIs are fixed.

---

### Task 5.8 - Implement Submission API Route

**Objective.** Expose the submission flow as a thin HTTP endpoint.

**Technical Requirements.**

Create `src/app/api/attempts/route.ts`.

Handler behavior:

1. Parse JSON body.
2. Validate with `submitAttemptSchema`.
3. Call `submitAttempt`.
4. Return `201 { data: ... }`.
5. Map errors via the shared error helper.
6. Set `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.

Route file should stay small. No grading, validation maps, or collision logic belongs here.

Response example:

```json
{
  "data": {
    "attemptId": 501,
    "publicToken": "cuid2...",
    "score": 7,
    "total": 10,
    "identifier": "nd_thanh_20260510114521"
  }
}
```

**Dependencies.**

- Task 5.2 schema.
- Task 5.7 submission service.

**Acceptance Criteria.**

- Valid submission returns 201 with result payload.
- Invalid submission returns typed 4xx errors.
- Route stays thin and service-driven.

**Validation Steps.**

1. `POST /api/attempts` with valid payload -> 201.
2. Missing `sessionToken` -> 400.
3. Expired session -> 410.
4. Simulated persistence collision failure after retry -> 409.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Thin route handlers are efficient AI work.

---

### Task 5.9 - Wire Quiz Client Submission Flow

**Objective.** Connect the participant quiz UI to the new submit contract without leaking scoring logic into the client.

**Technical Requirements.**

Update the Phase 4 client quiz component so it:

- reads `sessionToken` from the restored session payload,
- builds `answers[]` from local state,
- sends unanswered questions as `selectedOptionId: null`,
- disables duplicate submit while pending,
- handles API errors cleanly,
- redirects to the canonical done route on success.

Recommended submit payload:

```ts
{
  sessionToken,
  identifier,
  answers: questions.map((q) => ({
    questionId: q.questionId,
    selectedOptionId: selectedAnswers[q.questionId] ?? null,
  })),
}
```

Client rules:

- Never compute score client-side.
- Never infer correct answers.
- Clear or archive local session state after successful submit.
- Preserve pending state during request.

**Dependencies.**

- Phase 4 client state and session restoration.
- Task 5.8 submission API.

**Acceptance Criteria.**

- Client submits the exact issued questions in display order or normalized question order.
- Pending submit cannot be double-clicked into duplicate requests.
- Successful submit redirects to `/quiz/[token]/done?...`.
- Client does not attempt to grade locally.

**Validation Steps.**

1. Submit a valid attempt from the browser.
2. Double-click submit -> still one durable attempt.
3. Inspect Network tab -> request contains `sessionToken`, `identifier`, `answers[]`, not correctness fields.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Mostly form submission wiring and pending-state handling.

---

### Task 5.10 - Build Submission Result Route

**Objective.** Show the participant a clean post-submit score screen without re-scoring on the page load.

**Technical Requirements.**

Create:

- `src/app/quiz/[token]/done/page.tsx`
- `src/app/q/[token]/done/page.tsx` redirect compatibility if `/q/` still exists

Result-page behavior:

- Read result data from query string or server-friendly search params:
  - `score`
  - `total`
  - `identifier`
- Render a compact score summary.
- Show the final stored identifier so collision suffix behavior is visible.
- Include a lightweight message for anonymous participants such as "Your attempt has been recorded."

Do not:

- re-grade from DB,
- load the full session,
- show per-question correctness in Phase 5,
- add analytics widgets.

This page is confirmation only.

**Dependencies.**

- Task 5.9 client redirect.

**Acceptance Criteria.**

- Successful submit lands on `/quiz/[token]/done`.
- The page shows score, total, and final identifier.
- `/q/[token]/done` redirects to the canonical route.
- Reloading the done page does not require a re-submit.

**Validation Steps.**

1. Submit from the quiz UI -> lands on done page.
2. Verify displayed score matches API response.
3. Visit `/q/<token>/done?...` -> redirected to `/quiz/<token>/done?...`.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Small route and simple UI.

---

### Task 5.11 - Add Submission & Scoring Validation Tests

**Objective.** Cover the logic most likely to fail silently: session validation, grading correctness, unanswered handling, and identifier collisions.

**Technical Requirements.**

Add tests for:

- **Session validation**
  - invalid `sessionToken`,
  - expired session,
  - wrong `questionId`,
  - wrong `selectedOptionId`,
  - duplicate `questionId`.
- **Scoring integrity**
  - all correct,
  - all wrong,
  - partial,
  - unanswered counted wrong.
- **Collision handling**
  - second identical identifier gets suffixed,
  - second collision returns 409.
- **Persistence shape**
  - one `AttemptAnswer` per session question.

Recommended test files:

- `quiz-knowledge/src/services/attempt/validate-submission.test.ts`
- `quiz-knowledge/src/services/scoring/score-session-answers.test.ts`
- `quiz-knowledge/src/services/attempt/identifier-collision.test.ts`
- `quiz-knowledge/src/services/attempt/submit-attempt.test.ts`

Prefer service-level tests plus a small route smoke test if the repo already has a route-test pattern.

**Dependencies.**

- Tasks 5.3 through 5.8.

**Acceptance Criteria.**

- Validation logic is covered.
- Scoring logic is covered.
- Collision path is covered.
- Happy path and failure path both exist for each critical helper.

**Validation Steps.**

1. `pnpm test` -> green.
2. Temporarily break unanswered handling -> scoring test fails.
3. Temporarily remove the collision retry -> collision test fails.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Pure tests plus mocked persistence are strong AI tasks.

---

### Task 5.12 - Final Phase Verification & Commit

**Objective.** Run the full Phase 5 verification pass, fix remaining issues, and commit the scoring flow cleanly.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Open a valid quiz session | quiz renders normally |
| 2 | Submit all-correct answers | score equals total |
| 3 | Submit all-wrong answers | score equals 0 |
| 4 | Submit with one unanswered question | request succeeds, unanswered counted wrong |
| 5 | Submit same identifier twice on same quiz | second attempt stored with timestamp suffix |
| 6 | Tamper payload questionId | 400 |
| 7 | Tamper payload selectedOptionId | 400 |
| 8 | Expire session and submit | 410 |
| 9 | Check DB rows | one attempt row + `totalQuestions` answer rows |
| 10 | Check done route | score and final identifier displayed |
| 11 | Check `/q/<token>/done` | redirects to `/quiz/<token>/done` |

Automated validation before commit:

```bash
pnpm prisma generate
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

Commit strategy:

```text
feat(5): add submit attempt schema and session-based contract
feat(5): add submission validation and scoring services
feat(5): add identifier collision handling and timestamp helper
feat(5): persist attempts and attempt answers transactionally
feat(5): add attempts api route
feat(5): wire quiz client submit flow and done route
test(5): add submission and scoring validation tests
chore(5): phase 5 complete - attempts scoring working
```

Branch:

- `feat/5-quiz-submission-scoring`

PR title:

- `Phase 5: Quiz Submission & Scoring`

**Dependencies.**

- Tasks 5.1 through 5.11.

**Acceptance Criteria.**

- Manual QA checklist passes.
- All five validation commands pass.
- Score returned by the API matches the persisted attempt rows.
- Done page works on the canonical route and compatibility route.

**Validation Steps.**

1. Run automated checks.
2. Run the manual checklist end-to-end.
3. Verify the branch does not accidentally include Phase 6 analytics work.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Low to Medium. AI is useful for fixing final failures and drafting the PR summary, but final verification is manual.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **5.1 Architecture first**  
   Lock the session-based submit contract.
2. **5.2 Submit schema**  
   Freeze the request/response shape.
3. **5.3 Submission validation**  
   Ensure only valid session answers reach scoring.
4. **5.4 Scoring engine**  
   Build pure scoring logic early.
5. **5.5 Collision handling**  
   Isolate the DB-uniqueness behavior.
6. **5.6 Persistence**  
   Transactional write path.
7. **5.7 Orchestration service**  
   Compose validation, scoring, and persistence.
8. **5.8 API route**  
   Thin wrapper over the service.
9. **5.9 Client submit flow**  
   Wire the participant UI.
10. **5.10 Done route**  
    Confirmation UI only.
11. **5.11 Tests**  
    Lock down silent-failure paths.
12. **5.12 Final verification**  
    Manual QA and commit discipline.

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 5.1 | 25 min |
| 5.2 | 20 min |
| 5.3 | 45 min |
| 5.4 | 35 min |
| 5.5 | 25 min |
| 5.6 | 40 min |
| 5.7 | 35 min |
| 5.8 | 20 min |
| 5.9 | 45 min |
| 5.10 | 20 min |
| 5.11 | 60 min |
| 5.12 | 45 min |
| **Total** | **~415 min (~7 h)** |

Two-person parallel split:

- Engineer A: 5.1 -> 5.2 -> 5.3 -> 5.4 -> 5.7 -> 5.8
- Engineer B: 5.5 -> 5.6 -> 5.9 -> 5.10
- Rejoin on 5.11 -> 5.12

That keeps wall-clock around 4.5-5.5 hours.

---

## 6. Common Phase 5 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Scoring by `publicToken` instead of `sessionToken` | Participant may be graded against a different question set than they saw | Resolve and validate the persisted session |
| Trusting client "all answered" state | Browser state can be stale or tampered | Server validates answer count and membership |
| Re-querying the full bank at submit time | Couples scoring to mutable quiz state | Score against the issued session payload |
| Dropping unanswered questions | Analytics become inconsistent later | Persist one `AttemptAnswer` per issued question |
| Pre-checking identifier uniqueness only in app code | Race condition under concurrent submits | Let the DB UNIQUE constraint enforce truth |
| Retrying collision indefinitely | Hard-to-debug duplicate-attempt behavior | One retry only with deterministic suffix |
| Re-grading on the done page | Unnecessary DB work and new inconsistency risk | Render from returned result params only |
| Mixing validation and persistence in the route | Hard-to-test handler and logic duplication | Keep the route thin and service-driven |

---

## 7. Definition of Done

Phase 5 is complete when all of the following are true:

### Code

- [ ] `src/services/attempt` exists and owns submission orchestration.
- [ ] `src/services/scoring` exists and owns pure scoring logic.
- [ ] `src/types/attempt` exists for request and result contracts.
- [ ] `src/app/api/attempts/route.ts` exists and is thin.
- [ ] `src/app/quiz/[token]/done/page.tsx` exists and renders submission result.
- [ ] `src/lib/utils/timestamp.ts` exists and is reused by collision handling.

### Functionality

- [ ] Submitting a valid session persists one `Attempt`.
- [ ] Exactly one `AttemptAnswer` row is persisted per issued question.
- [ ] All-correct answers score full marks.
- [ ] All-wrong answers score zero.
- [ ] Unanswered questions are accepted and counted wrong.
- [ ] Invalid `questionId` or `selectedOptionId` is rejected with 400.
- [ ] Duplicate identifiers are resolved with one timestamp suffix retry.
- [ ] Expired or missing sessions are rejected cleanly.
- [ ] Successful submit redirects to `/quiz/[token]/done`.
- [ ] `/q/[token]/done` redirects to the canonical route.

### Non-functional

- [ ] Submission uses one validation/scoring flow and one transaction boundary.
- [ ] The browser never computes or receives correctness data from the submit API.
- [ ] No auth, Redis, websockets, or enterprise extras were introduced.

### Tests

- [ ] Session validation tests pass.
- [ ] Scoring integrity tests pass.
- [ ] Collision handling tests pass.
- [ ] Submission service tests pass.

### Repo hygiene

- [ ] Validation commands pass: `prisma generate`, `tsc`, `lint`, `test`, `build`.
- [ ] Commits follow `feat(5):`, `test(5):`, `chore(5):`.
- [ ] Branch `feat/5-quiz-submission-scoring` is ready to merge.

When everything above is true, move to **Phase 6 - Analytics Dashboard**.

---

## 8. Open Issues

These are documentation and implementation drift items surfaced while defining this phase.

### OI-5.A - `publicToken` submit contract in older docs

- **Description.** Older source docs still describe `POST /api/attempts` using `{ publicToken, identifier, answers[] }`.
- **Decision for Phase 5.** Superseded. Submit uses `{ sessionToken, identifier, answers[] }`.
- **Why.** Phase 4 now persists the issued session, so scoring should target the issued session, not a fresh quiz lookup.

### OI-5.B - `correctOptionId` in session payload

- **Description.** Phase 4 stores `correctAnswerIndex` and `originalCorrectAnswer` as server-only fields, but scoring is simpler if `correctOptionId` is also stored.
- **Decision for Phase 5.** Either persist `correctOptionId` in the session payload or derive it once from `correctAnswerIndex` before scoring. Do not re-query the full bank unless absolutely necessary.
- **Follow-up.** If Phase 4 implementation omitted `correctOptionId`, add the derivation helper under `src/services/scoring/answer-maps.ts`.

### OI-5.C - Repeat submit for the same session

- **Description.** A participant may try to submit the same session twice via back button or replayed request.
- **Decision for Phase 5.** Prefer marking the session completed inside the transaction and rejecting second submit attempts. If the team defers that guard, document the residual risk explicitly.


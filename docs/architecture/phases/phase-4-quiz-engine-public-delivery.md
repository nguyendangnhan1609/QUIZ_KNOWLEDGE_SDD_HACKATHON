# Phase 4 - Quiz Engine & Public Quiz Delivery (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, Section 8  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, Sections 1.3, 8, 9.3  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1  
Authoritative schema: [`quiz-knowledge/prisma/schema.prisma`](../../../quiz-knowledge/prisma/schema.prisma)

This is the executable task list for Phase 4. Each task is sized to be a single AI prompt or a single 30-60 minute block of work.

> **Read Section 8 Open Issues before starting.** This phase intentionally supersedes the older "send the full bank to the browser and randomize there" approach. That earlier model is cheaper to wire, but it is weaker on grading integrity, payload size, session stability, and future analytics.

---

## 1. Phase Overview

### Purpose

Turn the Phase 3 quiz bank into a stable public quiz experience that:

- resolves a public token into a live participant session,
- randomizes questions and answer order per participant session,
- keeps grading truth server-side,
- supports anonymous participants without auth,
- stays lightweight enough for hackathon delivery.

Phase 4 is about **delivery integrity**, not scoring. Submission persistence and grading stay in Phase 5. The output of this phase is a participant-facing quiz route that reliably serves a unique, stable, restorable session payload.

### Expected outcome

After Phase 4:

- A quiz generated in Phase 3 can be opened at `/quiz/<publicToken>`.
- The first visit creates a `QuizSession` record with a non-guessable `sessionToken`.
- The session contains exactly `quiz.questionCount` unique questions selected from the stored bank.
- Each selected question has 4 shuffled options.
- The browser receives only the public session payload; it never receives `isCorrect`, `correctAnswerIndex`, `correctOptionId`, or the unused bank questions.
- Refreshing the same browser tab restores the same session via local persistence instead of silently re-randomizing.
- Opening the same public link in another browser or incognito window creates a different session most of the time.
- The UI works on desktop and mobile, and invalid / empty quiz states fail cleanly.

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Public quiz identifier | Reuse `Quiz.publicToken` from Phase 3 | Stable share link; no token churn |
| Canonical public route | `/quiz/[token]` | Clear public URL for participants |
| Legacy compatibility | `/q/[token]` redirects to `/quiz/[token]` | Existing Phase 3 links must not break |
| Session identifier | New `sessionToken` per participant session via `cuid2()` | Non-guessable, session-specific payload retrieval |
| Session persistence | New `quiz_sessions` table with JSON payload | Lightweight, server-trustworthy, future Phase 5 input |
| Randomization location | Server-side only | Keeps correctness private and payload smaller |
| Returned payload | Only the selected session questions and shuffled options | Avoids leaking the full bank |
| Grading truth | Stored in session JSON as server-only answer mapping | Future scoring can trust the issued session |
| Refresh behavior | Restore prior session when `sessionToken` exists locally and is valid | Prevents refresh-based rerolling |
| Session TTL | 24 hours default, cleanup deferred | Enough for MVP retry / resume without long-lived state |
| Cache policy | `dynamic = 'force-dynamic'` + `Cache-Control: no-store` | No stale or mixed token/session payloads |

### Phase 4 architecture decision

The implementation plan and technical design originally described this flow:

1. server returns the full bank,
2. client picks a subset,
3. client shuffles options.

This Phase 4 document replaces that with:

1. server validates `publicToken`,
2. server creates or restores a `QuizSession`,
3. server randomizes the selected questions and options,
4. server stores the grading map in the session record,
5. client receives only the issued session payload.

That is the better MVP for this project because it:

- preserves grading integrity without extra infrastructure,
- reduces payload size,
- supports unique participant sessions,
- gives Phase 5 a clean contract for submit / score,
- gives Phase 6 a clean contract for "what was actually shown".

### Session payload shape

Use separate internal and public types under `src/types/quiz`.

```ts
export type QuizSessionQuestion = {
  questionId: number;
  question: string;
  options: Array<{ optionId: number; text: string }>;
  correctAnswerIndex: number; // server-only
  originalCorrectAnswer: string; // server-only
};

export type QuizSessionPayload = {
  sessionToken: string;
  quizId: number;
  publicToken: string;
  questionCount: number;
  expiresAt: string;
  questions: QuizSessionQuestion[];
};

export type PublicQuizSessionPayload = {
  sessionToken: string;
  quizId: number;
  publicToken: string;
  questionCount: number;
  expiresAt: string;
  questions: Array<{
    questionId: number;
    question: string;
    options: Array<{ optionId: number; text: string }>;
  }>;
};
```

`correctAnswerIndex` and `originalCorrectAnswer` exist only in the persisted session payload or server memory. They are never serialized into the HTTP response.

### Why this setup matters for future phases

- **Phase 5 (Submission & Scoring)** can submit `sessionToken` plus selected `optionId`s and score against the issued session, not against whatever the client claims it saw.
- **Phase 6 (Analytics)** can distinguish "question exists in the bank" from "question was shown in this session."
- **Phase 7 (Demo prep)** benefits from stable refresh / resume behavior instead of accidental rerolls mid-demo.
- **Payload discipline now prevents future churn.** If the client learns to depend on the full bank today, Phase 5 has to unwind that coupling later.

---

## 2. Setup Goals

- [ ] Add a lightweight `QuizSession` persistence model and migration.
- [ ] Standardize the canonical public route to `src/app/quiz/[token]`.
- [ ] Preserve existing Phase 3 public links via `/q/[token]` redirect compatibility.
- [ ] Create a dedicated quiz delivery domain under `src/services/quiz`.
- [ ] Create pure randomization helpers under `src/services/randomization`.
- [ ] Create shared session helpers under `src/lib/session`.
- [ ] Return only selected session questions to the browser.
- [ ] Add local session restoration so refresh does not silently reshuffle.
- [ ] Add validation guards for malformed sessions and invalid browser state.
- [ ] Add focused tests for randomization, token validation, and session integrity.

---

## 3. Target Folder Structure

This phase should introduce a clean public-delivery structure without polluting Phase 3 generation code.

```text
quiz-knowledge/
  src/
    services/
      quiz/
        public-links.ts
        get-public-quiz.ts
        create-quiz-session.ts
        restore-quiz-session.ts
        validate-quiz-session.ts
      randomization/
        select-random-questions.ts
        shuffle-answer-options.ts
        build-quiz-session.ts
    app/
      quiz/
        [token]/
          page.tsx
          loading.tsx
          not-found.tsx
          _components/
            QuizClient.tsx
      q/
        [token]/
          page.tsx          # compatibility redirect
      api/
        quiz/
          [token]/
            session/
              route.ts
    components/
      quiz/
        QuizQuestionCard.tsx
        QuizOptionSelector.tsx
        QuizProgressIndicator.tsx
        QuizNavigation.tsx
        QuizEmptyState.tsx
    types/
      quiz/
        session.ts
        public.ts
        state.ts
    lib/
      session/
        local-storage.ts
        session-token.ts
        session-guards.ts
```

### Folder rules

- `src/lib/services/quizzes.ts` remains the Phase 3 generation service. Do not keep piling public-delivery logic into it.
- `src/services/quiz` owns quiz resolution, session creation, and payload shaping.
- `src/services/randomization` owns only pure selection / shuffle logic.
- `src/lib/session` owns browser persistence and session guard utilities.
- `src/components/quiz` owns presentational UI only; it should not know how session generation works.

---

## 4. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 4.1 - Design Quiz Session Architecture

**Objective.** Lock the public delivery architecture before coding so the team does not mix stateless refresh behavior, client-side reshuffling, and future scoring assumptions.

**Technical Requirements.**

Document and implement the following architecture decisions:

- **Quiz delivery strategy:** public link resolves a `Quiz`, then issues a `QuizSession`.
- **Session lifecycle:** create -> restore -> expire -> complete (completion used by Phase 5, not fully implemented here).
- **Randomization flow:** randomization happens once during session creation, server-side only.
- **Grading integrity strategy:** persist session-specific answer mapping server-side, never client-side.
- **Persistence model:** add a lightweight `QuizSession` Prisma model with JSON payload, not a multi-table session tree.

Recommended Prisma shape:

```prisma
model QuizSession {
  id            Int       @id @default(autoincrement())
  quizId        Int
  sessionToken  String    @unique
  questionCount Int
  payload       Json
  createdAt     DateTime  @default(now())
  expiresAt     DateTime
  completedAt   DateTime?

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)

  @@index([quizId])
  @@index([expiresAt])
  @@map("quiz_sessions")
}
```

Design the session lifecycle as:

1. Participant opens `/quiz/[token]`.
2. Client checks local storage for `sessionToken`.
3. Retrieval API restores existing session when valid; otherwise creates a new one.
4. Client stores `sessionToken`, selected answers, and current index locally.
5. Session expires after 24h or when explicitly completed in Phase 5.

**Dependencies.**

- Phase 3 complete.
- Existing `Quiz`, `Question`, and `Option` records available.

**Acceptance Criteria.**

- `QuizSession` is explicitly defined as the Phase 4 source of truth.
- The team agrees that randomization is server-side only.
- The design clearly distinguishes public payload vs server-only answer mapping.
- The doc and code structure both reflect the layer split:
  - session layer,
  - randomization layer,
  - retrieval layer,
  - API layer,
  - UI layer,
  - client state layer.

**Validation Steps.**

1. Review the architecture against three scenarios:
   - first visit,
   - refresh in same browser,
   - visit in incognito.
2. Verify that all three scenarios have a deterministic source of truth.
3. Verify that no step requires auth, Redis, websockets, or distributed sessions.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Medium. AI is useful for drafting the Prisma model and type skeletons, but the architecture choice itself should be human-locked first.

---

### Task 4.2 - Generate Public Quiz Tokens

**Objective.** Standardize the public quiz token and URL contract so existing Phase 3 quizzes remain reachable while Phase 4 moves the public route to a clearer path.

**Technical Requirements.**

Use the tokens already created in Phase 3:

- `Quiz.publicToken` remains the canonical participant identifier.
- `Quiz.resultsToken` remains untouched in this phase.
- Both must remain `cuid2`-generated and non-guessable.

Implementation requirements:

- Create `src/services/quiz/public-links.ts` for route helpers.
- Standardize participant URL generation to `/quiz/${publicToken}`.
- Add `src/app/q/[token]/page.tsx` redirect to `/quiz/[token]` so previously generated links still work.
- Update any Phase 3 response helper that still emits `/q/` so new quizzes point to `/quiz/`.
- Never expose numeric `quiz.id` in participant URLs.

Do not regenerate or rotate tokens during Phase 4. Token persistence already belongs to the `quizzes` row created in Phase 3.

**Dependencies.**

- Task 4.1 architecture locked.
- Phase 3 token generation already working.

**Acceptance Criteria.**

- New participant URLs use `/quiz/[token]`.
- Old `/q/[token]` links continue to work via redirect.
- `publicToken` and `resultsToken` remain stable for existing rows.
- No route or API payload uses numeric `quiz.id` as a public identifier.

**Validation Steps.**

1. Open an existing Phase 3 link under `/q/<token>` -> redirected to `/quiz/<token>`.
2. Generate a new quiz -> returned participant URL uses `/quiz/<token>`.
3. Search the codebase for string interpolation using `quiz.id` in public URLs.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. AI can update route helpers and compatibility redirects quickly once the contract is explicit.

---

### Task 4.3 - Create Quiz Session Generation Service

**Objective.** Build the core service that turns a public quiz token into a persisted, randomized participant session.

**Technical Requirements.**

Create `src/services/quiz/create-quiz-session.ts`.

Service responsibilities:

- resolve `Quiz` by `publicToken`,
- load all candidate questions and options in one query,
- reject empty or undersized banks,
- select a unique question subset of size `quiz.questionCount`,
- shuffle options per selected question,
- derive deterministic answer mapping,
- persist the session payload,
- return the public session payload.

Recommended input/output:

```ts
type CreateQuizSessionInput = {
  publicToken: string;
};

type CreateQuizSessionResult = {
  sessionToken: string;
  quizId: number;
  questionCount: number;
  expiresAt: string;
  questions: Array<{
    questionId: number;
    question: string;
    options: Array<{ optionId: number; text: string }>;
  }>;
};
```

Implementation notes:

- Load only required fields:
  - `Quiz.id`,
  - `Quiz.publicToken`,
  - `Quiz.questionCount`,
  - `Question.id`,
  - `Question.text`,
  - `Option.id`,
  - `Option.text`,
  - `Option.isCorrect`.
- Persist `payload` JSON containing:
  - public payload,
  - server-only `correctAnswerIndex`,
  - `originalCorrectAnswer`,
  - optionally `correctOptionId` for Phase 5 convenience.
- Use one DB read and one DB write in the happy path.
- Set `expiresAt = createdAt + 24h`.

Do not persist one row per session question in MVP. That is more normalized but slower to build and not required yet.

**Dependencies.**

- Task 4.1 architecture decision.
- Task 4.2 token contract.
- Task 4.8 randomization helpers.

**Acceptance Criteria.**

- A valid `publicToken` creates a new persisted `QuizSession`.
- The session contains exactly `quiz.questionCount` unique questions.
- Each returned question contains exactly 4 shuffled options.
- The persisted payload includes the answer mapping, and the HTTP response does not.
- Empty banks or undersized banks fail fast with typed errors.

**Validation Steps.**

1. Create a quiz with bank size > question count.
2. Call the service directly from a temporary tinker script.
3. Inspect `quiz_sessions.payload` in Prisma Studio:
   - correct mapping present,
   - public payload present,
   - question count matches.
4. Confirm the returned payload does not contain correctness fields.

**Estimated Complexity.** High.

**AI Coding Opportunity.** High. This is mostly orchestration once the payload types and error contract are fixed.

---

### Task 4.4 - Implement Quiz Retrieval API

**Objective.** Expose one lightweight API that validates the public token and either restores or creates a participant session.

**Technical Requirements.**

Create `src/app/api/quiz/[token]/session/route.ts`.

Use `POST`, not `GET`, because session creation is a side effect.

Suggested request body:

```ts
const retrieveQuizSessionSchema = z.object({
  sessionToken: z.string().min(10).optional(),
});
```

Handler behavior:

1. Validate path `token`.
2. Parse optional `sessionToken`.
3. If `sessionToken` exists:
   - attempt restore,
   - verify it belongs to the same quiz,
   - verify it is not expired,
   - return the stored public payload.
4. If restore fails or `sessionToken` is missing:
   - create a fresh session,
   - return the new public payload.
5. Set `Cache-Control: no-store`.
6. Map errors with the standard `AppError` helper.

Recommended error codes:

- `QUIZ_NOT_FOUND` -> 404
- `QUIZ_EMPTY` -> 422
- `QUIZ_SESSION_INVALID` -> 422
- `QUIZ_SESSION_EXPIRED` -> 410
- `INTERNAL` -> 500

Response shape:

```json
{
  "data": {
    "sessionToken": "cuid2...",
    "quizId": 17,
    "publicToken": "cuid2...",
    "questionCount": 10,
    "expiresAt": "2026-05-11T10:00:00.000Z",
    "questions": [
      {
        "questionId": 234,
        "question": "What is ...?",
        "options": [
          { "optionId": 891, "text": "..." }
        ]
      }
    ]
  }
}
```

**Dependencies.**

- Task 4.3 session generation service.
- Task 4.10 session validation guards.

**Acceptance Criteria.**

- Invalid `publicToken` returns 404.
- Valid `sessionToken` restores the same session.
- Missing or stale `sessionToken` creates a new session.
- Responses always exclude correctness fields.
- Route is dynamic and uncached.

**Validation Steps.**

1. `POST /api/quiz/<valid-token>/session` with `{}` -> 200 and new `sessionToken`.
2. Repeat with returned `sessionToken` -> same question order and option order.
3. `POST /api/quiz/<bad-token>/session` -> 404.
4. Expire a session manually in DB -> restore attempt returns 410 or triggers fresh-session logic per chosen contract.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Thin route handlers are ideal AI work once the service API is stable.

---

### Task 4.5 - Build Public Quiz Route

**Objective.** Create the participant-facing route at `src/app/quiz/[token]` with resilient loading, invalid-token handling, and empty-state behavior.

**Technical Requirements.**

Create:

- `src/app/quiz/[token]/page.tsx`
- `src/app/quiz/[token]/loading.tsx`
- `src/app/quiz/[token]/not-found.tsx`
- `src/app/quiz/[token]/_components/QuizClient.tsx`

Route responsibilities:

- Validate that the quiz token exists quickly at the server boundary.
- Render a client shell that calls the retrieval API.
- Show a loading skeleton while the session is being restored / created.
- Show a not-found UI for invalid tokens.
- Show an empty-state UI if the quiz has zero usable questions.
- Mark the route dynamic.

Recommended behavior:

- `page.tsx` does a minimal `findUnique({ select: { id: true } })` guard and calls `notFound()` for obviously bad tokens.
- `QuizClient` owns retrieval, restoration, and client-side state.
- `loading.tsx` uses the same layout footprint as the final quiz page to avoid content jumping.
- `not-found.tsx` explains that the link is invalid or expired and gives a safe way back to `/`.

**Dependencies.**

- Task 4.2 public route contract.
- Task 4.4 retrieval API.

**Acceptance Criteria.**

- `/quiz/<valid-token>` renders the participant quiz shell.
- `/quiz/<bad-token>` returns the route-level not-found state.
- Empty or malformed quiz states produce a friendly error UI, not a crash.
- `/q/<token>` continues to reach the canonical route.

**Validation Steps.**

1. Open a valid token in browser -> page loads.
2. Open a bogus token -> not-found UI.
3. Force the API to return empty-quiz error -> empty-state UI renders.
4. Verify the route is still correct after a hard refresh.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. AI can scaffold the route, loading state, and not-found page quickly.

---

### Task 4.6 - Build Quiz UI Components

**Objective.** Build the reusable participant quiz components needed for a clean, mobile-friendly public delivery experience.

**Technical Requirements.**

Create components under `src/components/quiz`:

- `QuizQuestionCard.tsx`
- `QuizOptionSelector.tsx`
- `QuizProgressIndicator.tsx`
- `QuizNavigation.tsx`
- `QuizEmptyState.tsx`

Component expectations:

- `QuizQuestionCard`
  - renders question number, prompt, and child option selector,
  - handles long text without overflow.
- `QuizOptionSelector`
  - uses shadcn `RadioGroup`,
  - keyboard accessible,
  - visually clear selected state.
- `QuizProgressIndicator`
  - shows current question and total,
  - optional answered count.
- `QuizNavigation`
  - previous / next controls,
  - completion affordance,
  - unanswered indicator.
- `QuizEmptyState`
  - used for empty quiz and broken session cases.

Responsive requirements:

- one-column layout on mobile,
- sticky footer or bottom action bar only if it does not obscure options,
- no horizontal scroll at 375px width,
- touch targets at least ~44px high.

**Dependencies.**

- Task 4.5 route shell.

**Acceptance Criteria.**

- Components render correctly on desktop and mobile.
- Radio options are accessible via keyboard and touch.
- Progress and navigation remain usable with long question text.
- Empty-state component is reusable across route and client errors.

**Validation Steps.**

1. Render the components with fixture data in the route.
2. Resize to 375px width and verify no clipped controls.
3. Tab through the form and confirm option selection works without a mouse.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. This is strong AI territory if the component boundaries and visual requirements are explicit.

---

### Task 4.7 - Implement Client-Side Quiz State

**Objective.** Manage answer selections, current position, and session restoration in a minimal client-side state layer.

**Technical Requirements.**

Create a small state module using `useState` plus `src/lib/session` helpers.

State to track:

- `sessionToken`
- `selectedAnswers: Record<number, number>`
- `currentQuestionIndex`
- `status: 'loading' | 'ready' | 'invalid'`
- `lastSavedAt`

Create `src/lib/session/local-storage.ts`:

```ts
export type StoredQuizSessionState = {
  publicToken: string;
  sessionToken: string;
  currentQuestionIndex: number;
  selectedAnswers: Record<number, number>;
  updatedAt: string;
};
```

Rules:

- Persist only:
  - `sessionToken`,
  - selected answers,
  - current index,
  - timestamp.
- Do **not** persist correctness data.
- Clear local state if:
  - JSON parse fails,
  - `publicToken` mismatch,
  - saved index is out of range,
  - session restore fails.

This layer should be intentionally small. No Zustand, Redux, React Query, or other global store.

**Dependencies.**

- Task 4.4 retrieval API.
- Task 4.6 UI components.

**Acceptance Criteria.**

- Selecting answers updates local state immediately.
- Refreshing the same browser restores session token, answers, and question index.
- Corrupt local storage self-heals by clearing and re-fetching.
- No correctness data is stored in browser state.

**Validation Steps.**

1. Answer 3 questions, refresh -> answers still selected.
2. Navigate to question 5, refresh -> user returns to question 5.
3. Manually corrupt the local storage value -> app clears it and recovers.
4. Search browser storage -> no correctness fields present.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. The state shape is simple and explicit.

---

### Task 4.8 - Implement Answer Randomization Logic

**Objective.** Build pure, testable randomization helpers that preserve correctness after option shuffle.

**Technical Requirements.**

Create:

- `src/services/randomization/select-random-questions.ts`
- `src/services/randomization/shuffle-answer-options.ts`
- `src/services/randomization/build-quiz-session.ts`

Implementation rules:

- Use Fisher-Yates or equivalent unbiased shuffle.
- Never mutate Prisma-returned arrays in place.
- Inject `rng = Math.random` so tests can be deterministic.
- Preserve answer mapping after shuffle.

Recommended signatures:

```ts
export function selectRandomQuestions<T>(
  bank: T[],
  questionCount: number,
  rng: () => number = Math.random,
): T[]

export function shuffleAnswerOptions(
  question: QuestionWithOptions,
  rng: () => number = Math.random,
): QuizSessionQuestion
```

`shuffleAnswerOptions` must:

- shuffle the 4 options,
- find the new `correctAnswerIndex`,
- retain `originalCorrectAnswer`,
- preserve `optionId` for future submit / score work.

Do not return only strings. Keep stable `optionId` in the randomized payload.

**Dependencies.**

- Task 4.1 payload contract.

**Acceptance Criteria.**

- Question selection never returns duplicates.
- Option shuffling always preserves the correct answer mapping.
- Functions are pure and deterministic under a seeded `rng`.
- Randomization helpers do not depend on React, Prisma, or browser APIs.

**Validation Steps.**

1. Run the selector against a 20-question bank requesting 10 -> get 10 unique items.
2. Run option shuffle with a seeded RNG -> stable expected output.
3. Confirm `correctAnswerIndex` still points at the correct option text after shuffle.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Pure logic plus tests is ideal AI work.

---

### Task 4.9 - Implement Quiz Navigation System

**Objective.** Let participants move through the quiz cleanly while keeping unanswered-state visibility obvious.

**Technical Requirements.**

Navigation behavior:

- `Previous` and `Next` buttons.
- Optional direct jump via compact question dots or numbered pills.
- Unanswered indicator on the current question and overview controls.
- Completion state when all questions are answered.
- Progress text such as `Question 4 of 10`.

Implementation notes:

- Allow moving past unanswered questions; do not hard-lock linear completion.
- Keep navigation state local to the quiz page.
- Disable `Previous` on the first question.
- Change `Next` to `Finish` on the final question.
- Show remaining unanswered count near the completion affordance.

Keep the UI lightweight. Do not build a full exam review dashboard in this phase.

**Dependencies.**

- Task 4.6 quiz UI components.
- Task 4.7 client-side state.

**Acceptance Criteria.**

- Participant can move forward and backward without losing selections.
- Unanswered questions are visually distinguishable.
- Progress updates correctly as answers are selected.
- Completion state triggers only when all displayed questions have answers.

**Validation Steps.**

1. Answer some questions out of order and navigate back and forth.
2. Verify selections persist.
3. Leave one question unanswered on the last step -> completion affordance reflects the missing answer.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Straightforward client UI logic.

---

### Task 4.10 - Implement Quiz Validation Logic

**Objective.** Prevent malformed or inconsistent session state from rendering a broken participant experience.

**Technical Requirements.**

Create guards under `src/lib/session/session-guards.ts`.

Validate:

- session payload exists,
- `questions.length === questionCount`,
- no duplicate `questionId`,
- every question has exactly 4 options,
- no duplicate `optionId` within a question,
- current index is within range,
- selected answers only reference issued `questionId` and `optionId`,
- expired session is not restored silently.

Invalid-state handling:

- if server payload is malformed -> show `QuizEmptyState` / error state,
- if local persisted state is malformed -> clear it and fetch a fresh session,
- if restored session is expired -> clear local state and request a new one,
- if a future submit payload is impossible to build -> block with clear UI.

Do not let the UI continue with partial or contradictory state.

**Dependencies.**

- Task 4.3 session payload shape.
- Task 4.7 local state layer.

**Acceptance Criteria.**

- Malformed session payloads are detected before rendering the quiz body.
- Corrupt local state does not crash the page.
- Expired sessions are not reused.
- Validation logic is implemented once and reused, not duplicated across route and client.

**Validation Steps.**

1. Stub the API with duplicate question IDs -> invalid state path triggers.
2. Stub a question with 3 options -> invalid state path triggers.
3. Seed local storage with out-of-range `currentQuestionIndex` -> app self-heals.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Validation guards map cleanly to small pure helper functions.

---

### Task 4.11 - Implement Anti-Cheating MVP Logic

**Objective.** Add lightweight friction against answer sharing without drifting into enterprise exam-proctoring complexity.

**Technical Requirements.**

In-scope anti-cheating behavior:

- randomized question subset per session,
- shuffled answer order per session,
- stable same-browser restore so refresh does not reroll,
- unique `sessionToken` per participant session,
- full bank never sent to the client,
- correctness never sent to the client,
- no-store responses to prevent shared caching artifacts.

Optional but acceptable:

- short session TTL (24h),
- `sessionToken` required for future submission in Phase 5.

Explicitly out of scope:

- auth,
- copy / paste blocking,
- webcam / proctoring,
- tab visibility tracking,
- IP-based anti-sharing,
- CAPTCHA,
- time limits.

This task is about **raising the cost of casual sharing**, not pretending to solve adversarial cheating.

**Dependencies.**

- Task 4.3 session generation.
- Task 4.4 retrieval API.
- Task 4.7 local session restore.

**Acceptance Criteria.**

- Two separate browsers usually receive different session payloads from the same public link.
- Refreshing the same browser restores the same session instead of generating a new one.
- Network responses contain no correctness data and no unused bank questions.
- The implementation stays lightweight and understandable.

**Validation Steps.**

1. Open the same public link in regular and incognito windows -> different session tokens.
2. Refresh the regular window -> same session token and question order.
3. Inspect Network tab -> only issued session questions returned.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** Medium. AI can wire the mechanics, but scope discipline matters more than code volume.

---

### Task 4.12 - Optimize Quiz Delivery Performance

**Objective.** Keep quiz delivery fast and mobile-friendly without adding enterprise caching or infrastructure.

**Technical Requirements.**

Performance rules:

- load quiz bank with one Prisma query using a tight `select`,
- issue session with one insert,
- return only the selected session questions,
- avoid serializing unused fields,
- keep client state small and answer-focused,
- avoid extra fetches after session creation.

Recommended payload strategy:

- API returns only:
  - `sessionToken`,
  - `quizId`,
  - `publicToken`,
  - `questionCount`,
  - `expiresAt`,
  - selected questions with 4 options each.
- Browser stores only:
  - `sessionToken`,
  - selected answers,
  - current index.

Implementation notes:

- Use plain objects, not Prisma results, in the returned JSON.
- Avoid nested transforms inside React render paths; shape the data once in the service.
- Keep `loading.tsx` cheap.
- Do not introduce client caching libraries for this phase.

Suggested MVP targets:

- session creation path uses 1 read query + 1 write query,
- typical 10-question payload feels instant on localhost / preview,
- no visible lag during question navigation because navigation is local only.

**Dependencies.**

- Task 4.3 session generation service.
- Task 4.4 retrieval API.
- Task 4.7 client state.

**Acceptance Criteria.**

- Session creation stays within a simple 1-read / 1-write pattern.
- Participant route does not fetch the full bank.
- Navigation after initial load is client-local and immediate.
- Mobile loading experience is acceptable on a throttled connection.

**Validation Steps.**

1. Inspect the retrieval service and count queries in the happy path.
2. Check the API response body size for a typical 10-question quiz.
3. Use Chrome DevTools mobile emulation and verify navigation remains instant after load.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** Medium. AI can help trim payloads, but query discipline should be reviewed by hand.

---

### Task 4.13 - Add Quiz Engine Validation Tests

**Objective.** Cover the logic most likely to fail silently: randomization, answer integrity, session validation, and token handling.

**Technical Requirements.**

Add tests for:

- **Randomization testing**
  - `selectRandomQuestions` returns unique selections,
  - `shuffleAnswerOptions` preserves correctness.
- **Answer integrity testing**
  - shuffled correct answer still maps to the same semantic answer,
  - `optionId` survives shuffle.
- **Invalid token testing**
  - retrieval API returns 404 on bad token.
- **Session validation testing**
  - malformed payload rejected,
  - expired session rejected,
  - corrupt local state cleared.

Recommended test files:

- `quiz-knowledge/src/services/randomization/select-random-questions.test.ts`
- `quiz-knowledge/src/services/randomization/shuffle-answer-options.test.ts`
- `quiz-knowledge/src/services/quiz/create-quiz-session.test.ts`
- `quiz-knowledge/src/lib/session/session-guards.test.ts`
- API route test if the repo already has a thin route-handler testing pattern; otherwise cover service + guard layers and do API validation manually.

Testing guidance:

- Prefer seeded RNG or injected RNG over flaky `Math.random()` assertions.
- Test restore vs create behavior separately.
- Test that public payload shape omits answer fields.

**Dependencies.**

- Tasks 4.3, 4.4, 4.8, 4.10 complete.

**Acceptance Criteria.**

- Randomization helpers have deterministic unit tests.
- Session service tests verify payload shape and uniqueness constraints.
- Invalid token path is covered.
- Malformed / expired session handling is covered.

**Validation Steps.**

1. `pnpm test` -> green.
2. Temporarily break `correctAnswerIndex` mapping -> answer-integrity test fails.
3. Temporarily allow duplicate question IDs -> session validation test fails.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Pure tests plus mocked service tests are efficient AI work.

---

### Task 4.14 - Final Phase Verification & Commit

**Objective.** Run the full Phase 4 verification pass, fix final gaps, and commit the public quiz delivery feature as one coherent branch.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Generate a quiz in Phase 3 | `publicToken` exists and link resolves |
| 2 | Open `/quiz/<token>` | loading state, then quiz session renders |
| 3 | Answer several questions | local state updates immediately |
| 4 | Refresh page | same session restored, same answers retained |
| 5 | Open same link in incognito | different session token and usually different question / option order |
| 6 | Open invalid token | not-found state |
| 7 | Force empty quiz / invalid session | friendly empty or invalid state |
| 8 | Check Network tab | no `isCorrect`, no `correctAnswerIndex`, no full bank payload |
| 9 | Check mobile width 375px | no horizontal overflow, controls usable |
| 10 | Check `/q/<token>` | redirects to `/quiz/<token>` |

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
feat(4): add quiz session architecture and schema
feat(4): standardize public quiz links and compatibility redirect
feat(4): implement quiz session generation service
feat(4): add quiz session retrieval api
feat(4): add public quiz route and client shell
feat(4): add quiz ui components and navigation
feat(4): add local session persistence and validation guards
test(4): add randomization and session validation tests
chore(4): phase 4 complete - public quiz delivery working
```

Branch:

- `feat/4-quiz-engine-public-delivery`

PR title:

- `Phase 4: Quiz Engine & Public Quiz Delivery`

**Dependencies.**

- Tasks 4.1 through 4.13 complete.

**Acceptance Criteria.**

- The manual QA checklist passes end-to-end.
- All five validation commands exit 0.
- Existing `/q/` links remain compatible.
- The public quiz experience is usable on mobile and desktop.
- The branch is ready to merge without Phase 5 work sneaking in.

**Validation Steps.**

1. Run the automated checks top to bottom.
2. Run the manual checklist in one sitting on localhost or preview.
3. Diff the branch and remove any accidental Phase 5 scoring logic before merge.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Low to Medium. AI is useful for fixing build/test failures and drafting the PR summary, but final QA is manual.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **4.1 Architecture first**
   Lock the session model, route contract, and server-side randomization decision before writing code.
2. **4.2 Token and route contract**
   Standardize `/quiz/[token]` and preserve `/q/[token]`.
3. **4.8 Randomization helpers**
   Build the pure logic before the service that uses it.
4. **4.3 Session generation service**
   This is the core of the phase.
5. **4.10 Session guards**
   Add validation early so the API and UI can trust the payload.
6. **4.4 Retrieval API**
   Thin route over the session service.
7. **4.5 Public route shell**
   Wire the participant page.
8. **4.6 UI components**
   Build the display layer.
9. **4.7 Client state**
   Add restoration and answer selection.
10. **4.9 Navigation**
    Finish the participant experience.
11. **4.11 Anti-cheating MVP**
    Mostly falls out of the above, but verify and harden it explicitly.
12. **4.12 Performance pass**
    Trim payloads and queries after the happy path works.
13. **4.13 Tests**
    Lock down the logic.
14. **4.14 Final verification**
    Manual QA and commit discipline.

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 4.1 | 30 min |
| 4.2 | 20 min |
| 4.3 | 75 min |
| 4.4 | 40 min |
| 4.5 | 45 min |
| 4.6 | 60 min |
| 4.7 | 45 min |
| 4.8 | 40 min |
| 4.9 | 40 min |
| 4.10 | 35 min |
| 4.11 | 25 min |
| 4.12 | 30 min |
| 4.13 | 60 min |
| 4.14 | 45 min |
| **Total** | **~590 min (~10 h)** |

Two-person parallel split:

- Engineer A: 4.1 -> 4.2 -> 4.8 -> 4.3 -> 4.4 -> 4.12
- Engineer B: 4.5 -> 4.6 -> 4.7 -> 4.9 -> 4.10
- Rejoin on 4.11 -> 4.13 -> 4.14

That keeps wall-clock close to 6-7 hours.

---

## 6. Common Phase 4 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Returning the full bank to the browser | Larger payload, weaker anti-sharing, weaker Phase 5 contract | Return only the issued session questions |
| Randomizing in both service and client | Impossible to reason about scoring later | Randomize server-side only |
| Creating a new session on every refresh | Participants lose progress and can reroll questions | Restore by `sessionToken` from local storage |
| Storing correctness in browser state | Immediate grading leak | Persist correctness only in server-side session payload |
| Using `GET` for session creation | Side effects hidden behind cacheable semantics | Use `POST /api/quiz/[token]/session` |
| Mutating Prisma arrays in-place | Hard-to-reproduce bugs in later transforms | Copy arrays before shuffle |
| Not injecting RNG for tests | Flaky randomization tests | Accept `rng` param with `Math.random` default |
| Over-normalizing session persistence | Too much schema and code for MVP | One `quiz_sessions.payload` JSON blob |
| Letting `/q/` die immediately | Existing Phase 3 links break | Add compatibility redirect |
| Sneaking scoring into Phase 4 | Scope blow-up | Stop at stable delivery and client completion state |

---

## 7. Definition of Done

Phase 4 is complete when all of the following are true:

### Code

- [ ] `QuizSession` persistence exists and is migrated.
- [ ] `src/services/quiz` exists and owns public quiz delivery logic.
- [ ] `src/services/randomization` exists and owns pure randomization helpers.
- [ ] `src/app/quiz/[token]` exists and renders the public quiz experience.
- [ ] `src/components/quiz` contains the required participant UI pieces.
- [ ] `src/lib/session` contains local storage and validation helpers.

### Functionality

- [ ] Opening `/quiz/<publicToken>` creates or restores a session.
- [ ] The delivered quiz contains exactly `quiz.questionCount` unique questions.
- [ ] Each question contains exactly 4 options.
- [ ] Refreshing the same browser restores the same session and answers.
- [ ] A second browser usually receives a different session.
- [ ] Invalid tokens fail cleanly.
- [ ] Empty or malformed sessions fail cleanly.
- [ ] The browser never receives correctness metadata.
- [ ] `/q/<token>` redirects to `/quiz/<token>`.

### Non-functional

- [ ] Retrieval path stays lightweight: one read, one write in the happy path.
- [ ] Navigation after initial load is instant because it is local.
- [ ] The page is usable on mobile width 375px.
- [ ] No auth, Redis, websockets, distributed sessions, or enterprise extras were introduced.

### Tests

- [ ] Randomization tests pass.
- [ ] Answer integrity tests pass.
- [ ] Invalid token tests pass.
- [ ] Session validation tests pass.

### Repo hygiene

- [ ] Validation commands pass: `prisma generate`, `tsc`, `lint`, `test`, `build`.
- [ ] Commits follow `feat(4):`, `test(4):`, `chore(4):`.
- [ ] Branch `feat/4-quiz-engine-public-delivery` is ready to merge.

When everything above is true, move to **Phase 5 - Quiz Submission & Scoring**.

---

## 8. Open Issues

These are documentation and implementation drift items surfaced while defining this phase.

### OI-4.A - `/q/[token]` vs `/quiz/[token]`

- **Description.** Phase 3 currently emits `/q/<publicToken>` URLs, while this Phase 4 contract standardizes the public participant route as `/quiz/[token]`.
- **Decision for Phase 4.** Keep `publicToken` unchanged, update newly generated URLs to `/quiz/[token]`, and add a redirect from `/q/[token]`.
- **Follow-up.** Update any prior docs that still present `/q/[token]` as the only participant route.

### OI-4.B - Client-side full-bank randomization in older docs

- **Description.** Older design material says the API should return the full bank and the client should randomize the subset.
- **Decision for Phase 4.** Superseded. The server now creates and persists a per-session randomized payload.
- **Why.** Better integrity, smaller payload, stronger Phase 5 and Phase 6 contracts.

### OI-4.C - Session cleanup

- **Description.** `quiz_sessions` will accumulate over time.
- **Decision for Phase 4.** Add `expiresAt`, but do not implement a cleanup job yet.
- **Follow-up.** Add a lightweight cron or manual cleanup in a post-MVP task if table growth becomes noticeable.


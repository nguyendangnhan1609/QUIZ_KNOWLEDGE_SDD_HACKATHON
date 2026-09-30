# Phase 6 - Analytics Dashboard (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, Section 10  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, Sections 5.4, 9.5, 11, 12  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1  
Authoritative schema: [`quiz-knowledge/prisma/schema.prisma`](../../../quiz-knowledge/prisma/schema.prisma)

This is the executable task list for Phase 6. Each task is sized to be a single AI prompt or a single 30-60 minute block of work.

> **Read Section 8 Open Issues before starting.** This phase intentionally updates the older `/r/[token]` route references. Because Phase 3 already emits `resultsUrl` as `/results/[token]`, this document treats `/results/[token]` as canonical and `/r/[token]` as a compatibility redirect.

---

## 1. Phase Overview

### Purpose

Turn persisted quiz attempts into a lightweight results dashboard that:

- resolves a `resultsToken` to a quiz,
- shows submission summary metrics,
- lists participant attempts,
- shows per-question accuracy,
- distinguishes "no data yet" from "everyone got it wrong",
- stays fast and cheap enough for a hackathon MVP.

Phase 6 is about **read-only insight**, not management workflows. No editing, exporting, RBAC, charts library, or heavy live-updating infrastructure.

### Expected outcome

After Phase 6:

- A manager can open `/results/<resultsToken>`.
- The page shows:
  - total attempts,
  - average score,
  - average percent,
  - highest score,
  - lowest score,
  - submissions table,
  - per-question accuracy list.
- The dashboard renders correctly when there are zero submissions.
- Questions that have never been shown render as **"No attempts yet"**, not `0%`.
- Invalid `resultsToken` returns not-found behavior.

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Canonical results route | `/results/[token]` | Matches Phase 3 generated URLs |
| Legacy compatibility | `/r/[token]` redirects to `/results/[token]` | Older design docs should not break links |
| Analytics identifier | `Quiz.resultsToken` | Stable public read-only dashboard token |
| Data source | `Quiz`, `Attempt`, `AttemptAnswer`, `Question`, `Document` | Enough for MVP dashboard |
| Dashboard model | Server-rendered analytics payload | Minimal client state, simpler correctness |
| Refresh model | Manual refresh button first; polling optional | Lower complexity and less noise |
| Accuracy semantics | `attemptCount === 0` means "No attempts yet" | Avoid misleading `0% correct` |
| Query strategy | One analytics service + one raw SQL query for question accuracy | Simple and fast enough for MVP |
| Visualization strategy | Tailwind cards, table, and bars only | No charting library overhead |

### Phase 6 architecture decision

The older plan/design describe analytics on `/r/[token]` with:

1. one service,
2. one RSC page,
3. one raw query for `questionAccuracy`.

This Phase 6 document keeps that core shape, but aligns it with the current repository drift:

1. canonical route is `/results/[token]`,
2. `/r/[token]` becomes compatibility redirect,
3. analytics are still computed server-side in one service,
4. UI remains mostly static and server-rendered,
5. refresh stays manual by default.

That is the right MVP because it:

- matches the URLs Phase 3 is already generating,
- avoids client-side data orchestration,
- keeps the dashboard readable and fast,
- limits the surface area before demo prep.

### Analytics payload shape

Use types under `src/types/analytics`.

```ts
export type QuizAnalyticsSummary = {
  totalAttempts: number;
  averageScore: number | null;
  averagePercent: number | null;
  highest: number | null;
  lowest: number | null;
};

export type QuizAnalyticsAttempt = {
  attemptId: number;
  identifier: string;
  score: number;
  totalQuestions: number;
  percent: number;
  submittedAt: string;
};

export type QuizQuestionAccuracy = {
  questionId: number;
  text: string;
  attemptCount: number;
  correctRate: number | null;
};

export type QuizAnalyticsPayload = {
  quiz: {
    quizId: number;
    resultsToken: string;
    createdAt: string;
    documentName: string;
    questionCount: number;
    bankSize: number;
  };
  summary: QuizAnalyticsSummary;
  attempts: QuizAnalyticsAttempt[];
  questionAccuracy: QuizQuestionAccuracy[];
};
```

### Why this setup matters for future phases

- **Phase 7 (Demo Prep)** needs a dashboard that works reliably with seeded attempts.
- **Future exports or CSV download** can reuse the analytics service output without rewriting aggregation logic.
- **Advanced analytics later** can extend the service or add separate endpoints without replacing the MVP dashboard.

---

## 2. Setup Goals

- [ ] Create a dedicated analytics domain under `src/services/analytics`.
- [ ] Create `src/types/analytics` for payload contracts.
- [ ] Build one trusted analytics service that returns the full dashboard payload.
- [ ] Build canonical results route at `src/app/results/[token]`.
- [ ] Preserve `/r/[token]` as compatibility redirect.
- [ ] Build dashboard components for stats, submissions, and per-question accuracy.
- [ ] Handle empty-state and invalid-token flows cleanly.
- [ ] Add manual refresh behavior without introducing heavy client state.
- [ ] Add tests for aggregation logic and invalid-token handling.

---

## 3. Target Folder Structure

This phase should keep analytics aggregation and presentation separated.

```text
quiz-knowledge/
  src/
    services/
      analytics/
        get-quiz-analytics.ts
        aggregate-summary.ts
        map-attempts.ts
        question-accuracy-query.ts
    app/
      api/
        analytics/
          [token]/
            route.ts
      results/
        [token]/
          page.tsx
          _components/
            ResultsDashboard.tsx
            ResultsRefreshButton.tsx
      r/
        [token]/
          page.tsx      # compatibility redirect
    components/
      results/
        StatsCards.tsx
        SubmissionsTable.tsx
        QuestionAccuracyList.tsx
        ResultsEmptyState.tsx
    types/
      analytics/
        payload.ts
        summary.ts
        attempts.ts
```

### Folder rules

- `src/services/analytics` owns all aggregation and shaping logic.
- `src/components/results` owns presentation only.
- `src/app/results/[token]/page.tsx` stays server-rendered and thin.
- The optional API route exists for future polling and manual refresh, but the page can call the service directly in MVP.

---

## 4. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 6.1 - Design Results Dashboard Architecture

**Objective.** Lock the analytics contract before implementation so the team does not mix query logic into components or introduce unnecessary client complexity.

**Technical Requirements.**

Document and implement the following architecture decisions:

- **Results strategy:** resolve dashboard by `resultsToken`.
- **Aggregation strategy:** one analytics service returns the full payload.
- **Rendering strategy:** RSC page fetches analytics and renders mostly static UI.
- **Refresh strategy:** manual refresh button first, optional polling later.
- **Accuracy semantics:** `attemptCount === 0` is distinct from `correctRate === 0`.

Dashboard lifecycle:

1. Manager opens `/results/[token]`.
2. Server resolves `Quiz` by `resultsToken`.
3. Service loads quiz metadata, attempts list, summary metrics, and per-question accuracy.
4. Page renders summary cards, attempts table, and accuracy bars.
5. Empty submissions render an empty state without errors.

Do not:

- add auth or manager ownership checks,
- add client-side caching libraries,
- add chart libraries,
- split analytics into many HTTP round trips.

**Dependencies.**

- Phase 5 complete with persisted `Attempt` and `AttemptAnswer` data.

**Acceptance Criteria.**

- The team agrees on a single analytics payload contract.
- Route, service, and components have clear boundaries.
- Empty-state behavior is defined before coding.

**Validation Steps.**

1. Walk the architecture for:
   - zero attempts,
   - several attempts,
   - wrong token.
2. Verify each scenario has one clear server-side path.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Medium. AI can draft the shape, but the query contract should be human-locked first.

---

### Task 6.2 - Standardize Results Route & Token Contract

**Objective.** Align the dashboard route with the current generated URLs while preserving older route references.

**Technical Requirements.**

Use the tokens already created in Phase 3:

- `Quiz.resultsToken` remains the canonical dashboard identifier.
- No token rotation or regeneration in this phase.

Implementation requirements:

- Canonical route: `src/app/results/[token]/page.tsx`
- Compatibility redirect: `src/app/r/[token]/page.tsx`
- Create route helpers if needed under `src/services/analytics` or a shared public-links module.

Do not expose numeric `quiz.id` in results URLs.

**Dependencies.**

- Task 6.1 architecture decision.
- Existing `resultsToken` persistence from Phase 3.

**Acceptance Criteria.**

- New dashboard route is `/results/[token]`.
- Old `/r/[token]` links continue to work via redirect.
- `resultsToken` remains the only public dashboard identifier.

**Validation Steps.**

1. Open `/results/<valid-token>` -> dashboard loads.
2. Open `/r/<valid-token>` -> redirected to `/results/<valid-token>`.
3. Search codebase for numeric `quiz.id` leaking into results URLs.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Mostly route normalization and compatibility wiring.

---

### Task 6.3 - Create Analytics Aggregation Service

**Objective.** Build one server-side service that returns the complete dashboard payload from `resultsToken`.

**Technical Requirements.**

Create `src/services/analytics/get-quiz-analytics.ts`.

Service responsibilities:

- resolve quiz by `resultsToken`,
- load related document metadata,
- load all attempts for that quiz,
- compute summary metrics,
- compute per-question accuracy,
- shape one payload for the page or API.

Recommended happy-path query outline:

```ts
const quiz = await prisma.quiz.findUnique({
  where: { resultsToken },
  include: { document: { select: { filename: true } } },
});

if (!quiz) {
  throw new AppError('RESULTS_NOT_FOUND', 404, 'Results not found.');
}

const attempts = await prisma.attempt.findMany({
  where: { quizId: quiz.id },
  orderBy: { submittedAt: 'desc' },
  select: {
    id: true,
    identifier: true,
    score: true,
    totalQuestions: true,
    submittedAt: true,
  },
});
```

Summary rules:

- `totalAttempts = attempts.length`
- if `totalAttempts === 0`:
  - `averageScore = null`
  - `averagePercent = null`
  - `highest = null`
  - `lowest = null`
- otherwise compute all metrics from the attempt list

Bank size can be derived from the question count query:

```ts
const bankSize = await prisma.question.count({
  where: { quizId: quiz.id },
});
```

**Dependencies.**

- Task 6.1 architecture.
- Persisted Phase 5 attempt data.

**Acceptance Criteria.**

- One service returns the full dashboard payload.
- Wrong `resultsToken` returns `RESULTS_NOT_FOUND`.
- Summary metrics are correct for zero and non-zero attempt counts.
- Payload is already shaped for UI consumption.

**Validation Steps.**

1. Call the service from a temporary script with:
   - zero attempts,
   - several attempts.
2. Inspect payload shape and metric values.
3. Confirm `documentName`, `questionCount`, and `bankSize` are present.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Clear Prisma query orchestration.

---

### Task 6.4 - Implement Question Accuracy Aggregation

**Objective.** Compute per-question correctness in a way that correctly distinguishes "never shown" from "shown and answered wrong."

**Technical Requirements.**

Create `src/services/analytics/question-accuracy-query.ts`.

Use one raw SQL query for clarity and performance:

```ts
const questionAccuracy = await prisma.$queryRaw`
  SELECT q.id   as "questionId",
         q.text,
         COUNT(aa.id) as "attemptCount",
         AVG(CASE WHEN aa."isCorrect" THEN 1.0 ELSE 0.0 END)
           FILTER (WHERE aa.id IS NOT NULL)::float as "correctRate"
    FROM questions q
    LEFT JOIN attempt_answers aa ON aa."questionId" = q.id
   WHERE q."quizId" = ${quizId}
   GROUP BY q.id, q.text, q."orderIndex"
   ORDER BY q."orderIndex";
`;
```

Semantics:

- `attemptCount === 0` -> question has never been shown / answered in persisted attempts
- `correctRate === null` -> no data yet
- `correctRate === 0` with `attemptCount > 0` -> everyone got it wrong

Do not replace this with a complicated two-step Prisma relation walk for MVP. The raw query is simpler here.

**Dependencies.**

- Task 6.3 analytics service.

**Acceptance Criteria.**

- Every question in the bank appears in the accuracy list.
- Questions with no attempts report `attemptCount = 0` and `correctRate = null`.
- Questions with attempts have stable `correctRate` values.

**Validation Steps.**

1. Run the query on a quiz with zero attempts -> all questions show `attemptCount = 0`.
2. Add a few attempts and manually spot-check one or two questions against `attempt_answers`.
3. Confirm ordering follows `Question.orderIndex`.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Medium. AI can wire the query, but human review is required because raw SQL drift is easy to miss.

---

### Task 6.5 - Implement Analytics API Route

**Objective.** Expose the analytics payload as a GET endpoint for optional manual refresh or future polling.

**Technical Requirements.**

Create `src/app/api/analytics/[token]/route.ts`.

Handler behavior:

1. Read route `token`.
2. Call `getQuizAnalytics(token)`.
3. Return `200 { data: payload }`.
4. Map `RESULTS_NOT_FOUND` to 404.
5. Set `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, `Cache-Control: no-store`.

The API route is optional from the page's perspective. For MVP, the RSC page may call the service directly, but this route should exist if the team wants:

- manual client refresh,
- future lightweight polling,
- future external integration.

**Dependencies.**

- Task 6.3 analytics service.
- Task 6.4 accuracy query.

**Acceptance Criteria.**

- Valid `resultsToken` returns full analytics payload.
- Invalid `resultsToken` returns 404.
- Response is uncached and dynamic.

**Validation Steps.**

1. `GET /api/analytics/<valid-token>` -> 200.
2. `GET /api/analytics/<bad-token>` -> 404.
3. Inspect JSON shape against the analytics types.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Thin route handlers are ideal AI tasks.

---

### Task 6.6 - Build Results Dashboard Route

**Objective.** Create the participant-independent manager-facing results page at `src/app/results/[token]`.

**Technical Requirements.**

Create:

- `src/app/results/[token]/page.tsx`
- `src/app/results/[token]/_components/ResultsDashboard.tsx`
- `src/app/r/[token]/page.tsx` redirect compatibility

Route responsibilities:

- resolve analytics payload server-side,
- handle invalid token via `notFound()` or route error UI,
- render summary + table + question accuracy sections,
- render empty state when `totalAttempts === 0`.

Recommended behavior:

- `page.tsx` stays thin: call `getQuizAnalytics`, pass payload to dashboard components.
- Keep the page as an RSC.
- Add a simple header with:
  - document name,
  - created date,
  - attempt count.

**Dependencies.**

- Task 6.2 route contract.
- Task 6.3 analytics service.

**Acceptance Criteria.**

- `/results/<token>` renders a full analytics page.
- `/r/<token>` redirects to `/results/<token>`.
- Invalid token yields not-found behavior.
- Zero-attempt quizzes render a clean empty state.

**Validation Steps.**

1. Open valid token with attempts -> dashboard renders.
2. Open valid token with zero attempts -> empty state renders.
3. Open invalid token -> not found.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Strong RSC page wiring task.

---

### Task 6.7 - Build Analytics UI Components

**Objective.** Build reusable presentation components for summary, submissions, and question accuracy.

**Technical Requirements.**

Create components under `src/components/results`:

- `StatsCards.tsx`
- `SubmissionsTable.tsx`
- `QuestionAccuracyList.tsx`
- `ResultsEmptyState.tsx`

Component expectations:

- `StatsCards`
  - total attempts,
  - average score,
  - average percent,
  - highest / lowest.
- `SubmissionsTable`
  - columns: identifier, score, percent, submittedAt,
  - newest first,
  - no pagination in MVP.
- `QuestionAccuracyList`
  - one row per question,
  - Tailwind width bar for `correctRate`,
  - "No attempts yet" when `attemptCount === 0`.
- `ResultsEmptyState`
  - copy such as "No submissions yet - share the quiz link and check back."

Do not add:

- chart libraries,
- virtualized tables,
- client-side sorting,
- filtering UI,
- export buttons.

**Dependencies.**

- Task 6.6 route shell.

**Acceptance Criteria.**

- Dashboard components render correctly with realistic payloads.
- Empty, sparse, and full states all read cleanly.
- The UI stays mobile-safe and easy to scan.

**Validation Steps.**

1. Render with zero attempts.
2. Render with three attempts.
3. Render with mixed `questionAccuracy` values including `null`.
4. Resize to 375px width and check for overflow.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Straightforward component generation.

---

### Task 6.8 - Implement Refresh Behavior

**Objective.** Give managers a lightweight way to refresh analytics without introducing complex client state.

**Technical Requirements.**

Preferred MVP path:

- add a small client component `ResultsRefreshButton.tsx`,
- call `router.refresh()` on click,
- optionally show a brief pending state.

Optional path if time remains:

- poll `/api/analytics/[token]` every 10 seconds,
- re-render client islands only.

Recommendation:

- ship manual refresh first,
- add polling only if the rest of the phase is already stable.

Do not introduce React Query, SWR, websockets, or background subscriptions in MVP.

**Dependencies.**

- Task 6.5 API route if polling is used.
- Task 6.6 page shell.

**Acceptance Criteria.**

- A manager can refresh the page data without a full manual browser reload.
- Refresh behavior does not break the RSC architecture.
- No heavy client state library is added.

**Validation Steps.**

1. Open results page.
2. Insert a new attempt from another tab.
3. Click Refresh -> stats and table update.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Small client component.

---

### Task 6.9 - Add Analytics Validation Tests

**Objective.** Cover the aggregation logic most likely to drift silently: summary math, zero-attempt behavior, and question accuracy semantics.

**Technical Requirements.**

Add tests for:

- **Summary aggregation**
  - zero attempts -> null summary fields,
  - multiple attempts -> correct average/highest/lowest.
- **Question accuracy**
  - no attempts -> `attemptCount = 0`, `correctRate = null`,
  - mixed attempts -> correct percentage.
- **Invalid token**
  - `RESULTS_NOT_FOUND`.
- **Attempt mapping**
  - percent calculation per row is correct.

Recommended test files:

- `quiz-knowledge/src/services/analytics/aggregate-summary.test.ts`
- `quiz-knowledge/src/services/analytics/get-quiz-analytics.test.ts`
- `quiz-knowledge/src/services/analytics/question-accuracy-query.test.ts`

Prefer service-level tests. Route-level smoke tests are optional if the repo already has a pattern for them.

**Dependencies.**

- Tasks 6.3 through 6.5.

**Acceptance Criteria.**

- Summary math is covered.
- Accuracy semantics are covered.
- Wrong token path is covered.
- The "No attempts yet" condition is covered by data-level tests.

**Validation Steps.**

1. `pnpm test` -> green.
2. Temporarily change `averagePercent` math -> test fails.
3. Temporarily coerce `correctRate` null to zero -> test fails.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Good fit for service and aggregation tests.

---

### Task 6.10 - Final Phase Verification & Commit

**Objective.** Run the full Phase 6 verification pass, fix remaining issues, and commit the analytics dashboard cleanly.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Open valid `/results/<token>` with zero attempts | empty state renders |
| 2 | Submit 3 test attempts | rows appear in dashboard |
| 3 | Re-open `/results/<token>` | total, average, highest, lowest all correct |
| 4 | Check one or two questions manually in DB | `correctRate` matches spot-check |
| 5 | Find a bank question never shown yet | UI says "No attempts yet" |
| 6 | Open invalid token | not-found behavior |
| 7 | Open `/r/<token>` | redirected to `/results/<token>` |
| 8 | Click Refresh after a new submit | dashboard updates |
| 9 | Resize to mobile width | readable without broken layout |

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
feat(6): add analytics payload types and aggregation service
feat(6): add question accuracy raw query
feat(6): add analytics api route
feat(6): add results dashboard route and compatibility redirect
feat(6): add stats cards submissions table and question accuracy list
feat(6): add results empty state and refresh behavior
test(6): add analytics aggregation and accuracy tests
chore(6): phase 6 complete - analytics dashboard working
```

Branch:

- `feat/6-analytics-dashboard`

PR title:

- `Phase 6: Analytics Dashboard`

**Dependencies.**

- Tasks 6.1 through 6.9.

**Acceptance Criteria.**

- Manual QA checklist passes.
- All five validation commands pass.
- Dashboard numbers match manual spot-checks.
- Route compatibility works for both `/results` and `/r`.

**Validation Steps.**

1. Run automated checks.
2. Run the manual checklist end-to-end.
3. Verify the branch does not accidentally include Phase 7 polish work.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Low to Medium. AI helps with fixes and PR text, but final analytics verification is manual.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **6.1 Architecture first**  
   Lock the route, payload, and query strategy.
2. **6.2 Results route contract**  
   Align `/results` vs `/r`.
3. **6.3 Analytics service**  
   Build the core aggregation layer.
4. **6.4 Question accuracy query**  
   Add the only raw SQL piece.
5. **6.5 API route**  
   Thin wrapper for refresh/polling.
6. **6.6 Results page**  
   Wire the server-rendered route.
7. **6.7 UI components**  
   Render cards, table, and accuracy list.
8. **6.8 Refresh behavior**  
   Add manual refresh.
9. **6.9 Tests**  
   Lock summary and accuracy semantics.
10. **6.10 Final verification**  
    Manual QA and commit discipline.

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 6.1 | 20 min |
| 6.2 | 20 min |
| 6.3 | 45 min |
| 6.4 | 35 min |
| 6.5 | 20 min |
| 6.6 | 35 min |
| 6.7 | 50 min |
| 6.8 | 20 min |
| 6.9 | 55 min |
| 6.10 | 40 min |
| **Total** | **~340 min (~5.5 h)** |

Two-person parallel split:

- Engineer A: 6.1 -> 6.2 -> 6.3 -> 6.4 -> 6.5
- Engineer B: 6.6 -> 6.7 -> 6.8
- Rejoin on 6.9 -> 6.10

That keeps wall-clock around 3.5-4.5 hours.

---

## 6. Common Phase 6 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Keeping `/r/[token]` as the only route | Drifts from the URLs Phase 3 actually generates | Treat `/results/[token]` as canonical and redirect `/r/[token]` |
| Returning `0%` for never-shown questions | Misleading analytics at low traffic | Use `attemptCount === 0` + `correctRate = null` semantics |
| Splitting analytics across many endpoints | More network, more moving parts, slower MVP | One service, one payload |
| Moving summary math into components | Harder to test and easier to drift | Compute all aggregates in the service |
| Replacing the raw query with overcomplicated Prisma relations | More code for less clarity | Keep one raw query for question accuracy |
| Adding chart libraries | More dependency weight, longer styling time | Use cards, table, and Tailwind bars only |
| Polling by default | Extra noise and complexity before the happy path is stable | Ship manual refresh first |
| Sorting or filtering in the client | Scope creep | Keep newest-first static table |

---

## 7. Definition of Done

Phase 6 is complete when all of the following are true:

### Code

- [ ] `src/services/analytics` exists and owns all aggregation logic.
- [ ] `src/types/analytics` exists for payload contracts.
- [ ] `src/app/results/[token]/page.tsx` exists and renders the dashboard.
- [ ] `src/app/api/analytics/[token]/route.ts` exists for refresh/polling support.
- [ ] `src/components/results` contains the required dashboard UI pieces.
- [ ] `src/app/r/[token]/page.tsx` exists as compatibility redirect.

### Functionality

- [ ] Opening `/results/<resultsToken>` renders the dashboard.
- [ ] Invalid `resultsToken` fails cleanly.
- [ ] Zero submissions render an empty state.
- [ ] Summary cards show correct totals and score metrics.
- [ ] Submissions table lists attempts newest first.
- [ ] Question accuracy distinguishes "No attempts yet" from `0%`.
- [ ] `/r/<token>` redirects to `/results/<token>`.

### Non-functional

- [ ] Dashboard stays mostly server-rendered with minimal client state.
- [ ] No auth, charts library, websockets, or heavy caching layer were introduced.
- [ ] Refresh behavior remains lightweight.

### Tests

- [ ] Summary aggregation tests pass.
- [ ] Question accuracy tests pass.
- [ ] Invalid token tests pass.
- [ ] Attempt row mapping tests pass.

### Repo hygiene

- [ ] Validation commands pass: `prisma generate`, `tsc`, `lint`, `test`, `build`.
- [ ] Commits follow `feat(6):`, `test(6):`, `chore(6):`.
- [ ] Branch `feat/6-analytics-dashboard` is ready to merge.

When everything above is true, move to **Phase 7 - UI Polish & Demo Preparation**.

---

## 8. Open Issues

These are documentation and implementation drift items surfaced while defining this phase.

### OI-6.A - `/results/[token]` vs `/r/[token]`

- **Description.** Technical design and implementation plan still reference `/r/[token]`, while Phase 3 already emits `resultsUrl` as `/results/[token]`.
- **Decision for Phase 6.** Canonical dashboard route is `/results/[token]`; `/r/[token]` is a compatibility redirect.
- **Follow-up.** Update older docs to stop presenting `/r/[token]` as the only results route.

### OI-6.B - Raw SQL ownership

- **Description.** `questionAccuracy` is simplest as one raw query, but raw SQL drifts if schema names change.
- **Decision for Phase 6.** Keep one raw query in a dedicated analytics helper and cover it with tests.
- **Follow-up.** If the schema changes later, update the helper and tests in the same change.

### OI-6.C - Refresh model

- **Description.** Polling can make the dashboard feel live, but it adds client behavior and repeated network traffic.
- **Decision for Phase 6.** Ship manual refresh first. Add polling only if the rest of the phase is already stable.


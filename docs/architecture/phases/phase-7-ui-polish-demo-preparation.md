# Phase 7 - UI Polish & Demo Preparation (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, Section 11  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, Sections 3.4, 11, 13  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1  
Authoritative app root: [`quiz-knowledge/src/app`](../../../quiz-knowledge/src/app)

This is the executable task list for Phase 7. Each task is sized to be a single AI prompt or a single 30-60 minute block of work.

> **Read Section 8 Open Issues before starting.** This phase is not a feature phase. It is a polish-and-demo phase. The goal is to make the existing end-to-end system demo cleanly on production, not to add more product scope.

---

## 1. Phase Overview

### Purpose

Move the product from "works on my machine" to "safe to show live" by tightening:

- loading states,
- error states,
- empty states,
- mobile responsiveness,
- route metadata,
- production demo readiness,
- fallback planning.

Phase 7 is about **presentation reliability**. The work here should reduce demo risk, not invent new architecture.

### Expected outcome

After Phase 7:

- Core routes have consistent `loading.tsx` and `error.tsx` handling.
- Empty states are present and not awkward.
- The app is usable at 375px mobile width.
- Public quiz and results routes are presentable on production.
- A demo quiz and a backup quiz are already generated on production.
- The dashboard is not empty during the demo.
- A fallback screen recording exists.
- The team can run the full flow in under 2 minutes on the production URL.

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Phase focus | Polish + demo-readiness only | Avoid scope creep late in the project |
| Canonical participant route | `/quiz/[token]` | Matches Phase 4 contract |
| Participant compatibility route | `/q/[token]` redirect | Existing links should still work |
| Canonical results route | `/results/[token]` | Matches Phase 3 generated URLs |
| Results compatibility route | `/r/[token]` redirect | Older docs / links should still work |
| Demo data strategy | Manual through the real UI | Production demo should exercise the real flow |
| Live AI generation during demo | Not on critical path | Highest risk point in the system |
| Refresh strategy on results | Manual refresh acceptable | Good enough for MVP demo |
| UI additions allowed | Loading, error, empty, metadata, responsive fixes | Keeps polish bounded |
| UI additions not allowed | New product features, auth, role systems, exports, heavy animations | This phase is not a feature expansion |

### Phase 7 architecture decision

This phase does **not** introduce new business logic layers. It only hardens presentation and demo flow on top of Phases 0-6.

That means:

1. No new API domains.
2. No new persistence models.
3. No new state libraries.
4. No redesign of quiz / results architecture.
5. No chart libraries or enterprise UX work.

The correct Phase 7 mindset is:

- patch rough edges,
- standardize states,
- verify responsiveness,
- pre-stage demo data,
- rehearse the production flow,
- build a fallback.

### Route polish scope

These are the minimum route segments to harden in this phase:

- `/`
- `/manager/new`
- `/manager/quizzes/new`
- `/quiz/[token]`
- `/quiz/[token]/done`
- `/results/[token]`

Compatibility redirects should also still function:

- `/q/[token]`
- `/q/[token]/done`
- `/r/[token]`

### Why this setup matters

- Hackathon judging rewards **demo clarity and reliability** far more than minor architecture purity.
- A polished error state prevents one broken request from turning into an awkward dead end on stage.
- A pre-generated demo quiz removes the highest-risk live dependency from the critical path.

---

## 2. Setup Goals

- [ ] Add `loading.tsx` to each important route segment.
- [ ] Add `error.tsx` to each important route segment.
- [ ] Standardize empty states across upload, quiz, and results flows.
- [ ] Add or refine route metadata, titles, and OG basics where useful.
- [ ] Audit and fix mobile overflow at 375px width.
- [ ] Run a lightweight performance pass on the public quiz route.
- [ ] Prepare realistic production demo documents and quizzes.
- [ ] Seed the production dashboard with attempts before the demo.
- [ ] Rehearse the demo on production and create a fallback recording.

---

## 3. Target Folder Structure

This phase should mostly add small route-segment files and shared presentation helpers.

```text
quiz-knowledge/
  src/
    app/
      page.tsx
      loading.tsx
      error.tsx
      manager/
        new/
          page.tsx
          loading.tsx
          error.tsx
        quizzes/
          new/
            page.tsx
            loading.tsx
            error.tsx
      quiz/
        [token]/
          page.tsx
          loading.tsx
          error.tsx
          done/
            page.tsx
            loading.tsx
            error.tsx
      results/
        [token]/
          page.tsx
          loading.tsx
          error.tsx
    components/
      shared/
        LoadingState.tsx
        ErrorState.tsx
        EmptyState.tsx
        MobileSafeContainer.tsx
```

### Folder rules

- Prefer shared state components for consistency, but do not over-abstract.
- `loading.tsx` and `error.tsx` should be route-local when copy or layout differs.
- Keep this phase additive. Do not refactor half the tree just to make polish "cleaner."

---

## 4. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 7.1 - Audit UX Polish Scope & Lock Demo Contract

**Objective.** Freeze what Phase 7 will and will not do so the team stops adding late-stage features under the label of "polish."

**Technical Requirements.**

Document and align on:

- canonical routes:
  - `/quiz/[token]`
  - `/results/[token]`
- compatibility routes:
  - `/q/[token]`
  - `/q/[token]/done`
  - `/r/[token]`
- polish-only scope:
  - loading states,
  - error states,
  - empty states,
  - responsive fixes,
  - metadata,
  - performance pass,
  - demo prep.

Out of scope for Phase 7:

- auth,
- exports,
- CSV download,
- advanced analytics,
- quiz editing,
- animation-heavy redesign,
- feature rewrites,
- state-management migration.

Also lock the production demo contract:

- demo uses pre-generated quiz,
- backup quiz exists,
- dashboard already has attempts,
- fallback recording exists.

**Dependencies.**

- Phases 0-6 complete or nearly complete.

**Acceptance Criteria.**

- The team has one explicit checklist for polish and demo.
- Phase 7 scope excludes feature creep.
- Route contract is consistent with Phase 4-6 docs.

**Validation Steps.**

1. Review the route list and compare it to current docs.
2. Review the polish checklist and remove any feature work disguised as polish.
3. Review the demo contract and confirm it avoids live AI on the critical path.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Low. This is mostly scoping discipline.

---

### Task 7.2 - Add Loading States to Critical Route Segments

**Objective.** Prevent blank or jittery transitions on the routes users and judges are most likely to see.

**Technical Requirements.**

Add `loading.tsx` to:

- `src/app/loading.tsx`
- `src/app/manager/new/loading.tsx`
- `src/app/manager/quizzes/new/loading.tsx`
- `src/app/quiz/[token]/loading.tsx`
- `src/app/quiz/[token]/done/loading.tsx`
- `src/app/results/[token]/loading.tsx`

Implementation guidance:

- Use shadcn `Skeleton`.
- Match the shape of the final layout closely enough to avoid content jump.
- Keep loaders cheap and static.
- Do not overdesign these screens.

Recommended shared component:

```ts
type LoadingStateProps = {
  variant: 'page' | 'form' | 'quiz' | 'results';
};
```

**Dependencies.**

- Existing route structure from earlier phases.

**Acceptance Criteria.**

- Every critical route renders a visible loading state instead of flashing empty content.
- Skeleton shapes roughly match the final route layout.
- No `loading.tsx` introduces client-side complexity.

**Validation Steps.**

1. Use network throttling in DevTools.
2. Navigate each critical route.
3. Confirm loading states appear and disappear cleanly.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** High. Standard skeleton-state work.

---

### Task 7.3 - Add Error Boundaries to Critical Route Segments

**Objective.** Replace raw crashes with user-friendly route-level recovery states.

**Technical Requirements.**

Add `error.tsx` to:

- `src/app/error.tsx`
- `src/app/manager/new/error.tsx`
- `src/app/manager/quizzes/new/error.tsx`
- `src/app/quiz/[token]/error.tsx`
- `src/app/quiz/[token]/done/error.tsx`
- `src/app/results/[token]/error.tsx`

Use a shared `ErrorState` component where helpful.

Error-state behavior:

- show short human-readable copy,
- include a retry button using Next.js reset pattern,
- avoid leaking internal error details,
- keep tone calm and specific.

Recommended variants:

- upload / parsing error,
- quiz delivery error,
- results loading error,
- generic unexpected error.

**Dependencies.**

- Task 7.2 loading states recommended, but not required.

**Acceptance Criteria.**

- Critical route failures render controlled error UI.
- Retry actions work where reset is appropriate.
- Error states are visually consistent across the app.

**Validation Steps.**

1. Force one route to throw temporarily.
2. Visit the route and confirm `error.tsx` handles it.
3. Use retry and confirm the route can recover.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** High. Route-level error boundaries are boilerplate-heavy and AI-friendly.

---

### Task 7.4 - Standardize Empty States

**Objective.** Ensure routes with no data feel intentional instead of broken or unfinished.

**Technical Requirements.**

Create or refine empty states for:

- manager upload area when nothing has been uploaded yet,
- quiz generation flow when no document is selected,
- public quiz flow when the quiz is empty or invalid,
- results dashboard when there are no submissions,
- root / landing page if it still acts as a simple shell.

Recommended shared component:

```ts
type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};
```

Copy guidance:

- short,
- non-embarrassing,
- action-oriented,
- no internal jargon.

This phase should reuse the `"No submissions yet - share the quiz link and check back."` copy for results unless the team has a better final line.

**Dependencies.**

- Phases 2, 4, and 6 UI states exist.

**Acceptance Criteria.**

- Every list or dashboard state that can be empty has a clear empty state.
- No empty route looks like a loading bug or crash.
- Copy is consistent and concise.

**Validation Steps.**

1. Open results for a quiz with zero attempts.
2. Trigger quiz-empty / invalid paths.
3. Confirm each empty state explains what to do next.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Simple presentation work.

---

### Task 7.5 - Add Metadata, Titles, and Share-Friendly Basics

**Objective.** Improve polish around browser tabs, page identity, and shared links without spending time on a full brand system.

**Technical Requirements.**

Add or refine:

- page titles per key route,
- concise route metadata,
- landing page OG basics,
- favicon verification.

Minimum route title coverage:

- home / landing,
- manager upload,
- quiz generation,
- public quiz,
- quiz done,
- results.

Implementation guidance:

- use route-level metadata exports where appropriate,
- keep titles short and descriptive,
- avoid marketing-heavy copy.

Landing page OG metadata only needs:

- title,
- description,
- basic preview hygiene.

Do not spend time on custom image generation in this phase unless assets already exist and it is trivial.

**Dependencies.**

- Existing route files.

**Acceptance Criteria.**

- Browser tabs show route-appropriate titles.
- Landing page has reasonable OG metadata.
- Favicon is present and not broken.

**Validation Steps.**

1. Open each major route in browser tabs.
2. Confirm titles are correct.
3. Inspect landing page metadata in browser devtools or view-source.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Metadata boilerplate is AI-friendly.

---

### Task 7.6 - Run Mobile Responsiveness Pass

**Objective.** Make the app safe to show on a phone or in a narrow projector window.

**Technical Requirements.**

Audit at **375px width**:

- `/`
- `/manager/new`
- `/manager/quizzes/new`
- `/quiz/[token]`
- `/quiz/[token]/done`
- `/results/[token]`

Fix:

- horizontal overflow,
- clipped buttons,
- unreadable table cells,
- cramped form controls,
- sticky elements covering important content,
- spacing collapse.

Implementation guidance:

- prefer small Tailwind fixes over component rewrites,
- stack layout vertically earlier on narrow screens,
- keep touch targets usable,
- if a table is too wide, switch to stacked rows or horizontal containment only where truly necessary.

**Dependencies.**

- Tasks 7.2 through 7.5 recommended.

**Acceptance Criteria.**

- All critical routes remain usable at 375px width.
- No important actions are off-screen or clipped.
- Quiz answering and results reading remain practical on mobile.

**Validation Steps.**

1. Use Chrome DevTools device emulation at 375px.
2. Walk the full user flow.
3. Fix any overflow before moving on.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Medium. AI can suggest CSS fixes, but visual review must be manual.

---

### Task 7.7 - Run Lightweight Performance & Payload Audit

**Objective.** Catch obviously heavy or sloppy UI behavior before the demo.

**Technical Requirements.**

Audit:

- Network tab for unexpected payloads over ~200KB,
- public quiz route load behavior,
- results route load behavior,
- loading-state smoothness,
- unnecessary client-side work.

Minimum checks:

- Lighthouse mobile run on `/quiz/[token]`,
- target Performance >= 70,
- inspect any obviously large API payloads,
- verify no accidental correctness data leaks appear in quiz responses.

Optimization guidance:

- prefer pruning payload fields over adding caching,
- remove accidental duplicate fetches,
- keep the results page mostly server-rendered,
- keep public quiz state minimal.

Do not introduce new infrastructure for this phase.

**Dependencies.**

- Phases 4-6 route implementations.

**Acceptance Criteria.**

- No obviously bloated payloads remain.
- `/quiz/[token]` passes a basic mobile Lighthouse sanity bar.
- Network behavior looks predictable enough for demo use.

**Validation Steps.**

1. Run Lighthouse mobile on the public quiz route.
2. Inspect Network tab for the core flow.
3. Trim any easy waste before calling it done.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** Medium. AI can help identify payload bloat, but judgment is manual.

---

### Task 7.8 - Prepare Production Demo Data

**Objective.** Remove live-demo risk by preparing production-ready documents, quizzes, and seeded submissions ahead of time.

**Technical Requirements.**

Prepare:

- 1-2 realistic handbook / policy / knowledge-base PDFs,
- 1 primary demo quiz,
- 1 backup demo quiz,
- 1 third uploaded document only if live generation contingency is required.

Demo data rules:

- upload through the real production UI,
- generate the quiz through the real production UI,
- do not seed production by DB script,
- write down:
  - production URL,
  - primary `publicToken`,
  - primary `resultsToken`,
  - backup `publicToken`,
  - backup `resultsToken`.

Also:

- pre-submit at least 3 attempts with different identifiers,
- make sure the results dashboard is non-empty,
- keep one intentionally zero-attempt results link if helpful for edge-case checks.

**Dependencies.**

- Phases 2-6 working on production.

**Acceptance Criteria.**

- Primary and backup demo quizzes exist on production.
- Tokens are recorded outside the app.
- Dashboard already has visible attempt data.
- Demo does not require live generation to succeed.

**Validation Steps.**

1. Upload realistic production docs.
2. Generate primary and backup quizzes.
3. Submit at least 3 attempts.
4. Open results dashboard and verify it is populated.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Low. This is manual production prep.

---

### Task 7.9 - Rehearse Demo Flow & Create Fallback Assets

**Objective.** Ensure the team can deliver the demo under normal conditions and still survive if production networking or AI is flaky.

**Technical Requirements.**

Rehearse the exact flow:

1. landing or manager entry,
2. uploaded document / generated quiz already available,
3. open public quiz,
4. answer questions,
5. submit,
6. open results dashboard.

Rules:

- rehearse on the **production URL**, not localhost,
- use incognito at least once,
- time the end-to-end flow,
- confirm it stays under 2 minutes.

Fallback requirements:

- record a 90-second screen capture of the happy path,
- store it locally and somewhere easy to open,
- keep the token cheat sheet physically or digitally accessible,
- if live generation must be shown, warm the upload/generate page shortly before the demo and use the pre-uploaded third document only.

**Dependencies.**

- Task 7.8 demo data prep.

**Acceptance Criteria.**

- The team has rehearsed the production flow end-to-end.
- A fallback recording exists.
- The demo cheat sheet exists and is accurate.
- The team knows the fallback path if live generation misbehaves.

**Validation Steps.**

1. Run the demo once in production.
2. Run it once in incognito.
3. Record and verify the fallback video plays correctly.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** None. This is manual rehearsal work.

---

### Task 7.10 - Final Phase Verification & Release Readiness

**Objective.** Run the final polish and demo-readiness gate before calling the MVP complete.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Visit each critical route | loading/error/empty states behave cleanly |
| 2 | Run mobile pass at 375px | no broken layout |
| 3 | Open public quiz | smooth enough for demo |
| 4 | Submit a quiz | done page works |
| 5 | Open results dashboard | populated and readable |
| 6 | Refresh results | updated data appears |
| 7 | Test invalid quiz and results tokens | graceful failure |
| 8 | Rehearse full production flow | under 2 minutes |
| 9 | Verify backup quiz links | valid and recorded |
| 10 | Verify fallback recording | accessible and correct |

Automated validation before final release call:

```bash
pnpm prisma generate
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

Commit strategy:

```text
feat(7): add loading states across critical routes
feat(7): add route-level error boundaries and empty states
feat(7): add metadata and share-friendly page polish
fix(7): resolve mobile layout overflow and responsive issues
chore(7): complete demo data prep and production rehearsal
chore(7): phase 7 complete - demo ready
```

Branch:

- `feat/7-ui-polish-demo-preparation`

PR title:

- `Phase 7: UI Polish & Demo Preparation`

**Dependencies.**

- Tasks 7.1 through 7.9.

**Acceptance Criteria.**

- The app feels polished enough for demo use.
- Production demo assets and tokens are prepared.
- Automated checks pass.
- The team has a fallback if live conditions degrade.

**Validation Steps.**

1. Run automated checks.
2. Run the manual checklist.
3. Verify no last-minute feature work slipped into the branch.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** Low to Medium. AI helps with route-state boilerplate and small UI fixes; final release readiness is manual.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **7.1 Scope and demo contract first**  
   Stop scope creep before touching UI.
2. **7.2 Loading states**  
   Add skeleton coverage.
3. **7.3 Error boundaries**  
   Add recovery paths.
4. **7.4 Empty states**  
   Standardize zero-data behavior.
5. **7.5 Metadata and route polish**  
   Improve route identity.
6. **7.6 Mobile responsiveness**  
   Fix layout issues after states are in place.
7. **7.7 Performance audit**  
   Trim obvious waste.
8. **7.8 Production demo data**  
   Prepare the actual demo.
9. **7.9 Rehearsal and fallback**  
   Verify real-world readiness.
10. **7.10 Final verification**  
    Release gate.

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 7.1 | 20 min |
| 7.2 | 40 min |
| 7.3 | 40 min |
| 7.4 | 25 min |
| 7.5 | 25 min |
| 7.6 | 50 min |
| 7.7 | 35 min |
| 7.8 | 45 min |
| 7.9 | 45 min |
| 7.10 | 35 min |
| **Total** | **~360 min (~6 h)** |

Two-person parallel split:

- Engineer A: 7.1 -> 7.2 -> 7.3 -> 7.5 -> 7.7
- Engineer B: 7.4 -> 7.6 -> 7.8 -> 7.9
- Rejoin on 7.10

That keeps wall-clock around 4-4.5 hours, plus rehearsal time.

---

## 6. Common Phase 7 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Calling feature work "polish" | Late-stage scope creep delays demo readiness | Lock Phase 7 as polish-only |
| Depending on live AI generation in the demo | Highest-risk dependency on stage | Pre-generate primary and backup demo quizzes |
| Testing only on localhost | Hides production cold starts and env issues | Rehearse on the production URL |
| Ignoring mobile layout | Judges often view on phones | Audit at 375px and fix overflow |
| Leaving results dashboard empty | Demo feels unfinished | Pre-submit attempts before the demo |
| Overdesigning loading/error states | Burns time without demo value | Keep states simple and clear |
| Adding polling or client state late | More moving parts before demo | Manual refresh is enough |
| Forgetting a fallback | One network problem can kill the demo | Record a 90-second happy-path video |

---

## 7. Definition of Done

Phase 7 is complete when all of the following are true:

### Code

- [ ] Critical routes have `loading.tsx`.
- [ ] Critical routes have `error.tsx`.
- [ ] Empty states exist where users can encounter zero data.
- [ ] Route titles / metadata are present for key pages.
- [ ] Responsive fixes are applied to critical flows.

### Functionality

- [ ] The full flow works on production:
  - upload,
  - generate,
  - take quiz,
  - submit,
  - view results.
- [ ] The full production flow completes in under 2 minutes.
- [ ] Invalid-token and zero-data paths fail gracefully.
- [ ] Public quiz and results routes are usable on a phone screen.

### Demo readiness

- [ ] Primary demo quiz exists on production.
- [ ] Backup demo quiz exists on production.
- [ ] Tokens are written down on a cheat sheet.
- [ ] At least 3 attempts are already submitted.
- [ ] A fallback recording exists.
- [ ] The team has rehearsed the production demo.

### Non-functional

- [ ] No new feature scope was introduced under the banner of polish.
- [ ] No heavy dependencies were added for cosmetic reasons.
- [ ] Public route payloads remain lightweight enough for demo use.

### Repo hygiene

- [ ] Validation commands pass: `prisma generate`, `tsc`, `lint`, `test`, `build`.
- [ ] Commits follow `feat(7):`, `fix(7):`, `chore(7):`.
- [ ] Branch `feat/7-ui-polish-demo-preparation` is ready to merge.

When everything above is true, the MVP is **demo ready**.

---

## 8. Open Issues

These are documentation and implementation drift items surfaced while defining this phase.

### OI-7.A - `/quiz` and `/results` route drift vs current code

- **Description.** The current repository still contains older route shapes like `src/app/q/[publicToken]/page.tsx`, while the later phase docs standardize `/quiz/[token]` and `/results/[token]` as canonical.
- **Decision for Phase 7.** Polish should target the canonical route contract from Phases 4-6. Keep compatibility redirects where needed.
- **Follow-up.** Align any remaining older route implementations before demo rehearsal.

### OI-7.B - OG image depth

- **Description.** The implementation plan asks for OG tags, but a custom OG image generator is not necessary for MVP.
- **Decision for Phase 7.** Add basic OG metadata only unless a simple existing asset is already available.

### OI-7.C - Live generation contingency

- **Description.** Judges may ask for live quiz generation even though it is the riskiest part of the stack.
- **Decision for Phase 7.** Keep a third uploaded document ready and warm the generation path only as contingency, not as the primary demo flow.


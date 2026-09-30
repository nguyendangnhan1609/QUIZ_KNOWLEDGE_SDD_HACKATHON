# Implementation Plan — AI-Driven Knowledge Management & Assessment Platform

Status: v1.1
Last Updated: 2026-05-09
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../product_spec_ai_knowledge_assessment_platform.md) (v1.1)
Source design: [`docs/architecture/technical-design.md`](./technical-design.md) (v1.0)
Time horizon: **< 3 days** (hackathon).

This document is the execution roadmap. It picks up where the technical design ends — taking the locked architecture and turning it into an ordered sequence of tasks the team (and AI coding assistants) can execute against.

---

## 1. Implementation Strategy

### 1.1 Philosophy

**Ship the happy path end-to-end before polishing any part of it.** A demo where a user can upload → generate → take quiz → see results, even if rough, is infinitely more valuable than a half-built showpiece feature. We optimize for "vertical completeness" first, "depth per layer" second.

### 1.2 MVP-first rules

- If the spec doesn't require it, don't build it.
- If it's listed under spec §5 Non-Goals, refuse to build it even if asked mid-flight.
- Re-read spec §11 Success Criteria before adding any "nice-to-have".

### 1.3 Incremental delivery

Each phase produces something **demonstrable**. Even Phase 1 ends with a runnable Prisma client against a live Supabase DB. Phase 2 ends with "I uploaded a PDF and the text is in the DB." We never have a "phase done but nothing works" state.

### 1.4 Risk minimization

| Risk | Mitigation |
|---|---|
| OpenAI returns garbage JSON | Zod validation + single retry with stronger model. Fail loudly. |
| Vercel function timeout (60s) on big docs | `AbortController` at 55s; chunked parallel calls; cap doc size at 15MB / ≤ 50 pages. |
| Supabase outage during demo | Use a stable region; do a dry-run 2h before demo with live data. |
| Spec drift (scope creep) | Every new request is checked against spec v1.1 first. Out-of-scope = OI ticket, not code. |
| Migration mistakes | One owner of `prisma/schema.prisma`; PR review for any migration. |
| Demo data lost | Seed a known-good document and quiz before demo; keep its `publicToken` written down. |

### 1.5 Why phases

Phases are gates. Each gate forces:
- a deliverable check ("does this work?")
- a re-read of acceptance criteria ("are we still in scope?")
- a quick risk review ("anything blocking the next phase?")

Without gates, hackathon teams drift into rabbit holes 8 hours before demo.

### 1.6 Why end-to-end > perfection

Hackathon judging weights "does it work" far above "is it clean." A spaghetti-but-working demo wins over a beautifully-architected upload screen. We accept ~70% polish in exchange for 100% functional path.

---

## 2. Development Phases Overview

| # | Phase | Objective | Complexity | Depends on | Key deliverables |
|---|---|---|---|---|---|
| 0 | **Project Setup** | Repo + tooling + first deploy | Low | — | Running Next.js on Vercel + linked Supabase |
| 1 | **Database & Infrastructure** | Schema, migrations, storage bucket | Low | 0 | All 6 tables live; storage bucket created |
| 2 | **Document Upload & Parsing** | Upload UI + API + parsers | Medium | 1 | A PDF/DOCX/MD upload → text in DB |
| 3 | **AI Quiz Generation** | Chunk + prompt + validate + persist | High | 2 | A document → a Quiz with N questions in DB |
| 4 | **Quiz Engine** | Public quiz routes + randomization | Medium | 3 | `/q/[token]` renders a randomized quiz |
| 5 | **Quiz Submission & Scoring** | Submission API + grading + identifier handling | Medium | 4 | Submit → score returned + persisted |
| 6 | **Analytics Dashboard** | Aggregation API + dashboard UI | Medium | 5 | `/r/[token]` shows summary + table + per-question accuracy |
| 7 | **UI Polish & Demo Prep** | Loading/error/empty states + responsive + seed | Low–Med | 6 | Demo-ready URL with seeded happy-path data |

**Rough time budget (2-person team, < 3 days):**

| Phase | Person-hours |
|---|---|
| 0 | 2–3 |
| 1 | 1–2 |
| 2 | 4–6 |
| 3 | 6–10 |
| 4 | 3–5 |
| 5 | 2–4 |
| 6 | 3–5 |
| 7 | 4–6 |
| Buffer | 6–8 |
| **Total** | **31–49** |

Two devs running in parallel after Phase 1 should stay comfortably inside 48 wall-clock hours.

---

## 3. Detailed Phase Breakdown — Format

Every phase below (Phases 0–7) uses the same structure:

- **Phase Goal** — what this phase exists to deliver
- **Tasks** — checkable list, ordered
- **Deliverables** — concrete artifacts produced
- **Dependencies** — what must exist before starting
- **Acceptance Criteria** — testable definition of "done"
- **Risks** — what could go wrong, and the mitigation
- **AI-Assisted Development Opportunities** — which tasks are best for Claude/Cursor/Copilot, and which are not

This consistency is intentional: a developer or AI assistant should always know where to look.

---

## 4. Phase 0 — Project Setup

### Phase Goal

Get a runnable Next.js app on Vercel (currently 16.x — `create-next-app@latest` resolves to latest), with Supabase + OpenAI keys wired, deploying on every `git push`. **Until Phase 0 is green, nothing else matters.**

### Tasks

- [ ] Create Supabase project (region close to Vercel `iad1` or your default region)
- [ ] Create OpenAI API key + small spending cap (e.g. $5)
- [ ] `pnpm create next-app@latest quiz-knowledge` — TypeScript, Tailwind, App Router, ESLint
- [ ] Install core deps: `pnpm add @prisma/client zod @paralleldrive/cuid2 @t3-oss/env-nextjs openai pdf-parse mammoth tiktoken react-hook-form @hookform/resolvers @supabase/supabase-js sonner`
- [ ] Install dev deps: `pnpm add -D prisma @types/pdf-parse`
- [ ] `npx shadcn@latest init` — pick TypeScript + default style
- [ ] `npx shadcn@latest add button card input table dialog form label radio-group toast skeleton` (one shot)
- [ ] Initialize Prisma: `pnpm prisma init` — set `DATABASE_URL` and `DIRECT_URL`
- [ ] Wire Supabase: copy URL + service-role key into `.env.local`
- [ ] Add `lib/config/env.ts` (per technical-design §13.2) — fail-fast env validation
- [ ] Configure `tsconfig.json` with `"baseUrl": "."` and `"paths": { "@/*": ["./*"] }`
- [ ] Add `.prettierrc` + `.editorconfig`
- [ ] Initialize git, push to GitHub
- [ ] Connect repo to Vercel (Pro plan — 60s function timeout is required)
- [ ] Add Vercel env vars (mirror `.env.local`)
- [ ] First production deploy works (Next.js default page)

### Deliverables

- Public Vercel URL serving the default Next.js page.
- Working `pnpm dev` locally.
- Tailwind + shadcn primitives importable from `@/components/ui/*`.

### Dependencies

- A GitHub account.
- Supabase account (free tier).
- OpenAI account.
- Vercel account on Pro plan.

### Acceptance Criteria

- `git push` triggers a Vercel deploy that succeeds.
- `pnpm prisma studio` opens against the live Supabase DB.
- `lib/config/env.ts` throws if any env var is missing — verified by removing one var locally.

### Risks

- **Vercel Hobby plan can't hit AI generation 30s SLA.** Confirm Pro plan is enabled before Phase 3.
- **Supabase free tier has connection limits.** Use the pooler URL (port 6543, `pgbouncer=true&connection_limit=1`) in `DATABASE_URL` from day one.
- **shadcn requires manual style config.** Do this at scaffold time, not later — re-doing styles after components exist creates churn.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Scaffold `lib/config/env.ts` | ✅ | Paste the schema from technical-design §13.2 and ask AI to wire it |
| `.prettierrc` + `.editorconfig` | ✅ | Trivial generation |
| Connecting Vercel + Supabase | ❌ | Manual web UI, no AI value |
| Deciding the dependency list | ❌ | Already in this plan; just install |

---

## 5. Phase 1 — Database & Infrastructure

### Phase Goal

Materialize the data model from technical-design §5 in Supabase, end-to-end queryable via Prisma.

### Tasks

- [ ] Copy the full Prisma schema from technical-design §5.3 into `prisma/schema.prisma`
- [ ] `pnpm prisma migrate dev --name init` — first migration
- [ ] Verify all 6 tables exist (`documents`, `quizzes`, `questions`, `options`, `attempts`, `attempt_answers`) via Supabase Studio
- [ ] Verify indexes per §5.4 are present
- [ ] Verify `UNIQUE(quizId, identifier)` exists on `attempts`
- [ ] Add `lib/db/prisma.ts` singleton (Node module-level export)
- [ ] Create Supabase Storage bucket `docs` (private, server-only access)
- [ ] Add `lib/storage/supabase.ts` — server-side Supabase client using service-role key
- [ ] Add a tiny seed script `prisma/seed.ts` that inserts one Document row (the "Hello World" doc) for smoke-testing later phases
- [ ] Push schema + first migration to Vercel preview; run `pnpm prisma migrate deploy`

### Deliverables

- Live Supabase Postgres with the full schema.
- Storage bucket `docs` created.
- `lib/db/prisma.ts` and `lib/storage/supabase.ts` ready for import.
- One sample Document row seeded.

### Local vs production DB

- **Local:** create a *separate* Supabase project for development to avoid polluting prod data. Cheap on free tier.
- **Production:** the project linked to Vercel. Run migrations through `pnpm prisma migrate deploy` in a one-off shell, not during build, to keep deploys atomic.

### Migration workflow

```
# Schema change
edit prisma/schema.prisma
pnpm prisma migrate dev --name <change>      # local + apply

# Production
pnpm prisma migrate deploy                   # idempotent
```

Never edit an applied migration. Never `prisma db push` in production.

### Seed strategy

For MVP, **no auto-seed** in production. Seed only locally for testing. The "demo seed data" in Phase 7 is loaded manually before the demo through the actual UI (upload a real handbook + generate a real quiz).

### Dependencies

- Phase 0 complete.

### Acceptance Criteria

- All 6 tables exist with correct columns, types, and indexes.
- `(quizId, identifier)` UNIQUE constraint visible in Supabase.
- `prisma.document.findFirst()` from a local script returns the locally seeded row.

### Risks

- **Supabase pooler vs direct URL confusion.** Prisma needs the *direct* URL (`DIRECT_URL`, port 5432) for migrations and the *pooled* URL (`DATABASE_URL`, port 6543) at runtime. Setting one for the other silently breaks things.
- **Schema drift between local and prod.** Always run `migrate dev` locally and `migrate deploy` in prod — never both with the same name.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Paste Prisma schema into file | ✅ | Mechanical |
| Singleton Prisma client | ✅ | Standard Next.js pattern; AI knows it |
| Create Supabase bucket | ❌ | Web UI |
| Verifying indexes | ❌ | Eyeball or psql |

---

## 6. Phase 2 — Document Upload & Parsing

### Phase Goal

A manager can upload a PDF / DOCX / Markdown file. The system extracts text and stores it in `documents`.

### Tasks

UI:

- [ ] `app/manager/new/page.tsx` — RSC; renders `<UploadForm>` client component
- [ ] `components/shared/FileDropzone.tsx` — drag-drop + click; mime + size guard
- [ ] `app/manager/new/_components/UploadForm.tsx` — `react-hook-form` + Zod schema; POST to `/api/documents`
- [ ] Toast on success / error using `sonner`

API:

- [ ] `app/api/documents/route.ts` — POST handler; parse multipart; validate; call service
- [ ] `lib/services/documents.ts` — orchestrates: validate → upload to Supabase Storage → extract text → persist Document row
- [ ] `lib/parsers/pdf.ts` — `pdf-parse` wrapper with cleanup (per technical-design §6.4)
- [ ] `lib/parsers/docx.ts` — `mammoth.extractRawText` wrapper
- [ ] `lib/parsers/markdown.ts` — UTF-8 read + front-matter strip
- [ ] `lib/parsers/index.ts` — dispatch by mime
- [ ] `lib/schemas/api.ts` — Zod schema for upload request/response
- [ ] `lib/errors.ts` — `AppError` class + error code enum

### Deliverables

- Working `/manager/new` page that accepts a file and shows success.
- A Document row appears in Supabase with `textContent` populated.

### Recommended libraries (locked)

| Need | Library |
|---|---|
| PDF text | `pdf-parse` |
| DOCX text | `mammoth` |
| Markdown | native `Buffer.toString('utf-8')` + small front-matter regex |
| Form | `react-hook-form` + `@hookform/resolvers/zod` |
| Validation | `zod` |
| Toasts | `sonner` |

### File size handling

- Hard cap **15MB** at the API gate.
- Reject anything above with HTTP 413 `FILE_TOO_LARGE`.
- Vercel Pro body size limit is well above 15MB; if Vercel rejects before our gate fires, lower the cap.

### Parsing failure handling

| Failure | HTTP | Code | UX |
|---|---|---|---|
| Wrong mime | 415 | `UNSUPPORTED_MIME` | Toast: "Unsupported file type." |
| > 15MB | 413 | `FILE_TOO_LARGE` | Toast: "File too large (max 15MB)." |
| Parser throws | 422 | `PARSE_FAILED` | Toast: "We couldn't read this file." |
| Empty text after parse | 422 | `PARSE_EMPTY` | Toast: "No readable text. Is this a scanned PDF?" |
| Storage error | 500 | `STORAGE_FAILED` | Toast: "Upload failed. Please try again." |

### Dependencies

- Phase 1 complete (DB + storage bucket + parsers folder).

### Acceptance Criteria

- Uploading a known-good PDF, DOCX, and Markdown file each results in a Document row with non-empty `textContent`.
- Uploading a `.zip` file returns 415.
- Uploading a 20MB file returns 413.
- Uploading a scanned-PDF (no text layer) returns 422 `PARSE_EMPTY`.

### Risks

- **`pdf-parse` v1.1.x has a debug-mode bug** that tries to read a sample PDF on import. Use `pdf-parse` via direct file path import: `import pdfParse from 'pdf-parse/lib/pdf-parse.js'` to avoid this.
- **Mammoth bundles a large dictionary**. Acceptable for MVP; Vercel build size still well under limits.
- **Multipart parsing in Route Handlers** uses `await request.formData()` — straightforward, but easy to mis-handle Buffer vs File. Convert via `Buffer.from(await file.arrayBuffer())`.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| `<FileDropzone>` component with drag-drop | ✅✅ | Show shadcn primitives + acceptable mimes; AI generates clean code |
| Parser dispatch + per-format wrappers | ✅✅ | Paste technical-design §6 excerpts, ask AI to flesh out |
| Zod schemas | ✅ | Trivial |
| Wiring `react-hook-form` to Zod schema | ✅ | Standard pattern |
| Multipart `request.formData()` parsing | ⚠️ | AI sometimes hallucinates older API; verify against Next.js 15 docs |

---

## 7. Phase 3 — AI Quiz Generation

This is the highest-risk phase. Plan for **2 attempts** mentally — first pass to wire it, second pass to harden.

### Phase Goal

A manager picks an existing Document, enters a `questionCount` (the number of questions a participant will answer per attempt), and clicks "Generate". The system produces a question **bank of `2 × questionCount` valid questions** — generation is the only point at which AI is invoked, so we over-produce so that participants can be served fresh random subsets later without re-calling the AI. The bank is persisted with stable IDs; both public URLs are returned.

**Contract (locked):**

- `quiz.questionCount` = the number of questions a participant must answer per attempt (the request input).
- Bank size persisted to `questions` table = `2 × quiz.questionCount` (e.g. user enters 10 → 20 questions stored).
- Generation is **strict**: if we cannot end up with `≥ 2 × questionCount` valid questions across all chunks, the entire request fails (no partial publish).

### Implementation sequence (strict order)

1. **Stub first.** Implement `lib/ai/generateQuestions.ts` that ignores the document and returns `2 × questionCount` hardcoded questions. Wire the entire pipeline (UI button → POST `/api/quizzes` → service → stub → DB persist → response). Confirm the full flow works before involving OpenAI.
2. **Add chunker.** Replace stub with real chunking via tiktoken (per §7.2). Still don't call OpenAI — log chunk count + sizes.
3. **Add OpenAI single-chunk path.** Call OpenAI for chunk 0 only. Validate JSON with Zod. Persist.
4. **Parallelize.** Wrap chunks in `Promise.all`.
5. **Add retry logic.** On Zod failure, retry once with `gpt-4o`.
6. **Add `AbortController` 55s soft timeout.**

Each step is a commit. If anything breaks, revert one step, not the whole feature.

### Tasks

- [ ] `lib/ai/client.ts` — OpenAI singleton from `OPENAI_API_KEY`
- [ ] `lib/ai/chunker.ts` — tiktoken-based, `chunkText(text, maxTokens=3000)` (per technical-design §7.2)
- [ ] `lib/ai/prompts.ts` — `SYSTEM_PROMPT` + `userPrompt(chunk, n)` (verbatim from technical-design §7.3)
- [ ] `lib/schemas/ai.ts` — `aiQuestionSchema` + `aiResponseSchema` (per §7.5)
- [ ] `lib/ai/generateQuestions.ts` — orchestration: budget for `2 × questionCount` valid questions → parallel chunk calls → Zod → retry → flatten → take exactly `2 × questionCount`
- [ ] `lib/services/quizzes.ts` — wraps generation + persistence in a single Prisma transaction (per §7.10); persists ALL `2 × questionCount` questions; sets `quiz.questionCount` to the user's requested value
- [ ] `app/api/quizzes/route.ts` — POST handler; input `{ documentId, questionCount }`; output `{ quizUrl, resultsUrl, ... }`
- [ ] UI: "Generate Quiz" form on `/manager/new` with a number input for `questionCount` (default 10, min 5, max 30) — visible after upload succeeds
- [ ] UI: `<GenerationProgress>` client component — elapsed-time spinner, soft warning at 30s, hard cap UI at 60s
- [ ] UI: `<PublicLinkPanel>` showing both URLs + copy-to-clipboard

### Validation strategy

- **Per-question:** Zod schema enforces 4 options, valid `correctIndex`, difficulty enum, length bounds.
- **Per-chunk:** retry once with stronger model on Zod failure.
- **Final pass:** require **at least `2 × questionCount` valid questions**. If short, fail the whole request — do **not** publish a partial quiz. Persistence stores exactly `2 × questionCount` (the first N from the validated pool, or all if equal).

### Error recovery

| Failure | Recovery |
|---|---|
| OpenAI 429 / 5xx | Surface as 502 to user; one button to retry |
| Zod fails on chunk N | Retry chunk N once with `gpt-4o`. If still bad, drop chunk N's contribution. |
| Pool < `2 × questionCount` after all chunks | 502 `AI_GEN_FAILED` with a hint to upload a richer document or lower `questionCount`. Transaction rolled back; no quiz row left dangling. |
| Soft timeout (55s) | `AbortController.abort()`; return 504 `AI_TIMEOUT` |

### Hallucination mitigation

Already built into the prompt (see technical-design §7.3 + §7.7). Do **not** modify the prompt without checking the `<content>` tag and "do not invent facts" rule are still present.

### Cost optimization

- Default model: `gpt-4o-mini`.
- `max_tokens: 1200` per call.
- `response_format: { type: 'json_object' }` (per §7.4).
- `temperature: 0.4`.
- Set OpenAI account spending cap to $5 — won't be hit even with hundreds of test runs.

### Recommended architecture pattern

**Service-orchestrates, route-handles HTTP.** Route Handler in `app/api/quizzes/route.ts` should be < 30 LOC:

```ts
export async function POST(request: Request) {
  try {
    const body = createQuizRequestSchema.parse(await request.json());
    const result = await quizzesService.generateForDocument(body);
    return Response.json({ data: result }, { status: 201 });
  } catch (e) {
    return toResponse(e);
  }
}
```

All complexity lives in `lib/services/quizzes.ts` and `lib/ai/*`.

### Deliverables

- A button-press generates a real Quiz from a real Document.
- Generated quiz visible in Supabase: `quizzes`, `questions`, `options` rows.
- Both `publicToken` and `resultsToken` returned.

### Dependencies

- Phase 2 complete (Document with textContent in DB).

### Acceptance Criteria

- For a known-good 10-page PDF with `questionCount = 10`, generation completes in < 30s and persists **exactly 20** questions (`2 × questionCount`) in the bank.
- `quiz.questionCount` in the DB equals the value the user requested.
- Each persisted question has exactly 4 options, exactly one with `isCorrect: true`.
- Re-generating from the same document produces a NEW Quiz row (not overwriting).
- Forcing OpenAI to fail (e.g. invalidate API key briefly) returns 502 with no Quiz row created.
- Forcing the AI to return mostly invalid JSON (so the validated pool < `2 × questionCount`) returns 502 with no Quiz row created.

### Risks

- **OpenAI returns prose despite `json_object` mode.** Mitigated by Zod retry. If retry also fails, drop that chunk.
- **`tiktoken` WASM init slow on cold start.** First request after deploy may be ~500ms slower. Acceptable.
- **Total wall-clock exceeds 55s.** Mitigation: cap total chunks at 8 (≈ 24k input tokens). For docs that produce more chunks, sample chunks deterministically.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Chunker implementation from §7.2 | ✅ | Mechanical translation |
| Prompts file (verbatim) | ✅ | Copy from §7.3 |
| Zod AI schema | ✅ | From §7.5 |
| Persistence transaction | ✅✅ | Prisma `$transaction` patterns AI knows well |
| Retry-with-fallback logic | ⚠️ | AI tends to over-engineer (exponential backoff, circuit breakers). Insist on the simple "one retry, stronger model" pattern from §7.6. |
| `AbortController` wiring | ⚠️ | AI sometimes forgets to pass `signal` to OpenAI client. Verify. |

---

## 8. Phase 4 — Quiz Engine

### Phase Goal

Participants open `/q/{publicToken}` and see a randomized quiz drawn from the persisted bank of `2 × questionCount` questions. The browser never sees `isCorrect`.

### Single source of truth for randomization

- The server endpoint `GET /api/quizzes/[token]` is the **only** data source. It returns the **full bank** (all `2 × questionCount` questions) **with `isCorrect` stripped**.
- The page component is a thin RSC wrapper around a client component.
- The **client component** does Fisher–Yates over the bank to take `questionCount` questions, then Fisher–Yates the 4 options of each.
- This avoids the duplicate "API + page both randomize" footgun.

### Tasks

- [ ] `lib/randomization/selectQuestions.ts` — Fisher–Yates partial (per technical-design §8.2). Reusable on the client.
- [ ] `lib/randomization/shuffleOptions.ts` — Fisher–Yates per question (per §8.2). Reusable on the client.
- [ ] `app/api/quizzes/[token]/route.ts` — GET handler. Resolves quiz by `publicToken`. Returns `{ quizId, questionCount, questions: BankItem[] }` where each `BankItem` has `{ questionId, text, options: [{ id, text }] }` (NO `isCorrect`). 404 if not found.
- [ ] `app/q/[token]/page.tsx` — RSC: validate token exists (server `findUnique`), then render the client form.
- [ ] `app/q/[token]/_components/QuizForm.tsx` — client component: fetches the bank from the GET API on mount, runs `selectQuestions(bank, quiz.questionCount)`, runs `shuffleOptions` per selected question, holds answer state, posts to `/api/attempts`.
- [ ] `app/q/[token]/_components/QuestionItem.tsx` — single question with shadcn `<RadioGroup>`.
- [ ] Identifier input field (text) at the top of the form.
- [ ] Submit button (disabled until all displayed questions answered + identifier entered).

### How randomization works (recap)

1. Server: returns the full bank (`2 × questionCount`), stripped of `isCorrect`.
2. Client: Fisher–Yates partial → take exactly `questionCount` questions to display.
3. Client: Fisher–Yates the 4 options per displayed question.

Each pageview produces a fresh selection. No caching.

### Preserving correct answers after shuffle

The client payload contains `optionId` only. **Never** `isCorrect`. Grading at submit time joins on `optionId` against the canonical `Option.isCorrect` in the DB. This means:

- Shuffling option order does NOT change correctness mapping.
- Tampering with `selectedOptionId` either points at a real correct option (legitimate answer) or an option that doesn't belong to the question (server rejects with 400).

### Pseudocode (verbatim from technical-design §8.2)

```ts
export function selectQuestions<T>(bank: T[], n: number): T[] {
  const arr = [...bank];
  const k = Math.min(n, arr.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

export function shuffleOptions(question: QuestionWithOptions): QuestionView {
  const opts = [...question.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return {
    questionId: question.id,
    text: question.text,
    options: opts.map(o => ({ id: o.id, text: o.text })),  // NO isCorrect
  };
}
```

### Implementation notes

- Randomization runs **client-side** in `<QuizForm>` after fetching the bank. The `lib/randomization/*` modules are imported into the client bundle.
- The GET API must set `Cache-Control: no-store` (banks are stable but we want to avoid intermediate caches mixing tokens).
- `isCorrect` is **stripped server-side** in the GET handler. Confirm via curl that `isCorrect` does not appear anywhere in the JSON.
- The server-side `findUnique` in `page.tsx` is just a 404 gate; it does not fetch options.

### Deliverables

- `/q/{publicToken}` renders the participant view with a fresh random order on every refresh.
- Submitting fails gracefully if `publicToken` doesn't exist (404 page).

### Dependencies

- Phase 3 complete (Quizzes with Questions and Options exist).

### Acceptance Criteria

- Refreshing `/q/{token}` produces a different selection of questions and/or option order most of the time.
- The displayed quiz contains exactly `quiz.questionCount` questions out of the `2 × questionCount` bank.
- `curl /api/quizzes/{token}` returns the full bank (`2 × questionCount`) and the JSON contains no `isCorrect` field anywhere.
- Browser DevTools Network tab shows no `isCorrect` in any request/response.

### Risks

- **Caching middleware might cache page output.** Mitigation: explicit `no-store`.
- **`Math.random()` is not cryptographically secure.** That's fine for non-adversarial randomization; we only need "different per participant", not "unguessable".

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Fisher–Yates implementations | ✅✅ | Standard algorithm |
| RSC page wiring | ✅ | Standard Next.js 15 pattern |
| `<QuestionItem>` component | ✅✅ | shadcn `<RadioGroup>` boilerplate |
| Confirming `isCorrect` never leaks | ❌ | Manual review — AI will say "it's fine" without checking |

---

## 9. Phase 5 — Quiz Submission & Scoring

### Phase Goal

Participants submit answers, receive a score, and the attempt is durably persisted with correct identifier-collision handling.

### Tasks

- [ ] `lib/schemas/api.ts` — `submitAttemptSchema` (Zod): `{ publicToken, identifier, answers[] }`
- [ ] `app/api/attempts/route.ts` — POST handler
- [ ] `lib/services/attempts.ts` — orchestrates: resolve quiz → validate answers → check identifier → grade → persist
- [ ] `lib/utils/timestamp.ts` — formatter `formatYmdHms(date: Date): string` returning `yyyyMMddHHmmss`
- [ ] Identifier-collision retry logic (per technical-design §12.2)
- [ ] Server-side grading via JOIN on `Option.isCorrect`
- [ ] Persist `Attempt` + `AttemptAnswer[]` in one Prisma transaction
- [ ] Return `{ attemptId, score, total, identifier }` (final identifier may have suffix)
- [ ] `app/q/[token]/done/page.tsx` — server component: shows score from query string

### Grading logic (concrete)

```ts
// pseudocode for lib/services/attempts.ts
async function grade(quizId: number, answers: SubmittedAnswer[]) {
  const optionIds = answers.map(a => a.selectedOptionId).filter(Boolean);
  const options = await prisma.option.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, isCorrect: true, questionId: true },
  });
  const optionMap = new Map(options.map(o => [o.id, o]));

  // Verify each answer's optionId belongs to its claimed questionId
  for (const a of answers) {
    if (a.selectedOptionId == null) continue;
    const opt = optionMap.get(a.selectedOptionId);
    if (!opt || opt.questionId !== a.questionId) {
      throw new AppError('INVALID_INPUT', 400, 'Answer references invalid option.');
    }
  }

  let score = 0;
  for (const a of answers) {
    const opt = a.selectedOptionId == null ? null : optionMap.get(a.selectedOptionId);
    if (opt?.isCorrect) score++;
  }
  return score;
}
```

### Identifier collision

```ts
// pseudocode
async function persistWithCollisionHandling(quizId: number, identifier: string, ...rest) {
  try {
    return await prisma.attempt.create({ data: { quizId, identifier, ...rest } });
  } catch (e) {
    if (isUniqueConstraintViolation(e, ['quizId', 'identifier'])) {
      const suffixed = `${identifier}_${formatYmdHms(new Date())}`;
      return await prisma.attempt.create({ data: { quizId, identifier: suffixed, ...rest } });
    }
    throw e;
  }
}
```

One retry only. If the second insert also collides, throw 409 `ATTEMPT_PERSIST_FAILED`. (Same-second double-collision is OI-design.C.)

### Edge cases

| Edge case | Behavior |
|---|---|
| Participant doesn't answer a question | `selectedOptionId: null` → counted as wrong (not error) |
| Submission has fewer answers than `quiz.questionCount` | 400 `ANSWER_COUNT_MISMATCH` |
| `questionId` doesn't belong to this quiz | 400 `INVALID_INPUT` |
| `selectedOptionId` doesn't belong to its `questionId` | 400 `INVALID_INPUT` |
| Identifier has invalid chars | 400 `INVALID_INPUT` (Zod rejects) |
| Identifier is empty / only whitespace | 400 `INVALID_INPUT` |

### Validation

- Zod regex on identifier: `^[\p{L}0-9 ._-]+$`, length 1..64.
- `answers.length === quiz.questionCount` checked in the service (Zod can't see it).
- All `questionId`s belong to this quiz — single query: `count(distinct questions) where quizId = ? AND id in (...)`.

### Deliverables

- POST `/api/attempts` works end-to-end.
- Score visible on `/q/{token}/done`.
- Attempts visible in Supabase.

### Dependencies

- Phase 4 complete (random quiz rendering working).

### Acceptance Criteria

- Submitting two attempts with the same identifier succeeds; the second has `_yyyyMMddHHmmss` appended.
- Submitting all-correct answers yields `score === quiz.questionCount`.
- Submitting all-wrong yields `score === 0`.
- Tampering payload to include another quiz's `questionId` returns 400.

### Risks

- **Race on identifier collision detection.** Two simultaneous submits with the same identifier could both pass the pre-check before either inserts. Mitigation: rely on the DB UNIQUE constraint to catch it; the catch-and-retry logic above is the correct pattern.
- **Forgetting to include unanswered questions in `attempt_answers`.** Decision: insert one `AttemptAnswer` row per question with `selectedOptionId: null` for unanswered. Keeps analytics clean.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Zod request schema | ✅ | Mechanical |
| Grading function | ✅✅ | Show the pseudocode; AI fills in cleanly |
| Collision retry pattern | ⚠️ | AI may suggest "increment the suffix" or "keep retrying" — push back, follow the design |
| Timestamp formatter | ✅ | Trivial |

---

## 10. Phase 6 — Analytics Dashboard

### Phase Goal

The manager opens `/r/{resultsToken}` and sees who took the quiz, average score, per-question accuracy, all up-to-date.

### Tasks

- [ ] `lib/services/analytics.ts` — single function `getAnalytics(resultsToken)` returns the full payload
- [ ] `app/api/analytics/[token]/route.ts` — GET handler (used if we want client-side polling later; for MVP the page can call the service directly)
- [ ] `app/r/[token]/page.tsx` — RSC: fetch + render
- [ ] `app/r/[token]/_components/StatsCards.tsx` — 4 cards: total attempts, average score %, highest, lowest
- [ ] `app/r/[token]/_components/SubmissionsTable.tsx` — shadcn `<Table>`: identifier, score, %, submittedAt
- [ ] `app/r/[token]/_components/QuestionAccuracy.tsx` — bar list showing each question's correct rate
- [ ] Empty state: "No submissions yet — share the quiz link and check back."
- [ ] Auto-refresh: simple `setInterval` poll every 10s, OR a manual "Refresh" button (recommended for MVP)

### Score aggregation queries

All in one service function for simplicity:

```ts
const quiz = await prisma.quiz.findUnique({
  where: { resultsToken },
  include: { document: { select: { filename: true } } },
});
if (!quiz) throw new AppError('RESULTS_NOT_FOUND', 404, 'Results not found.');

const attempts = await prisma.attempt.findMany({
  where: { quizId: quiz.id },
  orderBy: { submittedAt: 'desc' },
  select: { id: true, identifier: true, score: true, totalQuestions: true, submittedAt: true },
});

const total = attempts.length;
const summary = total === 0 ? null : {
  totalAttempts: total,
  averageScore: avg(attempts.map(a => a.score)),
  averagePercent: avg(attempts.map(a => a.score / a.totalQuestions)) * 100,
  highest: Math.max(...attempts.map(a => a.score)),
  lowest:  Math.min(...attempts.map(a => a.score)),
};

const questionAccuracy = await prisma.$queryRaw`
  SELECT q.id   as "questionId",
         q.text,
         COUNT(aa.id) as "attemptCount",
         AVG(CASE WHEN aa."isCorrect" THEN 1.0 ELSE 0.0 END)
           FILTER (WHERE aa.id IS NOT NULL)::float as "correctRate"
    FROM questions q
    LEFT JOIN attempt_answers aa ON aa."questionId" = q.id
   WHERE q."quizId" = ${quiz.id}
   GROUP BY q.id, q.text, q."orderIndex"
   ORDER BY q."orderIndex";
`;
```

Why this shape:

- Because the bank holds `2 × questionCount` questions but each attempt only sees `questionCount`, some questions in the bank may legitimately have **zero** attempts. Without care, a question that has never been shown would be reported as "0% correct" — a misleading signal at low traffic.
- `COUNT(aa.id)` exposes how many attempts saw this question. UI distinguishes "no data" (`attemptCount === 0`) from "everyone got it wrong" (`attemptCount > 0 && correctRate === 0`).
- `FILTER (WHERE aa.id IS NOT NULL)` makes `correctRate` come back as `NULL` (not `0.0`) when no rows match — defensive duplication of the `attemptCount === 0` signal.

Yes, one raw query for `questionAccuracy` is intentional. Doing it via Prisma's relation API requires a two-step fetch + JS aggregation that's harder to read.

### Recommended visualizations

**Keep it cheap.**

- Stats cards (4 numbers) — pure HTML/Tailwind, no chart library.
- Submissions table — shadcn `<Table>`.
- Per-question accuracy — a horizontal "bar" rendered with a Tailwind div whose width is `${rate * 100}%`. When `attemptCount === 0`, render a muted "No attempts yet" label instead of a 0%-width bar. **Do not add Chart.js, Recharts, or D3 for MVP.** A 200-byte styled div is faster to write, faster to load, and easier to demo.

### Lightweight analytics approach

- One service function call.
- One RSC page.
- No client-side state beyond a refresh button.
- Polling, only if there's time. Otherwise, "Refresh" button is sufficient.

### Deliverables

- `/r/{resultsToken}` shows everything required by spec §8.7.
- Empty state visible when no submissions exist.

### Dependencies

- Phase 5 complete (attempts being persisted).

### Acceptance Criteria

- After 3 test submissions, dashboard shows 3 rows in the table, correct average score, correct highest/lowest.
- Per-question accuracy matches manual SQL spot-check.
- A question that was never shown across the 3 test submissions renders as **"No attempts yet"**, not "0%".
- Visiting with a wrong `resultsToken` returns 404.

### Risks

- **Raw SQL drift if schema renamed.** Acceptable for MVP; single query, easy to spot.
- **Polling spam.** Use a long interval (10s) or just a manual refresh button.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Aggregation service | ✅✅ | Show the schema + the desired payload; AI writes clean Prisma code |
| Stats cards UI | ✅✅ | shadcn `<Card>` patterns AI knows |
| Submissions table | ✅ | Standard shadcn `<Table>` |
| Bar visualization (Tailwind div) | ✅ | Trivial |
| Raw SQL aggregation | ⚠️ | Verify table/column names match Prisma `@map` directives |

---

## 11. Phase 7 — UI Polish & Demo Preparation

### Phase Goal

Move from "works on my dev machine" to "demos cleanly on the projector."

### Tasks

UX polish:

- [ ] Add `loading.tsx` to every route segment (skeletons via shadcn `<Skeleton>`)
- [ ] Add `error.tsx` to every route segment (user-friendly message + retry)
- [ ] Empty states everywhere a list could be empty
- [ ] Mobile responsive check at 375px width (Chrome devtools); fix any overflow
- [ ] Favicon + page title per route
- [ ] OG tags on the landing page (nice for a shared demo URL)

Demo prep:

- [ ] Prepare 1–2 real handbook PDFs (something realistic, not Lorem Ipsum)
- [ ] **Pre-generate** the demo quiz on the production URL well before the demo. Do not rely on live generation on stage — OpenAI hiccups, cold starts, and network jitter make live AI calls the highest risk in the run.
- [ ] Generate a second backup quiz in case the primary token gets corrupted/lost
- [ ] Write down `publicToken` and `resultsToken` of both quizzes on a sticky note
- [ ] Have a co-host pre-submit 3 attempts with different identifiers so the dashboard isn't empty
- [ ] Rehearse the demo flow end-to-end on the actual production URL, **not** localhost
- [ ] Record a 90s screen capture as backup if live demo fails

If you absolutely must demo live generation (e.g. judges ask):

- [ ] Have a *third* document already uploaded so you only press "Generate" — that's the slow path that benefits from a warm function. Open `/manager/new` ~2 min before demo and trigger one cheap action (e.g. start an upload then cancel) to warm the lambda; don't bother warming `GET /api/quizzes/{token}` — it's a different code path.

Performance pass:

- [ ] Audit Network tab — anything > 200KB unexpected?
- [ ] Lighthouse mobile run on `/q/{token}` — target Performance ≥ 70

### What matters most for hackathon judging

In rough order of judge impact:

1. **The demo runs without crashing.** Nothing else matters if step 1 fails.
2. **The "wow" moment is clear.** Upload → 30s → working quiz. Make sure the timing of the spinner is rehearsed; pause for effect.
3. **Mobile responsiveness.** Judges often pull out a phone.
4. **Empty states / error states aren't ugly.** Even brief visibility matters.
5. **Polish on the manager side is less important than on the participant side.** Participants are who judges imagine using the product.

### Deliverables

- A demo URL on a custom or vercel.app subdomain.
- A printed (or sticky-noted) cheat sheet with: demo URL, publicToken, resultsToken, fallback URLs.

### Dependencies

- Phase 6 complete; full happy path works.

### Acceptance Criteria

- The full flow (upload → generate → take quiz → submit → view dashboard) completes in < 2 minutes on the production URL.
- Demo works in Chrome incognito (no cached state).
- Demo works on a phone screen.

### Risks

- **OpenAI rate-limited or slow during demo.** Mitigation: demo quiz is **pre-generated**; live AI calls are off the critical path.
- **Vercel cold start adds 5–8s on first request.** For the demo's hot path (taking the quiz, viewing the dashboard), this is acceptable. If a live `Generate` is shown, warm the upload/generate page beforehand — but only as a contingency, not the planned path.
- **Live demo network failure.** Mitigation: 90s screen recording as fallback.

### AI-Assisted Development Opportunities

| Task | AI? | Notes |
|---|---|---|
| Skeleton states | ✅ | Standard shadcn |
| Error.tsx + Loading.tsx files | ✅ | Boilerplate per route |
| Empty state components | ✅ | Trivial |
| Demo data prep | ❌ | Manual (uploading real PDFs) |
| Rehearsal | ❌ | Definitely manual |

---

## 12. Recommended Git Workflow

**Lightweight trunk-based.** No PR ceremony beyond a quick second pair of eyes.

### Branching

- `main` — protected, deploys to Vercel production.
- `feat/<phase>-<slug>` — short-lived feature branches, e.g. `feat/3-ai-generation`.
- One PR per phase or per substantial sub-task.

### Commits

- Conventional-ish, but loose: `feat: add document upload`, `fix: pdf-parse ESM import`, `chore: bump shadcn`.
- Keep commits small (one logical change). When in doubt, split.
- If you're 30 minutes in and haven't committed, commit a WIP and keep going.

### PRs

- Title = scope (`Phase 3: AI generation pipeline`).
- Description = what changed + how to verify (paste a curl command or steps).
- One reviewer (the other person on the team). Don't block on review for hot fixes.

### Hot fixes during demo prep

- Direct push to `main` is acceptable in the final 4 hours before demo if a teammate verbally says "go."
- No `--force` push. Ever. If something is broken on `main`, push a forward fix.

---

## 13. Recommended AI Coding Workflow

Most code in this project should be AI-generated. Doing it right requires discipline.

### 13.1 The "context contract" — give AI four things, every time

1. **The relevant section of the spec or design doc** (paste the actual paragraphs, not "see the spec").
2. **The file path being created or modified.**
3. **The interfaces / types it must conform to** (Zod schemas, Prisma types, function signatures).
4. **The constraint envelope** ("no extra deps", "synchronous only", "use the existing AppError class").

Without all four, AI hallucinates.

### 13.2 Patterns that work well

| Pattern | When | Example prompt opener |
|---|---|---|
| **Translate-from-design** | Code is already specified in `technical-design.md` | "Implement `lib/randomization/shuffleOptions.ts` exactly as specified in technical-design §8.2 below: …" |
| **Fill-the-shape** | Function signature is decided, body is mechanical | "Implement this function. Inputs/outputs already typed below. Use Prisma client `prisma`. …" |
| **Skeleton-then-fill** | Complex feature | First prompt: "Generate file skeletons with TODOs". Second: "Now fill in the upload service." |

### 13.3 Patterns that fail

| Anti-pattern | Why it fails |
|---|---|
| "Build the AI quiz generator" | Too broad; AI invents architecture |
| "Make this faster" | No baseline; AI adds caching/queues we don't want |
| "Add tests" without specifying scope | AI generates 30 test cases for one function |
| "Refactor for clean code" | AI splits one file into seven; reverse churn |

### 13.4 Generating components

For every shadcn-based component:

```
You are writing a React Server Component file at app/q/[token]/page.tsx.
Use:
- Tailwind classes only (no inline styles)
- shadcn primitives from @/components/ui/* (Button, Card, RadioGroup)
- The `prisma` client from @/lib/db/prisma
- The QuestionView type from @/types/shared

The page should:
1. Read the [token] param.
2. Find the quiz; 404 if not found.
3. Pull all questions with options.
4. Use selectQuestions(bank, quiz.questionCount) to pick a subset.
5. Use shuffleOptions(q) on each.
6. Render QuizForm (already exists, client component) with the result.

Do NOT add a layout. Do NOT add metadata. Do NOT add error handling beyond
notFound() — the route segment's error.tsx covers it.
```

The "Do NOT" list saves more time than the "Do" list.

### 13.5 Generating APIs

```
You are writing a Next.js Route Handler at app/api/attempts/route.ts.

Imports available:
- prisma from @/lib/db/prisma
- AppError, toResponse from @/lib/errors
- submitAttemptSchema from @/lib/schemas/api
- attemptsService from @/lib/services/attempts

The handler:
- Accept POST with JSON body
- Parse with submitAttemptSchema
- Call attemptsService.submit(parsed)
- Return { data: result } with status 201
- Map any thrown error via toResponse(e)

Keep the file < 30 lines. No middleware. No auth (MVP).
```

Force the size constraint. AI will respect it.

### 13.6 Validating generated code

After every AI-generated file, run **all four** in this order:

1. `pnpm tsc --noEmit` — type check
2. Quickly scan the imports — does AI hallucinate a non-existent module? Common: `@/lib/utils/something-AI-invented`.
3. Run the relevant code path manually (curl, browser).
4. Check the diff against the spec section for hidden scope creep.

### 13.7 Avoiding hallucinated architecture

Common AI failure modes in this project:

| Hallucination | What AI tries to add | Counter |
|---|---|---|
| Caching | Redis client, in-memory LRU | "No caching for MVP. Direct DB only." |
| Auth | Supabase Auth, NextAuth | "No auth in MVP. Public links only." |
| Background jobs | Inngest, BullMQ, Vercel Cron | "Synchronous only. Spec defers async to v2." |
| Error wrapping | New error classes | "Use the existing AppError class." |
| Logging libraries | winston, pino | "console.error is sufficient for MVP." |
| Validation libraries | yup, joi | "Use Zod, the existing dep." |

When AI suggests one of these, **stop, and rewrite the prompt with an explicit "do not introduce X" clause.**

---

## 14. Recommended Task Granularity

### 14.1 The 1–3 hour rule

Every implementable unit of work should be 1–3 hours of focused effort. If you can't articulate what "done" looks like in one sentence, the task is too big.

| Size | Example | Reaction |
|---|---|---|
| **Right** | "Add `lib/parsers/pdf.ts` per design §6.4" | Do it |
| **Too big** | "Build the upload feature" | Split into UI / API / parsers / wiring |
| **Too small** | "Add prettier config" | Bundle with phase 0 setup |

### 14.2 How to split

Two heuristics:

1. **By file boundary.** Each task touches at most 3 files. More than that = split.
2. **By acceptance check.** Each task has exactly one thing to demonstrate ("uploading a PDF returns documentId").

### 14.3 Examples (good)

- `Phase 2 / Task 4`: Implement `lib/parsers/pdf.ts`. Acceptance: a unit-style smoke from `node` REPL extracts text from a sample PDF.
- `Phase 3 / Task 2`: Implement `lib/ai/chunker.ts` exactly per design §7.2. Acceptance: chunking a 50k-char string returns the expected chunk count.
- `Phase 4 / Task 1`: Implement `lib/randomization/selectQuestions.ts` per design §8.2. Acceptance: passes 3 manual cases (n < bank, n == bank, n > bank).

### 14.4 Examples (bad)

- "Make randomization work" — vague; what's the acceptance?
- "Add the analytics dashboard" — multi-file; should be 5 sub-tasks.
- "Fix all the linting errors" — open-ended; cap at "fix linting errors blocking commit".

### 14.5 Organizing for AI-assisted coding

Before invoking AI on a task, write a "prompt header" stub:

```
# Task: Phase 3 / Task 4 — Persistence transaction
# Files: lib/services/quizzes.ts (modify)
# Inputs: validated AI questions array, documentId, questionCount
# Output: { quizId, publicToken, resultsToken }
# Constraints: single Prisma $transaction; cuid2 tokens; respect questionCount
# Acceptance: test by calling from a tinker script
```

Pasting that header into the AI prompt → 80% better output.

---

## 15. Testing Strategy

**Lightweight, intentional, MVP-appropriate.** We are not writing tests for tests' sake.

### 15.1 What to test (priorities)

1. **Pure logic** — randomization, grading, identifier formatting. These are easy to unit-test and have the worst failure modes (silent miscounts).
2. **Zod schemas** — quick sanity tests that valid input passes and invalid input rejects.
3. **Critical service paths** — at least one happy-path call to `quizzesService.generateForDocument` with mocked OpenAI (after Phase 3 stabilizes).

### 15.2 What NOT to test (for MVP)

- React component rendering (manual verification is faster).
- API endpoints in isolation (covered by manual smoke tests).
- DB layer (Prisma is reliable).
- OpenAI integration end-to-end (slow, flaky, expensive).

### 15.3 Tooling

- `vitest` — Node-based unit tests. No browser tooling.
- One test file per pure-logic file: `lib/randomization/selectQuestions.test.ts` etc.
- Skip Playwright / Cypress / RTL for MVP.

### 15.4 Manual testing checklist

Run before every demo-readiness commit:

- [ ] Upload a PDF → success
- [ ] Upload a DOCX → success
- [ ] Upload a Markdown file → success
- [ ] Upload a ZIP → 415 error visible
- [ ] Generate a quiz → 5+ questions in DB
- [ ] Open `/q/{token}` → randomized
- [ ] Refresh `/q/{token}` → different order at least sometimes
- [ ] Submit with empty identifier → blocked
- [ ] Submit valid → score returned
- [ ] Submit twice with same identifier → second has timestamp suffix
- [ ] Open `/r/{token}` → submissions visible
- [ ] Open `/r/{wrong-token}` → 404
- [ ] On mobile (375px width) the quiz page is scrollable, no clipped buttons

### 15.5 What "tested enough" looks like

If you can run the manual checklist in 10 minutes and tick everything, you're ready to demo. Don't aim higher.

---

## 16. Deployment Plan

### 16.1 Vercel deployment

- Project linked to GitHub repo.
- Auto-deploy on push to `main`.
- Auto-preview on PR branches.
- Pro plan (60s function timeout — required).

### 16.2 Environment variable management

- All secrets in Vercel Project Settings → Environment Variables.
- Mirror `.env.local` keys; never commit secrets.
- Set per environment: Production / Preview / Development.

| Variable | Where to source | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) | append `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase direct URL (port 5432) | for migrations |
| `OPENAI_API_KEY` | OpenAI dashboard | spending cap recommended |
| `SUPABASE_URL` | Supabase project settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API | server-only |
| `SUPABASE_STORAGE_BUCKET` | constant `docs` | |

### 16.3 Production database setup

- Use a *production* Supabase project, distinct from dev.
- Run `pnpm prisma migrate deploy` once after Phase 1 finalized.
- Re-run after every schema change.
- **Do not** run `prisma db push` against production.

### 16.4 Production storage setup

- Bucket name `docs`, **private** (server-side access only via service-role key).
- No public read; uploads are proxied through the API.
- File size cap defaults are fine; our 15MB API gate is below them.

### 16.5 Deployment order (first-time)

1. Verify env vars in Vercel (all 6).
2. Push `main` → Vercel build succeeds.
3. From local, `pnpm prisma migrate deploy` against production `DIRECT_URL`.
4. Hit the deployed URL → default page or `/manager/new` loads.
5. Smoke-test: upload a small PDF on the production URL.
6. Smoke-test: generate quiz, take quiz, view dashboard.

### 16.6 Release checklist (before every demo)

- [ ] Latest `main` deployed and green
- [ ] All env vars present in Vercel Production
- [ ] Production DB has the latest migration applied
- [ ] OpenAI API key is valid (test with one quick generation, then leave alone)
- [ ] Storage bucket is reachable (one test upload)
- [ ] **Demo quiz is pre-generated on production**; primary + backup tokens recorded on the cheat sheet
- [ ] Cheat sheet (publicToken, resultsToken, demo URL) printed/sticky-noted and current
- [ ] At least 3 dummy attempts already submitted against the demo quiz so the dashboard is not empty
- [ ] Backup screen recording exists

---

## 17. Final MVP Checklist

Production readiness gate. **All of these must be true** before declaring "MVP done."

### Functional

- [ ] Upload a PDF → text in DB
- [ ] Upload a DOCX → text in DB
- [ ] Upload a Markdown file → text in DB
- [ ] Generate a quiz from an uploaded document → Quiz + Questions + Options persisted
- [ ] Bank size persisted = exactly `2 × questionCount`
- [ ] Generated questions all have 4 options, exactly one correct
- [ ] `publicToken` and `resultsToken` are non-guessable (cuid2)
- [ ] `/q/{token}` displays exactly `quiz.questionCount` questions, randomly selected from the bank, with shuffled option order
- [ ] No `isCorrect` ever leaks to the client (verified via curl + DevTools Network)
- [ ] Participant submits → score returned + persisted
- [ ] Duplicate identifier → auto-append `_yyyyMMddHHmmss`
- [ ] Retake allowed; each attempt is its own record
- [ ] `/r/{token}` shows total, average, highest, lowest, table, per-question accuracy
- [ ] Per-question accuracy distinguishes "No attempts yet" (`attemptCount === 0`) from "0% correct"
- [ ] Wrong tokens → 404

### Non-functional

- [ ] Generation completes < 30s for a typical 50-page PDF
- [ ] Pages load < 3s on Vercel production
- [ ] No null bytes / encoding artifacts in any document
- [ ] All API errors return `{ error: { code, message } }` with proper HTTP status
- [ ] All env vars validated at boot (`@t3-oss/env-nextjs` throws if missing)

### UX

- [ ] Loading skeletons on every route
- [ ] Error boundaries on every route
- [ ] Empty states on dashboard and manager landing
- [ ] Mobile responsive at 375px width
- [ ] Toast feedback on every form action

### Demo

- [ ] At least one realistic seed document uploaded in production
- [ ] At least one realistic quiz generated in production
- [ ] At least 3 dummy attempts so the dashboard is not empty
- [ ] Demo cheat sheet (URLs + tokens) printed / sticky-noted
- [ ] 90-second backup screen recording stored locally
- [ ] Rehearsed end-to-end on the production URL within the last 2 hours

When all checked: **demo it.**

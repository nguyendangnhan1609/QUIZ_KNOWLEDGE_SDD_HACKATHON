# Phase 3 — AI Quiz Generation (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, §7  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, §7  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1  
Authoritative schema: [`quiz-knowledge/prisma/schema.prisma`](../../../quiz-knowledge/prisma/schema.prisma)

This is the executable task list for Phase 3. Each task is sized to be a single AI prompt or a single ~30–45-minute block of work.

> **Read §8 Open Issues before starting.** Three contradictions between the source plan and source design were resolved by the team for this phase. The decisions live in §1 ("Contract") and §8.

---

## 1. Phase Overview

### Purpose

Turn a parsed `Document` into a persisted `Quiz` with a question bank, by orchestrating chunked OpenAI calls, validating outputs with Zod, and writing the entire result inside one Prisma transaction. AI is invoked **only** at generation time — every downstream attempt (Phase 5) re-uses the persisted bank without further AI cost.

### Expected outcome

After Phase 3:

- A manager who has uploaded a document (Phase 2) can navigate to `/manager/quizzes/new?documentId=…`, enter `questionCount` (5–30), click **Generate**, and receive two public URLs (`/q/<publicToken>` and `/results/<resultsToken>`) within ~30 seconds for a typical 10-page PDF.
- The `quizzes` row stores `questionCount` = the user's input.
- The `questions` table contains exactly **`bankSize = QUESTION_BANK_MULTIPLIER × questionCount`** rows for the new quiz (default multiplier = `2`).
- Each `questions` row has exactly 4 `options` rows; exactly one option has `isCorrect = true`.
- Generation is **strict**: if the validated pool falls short of `bankSize`, the entire request fails (502 `AI_GEN_FAILED`) — no partial quiz is ever persisted.

### Contract (decided for this phase)

| Item | Value | Source |
|---|---|---|
| `quiz.questionCount` | the integer the user entered (5–30) | spec F2 + §Task 3.7 input schema |
| **bank size persisted** | `bankSize = QUESTION_BANK_MULTIPLIER × questionCount` | OI-3.A resolution: A3 (env-configurable, default 2) |
| `QUESTION_BANK_MULTIPLIER` | server-side env, `z.coerce.number().int().min(1).max(3).default(2)` | §Task 3.1 (env addition) |
| Generate route | `POST /api/quizzes` | implementation-plan §7 |
| UI route | `/manager/quizzes/new?documentId=…` | OI-3.B resolution: B2 (matches Phase 2 redirect) |
| Persistence | one Prisma `$transaction` | technical-design §7.10 |
| Default model | `gpt-4o-mini` | technical-design §7.4 |
| Retry model | `gpt-4o` (single retry on Zod / SyntaxError) | technical-design §7.6 |
| Hard wall-clock cap | 55 s via `AbortController` | implementation-plan §7 |

### Why this setup matters for future phases

- **Phase 4 (Manager Dashboard)** lists quizzes by `createdAt` and links to their public URLs; the data Phase 3 persists is exactly what Phase 4 renders.
- **Phase 5 (Participant Attempt)** server-side selects a random subset of size `quiz.questionCount` from `bankSize` candidates. Phase 5's randomization §8 only works because Phase 3 over-produced the bank — if `QUESTION_BANK_MULTIPLIER = 1`, randomization across attempts degrades to "same N questions, only option order shuffled".
- **Phase 6 (Results Analytics)** joins `attempts → attempt_answers → questions/options` and groups by question. The `Question.orderIndex` Phase 3 writes is the canonical bank position, **not** the per-attempt display order.
- **Locking the contract early** prevents the highest-risk phase from rewriting downstream phases. `bankSize` is the only number Phase 5/6 must trust; the multiplier is invisible to them.

### Risk acknowledgment

This is the **highest-risk phase**. Plan mentally for **2 attempts** — first pass to wire the pipeline, second pass to harden retry / abort / strict-pool logic. Each step in §Task 3.0 → 3.5 is a separate commit; if anything breaks, revert one step, not the whole feature.

---

## 2. Setup Goals

- [ ] Add `QUESTION_BANK_MULTIPLIER` to `lib/config/env.ts` (server-side, default `2`).
- [ ] Install `openai` and `tiktoken` packages.
- [ ] Build `lib/ai/client.ts` — singleton OpenAI client from `env.OPENAI_API_KEY`.
- [ ] Build `lib/ai/chunker.ts` — tiktoken-based, `chunkText(text, maxTokens=3000)`.
- [ ] Build `lib/ai/prompts.ts` — `SYSTEM_PROMPT` + `userPrompt(chunk, n)` (verbatim from technical-design §7.3).
- [ ] Build `lib/schemas/ai.ts` — `aiQuestionSchema` + `aiResponseSchema` (per technical-design §7.5).
- [ ] Build `lib/ai/generateQuestions.ts` — orchestration (parallel chunks → Zod → 1 retry → flatten → take exactly `bankSize`); 55s `AbortController`.
- [ ] Build `lib/services/quizzes.ts` — wraps generation + persistence in a single Prisma `$transaction`.
- [ ] Build `app/api/quizzes/route.ts` — POST handler; input `{ documentId, questionCount }`; output `{ quizUrl, resultsUrl, … }`.
- [ ] Build UI route `/manager/quizzes/new?documentId=…` with a number input (default 10, min 5, max 30) and Generate button.
- [ ] Build `<GenerationProgress>` client component — elapsed-time spinner, soft warning at 30 s, hard cap UI at 60 s.
- [ ] Build `<PublicLinkPanel>` showing both URLs + copy-to-clipboard.
- [ ] Add validation tests (chunker, AI Zod schema, mocked-OpenAI orchestration happy / retry / strict-pool-fail paths).
- [ ] Manual QA pass with a real ~10-page PDF, then commit Phase 3 as one PR.

---

## 3. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 3.0 — Stub-First Pipeline Wiring

**Objective.** Wire the entire pipeline (UI button → POST `/api/quizzes` → service → stub generator → DB persist → response) using a hardcoded stub generator that returns `bankSize` placeholder questions. Confirm end-to-end flow before any real AI call.

**Technical Requirements.**

Files to create (placeholder versions, replaced by later tasks):

- `src/lib/ai/generateQuestions.ts` — exports `generateQuestions({ text, count }: { text: string; count: number })` that **ignores `text`** and returns an array of `count` hardcoded `AIQuestion`-shaped objects.
- `src/lib/services/quizzes.ts` — calls `generateQuestions` with `count = bankSize`, persists via Prisma transaction, returns `{ quizId, publicToken, resultsToken, questionCount, bankSize }`.
- `src/app/api/quizzes/route.ts` — POST handler ~30 LOC; Zod-validates body `{ documentId: number, questionCount: number }`; returns `201 { data: { quizUrl, resultsUrl, quizId, questionCount, bankSize } }`.
- `src/app/manager/quizzes/new/page.tsx` — RSC reading `?documentId=…`, renders heading + `<GenerateForm />` client component.
- `src/app/manager/quizzes/new/_components/GenerateForm.tsx` — number input + submit; on success, replace form with `<PublicLinkPanel>`.

The stub generator hardcodes one question template, varying only the question number:

```ts
// stub – replaced in Task 3.5
return Array.from({ length: count }, (_, i) => ({
  question: `Stub question ${i + 1}: what is the topic of this document?`,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correctIndex: 0,
  explanation: 'Stub explanation.',
  difficulty: 'easy' as const,
}));
```

**Why stub first.** Phase 3 has eight moving parts (chunker, prompts, OpenAI, Zod, retry, abort, transaction, UI). Wiring them all before exercising the happy path means three classes of bugs stack up at once. The stub flushes out routing, transaction, and contract bugs in 30 minutes.

**Pitfall.** Tempting to skip this task. Don't. Every project that has skipped stub-first on AI features has spent 2× longer debugging.

**Dependencies.** Phase 2 complete (Document with `textContent` exists in DB).

**Acceptance Criteria.**

- `curl -X POST localhost:3000/api/quizzes -H 'content-type: application/json' -d '{"documentId":1,"questionCount":10}'` → 201, returns two URLs and IDs.
- One row appears in `quizzes`, twenty rows in `questions`, eighty rows in `options` (assuming default multiplier `2`, so `bankSize = 20`).
- UI submission from `/manager/quizzes/new?documentId=1` shows the generated URLs.
- All assertions pass while OpenAI is **not** invoked once.

**Validation Steps.**

1. `pnpm dev` → POST via UI form → toast/panel renders both URLs.
2. Supabase Studio → confirm row counts (1 quiz, 20 questions, 80 options).
3. Inspect server logs → no OpenAI mention.

**Estimated Complexity.** Medium (mostly plumbing).

**AI Coding Opportunity.** ✅✅ High — paste this task's spec; AI generates wiring + stub cleanly.

---

### Task 3.1 — Add `QUESTION_BANK_MULTIPLIER` Env + OpenAI Client Singleton

**Objective.** Add the new env variable that controls bank size, install the `openai` package, and create a server-only OpenAI client singleton. (This task replaces no stub yet — it sets up the foundation Tasks 3.2–3.5 will wire in.)

**Technical Requirements.**

Edit `src/lib/config/env.ts` (additive only — do not remove fields):

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(10),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
    SUPABASE_STORAGE_BUCKET: z.string().default('docs'),
    QUESTION_BANK_MULTIPLIER: z.coerce.number().int().min(1).max(3).default(2),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    QUESTION_BANK_MULTIPLIER: process.env.QUESTION_BANK_MULTIPLIER,
  },
});
```

Update `.env.example` (add line `QUESTION_BANK_MULTIPLIER=2`). `.env.local` does **not** need this set — the default of `2` applies automatically when the variable is absent.

Install OpenAI SDK:

```bash
pnpm add openai
```

Create `src/lib/ai/client.ts`:

```ts
import OpenAI from 'openai';
import { env } from '@/lib/config/env';

const globalForOpenAI = globalThis as unknown as { openai?: OpenAI };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({ apiKey: env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== 'production') {
  globalForOpenAI.openai = openai;
}
```

Singleton pattern mirrors `lib/db/prisma.ts` for hot-reload safety.

**Pitfall — env coercion.** `process.env.QUESTION_BANK_MULTIPLIER` is a string. Use `z.coerce.number()`, not `z.number()`, or the parse fails when the var is set in `.env.local`.

**Pitfall — clamp range `[1, 3]`.** Hard upper bound prevents accidental `QUESTION_BANK_MULTIPLIER=10` blowing token cost 5× without the operator noticing.

**Dependencies.** Phase 0 (env infrastructure) + Phase 2 (existing env shape).

**Acceptance Criteria.**

- `pnpm tsc --noEmit` exits 0.
- Importing `env.QUESTION_BANK_MULTIPLIER` returns `2` when the var is unset (default) and the configured value when set.
- Importing `openai` from `@/lib/ai/client` returns an instance with `apiKey` populated.
- `.env.example` documents the new variable.

**Validation Steps.**

1. Add temporary route `src/app/api/_envcheck/route.ts` returning `{ multiplier: env.QUESTION_BANK_MULTIPLIER }` → confirm `2`.
2. Set `QUESTION_BANK_MULTIPLIER=3` in `.env.local`, restart dev → returns `3`.
3. Set to `5` → boot fails with Zod validation error (good).
4. Delete the temporary route.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Add `QUESTION_BANK_MULTIPLIER` to `src/lib/config/env.ts` using `z.coerce.number().int().min(1).max(3).default(2)`. Create `src/lib/ai/client.ts` exporting an OpenAI singleton via globalThis cache, mirroring the Prisma singleton pattern at `src/lib/db/prisma.ts`."

---

### Task 3.2 — Implement Tiktoken Chunker

**Objective.** Replace the stub generator's `text` parameter (currently ignored) with a real chunker that splits document text into ~3000-token slices using `tiktoken`.

**Technical Requirements.**

Install:

```bash
pnpm add tiktoken
```

Create `src/lib/ai/chunker.ts` (verbatim from technical-design §7.2 with explicit free / cleanup):

```ts
import { encoding_for_model } from 'tiktoken';

export function chunkText(text: string, maxTokens = 3000): string[] {
  if (!text || text.trim().length === 0) return [];
  const enc = encoding_for_model('gpt-4o-mini');
  try {
    const tokens = enc.encode(text);
    const chunks: string[] = [];
    for (let i = 0; i < tokens.length; i += maxTokens) {
      const slice = tokens.slice(i, i + maxTokens);
      chunks.push(new TextDecoder().decode(enc.decode(slice)));
    }
    return chunks;
  } finally {
    enc.free();
  }
}
```

Notes:

- `enc.decode` returns `Uint8Array` in current `tiktoken` builds; wrap in `TextDecoder` for `string` output. Verify against installed version's typings.
- `enc.free()` is mandatory — the WASM allocator leaks otherwise.
- Boundaries may cut a sentence; the prompt explicitly tells the model to ignore truncated fragments at chunk edges (technical-design §7.7).
- **Cap chunks at 8** in callers (Task 3.5) for very long documents — beyond ~24k input tokens, more chunks add wall-clock without quality.

**Pitfall — WASM cold start.** First call after deploy is ~500 ms slower than subsequent calls. Acceptable for Phase 3.

**Pitfall — stale `tiktoken` ABI.** If `pnpm add tiktoken` pulls a major-version mismatch with Next.js's bundler, the build breaks at install time. Pin to a known-good version once one works.

**Dependencies.** Task 3.1 (env + OpenAI client unrelated, but in-order). Phase 2's `Document.textContent` is the input source.

**Acceptance Criteria.**

- `chunkText('')` → `[]`.
- `chunkText('short text')` → array of length 1.
- `chunkText(<long text>)` → multiple chunks, each `≤ 3000` tokens decoded, total reconstructed text ≈ original (modulo BPE round-trip).
- Calling `chunkText` 100× in a loop does **not** leak memory (test by running test suite under `--logHeapUsage` if available).

**Validation Steps.**

1. Add unit test `src/lib/ai/chunker.test.ts`:
   ```ts
   import { describe, it, expect } from 'vitest';
   import { chunkText } from './chunker';

   describe('chunkText', () => {
     it('handles empty', () => expect(chunkText('')).toEqual([]));
     it('returns single chunk for short text', () =>
       expect(chunkText('hello world')).toHaveLength(1));
     it('splits long text', () => {
       const long = 'word '.repeat(20000);
       expect(chunkText(long, 1000).length).toBeGreaterThan(1);
     });
   });
   ```
2. Replace stub generator's body to log chunk count + sizes (still no OpenAI call). Confirm logs make sense for a real document.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅ High — but verify the `enc.decode` return type against the installed `tiktoken` version. AI sometimes assumes string return. Prompt: "Implement `src/lib/ai/chunker.ts` per technical-design §7.2. Use `encoding_for_model('gpt-4o-mini')`. Always call `enc.free()` in `finally`. Return empty array on empty input."

---

### Task 3.3 — Prompts Module

**Objective.** Externalize the system + user prompts into a dedicated module, verbatim from technical-design §7.3.

**Technical Requirements.**

Create `src/lib/ai/prompts.ts`:

```ts
export const SYSTEM_PROMPT = `
You are an expert assessment designer creating multiple-choice questions
from internal company documentation. Your goal is to test COMPREHENSION,
not memorization of trivia.

Hard rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown fences.
- Every question MUST have exactly 4 options.
- Exactly ONE option is correct.
- Distractors must be plausible but unambiguously wrong based on the source.
- Do NOT invent facts not present in the source. If unsure, skip.
- Difficulty: "easy" (recall), "medium" (application), "hard" (inference).
- Explanation: 1-2 sentences citing the source content.
- Ignore truncated fragments at the very start or end of the content block.
`.trim();

export const userPrompt = (chunk: string, n: number) => `
Generate ${n} multiple-choice questions from the following content.

<content>
${chunk}
</content>

Return JSON in this exact shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctIndex": 0,
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
`.trim();
```

**Hard rule.** Do **not** modify these strings without checking that the `<content>` tag and the "do not invent facts" line remain intact (technical-design §7.7 hallucination mitigation).

**Pitfall — accidental backticks in chunk text.** Chunks may contain literal markdown that includes backticks. Template literal interpolation handles this fine; do **not** wrap `${chunk}` in additional backticks.

**Dependencies.** None — pure constants + factory.

**Acceptance Criteria.**

- File exports `SYSTEM_PROMPT` (string) and `userPrompt` (function).
- Strings byte-match technical-design §7.3 (one round of copy-paste — no edits).
- `userPrompt('hello', 3).includes('Generate 3')` returns `true`.

**Validation Steps.**

1. Diff against technical-design §7.3 — should be byte-identical aside from formatting.
2. Snapshot test optional but cheap.

**Estimated Complexity.** Low (~5 minutes).

**AI Coding Opportunity.** ✅✅ High — pure copy. Prompt: "Create `src/lib/ai/prompts.ts` with `SYSTEM_PROMPT` constant and `userPrompt(chunk, n)` factory, copying the strings verbatim from `docs/architecture/technical-design.md` §7.3."

---

### Task 3.4 — Zod AI Schemas

**Objective.** Encode the AI response shape as Zod schemas so every OpenAI return value is validated before persistence.

**Technical Requirements.**

Create `src/lib/schemas/ai.ts` (per technical-design §7.5):

```ts
import { z } from 'zod';

export const aiQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5).max(800),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const aiResponseSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1),
});

export type AIQuestion = z.infer<typeof aiQuestionSchema>;
export type AIResponse = z.infer<typeof aiResponseSchema>;
```

**Bound rationale.**

- `question.min(10)` filters out single-word "questions".
- `options.length(4)` is hard — exactly 4 options, no more, no less.
- `correctIndex.max(3)` enforces 0..3 range matching 4 options.
- `explanation.max(800)` caps token waste.

Adding stricter validation now (vs in the orchestrator) means Zod errors are precise (`questions.0.options` instead of "something wrong somewhere").

**Pitfall — `.length(4)`.** Zod's `.length` is exact, not max. AI sometimes returns 3 or 5 options; `.length(4)` rejects both. Do not soften this.

**Dependencies.** None.

**Acceptance Criteria.**

- `aiQuestionSchema.parse(<valid object>)` succeeds.
- `aiQuestionSchema.parse(<3 options>)` throws ZodError.
- `aiQuestionSchema.parse(<correctIndex 4>)` throws ZodError.
- `aiResponseSchema.parse({ questions: [] })` throws (`.min(1)` enforces at least one).

**Validation Steps.**

1. Unit test `src/lib/schemas/ai.test.ts` covering 5+ failure modes (wrong count, wrong index, missing field, wrong difficulty, empty array).

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement `src/lib/schemas/ai.ts` per technical-design §7.5. Export `aiQuestionSchema`, `aiResponseSchema`, types `AIQuestion` / `AIResponse`."

---

### Task 3.5 — `generateQuestions` Orchestration

**Objective.** Replace the stub from Task 3.0 with the real orchestrator: chunk → parallel OpenAI calls → Zod validation → single retry with stronger model → flatten → take exactly `bankSize`. Wraps the whole pipeline in a 55s `AbortController`. Strict pool: if `validated.length < bankSize`, throw — never publish a partial quiz.

**Technical Requirements.**

Replace `src/lib/ai/generateQuestions.ts` content:

```ts
import { z } from 'zod';
import { openai } from './client';
import { chunkText } from './chunker';
import { SYSTEM_PROMPT, userPrompt } from './prompts';
import { aiResponseSchema, type AIQuestion } from '@/lib/schemas/ai';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/config/env';

const SOFT_TIMEOUT_MS = 55_000;
const MAX_CHUNKS = 8;
const MAX_TOKENS_PER_CALL = 1200;

export interface GenerateInput {
  text: string;
  questionCount: number;   // user input
}

export interface GenerateOutput {
  bank: AIQuestion[];      // length = bankSize
  bankSize: number;
}

export async function generateQuestions(
  input: GenerateInput,
): Promise<GenerateOutput> {
  const bankSize = env.QUESTION_BANK_MULTIPLIER * input.questionCount;

  const allChunks = chunkText(input.text);
  if (allChunks.length === 0) {
    throw new AppError('AI_GEN_FAILED', 422, 'Document has no extractable text.');
  }

  // Cap chunks; deterministic stride sampling preserves coverage.
  const chunks =
    allChunks.length <= MAX_CHUNKS
      ? allChunks
      : Array.from({ length: MAX_CHUNKS }, (_, i) =>
          allChunks[Math.floor((i * allChunks.length) / MAX_CHUNKS)],
        );

  // Per-chunk budget: ceil so we slightly over-produce.
  const perChunk = Math.ceil(bankSize / chunks.length);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOFT_TIMEOUT_MS);

  try {
    const results = await Promise.all(
      chunks.map((c) => generateForChunk(c, perChunk, ctrl.signal)),
    );

    const validated = results.flatMap((r) => r.questions);

    if (validated.length < bankSize) {
      throw new AppError(
        'AI_GEN_FAILED',
        502,
        'Could not generate enough valid questions. Try a richer document or a lower question count.',
      );
    }

    return { bank: validated.slice(0, bankSize), bankSize };
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new AppError('AI_TIMEOUT', 504, 'Generation took too long. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function generateForChunk(
  chunk: string,
  n: number,
  signal: AbortSignal,
) {
  try {
    const raw = await callOpenAI('gpt-4o-mini', chunk, n, signal);
    return aiResponseSchema.parse(JSON.parse(raw));
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError) {
      // single retry with stronger model
      const raw = await callOpenAI('gpt-4o', chunk, n, signal);
      return aiResponseSchema.parse(JSON.parse(raw));
    }
    throw e;
  }
}

async function callOpenAI(
  model: string,
  chunk: string,
  n: number,
  signal: AbortSignal,
): Promise<string> {
  const completion = await openai.chat.completions.create(
    {
      model,
      temperature: 0.4,
      max_tokens: MAX_TOKENS_PER_CALL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(chunk, n) },
      ],
    },
    { signal },
  );
  return completion.choices[0]?.message?.content ?? '';
}
```

**Notes on the design.**

- **Single retry, not exponential backoff.** Network errors (non-Zod, non-Syntax) propagate; user retries via UI. No retry storm.
- **`AbortController` is the hard wall-clock.** All chunk calls share one signal; aborting the controller cancels every in-flight request.
- **Strict pool check before slice.** `validated.length < bankSize` ⇒ throw. We slice only when we have enough.
- **Deterministic chunk sampling for >8 chunks.** Stride sampling, not random, so two reruns of the same long doc see the same chunks (consistent debugging).
- **`AI_GEN_FAILED` is a 502 (gateway error)**; `AI_TIMEOUT` is 504. UI distinguishes them.

**Add new error codes** to `src/lib/errors.ts` (extend `ErrorCode` union):

```ts
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MIME'
  | 'PARSE_FAILED'
  | 'PARSE_EMPTY'
  | 'STORAGE_FAILED'
  | 'DOCUMENT_NOT_FOUND'   // new — for /api/quizzes
  | 'AI_GEN_FAILED'        // new
  | 'AI_TIMEOUT'           // new
  | 'INTERNAL';
```

**Pitfall — forgot to pass `signal` to the OpenAI client.** AI assistants frequently drop the `signal` from the second-arg options object on the retry path. Verify both `callOpenAI` invocations pass `signal`.

**Pitfall — `Promise.all` rejects fast.** As soon as one chunk's retry also fails, the whole thing rejects — that's the desired "strict pool" behavior. Do **not** wrap in `Promise.allSettled` and try to recover; the strict contract is a feature.

**Dependencies.** Tasks 3.1 (env + client), 3.2 (chunker), 3.3 (prompts), 3.4 (schemas).

**Acceptance Criteria.**

- For a known-good 10-page PDF with `questionCount = 10` and `multiplier = 2`, returns `bank.length === 20`.
- Forcing OpenAI to return invalid JSON on chunk 0 only → retry path triggered → succeeds (verified via mock).
- Forcing all chunks to fail Zod → throws `AI_GEN_FAILED` 502.
- Forcing wall-clock > 55s (mock long delay) → throws `AI_TIMEOUT` 504.
- Bank `multiplier=1` + short doc + bad responses ⇒ same strict failure.

**Validation Steps.**

1. Unit test with mocked `openai.chat.completions.create` covering: happy, retry-success, retry-fail, abort.
2. Integration smoke against real API with a known doc, `questionCount=5` → `bank.length === 10`.

**Estimated Complexity.** High (this is the core of Phase 3).

**AI Coding Opportunity.** ⚠️ Medium. AI tends to over-engineer (exponential backoff, circuit breakers). Insist on the simple "one retry, stronger model" pattern from technical-design §7.6, and verify `signal` is passed on both calls.

---

### Task 3.6 — Quiz Persistence Service (Transaction)

**Objective.** Wrap quiz + questions + options creation into one Prisma `$transaction`, generating `publicToken` and `resultsToken` via `cuid2`, persisting **all** `bankSize` questions, setting `quiz.questionCount` to the user's requested value (NOT the bank size).

**Technical Requirements.**

Install:

```bash
pnpm add @paralleldrive/cuid2
```

Replace `src/lib/services/quizzes.ts`:

```ts
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@/lib/db/prisma';
import { generateQuestions } from '@/lib/ai/generateQuestions';
import { AppError } from '@/lib/errors';

export interface CreateQuizInput {
  documentId: number;
  questionCount: number;
}

export interface CreateQuizResult {
  quizId: number;
  publicToken: string;
  resultsToken: string;
  questionCount: number;
  bankSize: number;
}

export async function createQuiz(input: CreateQuizInput): Promise<CreateQuizResult> {
  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: { id: true, textContent: true },
  });
  if (!doc) {
    throw new AppError('DOCUMENT_NOT_FOUND', 404, 'Document not found.');
  }

  const { bank, bankSize } = await generateQuestions({
    text: doc.textContent,
    questionCount: input.questionCount,
  });

  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        documentId: doc.id,
        publicToken: createId(),
        resultsToken: createId(),
        questionCount: input.questionCount,   // user input — NOT bankSize
      },
    });

    for (let qi = 0; qi < bank.length; qi++) {
      const q = bank[qi];
      await tx.question.create({
        data: {
          quizId: created.id,
          text: q.question,
          explanation: q.explanation,
          difficulty: q.difficulty,
          orderIndex: qi,
          options: {
            create: q.options.map((text, oi) => ({
              text,
              isCorrect: oi === q.correctIndex,
              orderIndex: oi,
            })),
          },
        },
      });
    }

    return created;
  });

  return {
    quizId: quiz.id,
    publicToken: quiz.publicToken,
    resultsToken: quiz.resultsToken,
    questionCount: quiz.questionCount,
    bankSize,
  };
}
```

**Field-name reminder (per OI-3.C resolution).** The applied schema uses `Question.text`, `Question.orderIndex`, `Option.text`, `Option.orderIndex`, `Document.textContent`. **Do not** use `body` / `displayOrder` / `text` (for Document body) — those names appear in older phase docs but are not in the schema. See `quiz-knowledge/prisma/schema.prisma` for the authoritative definitions.

**Why `quiz.questionCount = input.questionCount` (not `bankSize`).** Phase 5 reads `quiz.questionCount` to decide how many questions a participant answers per attempt. The bank is invisible to participants; storing the multiplied number here would break attempt rendering.

**Pitfall — sequential `for` inside transaction.** Looks slow. It is — 20 questions × 5 inserts each ≈ 100 inserts serialized. For ~3 LOC of safety we tolerate ~500 ms transaction time. Do **not** parallelize inside `$transaction`; Prisma's interactive transactions don't support concurrent operations.

**Pitfall — token uniqueness.** `cuid2` collisions are astronomically unlikely (2⁻¹²⁰), but the schema has `@unique` on both tokens. Don't catch and retry — let the failure bubble; if it ever happens, retry-once would mask a real bug.

**Dependencies.** Task 3.5 (`generateQuestions` real), Phase 1 (schema applied).

**Acceptance Criteria.**

- Successful call creates exactly **1** quiz row, **`bankSize`** question rows, **`bankSize × 4`** option rows.
- `quiz.questionCount` equals `input.questionCount` (e.g., 10 for a `multiplier=2` request producing a 20-question bank).
- `quiz.publicToken` ≠ `quiz.resultsToken`; both are non-empty cuid2 strings.
- Forcing a Zod failure inside `generateQuestions` → no quiz row created (transaction never starts).
- Forcing a DB error inside the transaction (e.g., simulated FK violation) → no partial state in DB.

**Validation Steps.**

1. POST `/api/quizzes` with `documentId=1, questionCount=10` → DB shows 1/20/80 row counts.
2. Check `SELECT publicToken, resultsToken FROM quizzes ORDER BY id DESC LIMIT 1;` → both are 24-char cuid2 strings.
3. Re-run with same `documentId, questionCount` → new quiz row (no overwrite).
4. Set `QUESTION_BANK_MULTIPLIER=1` and rerun → 1/10/40 row counts.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** ✅✅ High — Prisma `$transaction` patterns are well-known. Prompt: "Implement `src/lib/services/quizzes.ts` exporting `createQuiz({ documentId, questionCount })`. Find Document, call generateQuestions, persist quiz + questions + options in a single `prisma.$transaction`. Use `cuid2` for tokens. `quiz.questionCount = input.questionCount` (NOT bankSize)."

---

### Task 3.7 — `POST /api/quizzes` Route Handler

**Objective.** Implement the route handler — < 30 LOC; Zod-validates input, delegates to `createQuiz` service, returns structured response with both URLs.

**Technical Requirements.**

Create `src/lib/schemas/quizzes.ts`:

```ts
import { z } from 'zod';

export const createQuizRequestSchema = z.object({
  documentId: z.number().int().positive(),
  questionCount: z.number().int().min(5).max(30),
});

export type CreateQuizRequest = z.infer<typeof createQuizRequestSchema>;
```

Create `src/app/api/quizzes/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createQuiz } from '@/lib/services/quizzes';
import { createQuizRequestSchema } from '@/lib/schemas/quizzes';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = createQuizRequestSchema.parse(await req.json());
    const result = await createQuiz(body);

    const origin = req.nextUrl.origin;
    return NextResponse.json(
      {
        data: {
          quizId: result.quizId,
          questionCount: result.questionCount,
          bankSize: result.bankSize,
          quizUrl: `${origin}/q/${result.publicToken}`,
          resultsUrl: `${origin}/results/${result.resultsToken}`,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } },
        { status: 400 },
      );
    }
    return toErrorResponse(err);
  }
}
```

**Why `maxDuration = 60`.** Vercel hobby/pro caps. Soft cap inside `generateQuestions` (55 s) gives 5 s of headroom for the transaction.

**Response contract.**

```json
{
  "data": {
    "quizId": 42,
    "questionCount": 10,
    "bankSize": 20,
    "quizUrl": "https://app.example.com/q/abc123…",
    "resultsUrl": "https://app.example.com/results/xyz789…"
  }
}
```

`bankSize` is included so the UI can show "20 questions in the bank, 10 per attempt" in the link panel.

**Error matrix (extends Phase 2 §Task 2.10):**

| Failure | HTTP | Code |
|---|---|---|
| Body fails Zod | 400 | `INVALID_INPUT` |
| Document not found | 404 | `DOCUMENT_NOT_FOUND` |
| `generateQuestions` strict-pool fail | 502 | `AI_GEN_FAILED` |
| 55 s soft timeout | 504 | `AI_TIMEOUT` |
| OpenAI 5xx / network error | 502 | `AI_GEN_FAILED` (mapped via `toErrorResponse` if not already an AppError) |
| Anything else | 500 | `INTERNAL` |

**Dependencies.** Task 3.5 + Task 3.6.

**Acceptance Criteria.**

- `curl -X POST … '{"documentId":1,"questionCount":10}'` → 201 with the response contract above.
- Posting `questionCount=4` → 400 `INVALID_INPUT`.
- Posting `questionCount=31` → 400 `INVALID_INPUT`.
- Posting `documentId=99999` → 404 `DOCUMENT_NOT_FOUND`.
- Server logs show stack only on 5xx (matches §Task 2.10 policy).

**Validation Steps.**

1. curl each error matrix row → assert HTTP code + body shape.
2. Confirm `quizUrl` and `resultsUrl` both render the correct hostname when accessed via dev server vs ngrok.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement `POST /api/quizzes` per the snippet above. Set `runtime = 'nodejs'`, `maxDuration = 60`. Validate body with `createQuizRequestSchema`. Delegate to `createQuiz`. Return 201 with `{ data: { quizId, questionCount, bankSize, quizUrl, resultsUrl } }`. Use `req.nextUrl.origin` for absolute URLs."

---

### Task 3.8 — UI: Generate Quiz Form

**Objective.** Build `/manager/quizzes/new?documentId=…` with a number input (5–30, default 10), submit button, error toast, and post-success transition to `<PublicLinkPanel>`.

**Route placement (per OI-3.B resolution: B2).**
The form lives at `/manager/quizzes/new?documentId=…`. Phase 2 §Task 2.1 already redirects upload-success to this URL.

**Technical Requirements.**

Files to create:

- `src/app/manager/quizzes/new/page.tsx` — RSC; reads `searchParams.documentId`; loads minimal doc info (`filename`, `charCount`) for the heading; renders `<GenerateForm />`.
- `src/app/manager/quizzes/new/_components/GenerateForm.tsx` — `'use client'`; `react-hook-form` + Zod resolver bound to `createQuizRequestSchema`; submit button disabled while pending; on success, swaps form for `<PublicLinkPanel>` (Task 3.10) and shows `<GenerationProgress>` (Task 3.9) while pending.
- `src/lib/schemas/quizzes.ts` — already created in Task 3.7; reuse.

UX requirements:

- Heading: "Generate quiz from `<filename>` (`<charCount>` characters)".
- Form: number input `questionCount` (default 10, min 5, max 30, step 1), helper text: "Each participant answers this many questions, drawn from a larger bank.".
- Submit button label: "Generate quiz" → switches to "Generating…" while pending.
- Error path: parse `error.code` from API → toast with mapping:
  - `AI_GEN_FAILED` → "Could not generate enough valid questions. Try a richer document or a lower question count."
  - `AI_TIMEOUT` → "Generation took too long. Please try again."
  - `DOCUMENT_NOT_FOUND` → "Document not found." + back link.
  - default → "Something went wrong. Please try again."
- Centralize the code → message map in `src/lib/schemas/api-errors.ts` (introduced in Phase 2; extend with the three new codes).

**Pitfall — RSC `searchParams` async API.** Next.js 15+ `searchParams` is a Promise; `await` it before reading.

**Pitfall — refetching on cold form.** If the user navigates back from PublicLinkPanel and re-submits, do NOT cache the previous response — re-POST. Each submission must hit `/api/quizzes` fresh.

**Dependencies.** Task 3.7 (API), Task 3.9 (progress), Task 3.10 (link panel).

**Acceptance Criteria.**

- Visiting `/manager/quizzes/new?documentId=1` shows the form preloaded with the document's filename + char count.
- Submitting with `questionCount=10` and a real OpenAI key produces a successful generation, swaps in `<PublicLinkPanel>` with both URLs.
- Submitting with `questionCount=4` (below min) → client-side Zod blocks before submit.
- Document not found → 404 toast + back-to-upload link.
- After error, the form remains editable so the user can adjust `questionCount` and retry without page reload.

**Validation Steps.**

1. Manual flow: upload PDF (Phase 2) → automatic redirect lands at `/manager/quizzes/new?documentId=…` → generate → both URLs visible and copyable.
2. Force a 502 (e.g. invalidate `OPENAI_API_KEY` briefly) → toast appears, form still usable.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement `/manager/quizzes/new?documentId=…` per the spec above. Use `react-hook-form` + zodResolver against `createQuizRequestSchema`. POST to `/api/quizzes`. On success, render `<PublicLinkPanel>`. While pending, render `<GenerationProgress>`."

---

### Task 3.9 — `<GenerationProgress>` Client Component

**Objective.** Show a clear, non-frozen progress UI for the 5–30s wait: spinner, elapsed seconds, soft warning at 30s, hard cap message at 60s.

**Technical Requirements.**

Create `src/components/quizzes/GenerationProgress.tsx`:

- `'use client'`; props: none required (timer drives state).
- On mount, start an interval (1s) tracking elapsed seconds.
- States:
  - 0–10s: "Reading the document…" + spinner.
  - 10–30s: "Generating questions…" + spinner + elapsed counter.
  - 30–55s: amber soft warning: "This is taking longer than usual. Hang on."
  - ≥ 55s: red message: "Almost at the timeout. If this fails, please retry."
- Cleanup interval on unmount.
- No fancy animations beyond Tailwind `animate-spin`.

```tsx
'use client';
import { useEffect, useState } from 'react';

export function GenerationProgress() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const phase =
    seconds >= 55 ? 'critical'
    : seconds >= 30 ? 'warning'
    : seconds >= 10 ? 'generating'
    : 'reading';

  const message = {
    reading: 'Reading the document…',
    generating: 'Generating questions…',
    warning: 'This is taking longer than usual. Hang on.',
    critical: 'Almost at the timeout. If this fails, please retry.',
  }[phase];

  const tone = {
    reading: 'text-muted-foreground',
    generating: 'text-muted-foreground',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  }[phase];

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className={tone}>{message}</span>
      <span className="tabular-nums text-muted-foreground">{seconds}s</span>
    </div>
  );
}
```

**Pitfall — interval leak.** Always return the cleanup from `useEffect`. Without it, navigating away mid-generation keeps incrementing.

**Pitfall — locale ":12s" formatting.** Don't internationalize the elapsed counter. It's a debug hint, not a user-facing localized string.

**Dependencies.** None (pure UI).

**Acceptance Criteria.**

- Component renders a spinner + message + elapsed counter.
- After ~30s of mounted time, message switches to amber warning copy.
- After ~55s, message switches to red critical copy.
- Unmounting clears the interval (verified with React DevTools or by inspecting `setInterval` count).

**Validation Steps.**

1. Mount the component in isolation (storybook or a dev page) for ≥ 60 s; observe transitions at 10, 30, 55 seconds.
2. Submit a real generate request, watch the component during the live wait.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High.

---

### Task 3.10 — `<PublicLinkPanel>` Component

**Objective.** Display the two URLs returned by the API alongside a copy-to-clipboard button each. Show the bank-vs-attempt context so the manager understands what they're sharing.

**Technical Requirements.**

Create `src/components/quizzes/PublicLinkPanel.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export interface PublicLinkPanelProps {
  quizUrl: string;
  resultsUrl: string;
  questionCount: number;   // per-attempt
  bankSize: number;        // total persisted
}

export function PublicLinkPanel(props: PublicLinkPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quiz created. Each participant answers <strong>{props.questionCount}</strong> questions
        randomly drawn from a bank of <strong>{props.bankSize}</strong>.
      </p>
      <LinkRow label="Share with participants" url={props.quizUrl} />
      <LinkRow label="View results" url={props.resultsUrl} />
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <input readOnly value={url} className="flex-1 rounded border px-2 py-1 font-mono text-xs" />
        <button onClick={onCopy} className="rounded border px-2 py-1 text-xs">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

**Pitfall — `navigator.clipboard` requires HTTPS or localhost.** On dev (localhost) it works; via HTTP-only ngrok tunnel it doesn't. If you test via tunnel, prefer the `https://` variant.

**Pitfall — leaking results URL.** The results URL is effectively private (anyone with it can see analytics). Make sure the panel labels it clearly so the manager doesn't paste it where participants see it.

**Dependencies.** None beyond `sonner` already in Phase 2 dep tree.

**Acceptance Criteria.**

- Both URLs render in monospaced inputs.
- Copy buttons write URLs to clipboard and toast.
- The summary line correctly substitutes `questionCount` and `bankSize` from props.

**Validation Steps.**

1. Generate a real quiz; click both copy buttons; paste each URL into an incognito window; both load.
2. Open the participant URL — Phase 5 quiz page (placeholder while Phase 5 is incomplete) should at minimum return 200, not 404.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High.

---

### Task 3.11 — Validation Tests

**Objective.** Add focused unit tests for chunker, AI Zod schema, and orchestrator. No live OpenAI in CI — orchestrator tests use a mocked `openai` module.

**Technical Requirements.**

New test files:

- `src/lib/ai/chunker.test.ts` — already drafted in Task 3.2; verify present.
- `src/lib/schemas/ai.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { aiQuestionSchema } from './ai';

  const valid = {
    question: 'What is the policy?',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Per the handbook.',
    difficulty: 'easy',
  };

  describe('aiQuestionSchema', () => {
    it('accepts a valid question', () => {
      expect(() => aiQuestionSchema.parse(valid)).not.toThrow();
    });
    it('rejects 3 options', () => {
      expect(() => aiQuestionSchema.parse({ ...valid, options: ['A', 'B', 'C'] })).toThrow();
    });
    it('rejects 5 options', () => {
      expect(() => aiQuestionSchema.parse({ ...valid, options: ['A', 'B', 'C', 'D', 'E'] })).toThrow();
    });
    it('rejects out-of-range correctIndex', () => {
      expect(() => aiQuestionSchema.parse({ ...valid, correctIndex: 4 })).toThrow();
    });
    it('rejects unknown difficulty', () => {
      expect(() => aiQuestionSchema.parse({ ...valid, difficulty: 'expert' })).toThrow();
    });
  });
  ```
- `src/lib/ai/generateQuestions.test.ts` — mocks `./client.openai.chat.completions.create` with `vi.spyOn` (or `vi.mock`):
  - **Happy path:** mock returns valid JSON for every chunk → `bank.length === bankSize`.
  - **Retry success:** mock returns invalid JSON on first call, valid on second → still succeeds.
  - **Strict-pool fail:** mock returns invalid JSON for first AND retry → throws `AI_GEN_FAILED`.
  - **Abort:** mock delays 70 s; 55 s soft timeout fires → throws `AI_TIMEOUT`.

**What we deliberately do NOT test:**

- ❌ End-to-end POST `/api/quizzes` against real OpenAI (manual QA only, Task 3.12).
- ❌ Prisma transaction rollback on partial failure (covered by integration smoke).
- ❌ UI components in isolation (manual QA covers).

**Dependencies.** Tasks 3.2, 3.4, 3.5.

**Acceptance Criteria.**

- `pnpm test` passes including all new files.
- Total parser + AI test runtime stays under 20 s.
- Each new test file has at least one happy + one failure case.

**Validation Steps.**

1. `pnpm test` → green.
2. Temporarily break `aiQuestionSchema` (e.g., `.length(3)` instead of `.length(4)`) → AI tests fail. Restore.
3. Temporarily remove the strict-pool `if` in orchestrator → orchestrator test "Strict-pool fail" fails. Restore.

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** ✅ High — mocking `openai` is well-known. Prompt: "Write Vitest tests for `generateQuestions` mocking `openai.chat.completions.create`. Cover: happy, retry-success, strict-pool fail, abort."

---

### Task 3.12 — Final Phase Verification & Commit

**Objective.** Run the manual QA matrix end-to-end, verify all Setup Goals are met, commit Phase 3 with a single PR.

**Technical Requirements.**

**Manual QA matrix** (`pnpm dev` against the dev Supabase project, with a real `OPENAI_API_KEY`):

| # | Action | Expected outcome |
|---|---|---|
| 1 | Upload a known-good ~10-page PDF (Phase 2 flow) | Redirected to `/manager/quizzes/new?documentId=N`. |
| 2 | Enter `questionCount=10`, click Generate | `<GenerationProgress>` runs ~10–30 s; on success `<PublicLinkPanel>` shows two URLs. |
| 3 | DB inspect | 1 quiz row, **20** question rows, **80** option rows; `quiz.questionCount=10`. |
| 4 | Each question has exactly 4 options; exactly one `isCorrect=true`. | Verified via `SELECT COUNT(*) FROM options o JOIN questions q ON o.questionId=q.id WHERE q.quizId=N AND o.isCorrect=true GROUP BY q.id;` — every group is 1. |
| 5 | Click Copy on participant URL → paste in incognito | Phase 5 placeholder loads (or 200 even if rendering minimal). |
| 6 | Re-generate from the **same** Document | A new quiz row appears; the previous one is unchanged. |
| 7 | Submit `questionCount=4` | 400 `INVALID_INPUT` toast; form remains editable. |
| 8 | Submit `documentId` that does not exist | 404 `DOCUMENT_NOT_FOUND` toast; back link to upload. |
| 9 | Temporarily set `OPENAI_API_KEY=invalid`, submit | 502 `AI_GEN_FAILED` toast; no quiz row created. |
| 10 | Set `QUESTION_BANK_MULTIPLIER=1`, restart, submit `questionCount=10` | DB shows 1/10/40 row counts; `quiz.questionCount=10`. |
| 11 | Set `QUESTION_BANK_MULTIPLIER=3`, restart, submit `questionCount=10` | DB shows 1/30/120 row counts. |
| 12 | Restore `QUESTION_BANK_MULTIPLIER=2` (or unset). | Default behaviour resumes. |
| 13 | Server logs | 5xx errors logged with stack; 4xx not logged. |

**Validation workflow (automated):**

```bash
pnpm prisma generate
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

All five must exit 0 before opening the PR.

**Git commit strategy.** One feature branch `feat/3-ai-quiz-generation`. Commits roughly one per task (some merged where tightly coupled):

```
feat(3): wire stub-first quiz generation pipeline (3.0)
feat(3): add QUESTION_BANK_MULTIPLIER env + openai client singleton (3.1)
feat(3): implement tiktoken chunker (3.2)
feat(3): add system + user prompts for quiz generation (3.3)
feat(3): add zod schema for ai response (3.4)
feat(3): real generateQuestions with parallel chunks + retry + abort (3.5)
feat(3): persist quiz + questions + options in single transaction (3.6)
feat(3): POST /api/quizzes route handler (3.7)
feat(3): /manager/quizzes/new generate form (3.8)
feat(3): GenerationProgress + PublicLinkPanel components (3.9, 3.10)
test(3): chunker, ai schema, generateQuestions orchestration tests (3.11)
chore(3): phase 3 complete — ai quiz generation working end-to-end
```

**Final PR.**

- Title: `Phase 3: AI Quiz Generation`
- Body: link to this doc, bullet list of what changed, screenshot of `<PublicLinkPanel>`, note env-var addition.
- Squash-merge to `main` after manual QA passes.

**Dependencies.** Tasks 3.0–3.11 all complete.

**Acceptance Criteria.**

- All 13 QA matrix items pass.
- All five validation commands exit 0.
- All Phase 3 commits follow `<type>(3): <imperative>` convention.
- PR is open and merged.

**Validation Steps.** Run the QA matrix top-to-bottom in one sitting. Stop and fix on any red.

**Estimated Complexity.** Medium (verification + likely 1–2 small fixes from real-data edge cases).

**AI Coding Opportunity.** Low — verification is manual. AI useful for diagnosing build/lint failures and drafting the PR body.

---

## 4. Recommended Execution Order

```
                ┌──────────────┐
                │ 3.0 Stub     │  (wire pipeline end-to-end first)
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ 3.1 Env +    │  (foundation for all real AI work)
                │ OpenAI       │
                └──────┬───────┘
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
   ┌────────┐    ┌──────────┐     ┌────────┐
   │ 3.2    │    │ 3.3      │     │ 3.4    │  (parallelizable)
   │Chunker │    │ Prompts  │     │ Schema │
   └───┬────┘    └────┬─────┘     └───┬────┘
       │              │               │
       └──────────────┼───────────────┘
                      ▼
               ┌─────────────┐
               │ 3.5         │  (orchestrator — core)
               │ generate    │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ 3.6         │  (transaction persistence)
               │ Service     │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ 3.7         │  (route handler)
               │ POST API    │
               └──────┬──────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
   ┌────────┐   ┌──────────┐   ┌──────────┐
   │ 3.8    │   │ 3.9      │   │ 3.10     │  (UI; parallelizable)
   │ Form   │   │ Progress │   │ LinkPanel│
   └───┬────┘   └────┬─────┘   └────┬─────┘
       │             │              │
       └─────────────┼──────────────┘
                     ▼
              ┌──────────────┐
              │ 3.11 Tests   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ 3.12 Verify  │
              └──────────────┘
```

### Dependency rationale

- **3.0 first:** Stub-first wiring exposes routing/transaction/contract bugs before any real AI debugging starts.
- **3.1 unblocks all real AI tasks:** env var + client singleton.
- **3.2 / 3.3 / 3.4 parallelizable:** chunker, prompts, schema are independent.
- **3.5 ties them together:** must come after 3.2, 3.3, 3.4.
- **3.6 then 3.7:** persistence wraps generation; route wraps service.
- **3.8 / 3.9 / 3.10 parallelizable:** UI pieces independent of each other.
- **3.11 → 3.12:** tests after impl, verification after tests.

### Wall-clock estimate (one-person serial)

| Task | Time |
|---|---|
| 3.0 Stub wiring | 45 min |
| 3.1 Env + OpenAI client | 15 min |
| 3.2 Chunker | 25 min |
| 3.3 Prompts | 10 min |
| 3.4 Zod schemas | 15 min |
| 3.5 Orchestrator | 90 min |
| 3.6 Persistence service | 40 min |
| 3.7 Route handler | 25 min |
| 3.8 Form UI | 60 min |
| 3.9 Progress component | 25 min |
| 3.10 LinkPanel component | 25 min |
| 3.11 Tests | 60 min |
| 3.12 Verify + commit | 45 min |
| **Total** | **~480 min (~8 h)** |

Two-person parallel (one on 3.2/3.3/3.4 + 3.5 + 3.6, one on 3.0 + 3.7 + UI): ~5 h wall-clock.

> **Note.** Phase 3 is rated highest-risk in implementation-plan §7. Plan a buffer: if hour 6 is approaching and 3.5 still flakes, fall back to deterministic mock generator for the demo and mark `OI-3.AI-LIVE` for follow-up.

---

## 5. Recommended Git Commit Strategy

### Naming convention

```
<type>(3): <short imperative>
```

- `type`: `feat`, `chore`, `fix`, `refactor`, `test`, `docs`.
- Short imperative sentence, no period.

### Frequency

- One commit per task, or one per 2 tightly-coupled tasks. 13 tasks → 9–12 commits is reasonable.
- Mid-task WIP commits OK (`chore(3): wip — orchestrator scaffolding`); squash on merge if noisy.
- Push to `feat/3-ai-quiz-generation` after every commit.

### Branching

- Single feature branch `feat/3-ai-quiz-generation` for all 13 tasks.
- One PR titled `Phase 3: AI Quiz Generation` when 3.12 is complete.
- Squash-merge to `main`.

---

## 6. Common Phase 3 Pitfalls

### OpenAI

| Pitfall | Mitigation |
|---|---|
| `response_format: json_object` enabled but model still returns prose | Single retry with `gpt-4o` (Task 3.5). If retry also fails, drop chunk. Never silently mutate text. |
| `signal` not passed on retry call | Verify both `callOpenAI` invocations include `{ signal }`. Common AI-generated bug. |
| Cost spikes from `gpt-4o` retry on every chunk | Set OpenAI account spending cap to $5. Default `gpt-4o-mini` keeps cost ~$0.005 / quiz. |

### Tiktoken

| Pitfall | Mitigation |
|---|---|
| WASM cold start adds ~500 ms on first call after deploy | Acceptable for MVP; document. |
| `enc.free()` skipped → memory leak | Call `enc.free()` in `finally` block (Task 3.2). |
| `enc.decode` returns `Uint8Array`, not string | Wrap in `TextDecoder` (Task 3.2). Verify against installed version. |

### Orchestration

| Pitfall | Mitigation |
|---|---|
| `Promise.allSettled` instead of `Promise.all` | Strict-pool contract requires fail-fast on chunk failure. Use `Promise.all`. |
| Exponential backoff added "to be safe" | Single retry, stronger model. No backoff. |
| Strict-pool check after `slice` instead of before | Always check `validated.length < bankSize` BEFORE `slice(0, bankSize)`. |
| Forgot `clearTimeout` in `finally` | Causes hung timers in tests. Always `clearTimeout` in `finally`. |

### Persistence

| Pitfall | Mitigation |
|---|---|
| Parallel `tx.question.create` inside `$transaction` | Prisma interactive transactions don't support concurrent ops. Use sequential `for`. |
| `quiz.questionCount` set to `bankSize` instead of user input | Phase 5 reads `questionCount` for attempt rendering. Always `quiz.questionCount = input.questionCount`. |
| Wrong field names (`body`, `displayOrder`) | Schema uses `text`, `orderIndex`. See `prisma/schema.prisma`. |

### UI

| Pitfall | Mitigation |
|---|---|
| `searchParams` accessed synchronously in Next.js 15+ RSC | `searchParams` is a Promise; `await` it. |
| `<GenerationProgress>` interval not cleared on unmount | Always return cleanup from `useEffect`. |
| `navigator.clipboard` unavailable on http tunnel | Test via localhost or https tunnel. |
| Toast messages drift from API codes | Centralize code → message map in `src/lib/schemas/api-errors.ts` (extend Phase 2's). |

### Env / Config

| Pitfall | Mitigation |
|---|---|
| `QUESTION_BANK_MULTIPLIER` parsed as string | Use `z.coerce.number()`, not `z.number()`. |
| Multiplier set to absurd value (e.g., 10) | `.min(1).max(3)` clamp guards token cost blow-up. |
| Env not in `.env.example` | Always update `.env.example` when adding a server var. |

---

## 7. Definition of Done

Phase 3 is complete when **all** of the following are true:

### Code

- [ ] All 13 tasks (3.0 → 3.12) committed and pushed.
- [ ] `pnpm tsc --noEmit` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test` exits 0; new chunker / AI schema / orchestrator tests all pass.
- [ ] `pnpm build` exits 0; no edge-runtime warnings on `/api/quizzes`.

### Functionality

- [ ] `/manager/quizzes/new?documentId=N` renders for an existing document.
- [ ] Submitting `questionCount=10` produces:
  - HTTP 201 with `{ data: { quizId, questionCount, bankSize, quizUrl, resultsUrl } }`,
  - 1 row in `quizzes` (with `questionCount=10`),
  - `bankSize` rows in `questions` (default 20),
  - `bankSize × 4` rows in `options`,
  - exactly one `option.isCorrect=true` per question.
- [ ] Public quiz URL and results URL are non-empty cuid2 tokens, both unique.
- [ ] Submitting `questionCount=4` returns 400 `INVALID_INPUT`.
- [ ] Submitting unknown `documentId` returns 404 `DOCUMENT_NOT_FOUND`.
- [ ] Forcing OpenAI failure returns 502 `AI_GEN_FAILED` with NO quiz row created.
- [ ] Forcing wall-clock > 55 s returns 504 `AI_TIMEOUT` with NO quiz row created.
- [ ] Setting `QUESTION_BANK_MULTIPLIER=1` produces a 10-question bank for `questionCount=10`.
- [ ] Setting `QUESTION_BANK_MULTIPLIER=3` produces a 30-question bank for `questionCount=10`.
- [ ] Server logs show stack only on 5xx; 4xx user errors are not logged.

### Code structure

- [ ] `src/lib/config/env.ts` declares `QUESTION_BANK_MULTIPLIER`.
- [ ] `src/lib/ai/{client,chunker,prompts,generateQuestions}.ts` all exist.
- [ ] `src/lib/schemas/{ai,quizzes}.ts` exist.
- [ ] `src/lib/services/quizzes.ts` exists with `createQuiz` + transaction.
- [ ] `src/app/api/quizzes/route.ts` exists, sets `runtime='nodejs'`, `maxDuration=60`.
- [ ] `src/app/manager/quizzes/new/page.tsx` + form component exist.
- [ ] `src/components/quizzes/{GenerationProgress,PublicLinkPanel}.tsx` exist.
- [ ] `.env.example` documents `QUESTION_BANK_MULTIPLIER`.

### Tests

- [ ] `chunker.test.ts`, `ai.test.ts`, `generateQuestions.test.ts` all green.
- [ ] At least one happy + one failure path per test file.
- [ ] No live OpenAI call in CI (orchestrator tests use mocks).

### Repository hygiene

- [ ] All Phase 3 commits prefix with `feat(3):` / `chore(3):` / `test(3):`.
- [ ] One feature branch `feat/3-ai-quiz-generation` for all 13 tasks.
- [ ] PR titled `Phase 3: AI Quiz Generation` is merged to `main`.

### Out-of-scope reminders (do **not** do in Phase 3)

- ❌ Do not build participant attempt page `/q/[token]`. (Phase 5.)
- ❌ Do not build results dashboard `/results/[token]`. (Phase 6.)
- ❌ Do not add manager dashboard `/manager`. (Phase 4.)
- ❌ Do not add OCR for image-only PDFs. (Out of MVP scope.)
- ❌ Do not implement question regeneration / per-question retry. (Post-MVP.)
- ❌ Do not modify the system prompt or schemas without checking technical-design §7.7.
- ❌ Do not call OpenAI on every attempt. (Phase 5 reads the persisted bank.)
- ❌ Do not add authentication. (Whole MVP is open by design — see spec §security.)

When everything above is true, move to **Phase 4 — Manager Dashboard**.

---

## 8. Open Issues

These are **documentation drift** issues surfaced while authoring this doc. None blocks Phase 3 implementation; each should be resolved in a separate doc-only change.

### OI-3.A1 — Bank-size formula alignment in source docs

- **Description.** [`implementation-plan.md`](../implementation-plan.md) §7 declares "Contract (locked): bank size = `2 × questionCount`". [`technical-design.md`](../technical-design.md) §7.1 declares "totalTarget = quiz.questionCount * 1.5" and persists `quiz.questionCount`. This Phase 3 doc supersedes both with `bankSize = QUESTION_BANK_MULTIPLIER × questionCount` (default `2`) per OI-3.A resolution (A3).
- **Affected files.** `docs/architecture/implementation-plan.md` §7, `docs/architecture/technical-design.md` §7.1.
- **Resolution path.** New change folder `docs/changes/<date>-phase-3-bank-multiplier-alignment/`. Edit both source docs to reference the env-multiplier model, with `2` as the locked-default. No code impact.

### OI-3.B1 — Generate-form route line in implementation-plan

- **Description.** `implementation-plan.md` §7 lists the task "`Generate Quiz` form on `/manager/new`" — but Phase 2's redirect target is `/manager/quizzes/new?documentId=…`, and this Phase 3 doc places the form at the latter URL per OI-3.B resolution (B2).
- **Affected files.** `docs/architecture/implementation-plan.md` §7.
- **Resolution path.** Bundle into the same alignment change as OI-3.A1. One-line edit.

### OI-3.D — Schema field names in older phase docs

- **Description.** [`phase-1-database-infrastructure.md`](./phase-1-database-infrastructure.md) §Task 1.4 lists `Question.body` / `Question.displayOrder` (not in schema). [`phase-2-document-upload-parsing.md`](./phase-2-document-upload-parsing.md) §Task 2.4 lists `Document.title` / `text` / `uploadedFileName` / `documentType` (not in schema). The applied schema (commit `5cefaee`) uses `text`/`orderIndex` and `filename`/`mimeType`/`textContent`/`charCount`. This Phase 3 doc uses the schema names; older docs should be aligned.
- **Affected files.** `docs/architecture/phases/phase-1-database-infrastructure.md`, `docs/architecture/phases/phase-2-document-upload-parsing.md`.
- **Resolution path.** New change folder `docs/changes/<date>-phase-docs-schema-realignment/`. Doc-only edits to the field tables in both task docs. No code impact.

---

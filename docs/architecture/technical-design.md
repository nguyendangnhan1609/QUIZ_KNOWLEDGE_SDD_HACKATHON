# Technical Design — AI-Driven Knowledge Management & Assessment Platform

Status: v1.0
Last Updated: 2026-05-09
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../product_spec_ai_knowledge_assessment_platform.md) (v1.1)

This document is the implementation contract for the MVP. It is written to be picked up by an engineer (or AI coding assistant) and turned into a working application without further architectural decisions.

---

## 1. System Architecture

### 1.1 High-level shape

A single Next.js 15 application deployed on Vercel, talking to Supabase (Postgres + Storage) and OpenAI. **No microservices, no queue, no separate worker.** Quiz generation runs synchronously inside a Route Handler.

```
┌────────────────────────────────────────────────────────────────┐
│                        Vercel (Node runtime)                   │
│                                                                │
│   ┌────────────────────┐         ┌─────────────────────────┐   │
│   │ Next.js App Router │         │ Next.js Route Handlers  │   │
│   │  RSC + Client      │  ◀───▶  │  /api/*                 │   │
│   └────────────────────┘         └─────────────────────────┘   │
│            │                              │                    │
│            │                              ▼                    │
│        Browser                  ┌─────────────────────────┐    │
│   (Tailwind + shadcn/ui)        │   Service Layer         │    │
│                                 │   lib/services/*        │    │
│                                 └─────────────────────────┘    │
└──────────────────────────────────┬─────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 ┌────────────────┐       ┌──────────────────┐       ┌────────────────┐
 │ Supabase       │       │ Supabase Storage │       │ OpenAI API     │
 │ Postgres       │       │ bucket: docs     │       │ gpt-4o-mini    │
 │ (Prisma)       │       │                  │       │ + gpt-4o (FB)  │
 └────────────────┘       └──────────────────┘       └────────────────┘
```

### 1.2 Request flow — manager creates a quiz

```
[Browser]                         [Vercel Function]                  [External]

Pick file ──▶ POST /api/documents (multipart)
                  │
                  ├─ validate (mime, size, ext)
                  ├─ upload buffer  ─────────────────▶ Supabase Storage
                  │                                       │ storagePath
                  ├─ extract text (pdf-parse|mammoth|md) ◀─┘
                  ├─ INSERT documents row ─────────▶ Postgres
                  └─ 201 { documentId }

Click "Generate" ──▶ POST /api/quizzes { documentId, questionCount }
                  │
                  ├─ load document.text
                  ├─ chunk via tiktoken (~3000 tok/chunk)
                  ├─ Promise.all chunks → OpenAI ────▶ gpt-4o-mini
                  │                                      │ JSON
                  ├─ Zod validate per chunk            ◀─┘
                  │     └ on fail: retry once with gpt-4o
                  ├─ generate publicToken + resultsToken (cuid2)
                  ├─ INSERT quiz, questions, options ─▶ Postgres
                  └─ 201 { quizUrl, resultsUrl }
```

### 1.3 Request flow — participant takes the quiz

```
GET /q/{publicToken}                         (server component)
   ├─ load quiz + questions + options from DB
   ├─ select N questions (Fisher–Yates partial)
   ├─ shuffle 4 options per question (Fisher–Yates)
   └─ render { questionId, optionId } payload — NEVER ships isCorrect

POST /api/attempts { publicToken, identifier, answers[] }
   ├─ resolve quizId
   ├─ check (quizId, identifier) collision
   │     └ on collision: identifier := identifier + "_" + yyyyMMddHHmmss
   ├─ join answers.selectedOptionId → options.isCorrect → score
   ├─ INSERT attempt + attempt_answers (single transaction)
   └─ 201 { score, total, identifier }
```

### 1.4 Component responsibilities

| Layer | Module | Responsibility |
|---|---|---|
| UI | `app/**/page.tsx`, `components/` | Routing, RSC fetching, client forms |
| HTTP | `app/api/**/route.ts` | Parse, validate, dispatch to service, map errors |
| Service | `lib/services/*` | Orchestration: parse → AI → persist; randomize; grade |
| AI | `lib/ai/*` | OpenAI client, chunking, prompts, JSON validation |
| Parsers | `lib/parsers/*` | Format-specific text extraction |
| Randomization | `lib/randomization/*` | Question selection + option shuffle |
| Data | `lib/db/*` + `prisma/*` | Prisma client, repositories |
| Validation | `lib/schemas/*` | Zod schemas shared by API and AI output |
| Config | `lib/config/env.ts` | Type-safe env vars |

---

## 2. Technology Stack

| Category | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Single repo for FE+BE; server components keep secrets server-side; Route Handlers replace a separate API service. (Was specced as 15 — `create-next-app@latest` resolved to 16.x; API-compatible for our usage.) |
| Language | **TypeScript 5.x** | End-to-end type-safety; mandatory for Zod-driven API contracts |
| Database | **Self-hosted Postgres 16** (Docker container) | Bundled in docker-compose; no external DB service needed for local or VPS deploy |
| ORM | **Prisma 5.x** | Type-safe client, migrations, IDE autocomplete; matches schema-first style |
| File Storage | **Local disk** (`.uploads/`) primary; **Supabase Storage** optional | Local fallback via `LOCAL_STORAGE_DIR`; set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to enable Supabase Storage |
| AI | **OpenAI API** — `gpt-4o-mini` primary, `gpt-4o` fallback | Mini is ~10× cheaper and 3–5× faster; fallback only on validation failure |
| Tokenization | **tiktoken** | Accurate token counting for chunk boundaries |
| PDF parsing | **pdf-parse** | Lightweight, text-only — matches spec §12 ("AI readable, no OCR") |
| DOCX parsing | **mammoth** | Standard for Node.js; extracts plain text from `.docx` |
| Markdown | Native UTF-8 read | `.md` is already plain text |
| Validation | **zod** | Runtime validation for API bodies AND AI JSON outputs; schemas are the single source of truth |
| Public IDs | **@paralleldrive/cuid2** | URL-safe, ~144 bits entropy, shorter than UUIDv4 |
| Forms | **react-hook-form** + zod resolver | Lightweight, integrates with shared Zod schemas |
| Styling | **TailwindCSS v4** + **shadcn/ui** | Speed-of-shipping; accessible primitives. v4 uses `@import "tailwindcss"` (no `@tailwind base/...` directives) and auto-discovers content (no `tailwind.config.ts` file). |
| Toasts | **sonner** | Ships with shadcn |
| Env | **@t3-oss/env-nextjs** | Build-time validation of env vars |
| Deployment | **Docker Compose** (self-hosted VPS or local machine) | Self-contained stack: Postgres + Next.js app in one `docker compose up`; no platform vendor lock-in |
| State | RSC + URL state + minimal `useState` | MVP does not need a global store |

---

## 3. Frontend Architecture

### 3.1 App Router routes

| Route | Type | Purpose |
|---|---|---|
| `/` | RSC | Landing / redirect to `/manager` |
| `/manager` | RSC | List recent quizzes; entry point |
| `/manager/new` | RSC + Client | Upload document, click Generate, see resulting links |
| `/q/[token]` | RSC + Client | Participant quiz form (randomized server-side) |
| `/q/[token]/done` | RSC | Submission confirmation with score |
| `/r/[token]` | RSC | Results dashboard |

### 3.2 Reusable components

- `<FileDropzone>` — drag-drop with mime/size guard
- `<GenerationProgress>` — elapsed-time spinner, capped at 60s
- `<QuestionItem>` — single MCQ with radio group
- `<PublicLinkPanel>` — copy-to-clipboard for both URLs
- `<ScoreCard>`, `<SubmissionsTable>`, `<QuestionAccuracy>` — dashboard widgets
- `<LoadingState>`, `<ErrorState>` — generic states with retry hooks
- shadcn primitives: Button, Card, Input, Table, Dialog, Toast (Sonner)

### 3.3 State management

- **Server data:** fetched in RSC; no client cache layer (no React Query for MVP).
- **Forms:** `react-hook-form` + `zodResolver`. The same Zod schema validates client and server.
- **Quiz-taking state:** local `useState<Map<questionId, optionId>>`. No autosave.
- **Notifications:** `sonner` toasts.

### 3.4 Loading / error states

- Per-route segments use Next.js `loading.tsx` + `error.tsx`.
- Long-running generation: `<GenerationProgress>` shows elapsed time and a soft warning at 30s. Hard timeout at 60s — surface error with retry.
- API errors render `<ErrorState code={...} message={...} />` with a retry button when applicable.

### 3.5 Frontend folder structure

```
app/
  layout.tsx
  page.tsx
  manager/
    page.tsx
    new/
      page.tsx
      _components/
        UploadForm.tsx              (client)
        GenerationProgress.tsx      (client)
  q/[token]/
    page.tsx                        (RSC — does randomization)
    _components/
      QuizForm.tsx                  (client)
      QuestionItem.tsx              (client)
    done/page.tsx
  r/[token]/
    page.tsx                        (RSC — analytics)
    _components/
      StatsCards.tsx
      SubmissionsTable.tsx
      QuestionAccuracy.tsx
components/
  ui/                               (shadcn primitives)
  shared/
    FileDropzone.tsx
    PublicLinkPanel.tsx
    LoadingState.tsx
    ErrorState.tsx
```

---

## 4. Backend Architecture

### 4.1 Layered shape

```
Route Handler  ─▶  Service  ─▶  (AI module | Parser | Repository | Storage)
      │                              │
   thin HTTP                    business logic
```

Route Handlers do four things only:

1. Parse `request` (FormData or JSON)
2. Validate via Zod schema
3. Call exactly one service function
4. Map `AppError` → HTTP response

All orchestration belongs in `lib/services/`.

### 4.2 Validation strategy

- One Zod schema per request body and one per response shape, in `lib/schemas/api.ts`.
- AI output schema in `lib/schemas/ai.ts`.
- Forms in the browser use the same schemas via `zodResolver`.

### 4.3 Error handling

Custom `AppError`:

```ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public httpStatus: number,
    public userMessage: string,
    public cause?: unknown,
  ) { super(userMessage); }
}
```

Single error-mapping helper used by every Route Handler:

```ts
export function toResponse(err: unknown) {
  if (err instanceof AppError) {
    return Response.json({ error: { code: err.code, message: err.userMessage } }, { status: err.httpStatus });
  }
  console.error('UNHANDLED', err);
  return Response.json({ error: { code: 'INTERNAL', message: 'Unexpected error.' } }, { status: 500 });
}
```

### 4.4 Async processing

- **Synchronous generation.** `POST /api/quizzes` blocks until completion.
- Internal parallelism via `Promise.all` over chunks.
- Vercel Pro 60s timeout is the hard ceiling. We set a soft `AbortController` at 55s.

### 4.5 Backend folder structure

```
lib/
  services/
    documents.ts            (upload + parse + persist)
    quizzes.ts              (generate quiz from document)
    attempts.ts             (grade + persist + collision handling)
    analytics.ts            (aggregate analytics queries)
  ai/
    client.ts               (OpenAI singleton)
    chunker.ts              (tiktoken)
    prompts.ts              (system + user templates)
    generateQuestions.ts    (orchestration)
    validate.ts             (zod + retry logic)
  parsers/
    pdf.ts
    docx.ts
    markdown.ts
    index.ts                (dispatch by mime)
  randomization/
    selectQuestions.ts
    shuffleOptions.ts
  db/
    prisma.ts               (singleton Prisma client)
    repositories/
      documents.ts
      quizzes.ts
      attempts.ts
  schemas/
    api.ts
    ai.ts
    common.ts
  storage/
    supabase.ts             (server-side client)
  config/
    env.ts
  utils/
    timestamp.ts            (yyyyMMddHHmmss formatter)
  errors.ts
```

---

## 5. Database Design

### 5.1 Tables and purpose

| Table | Purpose |
|---|---|
| `documents` | Uploaded source files (storage path + extracted text) |
| `quizzes` | Question-bank instance per generation |
| `questions` | Generated MCQs |
| `options` | Answer choices (4 per question) with `isCorrect` flag |
| `attempts` | One row per participant submission |
| `attempt_answers` | Per-question selected option per attempt |

`options` is split out from `questions` so randomization keeps **stable per-option IDs**: the client submits `optionId`, the server grades by joining on `Option.isCorrect`, regardless of display order.

### 5.2 ER diagram

```
documents ─1───< quizzes ─1───< questions ─1───< options
                    │                              ▲
                    │                              │
                    └─1───< attempts ─1───< attempt_answers
                                                   └─▶ FK to options.id
```

### 5.3 Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Document {
  id          Int       @id @default(autoincrement())
  filename    String
  mimeType    String
  storagePath String
  textContent String    @db.Text
  charCount   Int
  createdAt   DateTime  @default(now())

  quizzes     Quiz[]

  @@map("documents")
}

model Quiz {
  id            Int       @id @default(autoincrement())
  documentId    Int
  publicToken   String    @unique          // /q/[token]
  resultsToken  String    @unique          // /r/[token]
  questionCount Int                          // questions per attempt
  createdAt     DateTime  @default(now())

  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  questions     Question[]
  attempts      Attempt[]

  @@index([documentId])
  @@index([createdAt])                       // future cleanup job
  @@map("quizzes")
}

model Question {
  id          Int       @id @default(autoincrement())
  quizId      Int
  text        String    @db.Text
  explanation String    @db.Text
  difficulty  String                          // "easy" | "medium" | "hard"
  orderIndex  Int

  quiz           Quiz      @relation(fields: [quizId], references: [id], onDelete: Cascade)
  options        Option[]
  attemptAnswers AttemptAnswer[]

  @@index([quizId])
  @@map("questions")
}

model Option {
  id         Int      @id @default(autoincrement())
  questionId Int
  text       String   @db.Text
  isCorrect  Boolean  @default(false)
  orderIndex Int                             // canonical order

  question       Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  attemptAnswers AttemptAnswer[]

  @@index([questionId])
  @@map("options")
}

model Attempt {
  id             Int       @id @default(autoincrement())
  quizId         Int
  identifier     String                        // e.g. "nd_thanh" or "nd_thanh_20260509103014"
  score          Int
  totalQuestions Int
  submittedAt    DateTime  @default(now())

  quiz    Quiz             @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers AttemptAnswer[]

  @@unique([quizId, identifier])              // enforces spec v1.1 §8.5
  @@index([quizId])
  @@index([submittedAt])
  @@map("attempts")
}

model AttemptAnswer {
  id               Int     @id @default(autoincrement())
  attemptId        Int
  questionId       Int
  selectedOptionId Int?                         // null if unanswered
  isCorrect        Boolean

  attempt        Attempt  @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question       Question @relation(fields: [questionId], references: [id])
  selectedOption Option?  @relation(fields: [selectedOptionId], references: [id])

  @@index([attemptId])
  @@index([questionId])
  @@map("attempt_answers")
}
```

### 5.4 Index rationale

| Index | Used by |
|---|---|
| `quizzes(documentId)` | Manager view: list quizzes for a document |
| `quizzes(createdAt)` | Future cleanup job (per spec OI) |
| `attempts(quizId)`, `attempts(submittedAt)` | Analytics: list submissions, sort by time |
| `attempt_answers(questionId)` | Per-question accuracy aggregation |
| `attempts(quizId, identifier)` UNIQUE | Identifier collision detection |

### 5.5 Relationship semantics

- `Document → Quiz` is **1:N**: regenerating creates a new Quiz row (per spec F4 — manager regenerates rather than edits).
- `Quiz → Question → Option` is the question-bank tree.
- `Quiz → Attempt → AttemptAnswer` is the submission tree.
- `AttemptAnswer.selectedOptionId` is FK to `Option.id` so analytics can show which distractors were chosen.

---

## 6. File Upload & Document Processing Pipeline

### 6.1 Flow

```
[Client]                          [Route Handler]                    [External]

multipart POST ────▶ /api/documents
                          │
                          ├─ validate { mime, ext, size <= 15MB }
                          ├─ upload buffer ─────────────▶ Supabase Storage
                          │                                  │ path
                          ├─ dispatch parser by mime ◀───────┘
                          │     pdf  → pdf-parse
                          │     docx → mammoth
                          │     md   → utf-8 read
                          ├─ if extracted text empty → PARSE_EMPTY
                          ├─ INSERT documents row
                          └─ 201 { documentId, charCount }
```

**Decision: proxy through Next.js** (not signed URL). Trade-off accepted for hackathon speed; will migrate to signed URL once files exceed Vercel Pro body limit (see OI-design.E).

### 6.2 Supported formats

| Mime | Parser | Notes |
|---|---|---|
| `application/pdf` | `pdf-parse` | Text-based PDFs only. No OCR. |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth.extractRawText` | Strips formatting; ignores images |
| `text/markdown` | UTF-8 read | Strip front-matter if present |

### 6.3 Parser dispatch

```ts
// lib/parsers/index.ts
export async function extractText(buffer: Buffer, mime: string): Promise<string> {
  switch (mime) {
    case 'application/pdf':
      return parsePdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(buffer);
    case 'text/markdown':
      return stripFrontMatter(buffer.toString('utf-8'));
    default:
      throw new AppError('UNSUPPORTED_MIME', 415, 'Unsupported file type.');
  }
}
```

### 6.4 PDF parsing

```ts
// lib/parsers/pdf.ts
import pdfParse from 'pdf-parse';

export async function parsePdf(buf: Buffer): Promise<string> {
  const { text } = await pdfParse(buf);
  const cleaned = text.replace(/[ 	]+/g, ' ').replace(/
{3,}/g, '

').trim();
  if (cleaned.length === 0) {
    throw new AppError('PARSE_EMPTY', 422, 'Could not extract text from PDF (likely scanned).');
  }
  return cleaned;
}
```

### 6.5 DOCX parsing

```ts
// lib/parsers/docx.ts
import mammoth from 'mammoth';

export async function parseDocx(buf: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const cleaned = value.replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length === 0) {
    throw new AppError('PARSE_EMPTY', 422, 'Could not extract text from DOCX.');
  }
  return cleaned;
}
```

### 6.6 Markdown handling

Strip leading YAML front-matter if present, then return UTF-8 string verbatim.

### 6.7 Error handling for corrupted files

| Failure | HTTP | Code | User message |
|---|---|---|---|
| Wrong mime | 415 | `UNSUPPORTED_MIME` | "Unsupported file type." |
| File > 15MB | 413 | `FILE_TOO_LARGE` | "File too large (max 15MB)." |
| Parser throws | 422 | `PARSE_FAILED` | "We couldn't read this file." |
| Extracted text empty | 422 | `PARSE_EMPTY` | "No readable text. Is this a scanned PDF?" |
| Storage upload error | 500 | `STORAGE_FAILED` | "Upload failed. Please try again." |

Storage upload precedes DB insert. If parse fails, no `documents` row is created and the storage object is left for the cleanup job (acceptable for MVP).

---

## 7. AI Quiz Generation Pipeline

### 7.1 End-to-end workflow

```
text (T tokens)
  │
  ├─▶ chunk(T)                       (tiktoken, ~3000 tok/chunk)
  │     → [c1, c2, ..., cK]
  │
  ├─▶ allocate question budget
  │     totalTarget = quiz.questionCount * 1.5
  │     nPerChunk[i] = ceil(totalTarget * size_i / total)
  │
  ├─▶ Promise.all chunks:
  │     for each chunk → generateQuestionsForChunk(chunk, n)
  │       │
  │       ├─ call gpt-4o-mini, response_format: json_object, temp 0.4
  │       ├─ JSON.parse → Zod validate
  │       │     ├─ valid → return questions
  │       │     └─ invalid → retry once with gpt-4o
  │       │           ├─ valid → return
  │       │           └─ invalid → throw AI_GEN_FAILED
  │       └─ dedupe by exact question text
  │
  ├─▶ flatten + Fisher–Yates → take quiz.questionCount
  │
  └─▶ persist Quiz + Questions + Options inside one transaction
        - generate publicToken + resultsToken via cuid2()
        - questions[].correctIndex → options[i].isCorrect
```

### 7.2 Chunking

```ts
// lib/ai/chunker.ts
import { encoding_for_model } from 'tiktoken';

export function chunkText(text: string, maxTokens = 3000): string[] {
  const enc = encoding_for_model('gpt-4o-mini');
  const tokens = enc.encode(text);
  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    chunks.push(enc.decode(tokens.slice(i, i + maxTokens)));
  }
  enc.free();
  return chunks;
}
```

The boundary may cut a sentence; the prompt explicitly tells the model to ignore truncated fragments at chunk edges. Paragraph-aware chunking is a post-MVP improvement.

### 7.3 Prompts

```ts
// lib/ai/prompts.ts
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

**Why `correctIndex` instead of `correctAnswer` text:** eliminates ambiguity from option-text mutation and matches our internal storage (`Option.isCorrect`).

### 7.4 OpenAI call

```ts
// lib/ai/generateQuestions.ts (excerpt)
const completion = await openai.chat.completions.create({
  model,
  temperature: 0.4,
  max_tokens: 1200,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt(chunk, n) },
  ],
}, { signal: abortSignal });
```

`response_format: json_object` virtually eliminates malformed-JSON responses.

### 7.5 JSON validation schema

```ts
// lib/schemas/ai.ts
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
```

### 7.6 Retry mechanism

```ts
async function generateForChunk(chunk: string, n: number, signal: AbortSignal) {
  try {
    const raw = await callOpenAI('gpt-4o-mini', chunk, n, signal);
    return aiResponseSchema.parse(JSON.parse(raw));
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError) {
      const raw = await callOpenAI('gpt-4o', chunk, n, signal);
      return aiResponseSchema.parse(JSON.parse(raw));   // throws on second failure → AI_GEN_FAILED
    }
    throw e;                                             // network / 5xx / abort propagate as-is
  }
}
```

Single retry. No exponential backoff. No retry storms.

### 7.7 Hallucination prevention

- **Source-grounded prompt:** content passed verbatim in `<content>` tags with explicit "do not invent facts" rule.
- **Low temperature** (`0.4`) — distractor variety without creative drift.
- **Per-chunk grounding** — model sees only the chunk, so questions are anchored to specific content.
- **Manual review path** — manager opens the public quiz link to review (per spec F4 / OQ4); regenerates if unsatisfied.

### 7.8 Token / cost optimization

- `gpt-4o-mini` for primary path (~$0.15 / 1M input, ~$0.60 / 1M output).
- `max_tokens: 1200` per call — enough for ~8 questions.
- Parallel chunks via `Promise.all` to keep wall-clock low.
- Approximate cost per 50-page document (~12k input tokens, ~5k output tokens): **~$0.005**. Even with `gpt-4o` retries on every chunk: ~$0.05.

### 7.9 Difficulty levels

The model assigns `easy` / `medium` / `hard` per question per the prompt definition. No system-level rebalancing — distribution is whatever the model produces. The dashboard does not currently filter by difficulty (post-MVP).

### 7.10 Persistence

Wrap quiz + questions + options in one Prisma transaction:

```ts
await prisma.$transaction(async (tx) => {
  const quiz = await tx.quiz.create({
    data: {
      documentId,
      publicToken: createId(),
      resultsToken: createId(),
      questionCount,
    },
  });
  for (let qi = 0; qi < selected.length; qi++) {
    const q = selected[qi];
    await tx.question.create({
      data: {
        quizId: quiz.id,
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
  return quiz;
});
```

---

## 8. Quiz Randomization Engine

### 8.1 Two layers of randomness

1. **Question subset selection** — pick N from the bank.
2. **Option order shuffle** — randomize the 4 options per question.

Both happen **server-side** at `/q/[token]` page render. The client never sees the bank size or the canonical option order.

### 8.2 Pseudocode

```ts
// lib/randomization/selectQuestions.ts
export function selectQuestions<T>(bank: T[], n: number): T[] {
  const arr = [...bank];
  const k = Math.min(n, arr.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

// lib/randomization/shuffleOptions.ts
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

### 8.3 Data flow on submission

```
Client submits:
  { publicToken, identifier, answers: [{ questionId, selectedOptionId }] }

Server:
  1. Resolve quizId from publicToken
  2. Fetch options for those questionIds → map<optionId, { isCorrect, questionId }>
  3. Verify every answer.questionId belongs to that quiz
  4. Verify every answer.selectedOptionId belongs to the corresponding question
  5. Score = count of answers where map[selectedOptionId].isCorrect === true
  6. Insert Attempt + AttemptAnswers in one transaction
```

### 8.4 Grading integrity

- Correctness lives only in `Option.isCorrect` (never in client payload).
- Same question with different option order across two attempts grades identically.
- Tampering with `selectedOptionId` either points to a real correct option (legitimate answer) or to an option that doesn't belong to the question (rejected with 400).

### 8.5 Anti-cheating considerations

In scope (lightweight):

- Different question subsets per participant → answer-sharing requires sharing per-questionId answers, not just position.
- Different option orders → screenshots become useless.

Out of scope (per spec §5):

- Tab-switch detection
- Copy-paste blocking
- Proctoring / camera
- Time limits
- AI-assisted-answer detection

---

## 9. API Design

REST. JSON. `Content-Type: application/json` unless noted. Response shape: `{ data?, error? }`.

### 9.1 `POST /api/documents`

Upload + parse a document.

- **Content-Type:** `multipart/form-data`
- **Body:** field `file` (required)

Response **201**:
```json
{ "data": { "documentId": 42, "filename": "handbook.pdf", "charCount": 18234 } }
```

Errors: `400 INVALID_INPUT` · `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_MIME` · `422 PARSE_FAILED` · `422 PARSE_EMPTY` · `500 STORAGE_FAILED`.

### 9.2 `POST /api/quizzes`

Generate a quiz from a document.

Request:
```json
{ "documentId": 42, "questionCount": 10 }
```

Validation: `documentId` int (must exist); `questionCount` int, default 10, min 5, max 30.

Response **201**:
```json
{
  "data": {
    "quizId": 17,
    "publicToken": "a8r3kld9m1zp7q",
    "resultsToken": "b2x9pqs0kvlmnt",
    "quizUrl": "/q/a8r3kld9m1zp7q",
    "resultsUrl": "/r/b2x9pqs0kvlmnt",
    "generatedQuestionCount": 18
  }
}
```

Errors: `400 INVALID_INPUT` · `404 DOCUMENT_NOT_FOUND` · `502 AI_GEN_FAILED` · `504 AI_TIMEOUT`.

### 9.3 `GET /api/quizzes/{publicToken}`

Get a randomized participant view.

Response **200**:
```json
{
  "data": {
    "quizId": 17,
    "questionCount": 10,
    "questions": [
      {
        "questionId": 234,
        "text": "Which of the following best describes ...",
        "options": [
          { "id": 891, "text": "..." },
          { "id": 892, "text": "..." },
          { "id": 893, "text": "..." },
          { "id": 894, "text": "..." }
        ]
      }
    ]
  }
}
```

Errors: `404 QUIZ_NOT_FOUND`.

Note: each call produces a fresh randomization (no caching).

### 9.4 `POST /api/attempts`

Submit a participant attempt.

Request:
```json
{
  "publicToken": "a8r3kld9m1zp7q",
  "identifier": "nd_thanh",
  "answers": [
    { "questionId": 234, "selectedOptionId": 893 },
    { "questionId": 235, "selectedOptionId": 897 }
  ]
}
```

Validation:
- `identifier`: 1..64 chars, regex `^[\p{L}0-9 ._-]+$` (Unicode letters, digits, space, `.`, `_`, `-`).
- `answers.length === quiz.questionCount`.
- All `questionId`s belong to the quiz.

Response **201**:
```json
{
  "data": {
    "attemptId": 501,
    "score": 7,
    "total": 10,
    "identifier": "nd_thanh"
  }
}
```

If `(quizId, identifier)` collides, server appends `_yyyyMMddHHmmss`. Response reflects the final stored identifier.

Errors: `400 INVALID_INPUT` · `400 ANSWER_COUNT_MISMATCH` · `404 QUIZ_NOT_FOUND` · `409 ATTEMPT_PERSIST_FAILED`.

### 9.5 `GET /api/analytics/{resultsToken}`

Quiz analytics for the dashboard.

Response **200**:
```json
{
  "data": {
    "quiz": {
      "quizId": 17,
      "createdAt": "2026-05-09T10:00:00Z",
      "documentName": "handbook.pdf"
    },
    "summary": {
      "totalAttempts": 23,
      "averageScore": 7.2,
      "averagePercent": 72.0,
      "highest": 10,
      "lowest": 4
    },
    "attempts": [
      {
        "attemptId": 501,
        "identifier": "nd_thanh",
        "score": 7,
        "total": 10,
        "submittedAt": "2026-05-09T10:42:11Z"
      }
    ],
    "questionAccuracy": [
      { "questionId": 234, "text": "...", "correctRate": 0.65 }
    ]
  }
}
```

Errors: `404 RESULTS_NOT_FOUND`.

### 9.6 Error response shape

Every error:
```json
{ "error": { "code": "AI_GEN_FAILED", "message": "Quiz generation failed. Please try again." } }
```

---

## 10. Security Considerations

MVP-friendly, focused on the few real risks.

| # | Concern | Control |
|---|---|---|
| 1 | URL guessing | `cuid2` tokens (~144 bits) for `publicToken` and `resultsToken`. Internal autoincrement IDs never appear in URLs or API payloads. |
| 2 | Input validation | Every request body parsed via Zod. Reject early with structured error code. |
| 3 | File type | Strict mime + extension allowlist; size cap 15MB. |
| 4 | Path traversal | Storage object path = `${cuid2}.${ext}`, never derived from user filename. |
| 5 | AI output | Every response validated with Zod; one retry with stronger model; no untrusted JSON ever persists. |
| 6 | Identifier injection | Regex `^[\p{L}0-9 ._-]+$`, length ≤ 64. |
| 7 | Rate limiting | Per-IP bucket on `/api/documents` and `/api/quizzes` (e.g. 10/hr). Use in-memory map for single-region MVP; swap to `@upstash/ratelimit` if needed. |
| 8 | Secrets | Only server-side env vars; validated via `@t3-oss/env-nextjs` at boot; never logged. |
| 9 | TLS | Vercel-managed HTTPS by default. |
| 10 | CORS | Same-origin only. No cross-origin API consumers in MVP. |
| 11 | PII | Only participant identifier is stored. No emails, no IPs in DB. |

**Out of scope (per spec):** authentication, RBAC, audit logs, encryption beyond TLS, anti-cheating instrumentation, CSP hardening beyond Next.js defaults.

---

## 11. Performance Considerations

Targets per spec §9: **30s generation for ~50-page documents**, **3s page load**, **100 concurrent participants**.

| # | Lever | Detail |
|---|---|---|
| 1 | Parallel chunks | `Promise.all` over chunks to OpenAI. Wall-clock = max(chunk latency) + persist, not sum. |
| 2 | Model selection | `gpt-4o-mini` for primary path (~3-5× faster than `gpt-4o`); only fall back on validation failure. |
| 3 | JSON mode | `response_format: json_object` cuts malformed-output retries close to zero. |
| 4 | DB indexes | All hot queries hit indexes (see §5.4). |
| 5 | Connection pooling | Mandatory in serverless. Use Supabase Pooler (`?pgbouncer=true&connection_limit=1`). Prisma is module-level singleton. |
| 6 | No client cache | RSC + Postgres direct is fast enough for MVP scale. Skip React Query. |
| 7 | No edge cache | Quizzes are dynamic per request (randomization). |
| 8 | Token budget | `max_tokens: 1200` per chunk; total input cap ~12k tokens. |
| 9 | Cost | ~$0.005/quiz on `gpt-4o-mini`; ~$0.05 worst case. Negligible. |
| 10 | Frontend | Tailwind purges unused CSS; no heavy client libs; RSC for data. |
| 11 | Soft timeout | `AbortController` at 55s aborts in-flight OpenAI calls before Vercel kills the function. |

---

## 12. Error Handling Strategy

### 12.1 Error codes

```ts
export type ErrorCode =
  | 'INVALID_INPUT' | 'UNSUPPORTED_MIME' | 'FILE_TOO_LARGE'
  | 'PARSE_FAILED'  | 'PARSE_EMPTY'      | 'STORAGE_FAILED'
  | 'DOCUMENT_NOT_FOUND' | 'QUIZ_NOT_FOUND' | 'RESULTS_NOT_FOUND'
  | 'AI_GEN_FAILED' | 'AI_TIMEOUT'        | 'AI_VALIDATION_FAILED'
  | 'ANSWER_COUNT_MISMATCH' | 'ATTEMPT_PERSIST_FAILED'
  | 'INTERNAL';
```

### 12.2 Per-failure-mode behavior

| Failure | HTTP | Code | Strategy |
|---|---|---|---|
| Network error during upload | n/a | n/a | Client manual retry button |
| Storage upload fails | 500 | `STORAGE_FAILED` | No DB row created |
| Parse fails or empty | 422 | `PARSE_FAILED` / `PARSE_EMPTY` | No DB row; surface message |
| AI returns malformed JSON | n/a | `AI_VALIDATION_FAILED` (internal) | Retry once with `gpt-4o`. If still bad → 502 `AI_GEN_FAILED`. Transaction rolls back. |
| AI > 55s wall-clock | 504 | `AI_TIMEOUT` | `AbortController` aborts pending chunks; no partial Quiz persisted. |
| OpenAI 429 / 5xx | 502 | `AI_GEN_FAILED` | Surface to user. No silent retry storm. |
| Identifier collision | 201 | (success) | Append `_yyyyMMddHHmmss` and retry insert ONCE. If still collides, 409. |
| Answer count mismatch | 400 | `ANSWER_COUNT_MISMATCH` | Reject; client surfaces validation. |

### 12.3 Retry policy summary

- **AI generation:** at most one retry with stronger model on validation failure. Never on network errors.
- **Identifier collision:** at most one deterministic retry with timestamp suffix.
- **Everything else:** no automatic retry. Surface to user.

### 12.4 Logging

- Every `AppError` logs `{ code, cause }` (not message) to Vercel logs.
- 500s log full stack.
- **Never log:** file content, env vars, user-submitted answers.

---

## 13. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  VPS / local machine                                            │
│                                                                 │
│  docker compose --env-file .env.docker up -d --build            │
│                                                                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │ quiz-app  (port 3000)    │──▶│ quiz-postgres            │   │
│  │  Next.js 16 / node:22    │   │  postgres:16-alpine      │   │
│  │  non-root user nextjs    │   │  volume: postgres_data   │   │
│  └──────────────────────────┘   └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                             ▲
          │ OPENAI_API_KEY              │ optional
          ▼                             │
  ┌───────────────┐         ┌───────────────────────┐
  │ OpenAI API    │         │ Supabase Storage       │
  │ gpt-4o-mini   │         │ bucket: quiz-assets    │
  └───────────────┘         │ (if SUPABASE_URL set)  │
                            └───────────────────────┘
```

### 13.1 Environments

| Env | How to run | Purpose |
|---|---|---|
| Local (Docker) | `docker compose --env-file .env.docker up -d --build` | Full stack locally; Postgres bundled in compose |
| Local (dev) | `pnpm dev` | Hot-reload; needs `.env.local` pointing to a running Postgres |
| Production | Same Docker command on VPS | Build on VPS; expose port 3000 via a reverse proxy |

### 13.2 Env file: `.env.docker`

Excluded by `.gitignore` (`.env*` pattern). **Never commit this file.**

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_USER` | Yes | Postgres username |
| `POSTGRES_PASSWORD` | Yes | Use a strong password in production |
| `POSTGRES_DB` | Yes | Database name |
| `DATABASE_URL` | Auto | Composed from `POSTGRES_*`; points to `postgres:5432` (compose hostname) |
| `DIRECT_URL` | Auto | Same host, no pgbouncer param; used by `prisma db push` at startup |
| `NODE_ENV` | Yes | `production` |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude key |
| `SUPABASE_URL` | Optional | Set to enable Supabase Storage; leave empty to use local disk |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Required when `SUPABASE_URL` is set |
| `SUPABASE_STORAGE_BUCKET` | Optional | Default `quiz-assets` |
| `LOCAL_STORAGE_DIR` | No | Default `.uploads`; local disk fallback for file uploads |
| `PORT` | No | Default `3000` |

### 13.3 Database migration

Migration runs automatically when the `app` container starts:

```sh
# Dockerfile CMD
DATABASE_URL=${DIRECT_URL} pnpm exec prisma db push && pnpm start
```

`prisma db push` syncs schema to the self-hosted Postgres without a migration history file. Suitable for hackathon; switch to `prisma migrate deploy` for production (see OI-13.C).

### 13.4 Deployment workflow

```bash
# First deploy or rebuild after code change
cd quiz-knowledge/
docker compose --env-file .env.docker up -d --build

# View logs
docker compose logs -f app

# Restart app only (no rebuild)
docker compose restart app

# Stop
docker compose down

# Stop + delete volumes  ⚠ wipes all DB data
docker compose down -v
```

### 13.5 Build configuration

- `Dockerfile`: multi-stage build, `node:22-alpine`, `pnpm`, non-root user `nextjs:1001`, `dumb-init` signal handler.
- `docker-compose.yml`: services `postgres` (health-checked) + `app` (depends on healthy postgres); named volumes `postgres_data`, `app_logs`, `app_uploads`.
- `next.config.ts`: default Next.js output; no `output: 'standalone'` override required.

---

## 14. Recommended Folder Structure

```
quiz-knowledge/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── manager/
│   │   ├── page.tsx
│   │   └── new/
│   │       ├── page.tsx
│   │       └── _components/
│   │           ├── UploadForm.tsx
│   │           └── GenerationProgress.tsx
│   ├── q/[token]/
│   │   ├── page.tsx
│   │   ├── done/page.tsx
│   │   └── _components/
│   │       ├── QuizForm.tsx
│   │       └── QuestionItem.tsx
│   ├── r/[token]/
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── StatsCards.tsx
│   │       ├── SubmissionsTable.tsx
│   │       └── QuestionAccuracy.tsx
│   └── api/
│       ├── documents/route.ts
│       ├── quizzes/route.ts
│       ├── quizzes/[token]/route.ts
│       ├── attempts/route.ts
│       └── analytics/[token]/route.ts
├── components/
│   ├── ui/                          # shadcn primitives
│   └── shared/
│       ├── FileDropzone.tsx
│       ├── PublicLinkPanel.tsx
│       ├── LoadingState.tsx
│       └── ErrorState.tsx
├── lib/
│   ├── ai/
│   │   ├── client.ts
│   │   ├── chunker.ts
│   │   ├── prompts.ts
│   │   ├── generateQuestions.ts
│   │   └── validate.ts
│   ├── parsers/
│   │   ├── pdf.ts
│   │   ├── docx.ts
│   │   ├── markdown.ts
│   │   └── index.ts
│   ├── randomization/
│   │   ├── selectQuestions.ts
│   │   └── shuffleOptions.ts
│   ├── services/
│   │   ├── documents.ts
│   │   ├── quizzes.ts
│   │   ├── attempts.ts
│   │   └── analytics.ts
│   ├── db/
│   │   ├── prisma.ts
│   │   └── repositories/
│   │       ├── documents.ts
│   │       ├── quizzes.ts
│   │       └── attempts.ts
│   ├── schemas/
│   │   ├── api.ts
│   │   ├── ai.ts
│   │   └── common.ts
│   ├── storage/
│   │   └── supabase.ts
│   ├── config/
│   │   └── env.ts
│   ├── utils/
│   │   └── timestamp.ts
│   └── errors.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/
│   └── shared.ts
├── public/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.docker             # excluded from git; fill secrets before deploy
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 15. Development Workflow

### 15.1 Local setup (target: < 10 minutes for first-time dev)

```bash
pnpm install
cp .env.example .env.local
# fill OPENAI_API_KEY, DATABASE_URL, DIRECT_URL, SUPABASE_*

pnpm prisma migrate dev          # creates tables locally
pnpm dev                         # http://localhost:3000
```

### 15.2 Branching

- `main` → production (manual deploy: `docker compose --env-file .env.docker up -d --build` on VPS)
- `feat/*`, `fix/*` → local testing; no auto-preview environment

### 15.3 Migration workflow

```
# Local schema change
edit prisma/schema.prisma
pnpm prisma migrate dev --name <change>

# Production
pnpm prisma migrate deploy
```

Never edit an applied migration. New change = new migration.

### 15.4 Env setup checklist

Copy `.env.docker` and fill in the secret values; the file is git-ignored.

| Var | Where to get it |
|---|---|
| `POSTGRES_PASSWORD` | Choose a strong password |
| `OPENAI_API_KEY` | OpenAI dashboard → API keys |
| `ANTHROPIC_API_KEY` | Anthropic Console → API keys (optional) |
| `SUPABASE_URL` | Supabase → Project Settings → API (optional, for cloud storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → service_role key (optional) |

`DATABASE_URL` và `DIRECT_URL` được tự động tạo bởi docker-compose từ các biến `POSTGRES_*` — không cần ghi thủ công.

### 15.5 Hackathon speed tips

- Run `npx shadcn@latest add button card input table dialog form` **once** at project start.
- One person owns `prisma/schema.prisma` to avoid migration conflicts.
- Wire the entire happy path with stubs first (mock `generateQuestions` returning hardcoded JSON), then fill real OpenAI calls.
- Skip strict ESLint until shipping; rely on TypeScript + Prettier.
- Manually smoke-test the full flow on preview URL after every meaningful merge.

---

## 16. Future Scalability Considerations

Each item below is a **vertical slice** that touches isolated modules. The current architecture intentionally keeps boundaries clean so future work is additive, not a rewrite.

| Future capability | How it slots in | What changes |
|---|---|---|
| **Authentication** | Add Supabase Auth or Clerk; introduce `users` table | Add `ownerId` to `documents` and `quizzes`; gate manager routes; public participant routes unchanged |
| **Team management** | Add `organizations` + `memberships` | Backfill `organizationId` onto `documents` and `quizzes`; tokens still work for sharing |
| **RAG-based generation** | Enable `pgvector` in Supabase; add `document_chunks` table with embeddings | Replace `chunkText` + raw prompt in `lib/ai/generateQuestions.ts`; rest of system unchanged |
| **Async generation + job queue** | Add `quiz_generation_jobs` table; add Vercel Cron or Inngest worker | Current sync endpoint becomes "submit job"; FE adds polling hook. Triggered when spec F7 lands. |
| **Advanced analytics** | Materialized views or aggregate tables off `attempt_answers` | New endpoints; existing indexes already aligned |
| **LMS integration (SCORM / xAPI)** | Read from `attempts` + `attempt_answers`, emit statements | No schema change |
| **Anti-cheating** | Add `started_at` to `attempts`; client telemetry endpoint | Additive; no migration of existing data |
| **Cleanup job** | Vercel Cron daily: `DELETE FROM quizzes WHERE created_at < now() - interval '90 days'` | `Quiz.createdAt` index already in place |
| **Edit interface** | Add CRUD endpoints for questions/options | UI-only; data model is already adequate |

---

## Open Issues

These are tracked here so they surface in the next phase.

| ID | Description |
|---|---|
| **OI-design.A** | Should the dashboard show difficulty distribution? Currently aggregates across all difficulties. |
| **OI-design.B** | `questionCount` per attempt is currently a request parameter (default 10, max 30). Should it be locked at quiz creation time instead? |
| **OI-design.C** | Identifier suffix has 1-second resolution. Two same-second retakes by the same identifier still collide. Acceptable for MVP scale; revisit if observed. |
| **OI-design.D** | Cleanup job for stale quizzes is not implemented in MVP per spec F8 deferral. `Quiz.createdAt` index is in place to enable it later. |
| **OI-design.E** | Current upload is proxied through the Next.js Route Handler. Migrate to Supabase signed-URL upload once files exceed Vercel Pro body limit. |
| **OI-design.F** | Rate limiting uses in-memory bucket per Vercel function instance. Cross-instance accuracy requires Upstash. Acceptable for hackathon scale. |

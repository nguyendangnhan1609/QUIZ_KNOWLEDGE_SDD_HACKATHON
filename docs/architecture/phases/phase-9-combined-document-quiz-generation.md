# Phase 9 - Combined-Document Quiz Generation (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-13  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md)  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md)  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md)  
Authoritative app root: [`quiz-knowledge/src/app`](../../../quiz-knowledge/src/app)  
Resolved from: OI-8.A in [`docs/architecture/phases/phase-8-multi-file-upload.md`](./phase-8-multi-file-upload.md)

This is the executable task list for Phase 9. Each task is sized to be a single AI prompt or a single 30–60 minute block of work.

> **This phase resolves OI-8.A from Phase 8.** After uploading multiple files, the user now generates one quiz from the **combined text content of all uploaded documents**, instead of having to pick a single document.

---

## 1. Phase Overview

### Purpose

When a user uploads multiple documents and proceeds to quiz generation, the system should treat all uploaded documents as a single combined knowledge source — concatenating their text content before passing it to the AI generation pipeline.

**Phase 8 behavior (current):**  
Upload N files → pick 1 document → generate quiz from that 1 document.

**Phase 9 behavior (target):**  
Upload N files → confirm all N documents → generate 1 quiz from all N documents combined.

Single-document flow (1 file uploaded) is unchanged.

### Expected outcome

After Phase 9:

- The `GenerateForm` component accepts `documentIds: number[]` instead of `documentId: number`.
- The API endpoint `POST /api/quizzes` accepts `{ documentIds: number[], questionCount: number }`.
- The `createQuiz` service fetches all documents, concatenates their `textContent` with a separator, and passes the combined text to `generateQuestions`.
- The `Quiz` database record stores a primary `documentId` (first in the list, backward compat) and a new `sourceDocumentIds` column recording all source documents.
- The `DocumentPicker` component is replaced by a `MultiDocumentSummary` component that displays all documents as a read-only list and renders `GenerateForm` directly below — no selection step.
- Single-document flow: `page.tsx` passes `documentIds={[doc.id]}`, everything works identically to Phase 8.
- A Prisma migration adds the `sourceDocumentIds` column to the `quizzes` table.

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Combined text strategy | Concatenate all `textContent` fields with `\n\n---\n\n` separator | Simple, readable by chunker; no structural ambiguity |
| Max documents per quiz | 10 (enforced by schema validation) | Prevents combinatorial overload on the AI pipeline |
| Primary document FK | `documentId = documentIds[0]` (first in list) | Preserves non-nullable FK without migration complexity |
| New DB column | `sourceDocumentIds Int[]` on `quizzes` (PostgreSQL native array) | Stores full source list; backward-compat (default `{}`) |
| API backward compat | `documentIds` replaces `documentId` — old `?documentId=X` single-doc URL → `documentIds=[X]` via page.tsx adaptor | Single-doc flow still works end-to-end |
| `GenerateForm` prop | `documentIds: number[]` replaces `documentId: number` | One consistent interface for both flows |
| `DocumentPicker` | Removed and replaced by `MultiDocumentSummary` | Picker no longer needed — all docs always used |
| `generateQuestions` | Unchanged — receives concatenated `text: string` | AI pipeline has no knowledge of document count |
| Question chunk budget | Unchanged — `MAX_CHUNKS = 8`, spread over combined text | Chunker already handles arbitrary text length |
| Out of scope | Per-document question attribution, per-document chunk weighting, weighted question ratios, document reordering UI | Deferred; not in spec |

### Architecture decision

The concatenation happens at the **service layer** (`lib/services/quizzes.ts`), not in the AI layer or the API route. The AI pipeline (`generateQuestions`) remains a pure text-in / questions-out function.

The DB change is **additive only**: one new column on `quizzes`. No existing column is removed or renamed. Existing quiz records keep `sourceDocumentIds = {}` (empty array = legacy single-doc quiz read from `documentId`).

---

## 2. Setup Goals

- [ ] Prisma schema adds `sourceDocumentIds Int[]` to `Quiz` with `@default([])`.
- [ ] A migration is generated and applied locally.
- [ ] `createQuizRequestSchema` validates `{ documentIds: number[], questionCount: number }`.
- [ ] `createQuiz` service accepts `documentIds[]`, fetches all docs, concatenates text, persists `sourceDocumentIds`.
- [ ] `GenerateForm` prop changes from `documentId: number` to `documentIds: number[]`.
- [ ] `DocumentPicker` is replaced by `MultiDocumentSummary`.
- [ ] Quiz generation page passes `documentIds` correctly for both single and multi flows.
- [ ] All automated checks pass: `prisma generate`, `tsc --noEmit`, `lint` (no new errors), `build`.

---

## 3. Target Folder Structure

This phase modifies existing files and removes one component. One new component is created.

```text
quiz-knowledge/
  prisma/
    schema.prisma                               ← MODIFY: add sourceDocumentIds to Quiz
    migrations/
      <timestamp>_add_source_document_ids/      ← GENERATE: prisma migrate dev
        migration.sql

  src/
    lib/
      schemas/
        quizzes.ts                              ← MODIFY: documentId → documentIds
      services/
        quizzes.ts                              ← MODIFY: multi-doc fetch + concatenate + store
    app/
      manager/
        quizzes/
          new/
            page.tsx                            ← MODIFY: pass documentIds[] to both flows
            _components/
              GenerateForm.tsx                  ← MODIFY: prop documentId → documentIds
              DocumentPicker.tsx                ← REMOVE (replaced)
              MultiDocumentSummary.tsx          ← CREATE: read-only doc list + GenerateForm
```

### Folder rules

- Do not change `generateQuestions.ts`, `chunker.ts`, `prompts.ts`, or any API route file.
- Do not touch the upload flow (`FileDropzone`, `UploadForm`, `/api/documents`).
- The migration file is generated by Prisma CLI — do not hand-write SQL.

---

## 4. Task Breakdown

---

### Task 9.1 — Scope Lock & Interface Design

**Objective.** Agree on all interface and DB contracts before any file is modified.

**Technical Requirements.**

Lock the following before implementation:

**`createQuizRequestSchema` (new):**

```ts
z.object({
  documentIds: z.array(z.number().int().positive()).min(1).max(10),
  questionCount: z.number().int().min(5).max(30),
})
```

**`CreateQuizInput` (new):**

```ts
interface CreateQuizInput {
  documentIds: number[];
  questionCount: number;
}
```

**Concatenation format:**

```ts
const combinedText = docs
  .map(d => d.textContent)
  .join('\n\n---\n\n');
```

**DB write (new fields on Quiz create):**

```ts
await tx.quiz.create({
  data: {
    documentId: documentIds[0],          // primary FK, backward compat
    sourceDocumentIds: documentIds,      // full list
    publicToken: createId(),
    resultsToken: createId(),
    questionCount: input.questionCount,
  },
});
```

**`GenerateForm` new prop:**

```ts
interface GenerateFormProps {
  documentIds: number[];   // was: documentId: number
}
```

POST body sent to `/api/quizzes`:

```ts
{ documentIds: props.documentIds, questionCount }
```

**`MultiDocumentSummary` props:**

```ts
interface MultiDocumentSummaryProps {
  documents: { id: number; filename: string; charCount: number }[];
}
// Renders the list then: <GenerateForm documentIds={documents.map(d => d.id)} />
```

**page.tsx changes:**

```ts
// Single doc:
<GenerateForm documentIds={[doc.id]} />

// Multi doc:
<MultiDocumentSummary documents={docs} />
// (MultiDocumentSummary internally renders GenerateForm with all IDs)
```

**Dependencies.**

- Phase 8 complete.
- Files read: `schema.prisma`, `quizzes.ts` (schema), `quizzes.ts` (service), `GenerateForm.tsx`, `DocumentPicker.tsx`, `page.tsx`.

**Acceptance Criteria.**

- All interface changes are agreed on before Task 9.2 begins.
- No ambiguity remains about DB column type, concatenation format, or component props.

**Validation Steps.**

1. Review this section against current source files.
2. Confirm `sourceDocumentIds Int[]` is valid in Prisma + PostgreSQL.
3. Sign off before implementation begins.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Low. Design checkpoint only.

---

### Task 9.2 — Update Prisma Schema & Generate Migration

**Objective.** Add `sourceDocumentIds` to the `Quiz` model and apply the migration.

**File:** `quiz-knowledge/prisma/schema.prisma`

**Technical Requirements.**

Add one field to the `Quiz` model:

```prisma
model Quiz {
  id                Int      @id @default(autoincrement())
  documentId        Int
  sourceDocumentIds Int[]    @default([])          // ← ADD THIS
  publicToken       String   @unique
  resultsToken      String   @unique
  questionCount     Int
  createdAt         DateTime @default(now())

  document  Document       @relation(fields: [documentId], references: [id], onDelete: Cascade)
  questions Question[]
  attempts  Attempt[]
  sessions  QuizSession[]

  @@index([documentId])
  @@index([createdAt])
  @@map("quizzes")
}
```

After saving the schema, run:

```powershell
cd quiz-knowledge
pnpm prisma migrate dev --name add_source_document_ids
pnpm prisma generate
```

**Important:** Confirm the migration runs without error before proceeding to Task 9.3.

**Dependencies.**

- Task 9.1 signed off.
- Local PostgreSQL / Supabase connection available.

**Acceptance Criteria.**

- `schema.prisma` has `sourceDocumentIds Int[] @default([])` on `Quiz`.
- Migration file is generated under `prisma/migrations/`.
- `pnpm prisma generate` completes without error.
- `pnpm tsc --noEmit` still passes after generate.

**Validation Steps.**

1. Run `pnpm prisma migrate dev --name add_source_document_ids`.
2. Inspect generated SQL — confirm it is `ALTER TABLE quizzes ADD COLUMN source_document_ids integer[] DEFAULT '{}'`.
3. Run `pnpm prisma generate`.
4. Run `pnpm tsc --noEmit`.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Medium. Schema edit is trivial; migration command must be run by the developer.

---

### Task 9.3 — Update `createQuizRequestSchema` (Validation Schema)

**Objective.** Replace the single `documentId` field with `documentIds` array in the Zod request schema.

**File:** `quiz-knowledge/src/lib/schemas/quizzes.ts`

**Technical Requirements.**

Replace:

```ts
export const createQuizRequestSchema = z.object({
  documentId: z.number().int().positive(),
  questionCount: z.number().int().min(5).max(30),
});
```

With:

```ts
export const createQuizRequestSchema = z.object({
  documentIds: z.array(z.number().int().positive()).min(1).max(10),
  questionCount: z.number().int().min(5).max(30),
});

export type CreateQuizRequest = z.infer<typeof createQuizRequestSchema>;
```

**Dependencies.**

- Task 9.1 signed off.

**Acceptance Criteria.**

- `createQuizRequestSchema` validates `{ documentIds: [1, 2], questionCount: 10 }`.
- `createQuizRequestSchema` rejects `{ documentId: 1, questionCount: 10 }` (old format).
- `createQuizRequestSchema` rejects `documentIds` with 0 items.
- `createQuizRequestSchema` rejects `documentIds` with more than 10 items.
- `pnpm tsc --noEmit` passes.

**Validation Steps.**

1. Review the new schema.
2. Confirm TypeScript infers the correct type for `CreateQuizRequest`.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Mechanical schema swap.

---

### Task 9.4 — Update `createQuiz` Service (Multi-doc Fetch + Concatenate)

**Objective.** Update the quiz creation service to fetch multiple documents, concatenate their text, and store `sourceDocumentIds`.

**File:** `quiz-knowledge/src/lib/services/quizzes.ts`

**Technical Requirements.**

Replace the current single-document fetch logic with:

```ts
export interface CreateQuizInput {
  documentIds: number[];
  questionCount: number;
}

export async function createQuiz(input: CreateQuizInput): Promise<CreateQuizResult> {
  const docs = await prisma.document.findMany({
    where: { id: { in: input.documentIds } },
    select: { id: true, textContent: true },
    orderBy: { id: 'asc' },
  });

  if (docs.length === 0) {
    throw new AppError('DOCUMENT_NOT_FOUND', 404, 'No documents found.');
  }

  const combinedText = docs.map(d => d.textContent).join('\n\n---\n\n');

  const { bank, bankSize } = await generateQuestions({
    text: combinedText,
    questionCount: input.questionCount,
  });

  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        documentId: docs[0].id,              // primary FK
        sourceDocumentIds: docs.map(d => d.id),
        publicToken: createId(),
        resultsToken: createId(),
        questionCount: input.questionCount,
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

**Key decisions:**

- `orderBy: { id: 'asc' }` ensures consistent document order regardless of DB retrieval order.
- `docs[0].id` is the primary `documentId` FK (first by ascending ID).
- If `input.documentIds` contains IDs that don't exist in the DB, they are silently filtered out by `findMany`. The `docs.length === 0` guard catches total failure.
- The concatenation separator `\n\n---\n\n` is a Markdown horizontal rule — human-readable and chunker-friendly.

**Dependencies.**

- Task 9.2 (migration applied, `sourceDocumentIds` column exists).
- Task 9.3 (`CreateQuizInput` type updated).

**Acceptance Criteria.**

- `createQuiz({ documentIds: [1, 2, 3], questionCount: 10 })` fetches all 3 docs and generates questions from concatenated text.
- `createQuiz({ documentIds: [1], questionCount: 10 })` works identically to the old single-doc path.
- `quiz.sourceDocumentIds` is persisted correctly.
- `quiz.documentId` is set to the first document's ID.
- `pnpm tsc --noEmit` passes.

**Validation Steps.**

1. Review the updated service logic.
2. Confirm TypeScript types resolve correctly after schema and interface changes.
3. Manual end-to-end test in Task 9.8 will validate runtime behavior.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** High. Mechanical multi-fetch + concatenation.

---

### Task 9.5 — Update `GenerateForm` Component

**Objective.** Change the `documentId` prop to `documentIds` and update the POST body sent to `/api/quizzes`.

**File:** `quiz-knowledge/src/app/manager/quizzes/new/_components/GenerateForm.tsx`

**Technical Requirements.**

Change the props interface:

```ts
// Before
interface GenerateFormProps {
  documentId: number;
}

// After
interface GenerateFormProps {
  documentIds: number[];
}
```

Update the `fetch` call body:

```ts
// Before
body: JSON.stringify({ documentId, questionCount })

// After
body: JSON.stringify({ documentIds, questionCount })
```

No other changes to `GenerateForm`. The component UI, state, loading indicator, and result display remain unchanged.

**Dependencies.**

- Task 9.3 (API now expects `documentIds`).

**Acceptance Criteria.**

- `<GenerateForm documentIds={[1]} />` compiles and sends `{ documentIds: [1], questionCount }` to the API.
- `<GenerateForm documentIds={[1, 2, 3]} />` compiles and sends the correct body.
- `pnpm tsc --noEmit` passes.
- No regression in UI behavior.

**Validation Steps.**

1. Inspect the updated component.
2. Confirm no other prop usage remains in the file.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Mechanical prop rename.

---

### Task 9.6 — Create `MultiDocumentSummary` & Remove `DocumentPicker`

**Objective.** Replace `DocumentPicker` (pick-one UX) with `MultiDocumentSummary` (show all, generate from all).

**Files:**

- CREATE: `quiz-knowledge/src/app/manager/quizzes/new/_components/MultiDocumentSummary.tsx`
- REMOVE: `quiz-knowledge/src/app/manager/quizzes/new/_components/DocumentPicker.tsx`

**Technical Requirements — `MultiDocumentSummary.tsx`:**

```ts
'use client';

interface Doc {
  id: number;
  filename: string;
  charCount: number;
}

interface MultiDocumentSummaryProps {
  documents: Doc[];
}
```

UI layout:

1. A read-only list of all documents (filename + char count), styled as info cards.
2. A combined character count summary line below the list.
3. `<GenerateForm documentIds={documents.map(d => d.id)} />` rendered directly below.

No user selection is needed. The user sees all documents and configures only the question count.

Copy guidance:

- Heading above the list: `"Sources (N documents)"`
- Below the list: `"Combined: X characters"`
- No "select" button or checkbox — the list is display-only.

Example structure:

```tsx
<div className="space-y-6">
  <div className="space-y-2">
    <p className="text-sm font-medium text-gray-700">
      Sources ({documents.length} document{documents.length > 1 ? 's' : ''})
    </p>
    <ul className="space-y-2">
      {documents.map(doc => (
        <li key={doc.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-gray-800">{doc.filename}</p>
          <p className="text-xs text-gray-400">{doc.charCount.toLocaleString()} characters</p>
        </li>
      ))}
    </ul>
    <p className="text-xs text-gray-500">
      Combined: {documents.reduce((s, d) => s + d.charCount, 0).toLocaleString()} characters
    </p>
  </div>

  <GenerateForm documentIds={documents.map(d => d.id)} />
</div>
```

**Removal of `DocumentPicker.tsx`:**

- Delete the file after confirming `page.tsx` no longer imports it.
- Do not leave a re-export stub.

**Dependencies.**

- Task 9.5 (`GenerateForm` now takes `documentIds`).

**Acceptance Criteria.**

- `MultiDocumentSummary` renders a list of all documents without any selection UI.
- `GenerateForm` renders directly below the list.
- `DocumentPicker.tsx` is deleted.
- No TypeScript errors from the deletion.
- `pnpm tsc --noEmit` passes.

**Validation Steps.**

1. Verify `DocumentPicker` is no longer imported anywhere (`grep -r DocumentPicker src/`).
2. Verify `MultiDocumentSummary` renders correctly in browser.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Simple presentation component.

---

### Task 9.7 — Update Quiz Generation Page

**Objective.** Update `page.tsx` to use `MultiDocumentSummary` and pass `documentIds` correctly for both flows.

**File:** `quiz-knowledge/src/app/manager/quizzes/new/page.tsx`

**Technical Requirements.**

Replace the `DocumentPicker` import with `MultiDocumentSummary`.

Single-doc flow — change:

```tsx
// Before
<GenerateForm documentId={doc.id} />

// After
<GenerateForm documentIds={[doc.id]} />
```

Multi-doc flow — change:

```tsx
// Before
<DocumentPicker documents={docs} />

// After
<MultiDocumentSummary documents={docs} />
```

Update the single-doc heading to be consistent:

```tsx
// Single doc heading
<p className="mt-2 text-sm text-muted-foreground">
  From <strong>{doc.filename}</strong> ({doc.charCount.toLocaleString()} characters)
</p>
```

This heading stays as-is for the single-doc flow — no change needed.

**Dependencies.**

- Task 9.5 (`GenerateForm` takes `documentIds`).
- Task 9.6 (`MultiDocumentSummary` exists, `DocumentPicker` removed).

**Acceptance Criteria.**

- `?documentId=X` → single-doc layout with `<GenerateForm documentIds={[X]} />`.
- `?documentIds=X,Y,Z` → `<MultiDocumentSummary documents={[...]} />`.
- No import of `DocumentPicker` remains.
- `pnpm tsc --noEmit` passes.

**Validation Steps.**

1. Navigate to `?documentId=X` — confirm single-doc layout unchanged.
2. Navigate to `?documentIds=X,Y,Z` — confirm `MultiDocumentSummary` renders with all 3 docs.
3. Verify `DocumentPicker` import is gone.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** High. Mechanical import swap and prop update.

---

### Task 9.8 — End-to-End Verification & Phase Closeout

**Objective.** Confirm all changes work together and automated checks pass.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Upload 1 file, proceed to quiz generation | Single-doc layout; `GenerateForm` shown; quiz generates normally |
| 2 | Generate quiz from single doc | Quiz created; questions from that doc's content |
| 3 | Upload 3 files, proceed to quiz generation | `MultiDocumentSummary` shows 3 doc cards + combined char count |
| 4 | Generate quiz from 3 combined docs | Quiz created; questions span content from all 3 documents |
| 5 | Inspect DB — check `source_document_ids` | Single-doc quiz: `[id]`; multi-doc quiz: `[id1, id2, id3]` |
| 6 | Upload 3 files, 1 fails | 2-doc multi summary shown; quiz generates from 2 docs |
| 7 | Navigate `?documentIds=X` (single item) | Single-doc layout renders (no summary panel) |
| 8 | Take generated multi-doc quiz as participant | Full quiz flow works end-to-end |
| 9 | Open results for multi-doc quiz | Results dashboard loads correctly |
| 10 | Navigate to old `?documentId=X` URL | Backward compat: single-doc layout works |

Automated checks:

```powershell
cd quiz-knowledge
pnpm prisma generate
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Commit strategy:

```text
feat(9): add sourceDocumentIds column to quizzes, generate migration
feat(9): update createQuizRequestSchema to accept documentIds array
feat(9): update createQuiz service to concatenate multi-doc text
feat(9): update GenerateForm prop documentId → documentIds
feat(9): add MultiDocumentSummary, remove DocumentPicker
feat(9): update quiz generation page for multi-doc flow
chore(9): phase 9 complete - combined-document quiz generation
```

Branch:

- `feat/9-combined-document-quiz-generation`

PR title:

- `Phase 9: Combined-Document Quiz Generation`

**Dependencies.**

- Tasks 9.1 through 9.7.

**Acceptance Criteria.**

- All 10 manual QA steps pass.
- Automated checks pass (or lint has no new errors beyond pre-existing ones).
- No backend file outside of planned scope was modified.
- DB migration is present and applied.

**Validation Steps.**

1. Run automated checks.
2. Walk the manual QA checklist.
3. Confirm `source_document_ids` column exists in production-equivalent DB.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Low. This is manual verification.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **9.1 Scope lock** — freeze all contracts first.
2. **9.2 Prisma migration** — DB column must exist before service compiles.
3. **9.3 Schema update** — new Zod schema unblocks TypeScript compilation.
4. **9.4 Service update** — depends on 9.2 (column) and 9.3 (type).
5. **9.5 GenerateForm** — depends on 9.3 (API now expects `documentIds`).
6. **9.6 MultiDocumentSummary / remove DocumentPicker** — depends on 9.5 (GenerateForm prop).
7. **9.7 page.tsx** — depends on 9.5 and 9.6.
8. **9.8 Verification** — gate task.

Tasks 9.3 and 9.5 can be parallelized (schema and frontend are independent until compile-time).

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 9.1 | 15 min |
| 9.2 | 20 min |
| 9.3 | 10 min |
| 9.4 | 20 min |
| 9.5 | 10 min |
| 9.6 | 20 min |
| 9.7 | 15 min |
| 9.8 | 30 min |
| **Total** | **~140 min (~2.5 h)** |

---

## 6. Common Phase 9 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Forgetting `pnpm prisma generate` after schema change | TypeScript won't see the new field; `tsc` fails | Always run generate immediately after schema edit |
| Using `Promise.all` to fetch docs then joining out of order | Different runs may produce different chunk distributions | Use `orderBy: { id: 'asc' }` in `findMany` |
| Passing very large combined text to `generateQuestions` | Chunker handles it, but 10× 15MB docs would be extreme | `max(10)` in schema validation limits total exposure |
| Changing `GenerateForm` UI while changing the prop | Risk of introducing unrelated regressions | Only change the prop name and POST body; leave UI alone |
| Leaving `DocumentPicker` imported but unused | TypeScript may not catch dead imports; lint may warn | Grep for all imports of `DocumentPicker` before closing |
| Treating the primary `documentId` FK as "the source" in analytics | Analytics code reads `documentId` for display | This is an acceptable MVP limitation; note it as a known caveat |

---

## 7. Definition of Done

Phase 9 is complete when all of the following are true:

### Database

- [ ] `quizzes` table has `source_document_ids integer[] DEFAULT '{}'` column.
- [ ] Prisma migration file exists under `prisma/migrations/`.
- [ ] `pnpm prisma generate` succeeds.

### Code

- [ ] `createQuizRequestSchema` accepts `documentIds: number[]`.
- [ ] `createQuiz` service fetches all docs by ID, concatenates text, stores `sourceDocumentIds`.
- [ ] `GenerateForm` prop is `documentIds: number[]`.
- [ ] `MultiDocumentSummary` exists and is used when `docs.length > 1`.
- [ ] `DocumentPicker.tsx` is deleted.
- [ ] `page.tsx` imports `MultiDocumentSummary`, not `DocumentPicker`.
- [ ] No backend file outside planned scope was modified.

### Functionality

- [ ] Single-doc upload → quiz generation works identically to Phase 8.
- [ ] Multi-doc upload → combined quiz generates from all documents' content.
- [ ] `sourceDocumentIds` is correctly stored in DB for both flows.
- [ ] Participant quiz flow works after a multi-doc quiz is generated.
- [ ] Results flow works after a multi-doc quiz is generated.

### Non-functional

- [ ] No new npm dependencies introduced.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm build` passes.
- [ ] No new lint errors introduced (pre-existing errors are acceptable).

### Repo hygiene

- [ ] Commits follow `feat(9):` and `chore(9):`.
- [ ] Branch `feat/9-combined-document-quiz-generation` is ready to merge.

---

## 8. Open Issues

### OI-9.A — Question distribution across documents

- **Description.** When concatenating documents, the chunker spreads the question budget evenly across chunks — which does not guarantee proportional coverage per document. A short document may contribute fewer chunks and thus fewer questions than a long one.
- **Decision for Phase 9.** Accepted as a known limitation. The chunker already handles arbitrary text; uniform chunking is fair enough for MVP.
- **Follow-up.** If users report uneven question coverage, add per-document chunk weighting in a future phase.

### OI-9.B — Analytics dashboard shows primary document only

- **Description.** The analytics / results dashboard currently displays the document name by reading `quiz.documentId → document.filename`. For multi-document quizzes, this shows only the first document's name.
- **Decision for Phase 9.** Acceptable for MVP. The quiz is still usable and results are correct.
- **Follow-up.** Update the dashboard to read `sourceDocumentIds` and display all source document names when more than one is present.

### OI-9.C — `sourceDocumentIds` not validated against DB at request time

- **Description.** The API accepts `documentIds: [1, 2, 999]` where `999` does not exist. The service uses `findMany`, which silently drops non-existent IDs. If all IDs are invalid, the `docs.length === 0` guard throws `DOCUMENT_NOT_FOUND`, but partial invalidity is silent.
- **Decision for Phase 9.** Silent partial resolution is acceptable for MVP. The user controls which IDs are submitted (they come from the upload flow, not user-typed input).
- **Follow-up.** Add strict validation if the API is ever exposed to untrusted clients.

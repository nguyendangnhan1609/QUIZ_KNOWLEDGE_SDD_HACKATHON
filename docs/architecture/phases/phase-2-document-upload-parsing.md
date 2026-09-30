# Phase 2 — Document Upload & Parsing (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, §6  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0, §6 + §9.1  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1

This is the executable task list for Phase 2. Each task is sized to be a single AI prompt or a single ~30–45-minute block of work.

---

## 1. Phase Overview

### Purpose

Build the end-to-end document upload and parsing pipeline so a manager can drop a PDF, DOCX, or Markdown file into the UI and have its plain-text content land in the `documents` table — ready for AI quiz generation in Phase 3.

### Expected outcome

After Phase 2:

- A manager can navigate to `/manager/new`, drag-and-drop a file, and see a success toast within ~2 seconds.
- The original file lives in the private Supabase Storage `docs` bucket.
- A `documents` row exists with `text` populated, `storagePath` set, `documentType` enum filled, and `uploadedFileName` recorded.
- Bad inputs (wrong mime, oversize, scanned PDF, corrupted file) return precise HTTP codes with user-friendly toasts.
- The parsing layer is a single `extractText(buffer, mime)` function used by the API; it dispatches to per-format parsers and is unit-testable.

### Why this setup matters for future phases

- **Phase 3 (AI Quiz Generation)** consumes `documents.text`. Garbage in → garbage quizzes. Text normalization in this phase (§Task 2.9) directly affects question quality and token cost.
- **Phase 4 (Manager Dashboard)** lists documents by `createdAt` and shows char counts. The metadata we capture here is what the dashboard renders.
- **Phase 7 (Polish)** depends on the upload UX being reliable; we don't want to revisit drag-drop behavior late in the hackathon.
- **A 15MB cap and clean error codes now = zero firefighting later.** Catching a corrupted PDF in Phase 2 takes 2 minutes; catching it as a 502 from OpenAI in Phase 3 takes 30 minutes of confused debugging.

---

## 2. Setup Goals

- [ ] Build `/manager/new` upload page with drag-and-drop, mime preview, size guard, and toast feedback.
- [ ] Implement `POST /api/documents` route handler with multipart parsing, Zod validation, and structured error responses.
- [ ] Wire Supabase Storage upload via the existing `docsBucket` helper (created in Phase 1 Task 1.7).
- [ ] Persist a `documents` row with `text`, `uploadedFileName`, `storagePath`, `documentType`, and timestamps.
- [ ] Implement three parsers: `pdf-parse` for PDF, `mammoth` for DOCX, native UTF-8 for Markdown.
- [ ] Build a unified `extractText(buffer, mime)` dispatcher.
- [ ] Build a text normalization step (whitespace, unicode, line breaks) shared by all parsers.
- [ ] Implement structured error handling: `UNSUPPORTED_MIME`, `FILE_TOO_LARGE`, `PARSE_FAILED`, `PARSE_EMPTY`, `STORAGE_FAILED`.
- [ ] Add a small set of validation tests (one good + one bad fixture per format).
- [ ] Manual QA pass with real PDF / DOCX / MD files; commit Phase 2 with one PR.

---

## 3. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 2.1 — Create Upload UI

**Objective.** Build the `/manager/new` page with a drag-and-drop file dropzone, client-side validation, loading state, and toast feedback.

**Technical Requirements.**

Files to create:

- `src/app/manager/new/page.tsx` — RSC; renders heading + `<UploadForm />` client component.
- `src/app/manager/new/_components/UploadForm.tsx` — `'use client'`; `react-hook-form` + Zod resolver; calls `POST /api/documents`; routes to `/manager/quizzes/new?documentId=…` on success.
- `src/components/shared/FileDropzone.tsx` — generic drag-drop + click-to-browse dropzone; props: `accept`, `maxSizeBytes`, `onFile(file: File)`.
- `src/lib/schemas/upload.ts` — Zod schema for client-side guard (mime, size).

UX requirements:

- Accepted mimes (client-side hint): `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/markdown`, `.md` extension fallback.
- Visual states: idle (dashed border) → drag-over (highlighted border) → file-selected (filename + size + remove button) → uploading (spinner + disabled) → success (toast) → error (toast).
- Hard cap **15MB** enforced both client-side (immediate feedback) and server-side (final word).
- Use `sonner` for toasts (already in shadcn/ui dependency tree). Mount `<Toaster />` in `app/layout.tsx` if not already.
- No custom CSS animations beyond Tailwind utilities.

**Pitfall:** `react-hook-form` with file inputs requires `register('file', { required: true })` and reading the `FileList` via `watch('file')[0]`. Use a controlled approach via `<Controller>` if you need finer control over the dropzone.

**Dependencies.** Phase 1 complete. Task 2.2 (API) for end-to-end testing, but the UI can be built with a stubbed handler first.

**Acceptance Criteria.**

- `/manager/new` renders without errors.
- Dragging a valid file onto the dropzone shows the filename and size.
- Clicking "Upload" calls `POST /api/documents` with `multipart/form-data`.
- A 415 / 413 / 422 from the API surfaces as a toast with the correct message (matches §Task 2.10 table).
- A 201 success routes the user to the next step and shows a "Document uploaded" toast.

**Validation Steps.**

1. `pnpm dev` → visit `localhost:3000/manager/new` → page renders.
2. Drop a valid PDF → "Upload" enabled → click → success toast → redirected.
3. Drop a `.zip` → client blocks before submit (or 415 toast if server-side).
4. Drop a 20MB file → client blocks with size message.

**Estimated Complexity.** Medium (form + dropzone + state machine).

**AI Coding Opportunity.** ✅✅ High — paste shadcn/ui dropzone primitives + the requirements above; AI generates the dropzone and form wiring cleanly. Prompt: "Implement `/manager/new` with `react-hook-form` + Zod. Reuse a generic `<FileDropzone>` that accepts {pdf, docx, md} mimes and a 15MB cap. Submit via `fetch('/api/documents', { method: 'POST', body: formData })`. On success, route to `/manager/quizzes/new?documentId=<id>`. On error, parse `error.code` and show the matching toast."

---

### Task 2.2 — Implement Upload API

**Objective.** Implement `POST /api/documents` route handler that parses multipart input, validates, calls the document service, and returns a structured response.

**Technical Requirements.**

Create `src/app/api/documents/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDocument } from '@/lib/services/documents';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs'; // pdf-parse / mammoth need Node runtime
export const maxDuration = 30;   // seconds; Vercel hobby/pro safe

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
]);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new AppError('INVALID_INPUT', 400, 'Missing file field.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError('FILE_TOO_LARGE', 413, 'File too large (max 15MB).');
    }
    // Markdown often arrives as text/plain; allow .md extension as fallback
    const mime = inferMime(file);
    if (!ACCEPTED_MIMES.has(mime)) {
      throw new AppError('UNSUPPORTED_MIME', 415, 'Unsupported file type.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await createDocument({
      buffer,
      mime,
      filename: file.name,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

function inferMime(file: File): string {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}
```

Also create `src/lib/errors.ts`:

```typescript
import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MIME'
  | 'PARSE_FAILED'
  | 'PARSE_EMPTY'
  | 'STORAGE_FAILED'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    public userMessage: string,
    public cause?: unknown,
  ) {
    super(userMessage);
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.userMessage } },
      { status: err.status },
    );
  }
  console.error('[unhandled]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  );
}
```

Response contract (per technical-design §9.1):

```json
{ "data": { "documentId": 42, "filename": "handbook.pdf", "charCount": 18234 } }
```

**Pitfall:** Default Next.js Route Handler runtime is `edge` for some templates; `pdf-parse` and `mammoth` require Node. Always set `export const runtime = 'nodejs'`.

**Dependencies.** Task 2.3 (storage), Task 2.4 (persistence), Task 2.8 (parser dispatch). The route is the orchestrator; it calls `createDocument` from `lib/services/documents.ts`.

**Acceptance Criteria.**

- `curl -F "file=@sample.pdf" localhost:3000/api/documents` returns `{ "data": { "documentId": ..., "charCount": ... } }` with HTTP 201.
- Posting without a file returns 400 `INVALID_INPUT`.
- Posting a 20MB file returns 413 `FILE_TOO_LARGE`.
- Posting a `.zip` returns 415 `UNSUPPORTED_MIME`.
- Server logs do not leak stack traces to clients.

**Validation Steps.**

1. `curl -i -F "file=@fixtures/sample.pdf" http://localhost:3000/api/documents` → 201.
2. `curl -i -F "file=@fixtures/sample.zip" http://localhost:3000/api/documents` → 415.
3. `curl -i http://localhost:3000/api/documents -X POST` → 400.

**Estimated Complexity.** Medium (multipart + Buffer handling + structured errors).

**AI Coding Opportunity.** ✅✅ High — paste this spec and ask AI to implement. Verify against Next.js 15/16 Route Handler docs (formData() API has been stable since 13.4). Prompt: "Implement `POST /api/documents` per the snippet above. Set runtime=nodejs. Use AppError + toErrorResponse for all error paths. Call createDocument({ buffer, mime, filename }) from lib/services/documents."

---

### Task 2.3 — Integrate Supabase Storage

**Objective.** Upload the validated file buffer to the private `docs` bucket using the existing `docsBucket` helper from Phase 1.

**Technical Requirements.**

Create `src/lib/storage/upload.ts`:

```typescript
import { docsBucket } from '@/lib/storage/supabase';
import { AppError } from '@/lib/errors';
import { randomUUID } from 'node:crypto';

export interface UploadedFile {
  storagePath: string; // path inside the bucket
  byteSize: number;
}

export async function uploadDocumentFile(
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<UploadedFile> {
  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;

  const { error } = await docsBucket.upload(storagePath, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new AppError('STORAGE_FAILED', 500, 'Upload failed. Please try again.', error);
  }

  return { storagePath, byteSize: buffer.length };
}
```

Bucket structure & naming:

- **Bucket:** `docs` (private; provisioned in Phase 1 Task 1.5).
- **Path layout:** `<YYYY-MM-DD>/<uuid>-<sanitized-original-name>` — date prefix gives natural partitioning; UUID prevents collisions; sanitized name preserves human-readable hint.
- **No public URLs.** Files are accessed server-side only via service-role key. If Phase 4 needs a download link, generate a short-lived signed URL on demand (post-MVP).

Why upload **before** parsing:

- Keeps the original file even if parsing fails — useful for debugging "we couldn't read this PDF" reports.
- If parsing fails after upload, the storage object is orphaned; that's acceptable for MVP (cleanup is a future cron job, see OI-design.E).

**Pitfall:** `docsBucket.upload()` returns `{ data, error }` — never throws. Always check `error`.

**Dependencies.** Phase 1 Task 1.5 (bucket exists) + Task 1.7 (`docsBucket` helper).

**Acceptance Criteria.**

- After a successful upload, the file appears in Supabase Studio → Storage → `docs` bucket under today's date prefix.
- `storagePath` is returned and stored in the `documents` row.
- Filenames with spaces, accented chars, and slashes are sanitized.
- A simulated storage failure (e.g., temporarily wrong service-role key) returns 500 `STORAGE_FAILED`.

**Validation Steps.**

1. Upload a PDF via the UI → check Supabase Studio → file present at `2026-05-10/<uuid>-<name>.pdf`.
2. Upload a file named `my report (final).pdf` → check sanitized path in Studio.
3. Inspect the `documents` row → `storagePath` matches the actual object key.

**Estimated Complexity.** Low (thin wrapper over `docsBucket.upload`).

**AI Coding Opportunity.** ✅✅ High — well-scoped. Prompt: "Implement `src/lib/storage/upload.ts`. Export `uploadDocumentFile(buffer, filename, mime)` that uploads to docsBucket under `<YYYY-MM-DD>/<uuid>-<sanitized-name>`. Throw AppError('STORAGE_FAILED', 500) on error. Sanitize filename by replacing non [\\w.\\-] with underscore."

---

### Task 2.4 — Create File Metadata Persistence

**Objective.** Insert a `documents` row capturing original filename, storage path, document type, parsed text, and timestamps.

**Technical Requirements.**

Create `src/lib/services/documents.ts` (the orchestrator called by the route):

```typescript
import { prisma } from '@/lib/db/prisma';
import { extractText } from '@/lib/parsers';
import { uploadDocumentFile } from '@/lib/storage/upload';
import { AppError } from '@/lib/errors';
import { mimeToDocumentType } from '@/lib/parsers/types';

export interface CreateDocumentInput {
  buffer: Buffer;
  mime: string;
  filename: string;
}

export interface CreateDocumentResult {
  documentId: number;
  filename: string;
  charCount: number;
}

export async function createDocument(
  input: CreateDocumentInput,
): Promise<CreateDocumentResult> {
  // 1. Upload original file FIRST (so we keep it even if parsing fails).
  const uploaded = await uploadDocumentFile(input.buffer, input.filename, input.mime);

  // 2. Extract text. If this throws, no DB row is created (storage object is orphaned).
  const text = await extractText(input.buffer, input.mime);

  if (text.trim().length === 0) {
    throw new AppError('PARSE_EMPTY', 422, 'No readable text. Is this a scanned PDF?');
  }

  // 3. Persist row.
  const document = await prisma.document.create({
    data: {
      title: deriveTitle(input.filename),
      text,
      uploadedFileName: input.filename,
      storagePath: uploaded.storagePath,
      documentType: mimeToDocumentType(input.mime),
    },
    select: { id: true, uploadedFileName: true },
  });

  return {
    documentId: document.id,
    filename: document.uploadedFileName,
    charCount: text.length,
  };
}

function deriveTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim() || 'Untitled';
}
```

Field mapping (all columns already exist from Phase 1 schema):

| Column | Source |
|---|---|
| `title` | derived from filename (strip extension, dashes/underscores → spaces) |
| `text` | output of `extractText()` after normalization |
| `uploadedFileName` | original `file.name` |
| `storagePath` | returned by `uploadDocumentFile` |
| `documentType` | enum derived from mime (`PDF` / `DOCX` / `MARKDOWN`) |
| `createdAt` / `updatedAt` | auto via Prisma `@default(now())` / `@updatedAt` |

**Status tracking note.** The MVP spec does NOT require an explicit `status` enum on `Document` (parsing is synchronous within the request). If a row exists, parsing succeeded. Do not add a status column without a Phase prompt authorizing the schema change.

**Dependencies.** Phase 1 Tasks 1.1, 1.6 (Prisma + schema). Task 2.3 (storage upload). Task 2.8 (parser dispatch).

**Acceptance Criteria.**

- Successful upload creates exactly one row in `documents`.
- `text` is non-empty and matches the file content (sanity-check first 200 chars).
- `documentType` is the correct enum value.
- Failed parsing leaves NO row in `documents` (verified by counting rows before/after a corrupted upload).

**Validation Steps.**

1. Upload a PDF → `SELECT id, title, documentType, char_length(text) FROM documents ORDER BY id DESC LIMIT 1;` → row present, char_length > 0.
2. Upload a corrupted PDF → API returns 422 → row count in `documents` unchanged.
3. Upload a file named `Q3_Earnings-Report.pdf` → `title = "Q3 Earnings Report"`.

**Estimated Complexity.** Low–Medium (composes upload + parse + insert).

**AI Coding Opportunity.** ✅ High. Prompt: "Implement `src/lib/services/documents.ts` exporting `createDocument({ buffer, mime, filename })`. Order: upload → extractText → throw PARSE_EMPTY if empty → prisma.document.create. Return { documentId, filename, charCount }."

---

### Task 2.5 — Implement PDF Parsing

**Objective.** Extract text from a PDF buffer using `pdf-parse`, with a workaround for its known import-time bug.

**Technical Requirements.**

Install (one-time):

```bash
pnpm add pdf-parse
pnpm add -D @types/pdf-parse
```

Create `src/lib/parsers/pdf.ts`:

```typescript
// IMPORTANT: import from the inner path to bypass pdf-parse v1.1.x's
// debug-mode bug that tries to read a sample PDF on top-level import.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { AppError } from '@/lib/errors';
import { normalizeText } from './normalize';

export async function parsePdf(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    const result = await pdfParse(buffer);
    raw = result.text ?? '';
  } catch (err) {
    throw new AppError('PARSE_FAILED', 422, "We couldn't read this file.", err);
  }

  const cleaned = normalizeText(raw);
  if (cleaned.length === 0) {
    throw new AppError(
      'PARSE_EMPTY',
      422,
      'No readable text. Is this a scanned PDF?',
    );
  }
  return cleaned;
}
```

Behavior:

- Text-based PDFs only — no OCR, by design (out of MVP scope).
- Scanned PDFs (image-only) return `PARSE_EMPTY` (text length 0 after extraction).
- Corrupted PDFs (truncated, wrong magic bytes) cause `pdf-parse` to throw → mapped to `PARSE_FAILED`.
- Password-protected PDFs throw inside `pdf-parse` → also `PARSE_FAILED`. (Acceptable; rare in practice.)

**Pitfall — pdf-parse@1.1.x bug.** The default `import pdfParse from 'pdf-parse'` runs an `index.js` that, in debug mode, tries to read `./test/data/05-versions-space.pdf`. This crashes on Vercel because the file isn't bundled. **Always import from `pdf-parse/lib/pdf-parse.js`** to avoid this. Verified workaround across many production Next.js apps.

**Dependencies.** Task 2.9 (text normalization).

**Acceptance Criteria.**

- A known-good text PDF returns its text content (sanity-check known phrase appears).
- A scanned PDF (no text layer) returns `PARSE_EMPTY` 422.
- A truncated PDF (e.g., first 100 bytes only) returns `PARSE_FAILED` 422.
- The function never returns null/undefined; only string or throws.

**Validation Steps.**

1. Add `fixtures/sample.pdf` (a real, text-based PDF). Run a one-off test script → text contains expected phrase.
2. Add `fixtures/scanned.pdf` (image-only PDF) → throws `PARSE_EMPTY`.
3. Truncate `sample.pdf` with `head -c 100` → throws `PARSE_FAILED`.

**Estimated Complexity.** Low (~15 lines including error handling).

**AI Coding Opportunity.** ✅✅ High — but verify the import path workaround. Prompt: "Implement src/lib/parsers/pdf.ts exporting parsePdf(buffer): Promise<string>. Use `pdf-parse/lib/pdf-parse.js` (NOT default top-level import — known debug bug). Wrap in try/catch → AppError('PARSE_FAILED'). Apply normalizeText. If empty after normalization → AppError('PARSE_EMPTY')."

---

### Task 2.6 — Implement DOCX Parsing

**Objective.** Extract raw text from a DOCX buffer using `mammoth.extractRawText`.

**Technical Requirements.**

Install:

```bash
pnpm add mammoth
```

Create `src/lib/parsers/docx.ts`:

```typescript
import mammoth from 'mammoth';
import { AppError } from '@/lib/errors';
import { normalizeText } from './normalize';

export async function parseDocx(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value ?? '';
  } catch (err) {
    throw new AppError('PARSE_FAILED', 422, "We couldn't read this file.", err);
  }

  const cleaned = normalizeText(raw);
  if (cleaned.length === 0) {
    throw new AppError('PARSE_EMPTY', 422, 'Could not extract text from DOCX.');
  }
  return cleaned;
}
```

Behavior:

- `extractRawText` strips all formatting, headings, bold/italic — we only need plain text for AI.
- Embedded images, charts, footnotes are dropped (acceptable for MVP).
- Mammoth's `messages` array (warnings) is intentionally ignored — non-fatal.

**Pitfall — bundle size.** `mammoth` ships with a sizable XML parser (~500KB). Acceptable for Vercel functions; do NOT split-import or use dynamic import — adds complexity without benefit.

**Pitfall — `.doc` (old Word format).** Mammoth supports `.docx` (Office Open XML) only, not legacy `.doc`. Our mime allowlist excludes `.doc` (mime `application/msword`), so this is enforced upstream.

**Dependencies.** Task 2.9 (normalization).

**Acceptance Criteria.**

- A known-good DOCX returns its body text (sanity-check known phrase).
- A corrupted DOCX returns `PARSE_FAILED` 422.
- An empty DOCX (template with no body) returns `PARSE_EMPTY` 422.

**Validation Steps.**

1. `fixtures/sample.docx` → text matches.
2. `fixtures/empty.docx` (blank Word doc) → `PARSE_EMPTY`.
3. Rename a `.zip` to `.docx` → mammoth throws → `PARSE_FAILED`.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement src/lib/parsers/docx.ts mirroring the pdf parser shape: try mammoth.extractRawText, normalize, throw PARSE_EMPTY if empty, PARSE_FAILED on thrown error."

---

### Task 2.7 — Implement Markdown Parsing

**Objective.** Read Markdown as UTF-8 text, strip optional YAML front-matter, return cleaned plain text.

**Technical Requirements.**

Create `src/lib/parsers/markdown.ts`:

```typescript
import { AppError } from '@/lib/errors';
import { normalizeText } from './normalize';

const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

export async function parseMarkdown(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    raw = buffer.toString('utf-8');
  } catch (err) {
    throw new AppError('PARSE_FAILED', 422, "We couldn't read this file.", err);
  }

  // Strip YAML front-matter if present.
  const stripped = raw.replace(FRONT_MATTER_RE, '');

  const cleaned = normalizeText(stripped);
  if (cleaned.length === 0) {
    throw new AppError('PARSE_EMPTY', 422, 'Markdown file is empty.');
  }
  return cleaned;
}
```

Decisions:

- **Do NOT render Markdown to HTML or strip syntax.** AI quiz generation in Phase 3 handles markdown well; preserving the raw structure (`# headings`, `- bullets`) actually helps the model identify section boundaries.
- **Strip YAML front-matter** (the `---\nkey: value\n---\n` block at the top) — it's metadata, not content, and would skew chunking.
- No HTML decoding, no link extraction. KISS.

**Pitfall — BOM.** Some editors prepend a UTF-8 BOM (`﻿`). The normalizer strips this (Task 2.9).

**Dependencies.** Task 2.9 (normalization).

**Acceptance Criteria.**

- A `.md` file with front-matter → front-matter removed; body retained.
- A `.md` file without front-matter → returned verbatim (after normalization).
- Empty file → `PARSE_EMPTY`.

**Validation Steps.**

1. `fixtures/with-frontmatter.md` → output starts with the body, not `---`.
2. `fixtures/plain.md` → output equals normalized input.
3. `fixtures/empty.md` (0 bytes) → `PARSE_EMPTY`.

**Estimated Complexity.** Low (~15 lines).

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement src/lib/parsers/markdown.ts. Buffer.toString('utf-8'), strip leading YAML front-matter via /^---\\r?\\n[\\s\\S]*?\\r?\\n---\\r?\\n/, normalizeText, throw PARSE_EMPTY if empty."

---

### Task 2.8 — Create Unified Parsing Service

**Objective.** Provide a single `extractText(buffer, mime)` entry point that dispatches to the correct parser and is the only parser interface used by the rest of the app.

**Technical Requirements.**

Create `src/lib/parsers/types.ts`:

```typescript
import type { DocumentType } from '@prisma/client';

export const MIME_PDF = 'application/pdf';
export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MIME_MARKDOWN = 'text/markdown';

export type SupportedMime =
  | typeof MIME_PDF
  | typeof MIME_DOCX
  | typeof MIME_MARKDOWN;

export function mimeToDocumentType(mime: string): DocumentType {
  switch (mime) {
    case MIME_PDF: return 'PDF';
    case MIME_DOCX: return 'DOCX';
    case MIME_MARKDOWN: return 'MARKDOWN';
    default: throw new Error(`Unsupported mime: ${mime}`);
  }
}
```

Create `src/lib/parsers/index.ts`:

```typescript
import { AppError } from '@/lib/errors';
import { parsePdf } from './pdf';
import { parseDocx } from './docx';
import { parseMarkdown } from './markdown';
import { MIME_PDF, MIME_DOCX, MIME_MARKDOWN } from './types';

export async function extractText(buffer: Buffer, mime: string): Promise<string> {
  switch (mime) {
    case MIME_PDF:
      return parsePdf(buffer);
    case MIME_DOCX:
      return parseDocx(buffer);
    case MIME_MARKDOWN:
      return parseMarkdown(buffer);
    default:
      throw new AppError('UNSUPPORTED_MIME', 415, 'Unsupported file type.');
  }
}

export { mimeToDocumentType } from './types';
```

Shared parser interface:

```typescript
type Parser = (buffer: Buffer) => Promise<string>;
```

All three parsers conform to this signature. This makes adding a fourth format (e.g., `.txt`) trivial: one new file + one new switch case.

**Architecture note.** No abstract `BaseParser` class, no factory pattern, no plugin registry. Switch statement on mime is correct for 3 formats; adding generality now would be premature.

**Dependencies.** Tasks 2.5, 2.6, 2.7. Phase 1 Prisma schema (for `DocumentType` enum — confirm enum values are `PDF`, `DOCX`, `MARKDOWN`; if Phase 1 used different names, align here).

**Acceptance Criteria.**

- `extractText(buffer, 'application/pdf')` calls `parsePdf` (verified via mock or via fixture).
- `extractText(buffer, 'application/x-rar')` throws `UNSUPPORTED_MIME` 415.
- `mimeToDocumentType` returns the correct enum for each supported mime.
- The route handler imports ONLY from `@/lib/parsers` — no direct imports of `pdf.ts` / `docx.ts` / `markdown.ts` from outside the parsers folder.

**Validation Steps.**

1. `grep -r "from '@/lib/parsers/pdf'" src/app src/lib/services` → no results (only `parsers/index.ts` should reach into individual parsers).
2. Run all three formats end-to-end via API → all succeed.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement src/lib/parsers/index.ts dispatching by mime to parsePdf / parseDocx / parseMarkdown. Throw UNSUPPORTED_MIME for unknown mimes. Re-export mimeToDocumentType from ./types."

---

### Task 2.9 — Implement Text Normalization Pipeline

**Objective.** Build a single `normalizeText` function used by all three parsers, ensuring consistent, AI-friendly text that minimizes token waste.

**Technical Requirements.**

Create `src/lib/parsers/normalize.ts`:

```typescript
/**
 * Normalize parsed text for downstream AI consumption.
 * - Strip BOM
 * - Unicode NFC normalization (combine accents)
 * - Convert CRLF / CR to LF
 * - Collapse runs of spaces / tabs to a single space
 * - Collapse 3+ consecutive newlines to a paragraph break (\n\n)
 * - Trim leading / trailing whitespace
 */
export function normalizeText(input: string): string {
  if (!input) return '';
  let s = input;

  // Strip UTF-8 BOM if present.
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

  // Unicode NFC (compose accents into single codepoints).
  s = s.normalize('NFC');

  // Normalize line endings.
  s = s.replace(/\r\n?/g, '\n');

  // Collapse spaces and tabs (preserve newlines).
  s = s.replace(/[ \t]+/g, ' ');

  // Trim trailing whitespace on each line.
  s = s.replace(/[ \t]+\n/g, '\n');

  // Collapse 3+ blank lines to exactly one paragraph break.
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
```

Why each step:

| Step | Reason |
|---|---|
| BOM strip | UTF-8 BOMs leak into chunked text and waste tokens. |
| NFC | "café" can be one codepoint or two; standardize to one. |
| CRLF → LF | Mixed line endings inflate token counts. |
| Collapse spaces | PDFs often have double-spacing as artifact of column extraction. |
| Trim per-line trailing | Same. |
| Collapse blank lines | PDFs often have 5+ blank lines between paragraphs; one blank line is enough. |
| `trim()` | Final cleanup. |

**What we explicitly do NOT do:**

- ❌ No language detection.
- ❌ No HTML / Markdown stripping (Markdown formatting helps AI; PDFs don't have HTML; DOCX raw text has none).
- ❌ No sentence segmentation (Phase 3's chunker handles it).
- ❌ No stop-word removal (would hurt quiz quality).
- ❌ No truncation (15MB cap upstream is enough).

**Dependencies.** None — pure function.

**Acceptance Criteria.**

- `normalizeText('Hello\r\nWorld')` returns `'Hello\nWorld'`.
- `normalizeText('A\n\n\n\nB')` returns `'A\n\nB'`.
- `normalizeText('  foo   bar  ')` returns `'foo bar'`.
- `normalizeText('﻿hello')` returns `'hello'`.
- `normalizeText('')` returns `''`.

**Validation Steps.**

1. Unit test (Task 2.11) covers the 5 cases above.
2. Real PDF parsed → output has no `\r`, no runs of 3+ newlines, no leading/trailing whitespace.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** ✅✅ High. Prompt: "Implement src/lib/parsers/normalize.ts. Pure function normalizeText(string): string. Steps in order: strip BOM, NFC normalize, CRLF→LF, collapse runs of [ \\t]+, trim trailing whitespace per line, collapse 3+ \\n to 2, final trim."

---

### Task 2.10 — Implement Parsing Error Handling

**Objective.** Ensure every failure mode in the upload pipeline maps to one of five precise HTTP responses with stable error codes.

**Technical Requirements.**

The error matrix (binding contract; UI in Task 2.1 reads these codes):

| Failure | HTTP | Code | User-facing message | Where it's thrown |
|---|---|---|---|---|
| Missing `file` field | 400 | `INVALID_INPUT` | "Missing file field." | route handler |
| File > 15MB | 413 | `FILE_TOO_LARGE` | "File too large (max 15MB)." | route handler |
| Mime not in allowlist | 415 | `UNSUPPORTED_MIME` | "Unsupported file type." | route handler / parser dispatch |
| Parser threw | 422 | `PARSE_FAILED` | "We couldn't read this file." | individual parsers |
| Parser returned empty | 422 | `PARSE_EMPTY` | "No readable text. Is this a scanned PDF?" | individual parsers / service |
| Storage upload failed | 500 | `STORAGE_FAILED` | "Upload failed. Please try again." | `uploadDocumentFile` |
| Anything else | 500 | `INTERNAL` | "Something went wrong." | `toErrorResponse` fallback |

Response body shape (matches `/api/quizzes` and `/api/attempts` for consistency — see technical-design §9.6):

```json
{ "error": { "code": "PARSE_EMPTY", "message": "No readable text. Is this a scanned PDF?" } }
```

**Retry strategy.**

- **No automatic server-side retries.** Parsing is deterministic; storage failures from Supabase are usually transient but rare enough that we let the user retry manually.
- **Client-side:** the upload form does NOT auto-retry. The toast tells the user what to do. If we add retry later, gate it on `STORAGE_FAILED` only (not parser errors — those won't change on retry).
- **Logging.** Every `AppError` with status >= 500 logs `cause` to stderr. 4xx errors are NOT logged (they're user errors, not bugs).

Update `toErrorResponse` to log 5xx:

```typescript
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      console.error(`[${err.code}]`, err.cause ?? err.message);
    }
    return NextResponse.json(
      { error: { code: err.code, message: err.userMessage } },
      { status: err.status },
    );
  }
  console.error('[unhandled]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  );
}
```

**Cleanup of orphaned storage objects.** When parsing fails after a successful upload, the file is left in storage. **Acceptable for MVP** — see OI-design.E in technical-design. Document this clearly so we don't forget.

**Dependencies.** Tasks 2.2, 2.5–2.7.

**Acceptance Criteria.**

- Each row in the error matrix above is reproducible with a specific input.
- 4xx responses do NOT appear in server logs (low signal-to-noise).
- 5xx responses include the cause in the server log but NOT in the response body.
- All error responses match the `{ error: { code, message } }` shape.

**Validation Steps.**

1. Trigger each row in the error matrix → verify HTTP code, response body, and (for 5xx) server log.
2. `grep -r "AppError(" src/lib src/app/api` → all error throws use the constants from the matrix; no ad-hoc strings.

**Estimated Complexity.** Low (mostly already done in Tasks 2.2 / 2.5–2.7; this task is the audit + log policy).

**AI Coding Opportunity.** ✅ Medium — AI can audit existing throws against the matrix and flag gaps. Prompt: "Audit the error throws in src/app/api/documents and src/lib/parsers against this matrix [paste table]. Report any throw that doesn't match a row."

---

### Task 2.11 — Add Upload & Parsing Validation Tests

**Objective.** Add a small but meaningful set of tests covering happy paths and the most common failure modes for each format.

**Technical Requirements.**

Test framework: **Vitest** (lightweight, native ESM, plays well with Next.js). If not yet installed:

```bash
pnpm add -D vitest @vitest/ui
```

Add `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Test fixtures (committed to repo, small files only):

```
src/lib/parsers/__fixtures__/
  sample.pdf       (~5 KB, plain text PDF)
  scanned.pdf      (~50 KB, image-only PDF)
  truncated.pdf    (sample.pdf head -c 100)
  sample.docx      (~5 KB)
  empty.docx       (blank Word doc)
  with-frontmatter.md
  plain.md
  empty.md         (0 bytes)
```

Tests to write:

`src/lib/parsers/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeText } from './normalize';

describe('normalizeText', () => {
  it('strips BOM', () => expect(normalizeText('﻿hi')).toBe('hi'));
  it('CRLF to LF', () => expect(normalizeText('a\r\nb')).toBe('a\nb'));
  it('collapses 3+ newlines', () => expect(normalizeText('a\n\n\n\nb')).toBe('a\n\nb'));
  it('collapses spaces', () => expect(normalizeText('a    b')).toBe('a b'));
  it('handles empty', () => expect(normalizeText('')).toBe(''));
});
```

`src/lib/parsers/pdf.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parsePdf } from './pdf';

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, '__fixtures__', name));

describe('parsePdf', () => {
  it('extracts text from a valid PDF', async () => {
    const text = await parsePdf(fixture('sample.pdf'));
    expect(text.length).toBeGreaterThan(0);
  });

  it('throws PARSE_EMPTY on scanned PDF', async () => {
    await expect(parsePdf(fixture('scanned.pdf'))).rejects.toMatchObject({
      code: 'PARSE_EMPTY',
    });
  });

  it('throws PARSE_FAILED on truncated PDF', async () => {
    await expect(parsePdf(fixture('truncated.pdf'))).rejects.toMatchObject({
      code: 'PARSE_FAILED',
    });
  });
});
```

Mirror the same structure for `docx.test.ts` and `markdown.test.ts`. Total: ~5 test files, ~20 assertions. Aim for ~15 second total run time.

**What we DO NOT test:**

- ❌ End-to-end HTTP integration (would need a test DB; manual QA covers this in Task 2.12).
- ❌ Supabase Storage uploads (requires real credentials; manual QA covers this).
- ❌ React component tests (the form is simple enough; manual QA covers it).

**Dependencies.** Tasks 2.5–2.9. Fixtures may need to be created manually.

**Acceptance Criteria.**

- `pnpm test` runs and exits 0.
- All five fixture-based test files pass.
- At least one test per parser asserts a happy path AND a failure path.
- Tests run in < 15 seconds locally.

**Validation Steps.**

1. `pnpm test` → all passing.
2. Temporarily break `normalizeText` (e.g., remove BOM strip) → relevant test fails. Restore.
3. `pnpm test --coverage` (optional) → parsers folder ≥ 80% coverage.

**Estimated Complexity.** Low–Medium (fixture creation is the main time sink).

**AI Coding Opportunity.** ✅ Medium — AI generates test bodies easily, but fixture creation is manual. Prompt: "Write Vitest tests for parsePdf, parseDocx, parseMarkdown, normalizeText following the structure shown. Read fixtures from src/lib/parsers/__fixtures__/. One happy-path + one failure-path per parser."

---

### Task 2.12 — Final Phase Verification & Commit

**Objective.** Run a manual QA pass, ensure the validation workflow is clean end-to-end, and commit Phase 2 with a single PR.

**Technical Requirements.**

**Manual QA checklist** (run with `pnpm dev` against the dev Supabase project):

| # | Action | Expected outcome |
|---|---|---|
| 1 | Visit `/manager/new` | Page renders; dropzone visible. |
| 2 | Drag a 1-page PDF | Filename + size shown. |
| 3 | Click "Upload" | Spinner → success toast → redirect with `?documentId=…`. |
| 4 | Inspect Supabase Studio Storage | File present at `<date>/<uuid>-<name>.pdf`. |
| 5 | Inspect Supabase Studio `documents` table | Row with non-empty `text`, correct `documentType=PDF`, correct `storagePath`. |
| 6 | Repeat steps 2–5 with DOCX | Same outcome, `documentType=DOCX`. |
| 7 | Repeat steps 2–5 with MD | Same outcome, `documentType=MARKDOWN`. |
| 8 | Drop a `.zip` | Toast: "Unsupported file type." |
| 9 | Drop a 20MB PDF | Toast: "File too large (max 15MB)." |
| 10 | Drop a scanned (image-only) PDF | Toast: "No readable text. Is this a scanned PDF?" |
| 11 | Drop an empty `.md` | Toast: "Markdown file is empty." (or generic `PARSE_EMPTY` text) |
| 12 | Open browser DevTools → Network | Verify request payload is `multipart/form-data`; response shapes match contracts. |
| 13 | Server logs | No 4xx logs; one stack trace per simulated 5xx. |

**Validation workflow (automated):**

```bash
pnpm prisma generate            # types up to date
pnpm tsc --noEmit               # no type errors
pnpm lint                       # eslint clean
pnpm test                       # all parser tests pass
pnpm build                      # next.js build succeeds (catches runtime config issues)
```

All five must exit 0 before the PR is opened.

**Definition of Done check.** Re-read §4 of this doc — every checkbox must be ticked.

**Git commit strategy.**

One feature branch: `feat/2-document-upload-parsing`. Commits roughly one per task, grouped where tightly coupled. Examples:

```
feat(2): scaffold /manager/new page and FileDropzone component
feat(2): add POST /api/documents route handler with multipart parsing
feat(2): integrate supabase storage upload helper
feat(2): persist documents row via createDocument service
feat(2): implement pdf-parse with debug-bug workaround
feat(2): implement mammoth docx parser
feat(2): implement markdown parser with front-matter strip
feat(2): unify parser dispatch via extractText
feat(2): add normalizeText pipeline shared by all parsers
feat(2): wire structured AppError responses across upload pipeline
test(2): add vitest tests for parsers and normalization
chore(2): phase 2 complete — pdf/docx/md upload + parse + persist
```

**Final PR.**

- Title: `Phase 2: Document Upload & Parsing`
- Body: link to this doc, summary of error matrix, screenshot of `/manager/new`, list of test fixtures committed.
- Squash-merge to `main` after manual QA passes.

**Dependencies.** Tasks 2.1–2.11 all complete.

**Acceptance Criteria.**

- All 13 QA checklist items pass.
- All five validation commands exit 0.
- All Phase 2 commits follow `<type>(2): <imperative>` convention.
- PR is open, reviewed (self-review at minimum), and merged.

**Validation Steps.** Run the QA checklist top-to-bottom in one sitting. Stop and fix on any red.

**Estimated Complexity.** Low–Medium (mostly verification; fixes if regressions surface).

**AI Coding Opportunity.** Low — verification is manual. AI useful for diagnosing build/lint failures and drafting the PR body.

---

## 4. Recommended Execution Order

```
                    ┌──────────────┐
                    │ 2.9          │  (pure function, no deps — start here)
                    │ Normalize    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     ┌─────────┐      ┌─────────┐      ┌─────────┐
     │ 2.5 PDF │      │ 2.6     │      │ 2.7     │  (parallelizable)
     │         │      │ DOCX    │      │ Markdown│
     └────┬────┘      └────┬────┘      └────┬────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    ┌─────────────┐
                    │ 2.8         │  (parser dispatch)
                    │ extractText │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐
         │ 2.3     │  │ 2.4     │  │ 2.10    │  (parallelizable)
         │ Storage │  │ Persist │  │ Errors  │
         └────┬────┘  └────┬────┘  └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌─────────────┐
                    │ 2.2         │  (route handler ties it all)
                    │ POST API    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 2.1         │  (UI)
                    │ Upload Form │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 2.11 Tests  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 2.12 Verify │
                    └─────────────┘
```

### Dependency rationale

- **2.9 first:** pure function, zero deps; unblocks all parsers.
- **2.5 / 2.6 / 2.7 parallel:** independent parsers, can be built in any order or simultaneously by different people / AI sessions.
- **2.8 ties parsers together:** must come after all three.
- **2.3 / 2.4 / 2.10 parallel:** storage helper, service composition, error matrix — all independent of each other and of the parsers (other than typing).
- **2.2 = orchestrator:** depends on 2.3, 2.4, 2.8, 2.10. Build last among backend tasks.
- **2.1 last (backend):** UI consumes the API contract; building it before 2.2 wastes time when the contract shifts.
- **2.11 → 2.12:** tests after impl, verification after tests.

### Wall-clock estimate (one-person serial)

| Task | Time |
|---|---|
| 2.9 Normalize | 15 min |
| 2.5 PDF | 20 min |
| 2.6 DOCX | 15 min |
| 2.7 Markdown | 15 min |
| 2.8 Dispatch | 10 min |
| 2.3 Storage | 20 min |
| 2.4 Persistence | 20 min |
| 2.10 Errors | 15 min |
| 2.2 API route | 30 min |
| 2.1 UI | 45 min |
| 2.11 Tests | 45 min |
| 2.12 Verify + commit | 30 min |
| **Total** | **~280 min (~4.5 h)** |

Two-person parallel (one on parsers + tests, one on API + UI): ~3 h wall-clock.

---

## 5. Recommended Git Commit Strategy

### Naming convention

```
<type>(<phase>): <short imperative>
```

- `type`: `chore`, `feat`, `fix`, `refactor`, `test`, `docs`.
- `phase`: `2` for Phase 2 commits.
- Short imperative sentence, no period.

### Frequency

- One commit per task, or one per 2 tightly-coupled tasks. 12 tasks → 8–12 commits is reasonable.
- Mid-task WIP commits OK (`chore(2): wip — pdf parser scaffolding`); squash on merge.
- Push to `feat/2-document-upload-parsing` after every commit.

### Branching

- Single feature branch `feat/2-document-upload-parsing` for all 12 tasks.
- One PR titled `Phase 2: Document Upload & Parsing` when 2.12 is complete.
- Squash-merge to `main`.

---

## 6. Common Phase 2 Pitfalls

### Parsers

| Pitfall | Mitigation |
|---|---|
| `pdf-parse` crashes on import in Vercel build | Use `pdf-parse/lib/pdf-parse.js` import path (Task 2.5). Confirmed workaround. |
| `mammoth` returns warnings array; treating warnings as errors | Ignore `result.messages`; only `result.value` matters. |
| Markdown front-matter regex matches across documents | Anchor with `^` and use non-greedy `[\s\S]*?`. |
| Buffer vs File confusion in route handler | Always convert: `Buffer.from(await file.arrayBuffer())`. Never pass `File` directly to parsers. |
| Edge runtime crash | Set `export const runtime = 'nodejs'` at top of route file. |

### Storage

| Pitfall | Mitigation |
|---|---|
| Filename with `/` creates nested directories | Sanitize via `replace(/[^\w.\-]+/g, '_')` before constructing path. |
| Two uploads same second collide | Use UUID prefix in storage path; never rely on filename alone. |
| Orphaned storage object after parse failure | Acceptable for MVP. Add cleanup cron in post-MVP. Documented in OI-design.E. |
| `upsert: true` overwrites by accident | Always `upsert: false`. |

### API & Validation

| Pitfall | Mitigation |
|---|---|
| Markdown arrives as `text/plain` from some browsers | Fall back to `.md` extension check (see `inferMime` in Task 2.2). |
| `await req.formData()` hangs on huge bodies | Vercel kills the function at the body limit; we never see this. Cap at 15MB upstream as defense-in-depth. |
| Mixing `INVALID_INPUT` and `UNSUPPORTED_MIME` codes | Use the matrix in Task 2.10 as the binding contract. UI parses by code, not message. |
| Stack traces leaked to client | `toErrorResponse` only ever returns `userMessage` field. Verified in Task 2.10. |

### UI

| Pitfall | Mitigation |
|---|---|
| Drag-leave fires while still over child elements | Use `onDragLeave` only on the outer container; check `e.currentTarget.contains(e.relatedTarget)`. |
| `<input type="file">` not reset after success | Reset via `react-hook-form` `reset()` after successful upload. |
| Toast messages drift from API codes | Centralize the code → message mapping in `src/lib/schemas/api-errors.ts`; both server and client import from it. |
| Submitting twice on double-click | Disable submit button during the request (via `formState.isSubmitting`). |

### Tests

| Pitfall | Mitigation |
|---|---|
| `pdf-parse` import in tests fails the same way as in prod | Same workaround: `import from 'pdf-parse/lib/pdf-parse.js'`. |
| Fixture files committed too large | Keep fixtures < 100 KB each. PDFs of "Hello world" are ~5 KB. |
| Tests rely on real Supabase | They don't — tests cover parsers and normalization only. Storage and DB integration is covered by manual QA. |

---

## 7. Definition of Done

Phase 2 is complete when **all** of the following are true:

### Code

- [ ] All 12 tasks (2.1 → 2.12) committed and pushed.
- [ ] `pnpm tsc --noEmit` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test` exits 0; all parser + normalization tests pass.
- [ ] `pnpm build` exits 0; no Edge runtime warnings on the upload route.

### Functionality

- [ ] `/manager/new` page renders and accepts drag-and-drop.
- [ ] Uploading a known-good PDF, DOCX, and Markdown file each results in:
  - HTTP 201 with `{ data: { documentId, filename, charCount } }`,
  - a file in Supabase Storage `docs` bucket at `<date>/<uuid>-<name>`,
  - a row in `documents` with non-empty `text`, correct `documentType`, and accurate `storagePath`.
- [ ] Uploading a `.zip` returns 415 `UNSUPPORTED_MIME` with matching toast.
- [ ] Uploading a 20MB file returns 413 `FILE_TOO_LARGE` with matching toast.
- [ ] Uploading a scanned-only PDF returns 422 `PARSE_EMPTY` with matching toast.
- [ ] Uploading a truncated PDF returns 422 `PARSE_FAILED` with matching toast.
- [ ] Server logs show stack traces only for 5xx; nothing for 4xx user errors.

### Code structure

- [ ] `src/app/api/documents/route.ts` exists, sets `runtime = 'nodejs'`, uses `AppError`.
- [ ] `src/lib/services/documents.ts` exports `createDocument`.
- [ ] `src/lib/parsers/{pdf,docx,markdown,normalize,index,types}.ts` all exist.
- [ ] `src/lib/storage/upload.ts` exists.
- [ ] `src/lib/errors.ts` exports `AppError` and `toErrorResponse`.
- [ ] No direct imports of individual parsers outside `src/lib/parsers/`.

### Tests

- [ ] `vitest.config.ts` exists.
- [ ] `pnpm test` runs in < 15 seconds.
- [ ] At least 1 happy-path + 1 failure-path test per parser.
- [ ] `normalizeText` has 5+ unit tests.

### Repository hygiene

- [ ] All Phase 2 commits prefix with `feat(2):` / `chore(2):` / `test(2):` / `docs(2):`.
- [ ] One feature branch `feat/2-document-upload-parsing` used for all 12 tasks.
- [ ] PR titled `Phase 2: Document Upload & Parsing` is merged to `main`.

### Out-of-scope reminders (do **not** do in Phase 2)

- ❌ Do not add OCR for scanned PDFs. (Out of MVP scope.)
- ❌ Do not implement signed-URL direct uploads. (Post-MVP; see OI-design.E.)
- ❌ Do not implement orphaned-storage cleanup cron. (Post-MVP.)
- ❌ Do not call OpenAI from this phase. (That's Phase 3.)
- ❌ Do not build the manager dashboard yet. (That's Phase 4.)
- ❌ Do not add background queues, retries, or async processing. (Synchronous request is sufficient for 15MB cap.)
- ❌ Do not add authentication. (Whole MVP is open by design — see spec §security.)

When everything above is true, move to **Phase 3 — AI Quiz Generation**.

# Phase 8 - Multi-file Upload (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-13  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md)  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md)  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md)  
Authoritative app root: [`quiz-knowledge/src/app`](../../../quiz-knowledge/src/app)

This is the executable task list for Phase 8. Each task is sized to be a single AI prompt or a single 30–60 minute block of work.

> **This phase is a focused enhancement to the upload flow.** The backend API is intentionally unchanged. All multi-file handling happens on the frontend only, by calling the existing `/api/documents` endpoint once per file in sequence.

---

## 1. Phase Overview

### Purpose

Allow managers to upload multiple documents in a single visit to `/manager/new`, then select which document to use when generating a quiz.

The current flow: select 1 file → upload → redirect to quiz generation with that document.  
The target flow: select N files → upload sequentially → redirect to quiz generation with a document picker.

### Expected outcome

After Phase 8:

- The upload dropzone accepts multiple files in one selection or drag-and-drop.
- Each file is validated individually (type, size) before upload begins.
- Files are uploaded one at a time to the existing API, with per-file status feedback (pending / uploading / done / error).
- A failed file does not stop the remaining files from uploading.
- After all uploads complete, the user is redirected to `/manager/quizzes/new?documentIds=1,2,3`.
- The quiz generation page loads all uploaded documents and shows a document picker.
- The user selects one document and proceeds to generate a quiz as before.
- Single-file use is still fully functional (backward compat preserved).

### Contract (locked for this phase)

| Item | Value | Why |
|---|---|---|
| Backend API | Unchanged — `/api/documents` processes one file per request | Simplest safe approach; no migration risk |
| Upload strategy | Sequential (one at a time) | Avoids parallel overload; simpler progress model |
| Redirect after upload | `/manager/quizzes/new?documentIds=<comma-separated ids>` | Carries all uploaded doc IDs to the quiz page |
| Backward compat — single file | `?documentId=X` (existing) still works on quiz page | Existing bookmarks / links must not break |
| Backward compat — FileDropzone | `multiple` prop defaults to `false`; single-file callers unaffected | FileDropzone is used only by UploadForm; no other callers |
| Per-file error handling | Log error, mark file as failed, continue next file | Partial success is better than total abort |
| Redirect condition | Redirect when ≥ 1 file succeeds | Do not block redirect on fully failed batch |
| Quiz generation scope | User picks 1 document and generates 1 quiz | Multi-document quiz generation is out of scope for this phase |
| New features not in scope | Batch API endpoints, parallel upload, drag-to-reorder, progress bars with % byte tracking, ZIP extraction | Defer unless spec is updated |

### Architecture decision

Phase 8 does **not** touch the backend layer. No new API routes, no new Prisma models, no new storage logic.

All changes are confined to:

1. `FileDropzone.tsx` — UI component
2. `UploadForm.tsx` — page-level form component
3. `/manager/quizzes/new/page.tsx` — quiz generation page (server component)
4. A new `DocumentPicker.tsx` client component under `/manager/quizzes/new/_components/`

---

## 2. Setup Goals

- [ ] `FileDropzone` supports a `multiple` prop that enables multi-file selection and drag-and-drop.
- [ ] `FileDropzone` validates each file individually and surfaces per-file errors.
- [ ] `UploadForm` holds `File[]` state and shows a list of selected files with remove-per-file capability.
- [ ] `UploadForm` uploads files sequentially and shows per-file status: pending / uploading / done / error.
- [ ] `UploadForm` redirects to `?documentIds=...` after the batch completes with at least one success.
- [ ] Quiz generation page parses both `?documentId` (single, legacy) and `?documentIds` (multi, new).
- [ ] `DocumentPicker` component renders when multiple documents are present, lets user choose one, then passes the chosen `documentId` to `GenerateForm`.
- [ ] All automated checks pass after the change: `tsc --noEmit`, `lint`, `build`.

---

## 3. Target Folder Structure

This phase adds one new component file and modifies three existing files.

```text
quiz-knowledge/
  src/
    app/
      manager/
        new/
          _components/
            UploadForm.tsx          ← MODIFY: multi-file state + sequential upload
        quizzes/
          new/
            page.tsx                ← MODIFY: parse documentIds param, load multiple docs
            _components/
              GenerateForm.tsx      ← NO CHANGE
              DocumentPicker.tsx    ← CREATE: multi-doc selector client component
    components/
      shared/
        FileDropzone.tsx            ← MODIFY: add multiple prop and onFiles callback
```

### Folder rules

- `DocumentPicker.tsx` lives under the route's `_components/` folder because it is only used by the quiz generation page.
- Do not move `GenerateForm.tsx`. It stays unchanged.
- Do not create new API routes or service files in this phase.

---

## 4. Task Breakdown

---

### Task 8.1 — Scope Lock & Interface Design

**Objective.** Freeze the component interface contracts before writing any code, to avoid mid-task pivots.

**Technical Requirements.**

Agree on and document the following interface changes before implementation begins:

**`FileDropzone` new props:**

```ts
interface FileDropzoneProps {
  onFiles: (files: File[]) => void;   // replaces onFile
  multiple?: boolean;                  // default false
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
  isLoading?: boolean;
}
```

When `multiple` is `false`, `onFiles` is still called, but always with an array of length 1. This removes the need for a separate `onFile` callback.

**`UploadForm` state shape:**

```ts
type FileEntry = {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  documentId?: number;
  errorMessage?: string;
};
```

**Quiz page URL contract:**

| Scenario | URL |
|---|---|
| Legacy single upload | `/manager/quizzes/new?documentId=42` |
| New multi upload | `/manager/quizzes/new?documentIds=42,43,44` |
| Both present | Prefer `documentIds` |

**`DocumentPicker` props:**

```ts
interface DocumentPickerProps {
  documents: { id: number; filename: string; charCount: number }[];
}
```

`DocumentPicker` manages its own selected state and renders `GenerateForm` for the chosen document.

**Dependencies.**

- Phase 7 complete (or at minimum Phases 0–6 working).
- Existing `FileDropzone` and `UploadForm` code read and understood.

**Acceptance Criteria.**

- Interface contracts are agreed upon before any file is modified.
- No ambiguity remains around the URL param format or the component callback shape.

**Validation Steps.**

1. Review this task's interface table.
2. Confirm no existing caller of `FileDropzone` outside of `UploadForm` exists (it does not — verified by grep).
3. Sign off before Task 8.2 begins.

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Low. This is a design checkpoint, not a coding task.

---

### Task 8.2 — Update `FileDropzone` for Multi-file Support

**Objective.** Extend the dropzone UI component to accept multiple files without breaking its single-file callers.

**File:** `quiz-knowledge/src/components/shared/FileDropzone.tsx`

**Technical Requirements.**

1. Replace prop `onFile: (file: File) => void` with `onFiles: (files: File[]) => void`.
2. Add prop `multiple?: boolean` (default `false`).
3. When `multiple` is `false`:
   - `<input type="file">` has no `multiple` attribute.
   - On drop or change: validate and call `onFiles([file])` for the single file.
4. When `multiple` is `true`:
   - `<input type="file" multiple>`.
   - On drop: validate all files, collect those that pass, call `onFiles(validFiles)`.
   - On input change: same.
   - Files that fail validation show per-file error messages in the dropzone (list format).
5. Validation logic (`validateFile`) remains unchanged per individual file.
6. The loading state spinner and the drag-active styling remain unchanged.
7. The descriptive text updates to reflect multi-select when `multiple` is `true` (e.g., "Click to upload files" and "or drag and drop multiple files").

**Interface after this task:**

```ts
interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
  isLoading?: boolean;
}
```

**Dependencies.**

- Task 8.1 interface contract approved.

**Acceptance Criteria.**

- Single-file mode works identically to today (except callback is now `onFiles([file])`).
- Multi-file mode collects all valid files from a drop or input selection and calls `onFiles` once with the full array.
- Per-file validation errors are visible in the dropzone.
- TypeScript compiles with `tsc --noEmit`.

**Validation Steps.**

1. Open `/manager/new` in browser.
2. Drag 3 valid files — confirm all 3 pass to `UploadForm`.
3. Drag a mix of valid and invalid files — confirm only valid ones pass, invalid ones show error.
4. Click the upload button and select multiple files via the file dialog — confirm same behavior.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** High. Self-contained component with clear interface.

---

### Task 8.3 — Update `UploadForm` for Multi-file State & Sequential Upload

**Objective.** Replace the single-file form state with a multi-file list and implement sequential upload with per-file status tracking.

**File:** `quiz-knowledge/src/app/manager/new/_components/UploadForm.tsx`

**Technical Requirements.**

**State:**

```ts
type FileEntry = {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  documentId?: number;
  errorMessage?: string;
};

const [entries, setEntries] = useState<FileEntry[]>([]);
```

**File list UI (below the dropzone):**

- Show a card/row per file with: filename, size, status badge.
- Status badge colors: gray (pending), blue (uploading), green (done), red (error).
- Each pending entry has a remove button (×) to deselect it before upload.
- Remove is disabled once upload has started.

**Upload flow (on form submit):**

```
for each entry in entries where status === 'pending':
  mark entry as 'uploading'
  POST to /api/documents with formData containing entry.file
  on success: mark 'done', store documentId
  on failure: mark 'error', store errorMessage
```

Upload is strictly sequential — do not use `Promise.all`.

**Submit button behavior:**

- Disabled when `entries` is empty or all entries are uploading.
- Label: "Upload X file(s)" when pending, "Uploading…" during upload.

**Redirect after upload:**

```ts
const succeededIds = entries.filter(e => e.status === 'done').map(e => e.documentId!);
if (succeededIds.length === 1) {
  router.push(`/manager/quizzes/new?documentId=${succeededIds[0]}`);
} else if (succeededIds.length > 1) {
  router.push(`/manager/quizzes/new?documentIds=${succeededIds.join(',')}`);
}
// if 0 succeeded: do not redirect; errors are already shown per-file
```

**Error handling:**

- Per-file error messages come from the API response `json.error.code`, mapped through the existing `errorMessages` map.
- Do not call `toast.error` for individual file failures — show inline in the file row instead.
- Call `toast.success('X of Y documents uploaded.')` after the batch.

**Dependencies.**

- Task 8.2 completed (FileDropzone now calls `onFiles`).

**Acceptance Criteria.**

- User can select 3 files, see them listed, remove 1 before upload, and upload the remaining 2.
- Status badges update in real time as each file uploads.
- A failing file shows its error inline and the remaining files continue uploading.
- Redirect uses `?documentIds=...` when ≥ 2 succeed, `?documentId=...` when exactly 1 succeeds.
- TypeScript compiles.

**Validation Steps.**

1. Upload 3 valid files — confirm all 3 succeed and redirect to quiz page with 3 IDs.
2. Upload 2 valid + 1 invalid MIME — confirm 2 succeed, 1 shows error, redirect with 2 IDs.
3. Remove a file before clicking upload — confirm it is not uploaded.
4. Upload a single file — confirm redirect uses `?documentId=X` (backward compat).

**Estimated Complexity.** Medium.

**AI Coding Opportunity.** High. Sequential loop with state mutation is well-scoped.

---

### Task 8.4 — Update Quiz Generation Page & Add `DocumentPicker`

**Objective.** Make the quiz generation page handle both single (`?documentId`) and multi (`?documentIds`) query params, and display a document picker when multiple documents are present.

**Files:**

- MODIFY: `quiz-knowledge/src/app/manager/quizzes/new/page.tsx`
- CREATE: `quiz-knowledge/src/app/manager/quizzes/new/_components/DocumentPicker.tsx`

**Technical Requirements — `page.tsx`:**

Parse search params:

```ts
interface PageProps {
  searchParams: Promise<{ documentId?: string; documentIds?: string }>;
}
```

Resolution logic:

```ts
let documentIds: number[] = [];

if (params.documentIds) {
  documentIds = params.documentIds
    .split(',')
    .map(s => parseInt(s, 10))
    .filter(n => !isNaN(n));
} else if (params.documentId) {
  const id = parseInt(params.documentId, 10);
  if (!isNaN(id)) documentIds = [id];
}
```

Load all documents:

```ts
const docs = await prisma.document.findMany({
  where: { id: { in: documentIds } },
  select: { id: true, filename: true, charCount: true },
});
```

Render:

- If `docs.length === 0`: existing "Document required" error state (unchanged).
- If `docs.length === 1`: existing layout with `<GenerateForm documentId={docs[0].id} />` (unchanged).
- If `docs.length > 1`: render `<DocumentPicker documents={docs} />`.

Page heading when multiple docs:

```
Generate quiz
Select a document and configure your quiz.
```

**Technical Requirements — `DocumentPicker.tsx`:**

```ts
'use client';

interface Doc { id: number; filename: string; charCount: number; }
interface DocumentPickerProps { documents: Doc[]; }
```

Behavior:

- State: `selectedId: number | null` (default `null`).
- Renders a list of document cards (filename + char count).
- Clicking a card selects it (highlighted border, checkmark indicator).
- Below the list: renders `<GenerateForm documentId={selectedId} />` only when `selectedId !== null`.
- No submit step needed — selection is immediate.

Styling guidance:

- Use `rounded-lg border p-4` cards with `border-blue-500` on selected.
- Keep the component simple — no accordion or tabs.

**Dependencies.**

- Task 8.3 completed (redirect now produces `?documentIds=...`).
- Existing `GenerateForm` must remain unchanged.

**Acceptance Criteria.**

- `?documentId=42` — existing single-doc flow works identically.
- `?documentIds=42,43` — document picker is shown, user selects one, quiz generates normally.
- `?documentIds=42` (single ID in multi param) — treated as single doc, existing layout rendered.
- Invalid or missing IDs are filtered out; if none remain, existing error state renders.
- TypeScript compiles.

**Validation Steps.**

1. Upload 1 file → quiz page with `?documentId=X` → existing layout, no picker.
2. Upload 3 files → quiz page with `?documentIds=X,Y,Z` → picker shown with 3 cards.
3. Select one card → `GenerateForm` appears below.
4. Generate quiz normally — confirm full flow completes.
5. Navigate to `?documentIds=X` (single item) — confirm existing layout, no picker.

**Estimated Complexity.** Low to Medium.

**AI Coding Opportunity.** High. Server component param parsing and a straightforward client picker.

---

### Task 8.5 — Final Verification & Phase Closeout

**Objective.** Confirm all four changes work together end-to-end and automated checks pass.

**Technical Requirements.**

Manual QA checklist:

| # | Action | Expected outcome |
|---|---|---|
| 1 | Select 1 file via click | File appears in list with pending badge |
| 2 | Select 3 files via click | All 3 appear in list |
| 3 | Drag-and-drop 3 files | All 3 appear in list |
| 4 | Drag-and-drop mix of valid + invalid | Valid files listed; invalid show inline error in dropzone |
| 5 | Remove a file from the list before upload | File removed; remaining files upload correctly |
| 6 | Upload 3 valid files | All 3 show green badge; redirect to `?documentIds=X,Y,Z` |
| 7 | On quiz page with 3 IDs | Document picker shows 3 cards |
| 8 | Select a document in picker | GenerateForm appears below |
| 9 | Generate quiz | Full flow succeeds |
| 10 | Upload 1 file | Redirect to `?documentId=X`; existing layout; no picker |
| 11 | Upload with 1 failing file (bad type) | Failing file shows error inline; others continue; redirect if ≥ 1 success |

Automated checks:

```powershell
cd quiz-knowledge
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Commit strategy:

```text
feat(8): add multiple prop to FileDropzone, switch to onFiles callback
feat(8): update UploadForm for multi-file state and sequential upload
feat(8): add DocumentPicker component for multi-document quiz selection
feat(8): update quiz generation page to parse documentIds param
chore(8): phase 8 complete - multi-file upload
```

Branch:

- `feat/8-multi-file-upload`

PR title:

- `Phase 8: Multi-file Upload`

**Dependencies.**

- Tasks 8.1 through 8.4.

**Acceptance Criteria.**

- All 11 manual QA steps pass.
- `tsc --noEmit`, `lint`, and `build` pass clean.
- No backend files were modified.
- No unrelated files were modified.

**Validation Steps.**

1. Run automated checks.
2. Walk the manual QA checklist.
3. Confirm no scope creep (no backend changes, no new API routes, no new dependencies).

**Estimated Complexity.** Low.

**AI Coding Opportunity.** Low. This is manual verification.

---

## 5. Recommended Execution Order

### Dependency-first order

1. **8.1 Scope lock & interface design**  
   Agree on all prop signatures before writing code.
2. **8.2 FileDropzone**  
   Foundation for everything above it.
3. **8.3 UploadForm**  
   Depends on the new `onFiles` callback from 8.2.
4. **8.4 Quiz page + DocumentPicker**  
   Depends on the redirect URL shape from 8.3.
5. **8.5 Final verification**  
   Gate task — nothing ships without this.

### Wall-clock estimate (one person, serial)

| Task | Time |
|---|---|
| 8.1 | 15 min |
| 8.2 | 30 min |
| 8.3 | 45 min |
| 8.4 | 35 min |
| 8.5 | 30 min |
| **Total** | **~155 min (~2.5 h)** |

Tasks 8.2 and 8.3 can be parallelized by two engineers once 8.1 is signed off. Task 8.4 requires 8.3's redirect URL shape to be final before writing the page param parsing.

---

## 6. Common Phase 8 Pitfalls

| Pitfall | Why it hurts | Mitigation |
|---|---|---|
| Uploading files in parallel | Overloads the API; harder to track per-file progress | Sequential loop only |
| Calling `toast.error` for each failed file | Spams the user when multiple fail | Show errors inline in the file list; use one summary toast |
| Blocking redirect on partial failure | If 3 of 4 files succeed, user expects to continue | Redirect when ≥ 1 succeeds |
| Breaking the single-file flow | Existing links with `?documentId=X` must still work | Backward compat tested explicitly in 8.5 |
| Adding `multiple` to FileDropzone but forgetting the input attribute | Drop works but the file dialog stays single-select | Verify both paths in 8.5 manual QA |
| Changing `GenerateForm` | Component must stay unchanged; only the page around it changes | Read constraint before touching the file |
| Introducing a new API endpoint | Adds complexity with no spec justification | All uploads go through existing `/api/documents` |

---

## 7. Definition of Done

Phase 8 is complete when all of the following are true:

### Code

- [ ] `FileDropzone` accepts `multiple` prop and calls `onFiles` instead of `onFile`.
- [ ] `UploadForm` manages `FileEntry[]` state with per-file status tracking.
- [ ] `UploadForm` uploads files sequentially and redirects correctly.
- [ ] `DocumentPicker` component exists and is rendered by the quiz generation page when `?documentIds` has more than one ID.
- [ ] Quiz generation page parses both `?documentId` and `?documentIds` params.
- [ ] No backend files were modified.

### Functionality

- [ ] Selecting and uploading multiple files works end-to-end.
- [ ] Per-file status updates are visible during upload.
- [ ] A partial failure (some files fail) does not prevent the user from continuing.
- [ ] Single-file upload still redirects to the existing quiz generation layout without a picker.
- [ ] Picking a document and generating a quiz works normally after a multi-file upload.

### Non-functional

- [ ] No new npm dependencies introduced.
- [ ] No new API routes or Prisma models introduced.
- [ ] `tsc --noEmit` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` passes.

### Repo hygiene

- [ ] Commits follow `feat(8):` and `chore(8):`.
- [ ] Branch `feat/8-multi-file-upload` is ready to merge.

---

## 8. Open Issues

### OI-8.A — Quiz generation from multiple documents simultaneously

- **Description.** A future requirement may ask for a quiz generated from the combined content of all uploaded documents, not just one selected document.
- **Decision for Phase 8.** Out of scope. User picks one document per quiz. Combined-document generation requires AI service changes and is deferred.
- **Follow-up.** File a new phase or change request if the product spec is updated to require this.

### OI-8.B — Maximum number of files per batch

- **Description.** No hard limit is enforced on the number of files a user can select at once. Selecting 50 files would send 50 sequential API requests.
- **Decision for Phase 8.** Accept the risk for MVP. The existing 15MB per-file limit and sequential upload already constrain throughput naturally.
- **Follow-up.** Add a configurable `maxFiles` prop to `FileDropzone` if abuse or UX issues arise.

### OI-8.C — Upload resume / retry per file

- **Description.** If a file fails, the user currently has no way to retry just that file without re-uploading the whole batch.
- **Decision for Phase 8.** Out of scope. Show the error inline; user can re-visit `/manager/new` for the failed file.
- **Follow-up.** Add per-file retry if user research shows it is a common pain point.

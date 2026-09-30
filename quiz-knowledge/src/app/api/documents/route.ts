import { NextRequest, NextResponse } from 'next/server';
import { createDocument } from '@/lib/services/documents';
import { AppError, toErrorResponse } from '@/lib/errors';

// pdf-parse and mammoth require Node.js runtime, not Edge
export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel Pro/Hobby safe

// Accepted MIME types
const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
  'text/csv',
  'text/html',
]);

// Hard limit: 15 MB
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

/**
 * POST /api/documents
 *
 * Uploads a document file (PDF, DOCX, or Markdown).
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: field "file" (required)
 *
 * Response (201):
 * {
 *   "data": {
 *     "documentId": 42,
 *     "filename": "handbook.pdf",
 *     "charCount": 18234
 *   }
 * }
 *
 * Errors:
 * - 400 INVALID_INPUT (missing file field)
 * - 413 FILE_TOO_LARGE (file > 15MB)
 * - 415 UNSUPPORTED_MIME (file type not supported)
 * - 422 PARSE_FAILED (parser threw error)
 * - 422 PARSE_EMPTY (extracted text is empty)
 * - 500 STORAGE_FAILED (Supabase Storage error)
 * - 500 INTERNAL (other errors)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');

    // 2. Validate file field exists and is a File
    if (!(file instanceof File)) {
      throw new AppError('INVALID_INPUT', 400, 'Missing file field.');
    }

    // 3. Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError(
        'FILE_TOO_LARGE',
        413,
        'File too large (max 15MB).',
      );
    }

    // 4. Infer MIME type (handle .md files that come as text/plain)
    const mime = inferMime(file);

    // 5. Validate MIME type
    if (!ACCEPTED_MIMES.has(mime)) {
      throw new AppError(
        'UNSUPPORTED_MIME',
        415,
        'Unsupported file type.',
      );
    }

    // 6. Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 7. Create document (upload, parse, persist)
    const result = await createDocument({
      buffer,
      mime,
      filename: file.name,
    });

    // 8. Return success
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

function inferMime(file: File): string {
  const name = file.name.toLowerCase();
  // Some browsers report wrong or missing MIME for text files; use extension as source of truth.
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'text/html';
  if (file.type) return file.type;
  return 'application/octet-stream';
}

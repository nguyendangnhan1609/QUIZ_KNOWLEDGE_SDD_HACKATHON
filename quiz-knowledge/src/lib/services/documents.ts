import { prisma } from '@/lib/db/prisma';
import { extractText } from '@/lib/parsers';
import { uploadDocumentFile } from '@/lib/storage/upload';
import { AppError } from '@/lib/errors';

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

/**
 * Create a document: upload file → extract text → persist to DB.
 *
 * Order matters:
 * 1. Upload first (so original is kept even if parsing fails)
 * 2. Extract text (may throw for corrupted files)
 * 3. Persist to DB (only if parsing succeeds)
 *
 * @throws AppError on any step
 */
export async function createDocument(
  input: CreateDocumentInput,
): Promise<CreateDocumentResult> {
  // 1. Upload original file to Supabase Storage
  let uploaded;
  try {
    uploaded = await uploadDocumentFile(input.buffer, input.filename, input.mime);
  } catch (err) {
    throw new AppError(
      'STORAGE_FAILED',
      500,
      'Upload failed. Please try again.',
      err,
    );
  }

  // 2. Extract and normalize text
  let text: string;
  try {
    text = await extractText(input.buffer, input.mime);
  } catch (err) {
    const errorMsg = (err as Error)?.message || 'Unknown parsing error';

    // Map specific error messages to error codes
    if (errorMsg.includes('Unsupported')) {
      throw new AppError(
        'UNSUPPORTED_MIME',
        415,
        'Unsupported file type.',
        err,
      );
    }
    if (errorMsg.includes('scanned') || errorMsg.includes('empty')) {
      throw new AppError(
        'PARSE_EMPTY',
        422,
        'No readable text. Is this a scanned PDF?',
        err,
      );
    }

    throw new AppError('PARSE_FAILED', 422, "We couldn't read this file.", err);
  }

  // 3. Validate extracted text is non-empty
  if (text.trim().length === 0) {
    throw new AppError(
      'PARSE_EMPTY',
      422,
      'No readable text. Is this a scanned PDF?',
    );
  }

  // 4. Persist to database
  let document;
  try {
    document = await prisma.document.create({
      data: {
        filename: input.filename,
        mimeType: input.mime,
        storagePath: uploaded.storagePath,
        textContent: text,
        charCount: text.length,
      },
      select: { id: true, filename: true },
    });
  } catch (err) {
    throw new AppError(
      'INTERNAL',
      500,
      'Failed to save document. Please try again.',
      err,
    );
  }

  return {
    documentId: document.id,
    filename: document.filename,
    charCount: text.length,
  };
}

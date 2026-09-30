import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MIME'
  | 'PARSE_FAILED'
  | 'PARSE_EMPTY'
  | 'STORAGE_FAILED'
  | 'DOCUMENT_NOT_FOUND'
  | 'AI_GEN_FAILED'
  | 'AI_TIMEOUT'
  | 'QUIZ_NOT_FOUND'
  | 'QUIZ_EMPTY'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'ANSWER_COUNT_MISMATCH'
  | 'ATTEMPT_PERSIST_FAILED'
  | 'RESULTS_NOT_FOUND'
  | 'INTERNAL';

/**
 * Application error with HTTP status and user-friendly message.
 * Server logs the cause; client only sees userMessage.
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    public userMessage: string,
    public cause?: unknown,
  ) {
    super(userMessage);
    this.name = 'AppError';
  }
}

/**
 * Convert any error to a JSON response.
 * Never leaks stack traces to client.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    // Log 5xx errors with cause for debugging
    if (err.status >= 500) {
      console.error(`[${err.code}]`, err.cause ?? err.message);
    }
    return NextResponse.json(
      { error: { code: err.code, message: err.userMessage } },
      { status: err.status },
    );
  }

  // Unhandled error
  console.error('[unhandled]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong.' } },
    { status: 500 },
  );
}

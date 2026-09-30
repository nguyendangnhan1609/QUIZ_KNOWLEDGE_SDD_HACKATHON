/**
 * Centralized error code → message mapping
 * Used by API and client to ensure consistency
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Phase 2 errors
  INVALID_INPUT: 'Invalid input. Please check your request.',
  FILE_TOO_LARGE: 'File too large (max 15MB).',
  UNSUPPORTED_MIME: 'Unsupported file type.',
  PARSE_FAILED: "We couldn't read this file.",
  PARSE_EMPTY: 'No readable text. Is this a scanned PDF?',
  STORAGE_FAILED: 'Upload failed. Please try again.',

  // Phase 3 errors
  DOCUMENT_NOT_FOUND: 'Document not found.',
  AI_GEN_FAILED:
    'Could not generate enough valid questions. Try a richer document or a lower question count.',
  AI_TIMEOUT: 'Generation took too long. Please try again.',

  // Phase 4 errors
  QUIZ_NOT_FOUND: 'Quiz not found.',
  QUIZ_EMPTY: 'Quiz has no questions.',
  SESSION_NOT_FOUND: 'Quiz session not found.',
  SESSION_EXPIRED: 'Your quiz session has expired. Please start a new quiz.',

  // Phase 5 errors
  ANSWER_COUNT_MISMATCH: 'Answer count does not match quiz length.',
  ATTEMPT_PERSIST_FAILED: 'Failed to save your attempt. Please try again.',

  // Phase 6 errors
  RESULTS_NOT_FOUND: 'Results not found.',

  // Fallback
  INTERNAL: 'Something went wrong.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An error occurred.';
}

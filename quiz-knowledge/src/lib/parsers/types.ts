export const MIME_PDF = 'application/pdf';
export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MIME_MARKDOWN = 'text/markdown';
export const MIME_TEXT = 'text/plain';
export const MIME_CSV = 'text/csv';
export const MIME_HTML = 'text/html';

export type SupportedMime =
  | typeof MIME_PDF
  | typeof MIME_DOCX
  | typeof MIME_MARKDOWN
  | typeof MIME_TEXT
  | typeof MIME_CSV
  | typeof MIME_HTML;

export function isSupportedMime(mime: string): mime is SupportedMime {
  return [MIME_PDF, MIME_DOCX, MIME_MARKDOWN, MIME_TEXT, MIME_CSV, MIME_HTML].includes(mime);
}

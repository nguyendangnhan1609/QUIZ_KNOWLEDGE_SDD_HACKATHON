import { parseMarkdown } from './markdown';
import { MIME_PDF, MIME_DOCX, MIME_MARKDOWN, MIME_TEXT, MIME_CSV, MIME_HTML } from './types';

export type ParserError = Error & { cause?: unknown };

export async function extractText(
  buffer: Buffer,
  mime: string,
): Promise<string> {
  switch (mime) {
    case MIME_PDF: {
      const { parsePdf } = await import('./pdf');
      return parsePdf(buffer);
    }
    case MIME_DOCX: {
      const { parseDocx } = await import('./docx');
      return parseDocx(buffer);
    }
    case MIME_MARKDOWN:
      return parseMarkdown(buffer);
    case MIME_TEXT:
    case MIME_CSV: {
      const { parsePlainText } = await import('./plaintext');
      return parsePlainText(buffer);
    }
    case MIME_HTML: {
      const { parseHtml } = await import('./html');
      return parseHtml(buffer);
    }
    default:
      throw new Error(`Unsupported file type (MIME: ${mime})`);
  }
}

export type { SupportedMime } from './types';

/**
 * Normalize parsed text for downstream AI consumption.
 *
 * Steps (in order):
 * 1. Strip UTF-8 BOM if present
 * 2. Unicode NFC normalization (combine accents)
 * 3. Convert CRLF / CR to LF
 * 4. Collapse runs of spaces / tabs to single space
 * 5. Trim trailing whitespace on each line
 * 6. Collapse 3+ consecutive newlines to exactly two (paragraph break)
 * 7. Trim leading / trailing whitespace
 *
 * Why each step:
 * - BOM: wastes tokens
 * - NFC: standardizes "é" as single codepoint
 * - CRLF: mixed endings inflate token count
 * - Spaces: PDFs often have double-spacing from column extraction
 * - Blank lines: PDFs often have 5+ blank lines; one is enough
 * - Final trim: cleanup
 *
 * What we do NOT do:
 * - No HTML stripping (Markdown is kept; PDFs/DOCX have none)
 * - No stop-word removal (helps quiz quality)
 * - No language detection
 * - No sentence segmentation (Phase 3's chunker handles it)
 */
export function normalizeText(input: string): string {
  if (!input) return '';

  let s = input;

  // 1. Strip UTF-8 BOM if present (U+FEFF)
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1);
  }

  // 2. Unicode NFC normalization (compose accents into single codepoints)
  s = s.normalize('NFC');

  // 3. Normalize line endings: CRLF and CR both become LF
  s = s.replace(/\r\n?/g, '\n');

  // 4. Collapse spaces and tabs (preserve newlines)
  s = s.replace(/[ \t]+/g, ' ');

  // 5. Trim trailing whitespace on each line
  s = s.replace(/[ \t]+\n/g, '\n');

  // 6. Collapse 3+ consecutive newlines to exactly 2 (paragraph break)
  s = s.replace(/\n{3,}/g, '\n\n');

  // 7. Final trim: remove leading/trailing whitespace
  return s.trim();
}

// ~4 chars per token on average; 3000 tokens ≈ 12000 chars
const CHARS_PER_CHUNK = 12_000;

export function chunkText(text: string, maxTokens = 3000): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const maxChars = maxTokens * 4;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    if (end < text.length) {
      // Prefer splitting on a paragraph break, then a newline, then a space
      const boundary =
        text.lastIndexOf('\n\n', end) ||
        text.lastIndexOf('\n', end) ||
        text.lastIndexOf(' ', end);

      if (boundary > start) {
        end = boundary;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter((c) => c.length > 0);
}

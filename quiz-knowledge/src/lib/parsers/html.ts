import { normalizeText } from './normalize';

export async function parseHtml(buffer: Buffer): Promise<string> {
  const raw = buffer.toString('utf-8');
  // Strip tags, decode common entities
  const stripped = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const cleaned = normalizeText(stripped);
  if (cleaned.length === 0) {
    throw new Error('HTML file has no readable text content.');
  }
  return cleaned;
}

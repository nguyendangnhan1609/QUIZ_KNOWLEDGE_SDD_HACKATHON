import { normalizeText } from './normalize';

// Match YAML front-matter: ---\nYAML content\n---\n
const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

export async function parseMarkdown(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    raw = buffer.toString('utf-8');
  } catch (err) {
    throw new Error("Couldn't read this Markdown");
  }

  // Strip YAML front-matter if present
  const stripped = raw.replace(FRONT_MATTER_RE, '');

  const cleaned = normalizeText(stripped);
  if (cleaned.length === 0) {
    throw new Error('Markdown file is empty.');
  }
  return cleaned;
}

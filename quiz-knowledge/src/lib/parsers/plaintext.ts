import { normalizeText } from './normalize';

export async function parsePlainText(buffer: Buffer): Promise<string> {
  const raw = buffer.toString('utf-8');
  const cleaned = normalizeText(raw);
  if (cleaned.length === 0) {
    throw new Error('Text file is empty.');
  }
  return cleaned;
}

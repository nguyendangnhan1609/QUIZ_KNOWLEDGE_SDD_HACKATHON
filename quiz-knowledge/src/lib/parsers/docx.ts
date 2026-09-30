import mammoth from 'mammoth';
import { normalizeText } from './normalize';

export async function parseDocx(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value ?? '';
  } catch (err) {
    throw new Error("Couldn't read this DOCX");
  }

  const cleaned = normalizeText(raw);
  if (cleaned.length === 0) {
    throw new Error('No readable text in DOCX.');
  }
  return cleaned;
}

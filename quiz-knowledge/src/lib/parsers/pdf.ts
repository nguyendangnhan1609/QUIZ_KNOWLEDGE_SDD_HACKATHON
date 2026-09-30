import { PDFParse } from 'pdf-parse';
import { normalizeText } from './normalize';

export async function parsePdf(buffer: Buffer): Promise<string> {
  let raw: string;
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    raw = result.text ?? '';
    await parser.destroy();
  } catch (err) {
    throw new Error("Couldn't read this PDF");
  }

  const cleaned = normalizeText(raw);
  if (cleaned.length === 0) {
    throw new Error('No readable text. Is this a scanned PDF?');
  }
  return cleaned;
}

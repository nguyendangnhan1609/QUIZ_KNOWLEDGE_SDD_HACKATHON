import { z } from 'zod';
import { getAnthropicClient } from './client';
import { SYSTEM_PROMPT, userPrompt, type Language } from './prompts';
import { chunkText } from './chunker';
import { aiResponseSchema, type AIQuestion } from '@/lib/schemas/ai';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/config/env';

const SOFT_TIMEOUT_MS = 55_000;
const MAX_CHUNKS = 8;
const MAX_TOKENS_PER_CALL = 4096;

export interface GenerateInput {
  text: string;
  questionCount: number;
  language: Language;
}

export interface GenerateOutput {
  bank: AIQuestion[];
  bankSize: number;
}

export async function generateQuestions(input: GenerateInput): Promise<GenerateOutput> {
  const bankSize = input.questionCount * env.QUESTION_BANK_MULTIPLIER;

  const allChunks = chunkText(input.text);
  if (allChunks.length === 0) {
    throw new AppError(
      'AI_GEN_FAILED',
      422,
      'Document has no extractable text.',
    );
  }

  const chunks =
    allChunks.length <= MAX_CHUNKS
      ? allChunks
      : Array.from({ length: MAX_CHUNKS }, (_, i) =>
          allChunks[Math.floor((i * allChunks.length) / MAX_CHUNKS)],
        );

  const perChunk = Math.ceil(bankSize / chunks.length);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOFT_TIMEOUT_MS);

  try {
    const results = await Promise.all(
      chunks.map((c) => generateForChunk(c, perChunk, ctrl.signal, input.language)),
    );

    const validated = results.flatMap((r) => r.questions);

    if (validated.length < bankSize) {
      throw new AppError(
        'AI_GEN_FAILED',
        502,
        'Could not generate enough valid questions. Try a richer document or a lower question count.',
      );
    }

    return { bank: validated.slice(0, bankSize), bankSize };
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new AppError('AI_TIMEOUT', 504, 'Generation took too long. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function generateForChunk(
  chunk: string,
  n: number,
  signal: AbortSignal,
  language: Language,
) {
  try {
    const raw = await callClaude('claude-haiku-4-5', chunk, n, signal, language);
    return aiResponseSchema.parse(JSON.parse(raw));
  } catch (e) {
    // Retry once with stronger model on JSON or validation error
    if (e instanceof z.ZodError || e instanceof SyntaxError) {
      const raw = await callClaude('claude-sonnet-4-6', chunk, n, signal, language);
      return aiResponseSchema.parse(JSON.parse(raw));
    }
    throw e;
  }
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  // Properly closed fence
  const closed = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (closed) return closed[1].trim();
  // Unclosed fence (truncated response) — strip opening fence, return rest
  const open = trimmed.match(/^```(?:json)?\s*([\s\S]*)/);
  if (open) return open[1].trim();
  return trimmed;
}

async function callClaude(
  model: string,
  chunk: string,
  n: number,
  signal: AbortSignal,
  language: Language,
): Promise<string> {
  const client = getAnthropicClient();
  const message = await client.messages.create(
    {
      model,
      max_tokens: MAX_TOKENS_PER_CALL,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(chunk, n, language) }],
    },
    { signal },
  );
  const block = message.content[0];
  const text = block?.type === 'text' ? block.text : '';
  return stripCodeFences(text);
}

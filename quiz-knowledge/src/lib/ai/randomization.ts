import crypto from 'crypto';

function seedHash(seed: string, index: number): number {
  const hash = crypto
    .createHash('sha256')
    .update(`${seed}:${index}`)
    .digest();
  return parseInt(hash.toString('hex').slice(0, 8), 16);
}

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let m = result.length;

  while (m > 1) {
    m--;
    const k = seedHash(seed, arr.length - m) % (m + 1);
    [result[k], result[m]] = [result[m], result[k]];
  }

  return result;
}

export function selectQuestions(
  allQuestionIds: number[],
  count: number,
  seed: string,
): number[] {
  const shuffled = deterministicShuffle(allQuestionIds, seed);
  return shuffled.slice(0, count);
}

export function shuffleAnswerOrder(
  optionIndices: number[],
  seed: string,
): number[] {
  return deterministicShuffle(optionIndices, seed);
}

export type SessionPayloadAnswerOrders = Record<string, number[]>;

export type SessionPayload = {
  [key: string]: any;
  questionIds: number[];
  answerOrders: SessionPayloadAnswerOrders;
  seed: string;
  clientViewOrder: number[];
};

export function generateSessionPayload(
  selectedQuestionIds: number[],
  answerOrdersByQuestion: SessionPayloadAnswerOrders,
  seed: string,
): SessionPayload {
  return {
    questionIds: selectedQuestionIds,
    answerOrders: answerOrdersByQuestion,
    seed,
    clientViewOrder: selectedQuestionIds,
  };
}

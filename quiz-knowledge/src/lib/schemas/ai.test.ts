import { describe, it, expect } from 'vitest';
import { aiQuestionSchema, aiResponseSchema } from './ai';

const validQuestion = {
  question: 'What is the capital of France?',
  options: ['Paris', 'London', 'Berlin', 'Rome'],
  correctIndex: 0,
  explanation: 'Paris is the capital city of France.',
  difficulty: 'easy' as const,
};

describe('aiQuestionSchema', () => {
  it('accepts a valid question', () => {
    expect(() => aiQuestionSchema.parse(validQuestion)).not.toThrow();
  });

  it('rejects 3 options', () => {
    expect(() =>
      aiQuestionSchema.parse({ ...validQuestion, options: ['A', 'B', 'C'] }),
    ).toThrow();
  });

  it('rejects 5 options', () => {
    expect(() =>
      aiQuestionSchema.parse({
        ...validQuestion,
        options: ['A', 'B', 'C', 'D', 'E'],
      }),
    ).toThrow();
  });

  it('rejects out-of-range correctIndex', () => {
    expect(() =>
      aiQuestionSchema.parse({ ...validQuestion, correctIndex: 4 }),
    ).toThrow();
  });

  it('rejects unknown difficulty', () => {
    expect(() =>
      aiQuestionSchema.parse({ ...validQuestion, difficulty: 'expert' }),
    ).toThrow();
  });

  it('rejects short question', () => {
    expect(() =>
      aiQuestionSchema.parse({ ...validQuestion, question: 'Q?' }),
    ).toThrow();
  });

  it('rejects missing explanation', () => {
    expect(() =>
      aiQuestionSchema.parse({ ...validQuestion, explanation: '' }),
    ).toThrow();
  });
});

describe('aiResponseSchema', () => {
  it('accepts valid response with single question', () => {
    expect(() =>
      aiResponseSchema.parse({ questions: [validQuestion] }),
    ).not.toThrow();
  });

  it('accepts valid response with multiple questions', () => {
    expect(() =>
      aiResponseSchema.parse({
        questions: [validQuestion, validQuestion, validQuestion],
      }),
    ).not.toThrow();
  });

  it('rejects empty questions array', () => {
    expect(() => aiResponseSchema.parse({ questions: [] })).toThrow();
  });

  it('rejects invalid nested question', () => {
    expect(() =>
      aiResponseSchema.parse({
        questions: [validQuestion, { ...validQuestion, options: ['A', 'B'] }],
      }),
    ).toThrow();
  });
});

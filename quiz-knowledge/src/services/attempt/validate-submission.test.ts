import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSubmission } from './validate-submission';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/db', () => ({
  prisma: {
    quizSession: {
      findUnique: vi.fn() as any,
    },
  },
}));

import { prisma } from '@/lib/db';

describe('validateSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const expectAppError = async (
    fn: () => Promise<any>,
    expectedCode: string,
  ) => {
    try {
      await fn();
      expect.fail(`Should have thrown ${expectedCode}`);
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(expectedCode);
    }
  };

  it('should throw if session not found', async () => {
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce(null);

    await expectAppError(() => validateSubmission('invalid-token', []), 'SESSION_NOT_FOUND');
  });

  it('should throw if session is expired', async () => {
    const pastDate = new Date(Date.now() - 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: pastDate,
      completedAt: null,
      payload: { questionIds: [] },
      quiz: { id: 1, publicToken: 'pub-token', questions: [] },
    } as any);

    await expectAppError(() => validateSubmission('token', []), 'SESSION_EXPIRED');
  });

  it('should throw if session is already completed', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: new Date(),
      payload: { questionIds: [1] },
      quiz: { id: 1, publicToken: 'pub-token', questions: [] },
    } as any);

    await expectAppError(() => validateSubmission('token', []), 'INVALID_INPUT');
  });

  it('should throw if answer count mismatches', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1, 2] },
      quiz: { id: 1, publicToken: 'pub-token', questions: [] },
    } as any);

    await expectAppError(
      () => validateSubmission('token', [{ questionId: 1, selectedOptionId: null }]),
      'ANSWER_COUNT_MISMATCH',
    );
  });

  it('should throw if duplicate question IDs', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1, 2] },
      quiz: { id: 1, publicToken: 'pub-token', questions: [] },
    } as any);

    await expectAppError(
      () =>
        validateSubmission('token', [
          { questionId: 1, selectedOptionId: null },
          { questionId: 1, selectedOptionId: null },
        ]),
      'INVALID_INPUT',
    );
  });

  it('should throw if question not in session', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1] },
      quiz: { id: 1, publicToken: 'pub-token', questions: [] },
    } as any);

    await expectAppError(
      () => validateSubmission('token', [{ questionId: 999, selectedOptionId: null }]),
      'INVALID_INPUT',
    );
  });

  it('should accept valid submission with all answers', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1, 2] },
      quiz: {
        id: 1,
        publicToken: 'pub-token',
        questions: [
          {
            id: 1,
            text: 'Q1',
            options: [
              { id: 10, isCorrect: true },
              { id: 11, isCorrect: false },
            ],
          },
          {
            id: 2,
            text: 'Q2',
            options: [
              { id: 20, isCorrect: false },
              { id: 21, isCorrect: true },
            ],
          },
        ],
      },
    } as any);

    const result = await validateSubmission('token', [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, selectedOptionId: 21 },
    ]);

    expect(result.quizId).toBe(1);
    expect(result.questionCount).toBe(2);
    expect(result.normalizedAnswers).toHaveLength(2);
  });

  it('should accept unanswered questions', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1] },
      quiz: {
        id: 1,
        publicToken: 'pub-token',
        questions: [
          {
            id: 1,
            text: 'Q1',
            options: [
              { id: 10, isCorrect: true },
              { id: 11, isCorrect: false },
            ],
          },
        ],
      },
    } as any);

    const result = await validateSubmission('token', [
      { questionId: 1, selectedOptionId: null },
    ]);

    expect(result.normalizedAnswers[0]?.selectedOptionId).toBeNull();
  });

  it('should throw if selected option not in question', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
      sessionToken: 'token',
      expiresAt: futureDate,
      completedAt: null,
      payload: { questionIds: [1] },
      quiz: {
        id: 1,
        publicToken: 'pub-token',
        questions: [
          {
            id: 1,
            text: 'Q1',
            options: [
              { id: 10, isCorrect: true },
              { id: 11, isCorrect: false },
            ],
          },
        ],
      },
    } as any);

    await expect(
      validateSubmission('token', [{ questionId: 1, selectedOptionId: 999 }]),
    ).rejects.toThrow('does not belong to question');
  });
});

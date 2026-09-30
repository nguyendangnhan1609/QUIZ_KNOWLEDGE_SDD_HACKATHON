import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createQuizSession, getQuizSession } from './quizSessions';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/db', () => ({
  prisma: {
    quiz: {
      findUnique: vi.fn() as any,
    },
    quizSession: {
      create: vi.fn() as any,
      findUnique: vi.fn() as any,
    },
  },
}));

import { prisma } from '@/lib/db';

describe('quizSessions service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuizSession', () => {
    it('should throw if quiz not found', async () => {
      vi.mocked(prisma.quiz.findUnique as any).mockResolvedValueOnce(null);

      await expect(createQuizSession(999, 10)).rejects.toThrow(AppError);
    });

    it('should throw if quiz has no questions', async () => {
      vi.mocked(prisma.quiz.findUnique as any).mockResolvedValueOnce({
        id: 1,
        documentId: 1,
        publicToken: 'token',
        resultsToken: 'res-token',
        questionCount: 10,
        createdAt: new Date(),
        questions: [],
        sessions: [],
        attempts: [],
      } as any);

      await expect(createQuizSession(1, 10)).rejects.toThrow('Quiz has no questions');
    });

    it('should create session with correct token and expiration', async () => {
      const mockQuiz = {
        id: 1,
        documentId: 1,
        publicToken: 'token',
        resultsToken: 'res-token',
        questionCount: 10,
        createdAt: new Date(),
        questions: [
          {
            id: 1,
            quizId: 1,
            text: 'Q1',
            explanation: 'Exp',
            difficulty: 'easy',
            orderIndex: 0,
            options: [
              { id: 1, questionId: 1, text: 'Opt1', isCorrect: true, orderIndex: 0 },
              { id: 2, questionId: 1, text: 'Opt2', isCorrect: false, orderIndex: 1 },
            ],
          },
        ],
        sessions: [],
        attempts: [],
      } as any;

      vi.mocked(prisma.quiz.findUnique as any).mockResolvedValueOnce(mockQuiz);
      vi.mocked(prisma.quizSession.create as any).mockResolvedValueOnce({
        id: 'session-1',
        quizId: 1,
        sessionToken: 'test-token',
        payload: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        completedAt: null,
      });

      const result = await createQuizSession(1, 1);

      expect(result.sessionToken).toBe('test-token');
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('getQuizSession', () => {
    it('should throw if session not found', async () => {
      vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce(null);

      await expect(getQuizSession('invalid-token')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should throw if session expired', async () => {
      vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
        id: 'session-1',
        quizId: 1,
        sessionToken: 'token',
        payload: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        completedAt: null,
      });

      await expect(getQuizSession('token')).rejects.toThrow('Session has expired');
    });

    it('should return valid session', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(prisma.quizSession.findUnique as any).mockResolvedValueOnce({
        id: 'session-1',
        quizId: 1,
        sessionToken: 'token',
        payload: {},
        createdAt: new Date(),
        expiresAt: futureDate,
        completedAt: null,
      });

      const session = await getQuizSession('token');

      expect(session).toBeDefined();
      expect(session.sessionToken).toBe('token');
    });
  });
});

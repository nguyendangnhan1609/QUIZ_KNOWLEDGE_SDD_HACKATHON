import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttemptWithCollisionHandling } from './identifier-collision';

describe('createAttemptWithCollisionHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create attempt without suffix on first try', async () => {
    const mockTx = {
      attempt: {
        create: vi.fn().mockResolvedValueOnce({
          id: 1,
          quizId: 100,
          identifier: 'john_doe',
          score: 7,
          totalQuestions: 10,
        }),
      },
    };

    const result = await createAttemptWithCollisionHandling(
      mockTx as any,
      100,
      'john_doe',
      7,
      10,
    );

    expect(result.identifier).toBe('john_doe');
    expect(mockTx.attempt.create).toHaveBeenCalledTimes(1);
  });

  it('should retry with timestamp suffix on collision', async () => {
    const mockTx = {
      attempt: {
        create: vi
          .fn()
          .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['identifier'] } })
          .mockResolvedValueOnce({
            id: 2,
            quizId: 100,
            identifier: 'john_doe_20260510120000',
            score: 5,
            totalQuestions: 10,
          }),
      },
    };

    const result = await createAttemptWithCollisionHandling(
      mockTx as any,
      100,
      'john_doe',
      5,
      10,
    );

    expect(result.identifier).toMatch(/^john_doe_\d{14}$/);
    expect(mockTx.attempt.create).toHaveBeenCalledTimes(2);
  });

  it('should throw 409 on second collision', async () => {
    const mockTx = {
      attempt: {
        create: vi
          .fn()
          .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['identifier'] } })
          .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['identifier'] } }),
      },
    };

    try {
      await createAttemptWithCollisionHandling(mockTx as any, 100, 'john_doe', 5, 10);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.code).toBe('ATTEMPT_PERSIST_FAILED');
    }
  });

  it('should propagate non-collision errors from first attempt', async () => {
    const mockTx = {
      attempt: {
        create: vi.fn().mockRejectedValueOnce(new Error('Database connection failed')),
      },
    };

    await expect(
      createAttemptWithCollisionHandling(mockTx as any, 100, 'john_doe', 5, 10),
    ).rejects.toThrow('Database connection failed');
  });

  it('should propagate non-collision errors from retry', async () => {
    const mockTx = {
      attempt: {
        create: vi
          .fn()
          .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['identifier'] } })
          .mockRejectedValueOnce(new Error('Query timeout')),
      },
    };

    await expect(
      createAttemptWithCollisionHandling(mockTx as any, 100, 'john_doe', 5, 10),
    ).rejects.toThrow('Query timeout');
  });
});

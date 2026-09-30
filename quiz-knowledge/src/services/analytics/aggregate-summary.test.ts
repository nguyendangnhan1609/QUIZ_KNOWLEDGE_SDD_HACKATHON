import { describe, it, expect } from 'vitest';
import { aggregateSummary, type AttemptRecord } from './aggregate-summary';

describe('aggregateSummary', () => {
  it('should return null fields for zero attempts', () => {
    const result = aggregateSummary([]);

    expect(result.totalAttempts).toBe(0);
    expect(result.averageScore).toBeNull();
    expect(result.averagePercent).toBeNull();
    expect(result.highest).toBeNull();
    expect(result.lowest).toBeNull();
  });

  it('should aggregate single attempt', () => {
    const attempts: AttemptRecord[] = [
      {
        id: 1,
        score: 8,
        totalQuestions: 10,
        submittedAt: new Date(),
      },
    ];

    const result = aggregateSummary(attempts);

    expect(result.totalAttempts).toBe(1);
    expect(result.averageScore).toBe(8);
    expect(result.averagePercent).toBe(80);
    expect(result.highest).toBe(8);
    expect(result.lowest).toBe(8);
  });

  it('should aggregate multiple attempts', () => {
    const attempts: AttemptRecord[] = [
      { id: 1, score: 8, totalQuestions: 10, submittedAt: new Date() },
      { id: 2, score: 6, totalQuestions: 10, submittedAt: new Date() },
      { id: 3, score: 10, totalQuestions: 10, submittedAt: new Date() },
    ];

    const result = aggregateSummary(attempts);

    expect(result.totalAttempts).toBe(3);
    expect(result.averageScore).toBe(8);
    expect(result.averagePercent).toBe(80);
    expect(result.highest).toBe(10);
    expect(result.lowest).toBe(6);
  });

  it('should calculate percent correctly across attempts', () => {
    const attempts: AttemptRecord[] = [
      { id: 1, score: 7, totalQuestions: 10, submittedAt: new Date() },
      { id: 2, score: 8, totalQuestions: 10, submittedAt: new Date() },
      { id: 3, score: 9, totalQuestions: 10, submittedAt: new Date() },
    ];

    const result = aggregateSummary(attempts);

    expect(result.averagePercent).toBe(80);
  });

  it('should handle different total questions per attempt', () => {
    const attempts: AttemptRecord[] = [
      { id: 1, score: 5, totalQuestions: 10, submittedAt: new Date() },
      { id: 2, score: 8, totalQuestions: 10, submittedAt: new Date() },
    ];

    const result = aggregateSummary(attempts);

    expect(result.averageScore).toBe(6.5);
    expect(result.averagePercent).toBe(65);
  });
});

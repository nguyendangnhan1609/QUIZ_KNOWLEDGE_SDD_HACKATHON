import { describe, it, expect } from 'vitest';
import { scoreSessionAnswers, type SessionQuestion } from './score-session-answers';
import type { SubmittedAnswer } from '@/types/attempt';

describe('scoreSessionAnswers', () => {
  const mockQuestions: SessionQuestion[] = [
    {
      questionId: 1,
      correctOptionId: 10,
      options: [{ optionId: 10 }, { optionId: 11 }],
    },
    {
      questionId: 2,
      correctOptionId: 20,
      options: [{ optionId: 20 }, { optionId: 21 }],
    },
    {
      questionId: 3,
      correctOptionId: 30,
      options: [{ optionId: 30 }, { optionId: 31 }],
    },
  ];

  it('should score all correct answers', () => {
    const answers: SubmittedAnswer[] = [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, selectedOptionId: 20 },
      { questionId: 3, selectedOptionId: 30 },
    ];

    const result = scoreSessionAnswers(mockQuestions, answers);

    expect(result.score).toBe(3);
    expect(result.total).toBe(3);
    expect(result.gradedAnswers).toEqual([
      { questionId: 1, selectedOptionId: 10, isCorrect: true },
      { questionId: 2, selectedOptionId: 20, isCorrect: true },
      { questionId: 3, selectedOptionId: 30, isCorrect: true },
    ]);
  });

  it('should score all wrong answers', () => {
    const answers: SubmittedAnswer[] = [
      { questionId: 1, selectedOptionId: 11 },
      { questionId: 2, selectedOptionId: 21 },
      { questionId: 3, selectedOptionId: 31 },
    ];

    const result = scoreSessionAnswers(mockQuestions, answers);

    expect(result.score).toBe(0);
    expect(result.total).toBe(3);
    expect(result.gradedAnswers.every((a) => !a.isCorrect)).toBe(true);
  });

  it('should score partial answers', () => {
    const answers: SubmittedAnswer[] = [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, selectedOptionId: 21 },
      { questionId: 3, selectedOptionId: 30 },
    ];

    const result = scoreSessionAnswers(mockQuestions, answers);

    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
  });

  it('should count unanswered as incorrect', () => {
    const answers: SubmittedAnswer[] = [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, selectedOptionId: null },
      { questionId: 3, selectedOptionId: 30 },
    ];

    const result = scoreSessionAnswers(mockQuestions, answers);

    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
    expect(result.gradedAnswers[1]).toEqual({
      questionId: 2,
      selectedOptionId: null,
      isCorrect: false,
    });
  });

  it('should handle missing answers for a question', () => {
    const answers: SubmittedAnswer[] = [
      { questionId: 1, selectedOptionId: 10 },
      { questionId: 2, selectedOptionId: 20 },
    ];

    const result = scoreSessionAnswers(mockQuestions, answers);

    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
    expect(result.gradedAnswers).toHaveLength(3);
    expect(result.gradedAnswers[2]?.isCorrect).toBe(false);
  });

  it('should score single question', () => {
    const singleQuestion: SessionQuestion[] = [
      {
        questionId: 1,
        correctOptionId: 10,
        options: [{ optionId: 10 }, { optionId: 11 }],
      },
    ];

    const answers: SubmittedAnswer[] = [{ questionId: 1, selectedOptionId: 10 }];

    const result = scoreSessionAnswers(singleQuestion, answers);

    expect(result.score).toBe(1);
    expect(result.total).toBe(1);
  });
});

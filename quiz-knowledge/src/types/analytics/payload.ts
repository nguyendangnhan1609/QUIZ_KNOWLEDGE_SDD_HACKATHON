import type { QuizAnalyticsSummary } from './summary';
import type { QuizAnalyticsAttempt } from './attempts';

export type QuizQuestionAccuracy = {
  questionId: number;
  text: string;
  attemptCount: number;
  correctRate: number | null;
};

export type QuizAnalyticsPayload = {
  quiz: {
    quizId: number;
    resultsToken: string;
    createdAt: string;
    documentName: string;
    questionCount: number;
    bankSize: number;
  };
  summary: QuizAnalyticsSummary;
  attempts: QuizAnalyticsAttempt[];
  questionAccuracy: QuizQuestionAccuracy[];
};

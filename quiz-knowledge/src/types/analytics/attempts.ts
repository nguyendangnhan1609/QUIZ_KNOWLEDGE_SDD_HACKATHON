export type QuizAnalyticsAttempt = {
  attemptId: number;
  identifier: string;
  score: number;
  totalQuestions: number;
  percent: number;
  submittedAt: string;
};

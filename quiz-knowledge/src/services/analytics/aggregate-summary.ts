import type { QuizAnalyticsSummary } from '@/types/analytics';

export interface AttemptRecord {
  id: number;
  score: number;
  totalQuestions: number;
  submittedAt: Date;
}

export function aggregateSummary(attempts: AttemptRecord[]): QuizAnalyticsSummary {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: null,
      averagePercent: null,
      highest: null,
      lowest: null,
    };
  }

  const scores = attempts.map((a) => a.score);
  const percents = attempts.map((a) => (a.score / a.totalQuestions) * 100);

  const averageScore = scores.reduce((sum, s) => sum + s, 0) / attempts.length;
  const averagePercent = percents.reduce((sum, p) => sum + p, 0) / attempts.length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);

  return {
    totalAttempts: attempts.length,
    averageScore,
    averagePercent,
    highest,
    lowest,
  };
}

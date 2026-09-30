import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { aggregateSummary } from './aggregate-summary';
import { getQuestionAccuracy } from './question-accuracy-query';
import type { QuizAnalyticsPayload } from '@/types/analytics';

export async function getQuizAnalytics(resultsToken: string): Promise<QuizAnalyticsPayload> {
  const quiz = await prisma.quiz.findUnique({
    where: { resultsToken },
    include: {
      document: { select: { filename: true } },
    },
  });

  if (!quiz) {
    throw new AppError('RESULTS_NOT_FOUND', 404, 'Results not found.');
  }

  const attempts = await prisma.attempt.findMany({
    where: { quizId: quiz.id },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      identifier: true,
      score: true,
      totalQuestions: true,
      submittedAt: true,
    },
  });

  const bankSize = await prisma.question.count({
    where: { quizId: quiz.id },
  });

  const summary = aggregateSummary(attempts);

  const questionAccuracy = await getQuestionAccuracy(quiz.id);

  const analyticsAttempts = attempts.map((a) => ({
    attemptId: a.id,
    identifier: a.identifier,
    score: a.score,
    totalQuestions: a.totalQuestions,
    percent: (a.score / a.totalQuestions) * 100,
    submittedAt: a.submittedAt.toISOString(),
  }));

  return {
    quiz: {
      quizId: quiz.id,
      resultsToken: quiz.resultsToken,
      createdAt: quiz.createdAt.toISOString(),
      documentName: quiz.document.filename,
      questionCount: quiz.questionCount,
      bankSize,
    },
    summary,
    attempts: analyticsAttempts,
    questionAccuracy,
  };
}

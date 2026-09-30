import { prisma } from '@/lib/db';
import { createAttemptWithCollisionHandling } from './identifier-collision';
import type { GradedAnswer } from '@/services/scoring/score-session-answers';

export async function persistAttempt(
  quizId: number,
  sessionToken: string,
  identifier: string,
  score: number,
  totalQuestions: number,
  gradedAnswers: GradedAnswer[],
) {
  return await prisma.$transaction(async (tx: any) => {
    const attempt = await createAttemptWithCollisionHandling(
      tx,
      quizId,
      identifier,
      score,
      totalQuestions,
    );

    await tx.attemptAnswer.createMany({
      data: gradedAnswers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect: answer.isCorrect,
      })),
    });

    await tx.quizSession.update({
      where: { sessionToken },
      data: { completedAt: new Date() },
    });

    return attempt;
  });
}

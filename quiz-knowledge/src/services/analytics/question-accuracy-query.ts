import { prisma } from '@/lib/db';
import type { QuizQuestionAccuracy } from '@/types/analytics';

export async function getQuestionAccuracy(quizId: number): Promise<QuizQuestionAccuracy[]> {
  const results = await prisma.$queryRaw<
    Array<{
      questionId: number;
      text: string;
      attemptCount: bigint;
      correctRate: number | null;
      orderIndex: number;
    }>
  >`
    SELECT q.id as "questionId",
           q.text,
           COUNT(aa.id) as "attemptCount",
           AVG(CASE WHEN aa."isCorrect" THEN 1.0 ELSE 0.0 END)
             FILTER (WHERE aa.id IS NOT NULL)::float as "correctRate",
           q."orderIndex"
      FROM "questions" q
      LEFT JOIN "attempt_answers" aa ON aa."questionId" = q.id
     WHERE q."quizId" = ${quizId}
     GROUP BY q.id, q.text, q."orderIndex"
     ORDER BY q."orderIndex"
  `;

  return results.map((r) => ({
    questionId: r.questionId,
    text: r.text,
    attemptCount: Number(r.attemptCount),
    correctRate: r.correctRate,
  }));
}

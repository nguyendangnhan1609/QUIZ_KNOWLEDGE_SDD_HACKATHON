import { prisma } from '@/lib/db';
import { formatYmdHms } from '@/lib/utils/timestamp';
import { AppError } from '@/lib/errors';
import type { PrismaClient } from '@prisma/client';

export async function createAttemptWithCollisionHandling(
  tx: PrismaClient | typeof prisma,
  quizId: number,
  identifier: string,
  score: number,
  totalQuestions: number,
) {
  try {
    return await tx.attempt.create({
      data: {
        quizId,
        identifier,
        score,
        totalQuestions,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('identifier')) {
      const suffixedIdentifier = `${identifier}_${formatYmdHms(new Date())}`;

      try {
        return await tx.attempt.create({
          data: {
            quizId,
            identifier: suffixedIdentifier,
            score,
            totalQuestions,
          },
        });
      } catch (retryError: any) {
        if (retryError?.code === 'P2002') {
          throw new AppError(
            'ATTEMPT_PERSIST_FAILED',
            409,
            'Failed to save your attempt. Please try again.',
          );
        }
        throw retryError;
      }
    }

    throw error;
  }
}

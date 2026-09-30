import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createQuizSession } from '@/lib/services/quizSessions';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSessionSchema = z.object({
  questionCount: z.number().int().min(1).max(100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  try {
    const { publicToken } = await params;
    const body = createSessionSchema.parse(await req.json());

    const quiz = await prisma.quiz.findUnique({
      where: { publicToken },
    });

    if (!quiz) {
      throw new AppError('QUIZ_NOT_FOUND', 404, 'Quiz not found.');
    }

    const result = await createQuizSession(quiz.id, body.questionCount);

    return NextResponse.json(
      {
        data: {
          sessionToken: result.sessionToken,
          expiresAt: result.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } },
        { status: 400 },
      );
    }
    return toErrorResponse(err);
  }
}

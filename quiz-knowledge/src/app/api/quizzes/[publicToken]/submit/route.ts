import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getQuizSession } from '@/lib/services/quizSessions';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submitSchema = z.object({
  sessionToken: z.string(),
  answers: z.record(z.string(), z.number()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  try {
    const { publicToken } = await params;
    const body = submitSchema.parse(await req.json());

    const session = await getQuizSession(body.sessionToken);

    if (session.completedAt) {
      throw new AppError(
        'INVALID_INPUT',
        400,
        'This quiz session has already been submitted.',
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { publicToken, id: session.quizId },
      include: {
        questions: {
          include: {
            options: {
              select: { id: true, isCorrect: true, orderIndex: true },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new AppError('QUIZ_NOT_FOUND', 404, 'Quiz not found.');
    }

    const payload = session.payload as any;
    const selectedQuestionIds = payload.questionIds as number[];
    const answerOrders = payload.answerOrders as Record<string, number[]>;

    let score = 0;
    const breakdown: Record<number, boolean> = {};
    const completionTime = new Date().getTime() - session.createdAt.getTime();

    for (const qIdStr of Object.keys(body.answers)) {
      const qId = parseInt(qIdStr);
      if (!selectedQuestionIds.includes(qId)) {
        continue;
      }

      const question = quiz.questions.find((q: any) => q.id === qId);
      if (!question) continue;

      const selectedOptionIndex = body.answers[qIdStr];
      const answerOrder = answerOrders[qIdStr] || [];

      if (selectedOptionIndex < 0 || selectedOptionIndex >= answerOrder.length) {
        breakdown[qId] = false;
        continue;
      }

      const actualOptionIndex = answerOrder[selectedOptionIndex];
      const sortedOptions = question.options.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
      const selectedOption = sortedOptions[actualOptionIndex];

      if (selectedOption?.isCorrect) {
        score++;
        breakdown[qId] = true;
      } else {
        breakdown[qId] = false;
      }
    }

    const updatedSession = await prisma.quizSession.update({
      where: { id: session.id },
      data: { completedAt: new Date() },
    });

    await prisma.quizSubmission.create({
      data: {
        sessionId: session.id,
        answers: body.answers,
        score,
        totalQuestions: selectedQuestionIds.length,
      },
    });

    return NextResponse.json(
      {
        data: {
          score,
          total: selectedQuestionIds.length,
          breakdown,
          completionTimeMs: completionTime,
        },
      },
      { status: 200 },
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

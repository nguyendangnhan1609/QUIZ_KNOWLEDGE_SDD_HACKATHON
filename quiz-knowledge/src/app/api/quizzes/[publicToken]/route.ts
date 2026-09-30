import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getQuizSession } from '@/lib/services/quizSessions';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  try {
    const { publicToken } = await params;
    const sessionToken = req.nextUrl.searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Missing sessionToken.' } },
        { status: 400 },
      );
    }

    const session = await getQuizSession(sessionToken);

    const quiz = await prisma.quiz.findUnique({
      where: { publicToken, id: session.quizId },
      include: {
        questions: {
          include: {
            options: {
              select: { id: true, text: true, orderIndex: true },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new AppError('QUIZ_NOT_FOUND', 404, 'Quiz not found.');
    }

    const payload = session.payload as any;
    const answerOrders = payload.answerOrders as Record<string, number[]>;
    // clientViewOrder is the ordered list of selected question IDs for this session
    const clientViewOrder = (payload.clientViewOrder ?? payload.questionIds) as number[];

    // Index all DB questions by ID for O(1) lookup
    const questionMap = new Map(
      quiz.questions.map((q: any) => [q.id, q]),
    );

    // Return only the selected questions in session order — never the full bank
    const questions = clientViewOrder
      .map((qId: number) => {
        const q = questionMap.get(qId);
        if (!q) return null;

        const qIdStr = qId.toString();
        const answerOrder = answerOrders[qIdStr] ?? [];

        const sortedOptions = [...q.options].sort(
          (a: any, b: any) => a.orderIndex - b.orderIndex,
        );
        const shuffledOptions = answerOrder.map((idx: number) => ({
          text: sortedOptions[idx]?.text ?? '',
        }));

        return { id: q.id, text: q.text, options: shuffledOptions };
      })
      .filter((q: any): q is NonNullable<typeof q> => q !== null);

    return NextResponse.json(
      {
        data: {
          title: quiz.id,
          sessionToken: session.sessionToken,
          expiresAt: session.expiresAt,
          questions,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

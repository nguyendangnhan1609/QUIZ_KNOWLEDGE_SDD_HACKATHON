import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createQuiz } from '@/lib/services/quizzes';
import { createQuizRequestSchema } from '@/lib/schemas/quizzes';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = createQuizRequestSchema.parse(await req.json());
    const result = await createQuiz(body);

    // Use the Host header so links reflect the actual hostname/IP the client used,
    // not the internal container address (which would be localhost in Docker).
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
    const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '');
    const origin = `${proto}://${host}`;

    return NextResponse.json(
      {
        data: {
          quizId: result.quizId,
          questionCount: result.questionCount,
          bankSize: result.bankSize,
          quizUrl: `${origin}/q/${result.publicToken}`,
          resultsUrl: `${origin}/results/${result.resultsToken}`,
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

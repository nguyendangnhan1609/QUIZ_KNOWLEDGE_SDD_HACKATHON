import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitAttemptSchema } from '@/lib/schemas/attempt';
import { submitAttempt } from '@/services/attempt/submit-attempt';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = submitAttemptSchema.parse(await req.json());

    const result = await submitAttempt(
      body.sessionToken,
      body.identifier,
      body.answers,
    );

    return NextResponse.json(
      {
        data: {
          attemptId: result.attemptId,
          publicToken: result.publicToken,
          score: result.score,
          total: result.total,
          identifier: result.identifier,
        },
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
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

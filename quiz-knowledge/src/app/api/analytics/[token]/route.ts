import { NextRequest, NextResponse } from 'next/server';
import { getQuizAnalytics } from '@/services/analytics/get-quiz-analytics';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const payload = await getQuizAnalytics(token);

    return NextResponse.json(
      { data: payload },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

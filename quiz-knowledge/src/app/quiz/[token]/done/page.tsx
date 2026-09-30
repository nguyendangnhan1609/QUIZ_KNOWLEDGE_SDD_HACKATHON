import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Quiz Results - Quiz Knowledge',
  description: 'View your quiz results and score.',
};

export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ score?: string; total?: string; identifier?: string }>;
}) {
  const { token } = await params;
  const { score: scoreStr, total: totalStr, identifier } = await searchParams;

  const score = scoreStr ? parseInt(scoreStr) : 0;
  const total = totalStr ? parseInt(totalStr) : 1;
  const percentage = Math.round((score / total) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Quiz Complete!</h1>
          <p className="text-slate-600">Thank you for taking the quiz.</p>
        </div>

        <div className="space-y-4 rounded-lg bg-slate-50 p-6">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Your Score:</span>
            <span className="text-3xl font-bold text-blue-600">
              {score} / {total}
            </span>
          </div>

          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{percentage}%</p>
            <p className="text-sm text-slate-600">Correct</p>
          </div>
        </div>

        {identifier && (
          <div className="space-y-1 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Recorded as</p>
            <p className="text-sm font-mono text-slate-900">{identifier}</p>
          </div>
        )}

        <p className="text-center text-sm text-slate-600">
          Your attempt has been recorded.
        </p>

        <Link href={`/q/${token}`} className="block">
          <Button className="w-full" variant="outline">
            Take Another Quiz
          </Button>
        </Link>
      </div>
    </div>
  );
}

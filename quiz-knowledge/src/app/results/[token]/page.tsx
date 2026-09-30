import { notFound } from 'next/navigation';
import { getQuizAnalytics } from '@/services/analytics/get-quiz-analytics';
import { AppError } from '@/lib/errors';
import { ResultsDashboard } from './_components/ResultsDashboard';

export const metadata = {
  title: 'Quiz Analytics - Quiz Knowledge',
  description: 'View detailed analytics and insights from your quiz.',
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const payload = await getQuizAnalytics(token);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <ResultsDashboard payload={payload} />
        </div>
      </div>
    );
  } catch (err) {
    if (err instanceof AppError && err.code === 'RESULTS_NOT_FOUND') {
      notFound();
    }
    throw err;
  }
}

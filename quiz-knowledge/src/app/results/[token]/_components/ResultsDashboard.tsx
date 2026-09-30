import { StatsCards } from '@/components/results/StatsCards';
import { SubmissionsTable } from '@/components/results/SubmissionsTable';
import { QuestionAccuracyList } from '@/components/results/QuestionAccuracyList';
import { ResultsEmptyState } from '@/components/results/ResultsEmptyState';
import { ResultsRefreshButton } from '@/components/results/ResultsRefreshButton';
import type { QuizAnalyticsPayload } from '@/types/analytics';

interface ResultsDashboardProps {
  payload: QuizAnalyticsPayload;
}

export function ResultsDashboard({ payload }: ResultsDashboardProps) {
  const { quiz, summary, attempts, questionAccuracy } = payload;
  const hasAttempts = summary.totalAttempts > 0;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{quiz.documentName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Created {formatDate(quiz.createdAt)} • {quiz.questionCount} questions • {quiz.bankSize} in bank
          </p>
        </div>
        <ResultsRefreshButton />
      </div>

      {hasAttempts ? (
        <>
          <StatsCards summary={summary} />
          <SubmissionsTable attempts={attempts} />
          <QuestionAccuracyList questions={questionAccuracy} />
        </>
      ) : (
        <ResultsEmptyState />
      )}
    </div>
  );
}

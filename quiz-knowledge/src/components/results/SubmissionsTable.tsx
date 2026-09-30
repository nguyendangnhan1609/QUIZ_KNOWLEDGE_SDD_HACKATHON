import type { QuizAnalyticsAttempt } from '@/types/analytics';

interface SubmissionsTableProps {
  attempts: QuizAnalyticsAttempt[];
}

export function SubmissionsTable({ attempts }: SubmissionsTableProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Submissions</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                Identifier
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                Score
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                %
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                Submitted
              </th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt, idx) => (
              <tr
                key={attempt.attemptId}
                className={idx !== attempts.length - 1 ? 'border-b border-slate-100' : ''}
              >
                <td className="px-4 py-3 font-mono text-sm text-slate-900">
                  {attempt.identifier}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {attempt.score} / {attempt.totalQuestions}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {Math.round(attempt.percent)}%
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(attempt.submittedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { QuizAnalyticsSummary } from '@/types/analytics';

interface StatsCardsProps {
  summary: QuizAnalyticsSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const formatScore = (score: number | null) => {
    if (score === null) return '—';
    return Math.round(score);
  };

  const formatPercent = (percent: number | null) => {
    if (percent === null) return '—';
    return Math.round(percent) + '%';
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Total Attempts</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalAttempts}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Avg Score</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{formatScore(summary.averageScore)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Avg %</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{formatPercent(summary.averagePercent)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Highest</p>
        <p className="mt-2 text-2xl font-bold text-green-600">{formatScore(summary.highest)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-500">Lowest</p>
        <p className="mt-2 text-2xl font-bold text-amber-600">{formatScore(summary.lowest)}</p>
      </div>
    </div>
  );
}

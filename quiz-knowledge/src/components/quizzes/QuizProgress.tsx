'use client';

import { memo } from 'react';

interface QuizProgressProps {
  current: number;
  total: number;
}

export const QuizProgress = memo(function QuizProgress({ current, total }: QuizProgressProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">
          Question {current + 1} of {total}
        </span>
        <span className="text-slate-500">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

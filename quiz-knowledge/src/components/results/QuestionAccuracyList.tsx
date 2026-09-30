import type { QuizQuestionAccuracy } from '@/types/analytics';

interface QuestionAccuracyListProps {
  questions: QuizQuestionAccuracy[];
}

export function QuestionAccuracyList({ questions }: QuestionAccuracyListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Question Accuracy</h2>
      <div className="space-y-3">
        {questions.map((question, idx) => {
          const hasAttempts = question.attemptCount > 0;
          const percent = hasAttempts && question.correctRate !== null
            ? Math.round(question.correctRate * 100)
            : null;

          return (
            <div key={question.questionId} className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">
                    {question.text}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {hasAttempts
                      ? `${question.attemptCount} attempt${question.attemptCount !== 1 ? 's' : ''}`
                      : 'No attempts yet'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {percent !== null ? `${percent}%` : '—'}
                  </p>
                </div>
              </div>

              {hasAttempts && percent !== null && (
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percent >= 75
                        ? 'bg-green-500'
                        : percent >= 50
                          ? 'bg-blue-500'
                          : percent >= 25
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}

              {!hasAttempts && (
                <div className="h-2 rounded-full bg-slate-100" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

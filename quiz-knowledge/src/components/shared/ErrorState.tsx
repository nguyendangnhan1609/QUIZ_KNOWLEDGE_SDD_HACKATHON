'use client';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  showReset?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onReset,
  showReset = true,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="space-y-4">
          <div className="text-4xl">⚠️</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          {showReset && (
            <Button onClick={onReset} className="w-full">
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

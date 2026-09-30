'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function QuizDoneError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Results Loading Error"
      description="We couldn't load your results. Please try again or check the link."
      onReset={reset}
      showReset={true}
    />
  );
}

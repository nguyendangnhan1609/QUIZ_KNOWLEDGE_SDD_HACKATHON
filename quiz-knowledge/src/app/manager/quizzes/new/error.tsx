'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function QuizGenerationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Generation Error"
      description="We couldn't load the quiz generation page. Please refresh and try again."
      onReset={reset}
      showReset={true}
    />
  );
}

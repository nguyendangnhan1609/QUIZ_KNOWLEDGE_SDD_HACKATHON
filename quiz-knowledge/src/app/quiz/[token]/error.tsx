'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function QuizError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Quiz Loading Error"
      description="We couldn't load the quiz. The link may be invalid or expired. Please check the link and try again."
      onReset={reset}
      showReset={true}
    />
  );
}

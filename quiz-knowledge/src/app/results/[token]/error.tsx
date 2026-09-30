'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Analytics Loading Error"
      description="We couldn't load the analytics dashboard. The link may be invalid or expired."
      onReset={reset}
      showReset={true}
    />
  );
}

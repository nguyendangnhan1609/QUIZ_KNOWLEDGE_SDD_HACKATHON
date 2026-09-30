'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Application Error"
      description="Something went wrong. Please refresh the page or try again later."
      onReset={reset}
      showReset={true}
    />
  );
}

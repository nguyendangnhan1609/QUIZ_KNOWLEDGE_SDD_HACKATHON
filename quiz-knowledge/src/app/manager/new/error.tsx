'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function ManagerNewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Upload Error"
      description="We couldn't load the upload page. Please refresh and try again."
      onReset={reset}
      showReset={true}
    />
  );
}

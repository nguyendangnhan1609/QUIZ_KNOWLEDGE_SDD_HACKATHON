'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function GenerationProgress() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const phase =
    seconds >= 55 ? 'critical' : seconds >= 30 ? 'warning' : seconds >= 10 ? 'generating' : 'reading';

  const message = {
    reading: 'Reading the document…',
    generating: 'Generating questions…',
    warning: 'This is taking longer than usual. Hang on.',
    critical: 'Almost at the timeout. If this fails, please retry.',
  }[phase];

  const tone = {
    reading: 'text-muted-foreground',
    generating: 'text-muted-foreground',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  }[phase];

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className={tone}>{message}</span>
      <span className="tabular-nums text-muted-foreground">{seconds}s</span>
    </div>
  );
}

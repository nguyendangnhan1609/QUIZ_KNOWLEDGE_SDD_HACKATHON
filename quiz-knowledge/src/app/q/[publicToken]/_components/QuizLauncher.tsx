'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuizEngine } from '@/components/quizzes/QuizEngine';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/schemas/api-errors';

interface QuizLauncherProps {
  publicToken: string;
}

interface QuizQuestion {
  id: number;
  text: string;
  options: { text: string }[];
}

interface SessionData {
  sessionToken: string;
  expiresAt: string;
  title: string;
  questions: QuizQuestion[];
}

export function QuizLauncher({ publicToken }: QuizLauncherProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    try {
      const sessionRes = await fetch(
        `/api/quizzes/${publicToken}/session`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ questionCount: 10 }),
        },
      );

      if (!sessionRes.ok) {
        const json = await sessionRes.json();
        const code = json.error?.code || 'INTERNAL';
        toast.error(getErrorMessage(code));
        return;
      }

      const sessionJson = await sessionRes.json();
      const sessionToken = sessionJson.data.sessionToken;

      const quizRes = await fetch(
        `/api/quizzes/${publicToken}?sessionToken=${sessionToken}`,
      );

      if (!quizRes.ok) {
        const json = await quizRes.json();
        const code = json.error?.code || 'INTERNAL';
        toast.error(getErrorMessage(code));
        return;
      }

      const quizJson = await quizRes.json();
      setSessionData(quizJson.data);
    } catch (err) {
      toast.error('Network error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionData) {
    return (
      <QuizEngine
        sessionData={sessionData}
        publicToken={publicToken}
      />
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ready to start?</h1>
        <p className="text-slate-600">
          You'll be asked 10 questions drawn randomly from a larger bank. You can navigate between questions freely.
        </p>
      </div>

      <Button
        onClick={handleStartQuiz}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Loading...' : 'Start Quiz'}
      </Button>
    </div>
  );
}

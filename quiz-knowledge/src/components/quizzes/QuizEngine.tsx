'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuizProgress } from './QuizProgress';
import { QuestionCard } from './QuestionCard';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/schemas/api-errors';

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

interface QuizEngineProps {
  sessionData: SessionData;
  publicToken: string;
}

export function QuizEngine({ sessionData, publicToken }: QuizEngineProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useLocalStorage<Record<number, number>>(
    `quiz_answers_${sessionData.sessionToken}`,
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIdentifierPrompt, setShowIdentifierPrompt] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');

  const currentQuestion = sessionData.questions[currentQuestionIndex];
  const questionsAnswered = Object.keys(selectedAnswers).length;
  const allAnswered = questionsAnswered === sessionData.questions.length;

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < sessionData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError('');

    if (!identifier.trim()) {
      setIdentifierError('Please enter your name or identifier.');
      return;
    }

    if (identifier.length > 64) {
      setIdentifierError('Identifier must be 64 characters or less.');
      return;
    }

    const trimmed = identifier.trim();
    await handleSubmitWithIdentifier(trimmed);
  };

  const handleSubmitWithIdentifier = async (finalIdentifier: string) => {
    setIsSubmitting(true);
    try {
      const answers = sessionData.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: selectedAnswers[q.id] ?? null,
      }));

      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionData.sessionToken,
          identifier: finalIdentifier,
          answers,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        const code = json.error?.code || 'INTERNAL';
        toast.error(getErrorMessage(code));
        setShowIdentifierPrompt(false);
        return;
      }

      const json = await response.json();
      localStorage.removeItem(`quiz_answers_${sessionData.sessionToken}`);

      const params = new URLSearchParams({
        score: json.data.score.toString(),
        total: json.data.total.toString(),
        identifier: json.data.identifier,
      });

      window.location.href = `/quiz/${publicToken}/done?${params.toString()}`;
    } catch (err) {
      toast.error('Failed to submit quiz. Please try again.');
      console.error(err);
      setShowIdentifierPrompt(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowPrompt = () => {
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting.');
      return;
    }
    setShowIdentifierPrompt(true);
  };

  if (showIdentifierPrompt) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Before we finish</h2>
          <p className="text-sm text-slate-600">
            Please provide your name or an identifier so we can record your attempt.
          </p>
        </div>

        <form onSubmit={handlePromptSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Your name</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setIdentifierError('');
              }}
              placeholder="e.g. John Doe"
              disabled={isSubmitting}
              autoFocus
            />
            {identifierError && <p className="text-xs text-red-600">{identifierError}</p>}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIdentifierPrompt(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-8 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <QuizProgress current={currentQuestionIndex} total={sessionData.questions.length} />

      <QuestionCard
        questionText={currentQuestion.text}
        options={currentQuestion.options}
        selectedIndex={selectedAnswers[currentQuestion.id] ?? null}
        onSelect={handleSelectAnswer}
      />

      <div className="flex gap-3">
        <Button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          Previous
        </Button>

        {currentQuestionIndex < sessionData.questions.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="outline"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleShowPrompt}
            disabled={!allAnswered || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        )}

        <div className="ml-auto text-sm text-slate-500">
          {questionsAnswered} / {sessionData.questions.length} answered
        </div>
      </div>
    </div>
  );
}

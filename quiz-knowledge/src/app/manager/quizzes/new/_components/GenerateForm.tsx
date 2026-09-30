'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GenerationProgress } from '@/components/quizzes/GenerationProgress';
import { PublicLinkPanel } from '@/components/quizzes/PublicLinkPanel';
import { getErrorMessage } from '@/lib/schemas/api-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Language = 'vi' | 'en' | 'ja';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'vi', label: 'Vietnamese' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
];

interface GenerateFormProps {
  documentIds: number[];
}

interface GenerationResult {
  quizId: number;
  questionCount: number;
  bankSize: number;
  quizUrl: string;
  resultsUrl: string;
}

export function GenerateForm({ documentIds }: GenerateFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [language, setLanguage] = useState<Language>('vi');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    if (questionCount < 5 || questionCount > 30) {
      setError('Question count must be between 5 and 30.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documentIds,
          questionCount,
          language,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        const code = json.error?.code || 'INTERNAL';
        const message = getErrorMessage(code);
        toast.error(message);
        return;
      }

      setResult(json.data);
      toast.success('Quiz generated successfully!');
    } catch (e) {
      toast.error('Network error. Please try again.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <PublicLinkPanel
          quizUrl={result.quizUrl}
          resultsUrl={result.resultsUrl}
          questionCount={result.questionCount}
          bankSize={result.bankSize}
        />
        <Button
          variant="outline"
          onClick={() => setResult(null)}
        >
          Generate another quiz
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg border p-6">
      <div className="space-y-2">
        <Label>Question language</Label>
        <RadioGroup
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
          disabled={isGenerating}
          className="grid-flow-col auto-cols-max gap-6"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`language-${option.value}`} />
              <Label htmlFor={`language-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Questions, options, and explanations will be generated in this language.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="questionCount">Questions per attempt</Label>
        <Input
          id="questionCount"
          type="number"
          value={questionCount}
          onChange={(e) => {
            setQuestionCount(parseInt(e.target.value, 10));
            setError(null);
          }}
          disabled={isGenerating}
          min={5}
          max={30}
          step={1}
        />
        <p className="text-xs text-muted-foreground">
          Each participant answers this many questions, drawn randomly from a larger bank.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {isGenerating ? (
        <div className="py-4">
          <GenerationProgress />
        </div>
      ) : (
        <Button type="submit" className="w-full" disabled={isGenerating}>
          Generate quiz
        </Button>
      )}
    </form>
  );
}

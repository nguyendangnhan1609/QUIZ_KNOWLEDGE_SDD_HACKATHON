'use client';

import { memo } from 'react';

interface QuestionCardProps {
  questionText: string;
  options: { text: string }[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export const QuestionCard = memo(function QuestionCard({
  questionText,
  options,
  selectedIndex,
  onSelect,
}: QuestionCardProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">{questionText}</h2>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${
              selectedIndex === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  selectedIndex === index
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300'
                }`}
              >
                {selectedIndex === index && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <span className="text-slate-900">{option.text}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

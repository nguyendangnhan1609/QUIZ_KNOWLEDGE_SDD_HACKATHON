import type { SubmittedAnswer } from '@/types/attempt';

export interface SessionQuestion {
  questionId: number;
  correctOptionId: number;
  options: Array<{ optionId: number }>;
}

export interface GradedAnswer {
  questionId: number;
  selectedOptionId: number | null;
  isCorrect: boolean;
}

export interface ScoreResult {
  score: number;
  total: number;
  gradedAnswers: GradedAnswer[];
}

export function scoreSessionAnswers(
  sessionQuestions: SessionQuestion[],
  answers: SubmittedAnswer[],
): ScoreResult {
  let score = 0;
  const gradedAnswers: GradedAnswer[] = [];

  for (const question of sessionQuestions) {
    const answer = answers.find((a) => a.questionId === question.questionId);

    if (!answer) {
      gradedAnswers.push({
        questionId: question.questionId,
        selectedOptionId: null,
        isCorrect: false,
      });
      continue;
    }

    if (answer.selectedOptionId === null) {
      gradedAnswers.push({
        questionId: question.questionId,
        selectedOptionId: null,
        isCorrect: false,
      });
      continue;
    }

    const isCorrect = answer.selectedOptionId === question.correctOptionId;

    if (isCorrect) {
      score++;
    }

    gradedAnswers.push({
      questionId: question.questionId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect,
    });
  }

  return {
    score,
    total: sessionQuestions.length,
    gradedAnswers,
  };
}

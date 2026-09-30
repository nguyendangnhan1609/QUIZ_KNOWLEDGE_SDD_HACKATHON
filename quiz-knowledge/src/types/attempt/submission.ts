export type SubmittedAnswer = {
  questionId: number;
  selectedOptionId: number | null;
};

export type SubmitAttemptInput = {
  sessionToken: string;
  identifier: string;
  answers: SubmittedAnswer[];
};

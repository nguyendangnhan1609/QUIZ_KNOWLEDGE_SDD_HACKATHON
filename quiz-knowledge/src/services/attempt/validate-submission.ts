import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { SubmittedAnswer } from '@/types/attempt';

export interface ValidatedSubmission {
  quizId: number;
  publicToken: string;
  questionCount: number;
  sessionToken: string;
  sessionQuestions: Array<{
    questionId: number;
    correctOptionId: number;
    options: Array<{ optionId: number }>;
  }>;
  normalizedAnswers: Array<{
    questionId: number;
    selectedOptionId: number | null;
  }>;
}

export async function validateSubmission(
  sessionToken: string,
  rawAnswers: SubmittedAnswer[],
): Promise<ValidatedSubmission> {
  const session = await prisma.quizSession.findUnique({
    where: { sessionToken },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              options: { select: { id: true, isCorrect: true, orderIndex: true } },
            },
          },
        },
      },
    },
  });

  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', 404, 'Quiz session not found.');
  }

  if (new Date() > session.expiresAt) {
    throw new AppError('SESSION_EXPIRED', 410, 'Your quiz session has expired. Please start a new quiz.');
  }

  if (session.completedAt) {
    throw new AppError(
      'INVALID_INPUT',
      400,
      'This quiz session has already been submitted.',
    );
  }

  const quiz = session.quiz;
  const payload = session.payload as any;
  const selectedQuestionIds = payload.questionIds as number[];
  const answerOrders = payload.answerOrders as Record<string, number[]>;

  const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

  // Translate each submitted shuffled index → actual DB option ID.
  // The session stores answerOrders[questionId] = permutation of original orderIndexes
  // presented to the user, so position i in the shuffled list maps to originalOptionIndex = answerOrders[qId][i].
  const answers = rawAnswers.map((answer) => {
    if (answer.selectedOptionId === null) return answer;

    const question = questionMap.get(answer.questionId);
    if (!question) return answer;

    const order = answerOrders[answer.questionId.toString()];
    if (!order) return answer;

    const shuffledIndex = answer.selectedOptionId;
    if (shuffledIndex < 0 || shuffledIndex >= order.length) {
      return { ...answer, selectedOptionId: null };
    }

    const originalIndex = order[shuffledIndex];
    const sortedOptions = [...question.options].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    const actualOption = sortedOptions[originalIndex];

    return { ...answer, selectedOptionId: actualOption?.id ?? null };
  });

  if (rawAnswers.length !== selectedQuestionIds.length) {
    throw new AppError(
      'ANSWER_COUNT_MISMATCH',
      400,
      'Answer count does not match quiz length.',
    );
  }

  const submittedQuestionIds = new Set(answers.map((a) => a.questionId));
  if (submittedQuestionIds.size !== answers.length) {
    throw new AppError(
      'INVALID_INPUT',
      400,
      'Duplicate question IDs in submission.',
    );
  }

  const questionIdSet = new Set(selectedQuestionIds);
  for (const answer of answers) {
    if (!questionIdSet.has(answer.questionId)) {
      throw new AppError(
        'INVALID_INPUT',
        400,
        `Question ${answer.questionId} was not in this quiz session.`,
      );
    }
  }

  const sessionQuestions: ValidatedSubmission['sessionQuestions'] = [];

  for (const qId of selectedQuestionIds) {
    const question = questionMap.get(qId);
    if (!question) continue;

    const correctOption = question.options.find((opt) => opt.isCorrect);
    if (!correctOption) {
      throw new AppError(
        'INVALID_INPUT',
        500,
        `Question ${qId} has no correct answer marked.`,
      );
    }

    const sessionQuestion = {
      questionId: qId,
      correctOptionId: correctOption.id,
      options: question.options.map((opt) => ({ optionId: opt.id })),
    };

    sessionQuestions.push(sessionQuestion);

    const answer = answers.find((a) => a.questionId === qId);
    if (answer?.selectedOptionId) {
      const optionExists = question.options.some((opt) => opt.id === answer.selectedOptionId);
      if (!optionExists) {
        throw new AppError(
          'INVALID_INPUT',
          400,
          `Option ${answer.selectedOptionId} does not belong to question ${qId}.`,
        );
      }
    }
  }

  const normalizedAnswers: ValidatedSubmission['normalizedAnswers'] = answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: a.selectedOptionId,
  }));

  return {
    quizId: quiz.id,
    publicToken: quiz.publicToken,
    questionCount: selectedQuestionIds.length,
    sessionToken: session.sessionToken,
    sessionQuestions,
    normalizedAnswers,
  };
}

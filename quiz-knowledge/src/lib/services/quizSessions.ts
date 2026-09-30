import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import {
  selectQuestions,
  shuffleAnswerOrder,
  generateSessionPayload,
  type SessionPayloadAnswerOrders,
} from '@/lib/ai/randomization';
import crypto from 'crypto';

export interface CreateSessionResult {
  sessionToken: string;
  expiresAt: Date;
}

export async function createQuizSession(
  quizId: number,
  questionCount: number,
): Promise<CreateSessionResult> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: { select: { id: true, orderIndex: true } } },
      },
    },
  });

  if (!quiz) {
    throw new AppError('QUIZ_NOT_FOUND', 404, 'Quiz not found.');
  }

  if (quiz.questions.length === 0) {
    throw new AppError(
      'QUIZ_EMPTY',
      422,
      'Quiz has no questions.',
    );
  }

  if (questionCount > quiz.questions.length) {
    throw new AppError(
      'INVALID_INPUT',
      400,
      `Cannot select ${questionCount} questions from a bank of ${quiz.questions.length}.`,
    );
  }

  const sessionToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const allQuestionIds = quiz.questions.map((q) => q.id);
  const seed = crypto
    .createHash('sha256')
    .update(`${sessionToken}:${Date.now()}`)
    .digest('hex');

  const selectedQuestionIds = selectQuestions(allQuestionIds, questionCount, seed);

  const answerOrdersByQuestion: SessionPayloadAnswerOrders = {};
  for (const qId of selectedQuestionIds) {
    const question = quiz.questions.find((q: any) => q.id === qId);
    if (!question) continue;

    const optionIndices = question.options
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((_: any, i: number) => i);

    const qSeed = `${seed}:${qId}`;
    answerOrdersByQuestion[qId.toString()] = shuffleAnswerOrder(optionIndices, qSeed);
  }

  const payload = generateSessionPayload(selectedQuestionIds, answerOrdersByQuestion, seed);

  const session = await prisma.quizSession.create({
    data: {
      quizId,
      sessionToken,
      payload,
      expiresAt,
    },
  });

  return {
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  };
}

export async function getQuizSession(sessionToken: string) {
  const session = await prisma.quizSession.findUnique({
    where: { sessionToken },
  });

  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', 404, 'Session not found.');
  }

  if (new Date() > session.expiresAt) {
    throw new AppError('SESSION_EXPIRED', 410, 'Session has expired.');
  }

  return session;
}

import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@/lib/db/prisma';
import { generateQuestions } from '@/lib/ai/generateQuestions';
import type { Language } from '@/lib/ai/prompts';
import { AppError } from '@/lib/errors';

export interface CreateQuizInput {
  documentIds: number[];
  questionCount: number;
  language: Language;
}

export interface CreateQuizResult {
  quizId: number;
  publicToken: string;
  resultsToken: string;
  questionCount: number;
  bankSize: number;
}

export async function createQuiz(input: CreateQuizInput): Promise<CreateQuizResult> {
  const docs = await prisma.document.findMany({
    where: { id: { in: input.documentIds } },
    select: { id: true, textContent: true },
    orderBy: { id: 'asc' },
  });

  if (docs.length === 0) {
    throw new AppError('DOCUMENT_NOT_FOUND', 404, 'No documents found.');
  }

  // Concatenate all document text with a clear separator so the chunker treats it as one corpus
  const combinedText = docs.map(d => d.textContent).join('\n\n---\n\n');

  const { bank, bankSize } = await generateQuestions({
    text: combinedText,
    questionCount: input.questionCount,
    language: input.language,
  });

  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        documentId: docs[0].id,                  // primary FK — first doc by ascending ID
        sourceDocumentIds: docs.map(d => d.id),  // full source list
        publicToken: createId(),
        resultsToken: createId(),
        questionCount: input.questionCount,
        language: input.language,
      },
    });

    for (let qi = 0; qi < bank.length; qi++) {
      const q = bank[qi];
      await tx.question.create({
        data: {
          quizId: created.id,
          text: q.question,
          explanation: q.explanation,
          difficulty: q.difficulty,
          orderIndex: qi,
          options: {
            create: q.options.map((text, oi) => ({
              text,
              isCorrect: oi === q.correctIndex,
              orderIndex: oi,
            })),
          },
        },
      });
    }

    return created;
  });

  return {
    quizId: quiz.id,
    publicToken: quiz.publicToken,
    resultsToken: quiz.resultsToken,
    questionCount: quiz.questionCount,
    bankSize,
  };
}

import { validateSubmission } from './validate-submission';
import { scoreSessionAnswers } from '@/services/scoring/score-session-answers';
import { persistAttempt } from './persist-attempt';
import type { SubmittedAnswer } from '@/types/attempt';
import type { SubmitAttemptResult } from '@/types/attempt';

export async function submitAttempt(
  sessionToken: string,
  identifier: string,
  answers: SubmittedAnswer[],
): Promise<SubmitAttemptResult> {
  const validated = await validateSubmission(sessionToken, answers);

  const scoreResult = scoreSessionAnswers(validated.sessionQuestions, validated.normalizedAnswers);

  const attempt = await persistAttempt(
    validated.quizId,
    sessionToken,
    identifier,
    scoreResult.score,
    scoreResult.total,
    scoreResult.gradedAnswers,
  );

  return {
    attemptId: attempt.id,
    publicToken: validated.publicToken,
    score: scoreResult.score,
    total: scoreResult.total,
    identifier: attempt.identifier,
  };
}

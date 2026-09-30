import { z } from 'zod';

export const submittedAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().min(0).nullable(),
});

export const submitAttemptSchema = z.object({
  sessionToken: z.string().min(10),
  identifier: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\p{L}0-9 ._-]+$/u),
  answers: z.array(submittedAnswerSchema),
});

export type SubmitAttemptSchemaType = z.infer<typeof submitAttemptSchema>;

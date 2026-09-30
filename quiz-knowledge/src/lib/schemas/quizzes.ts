import { z } from 'zod';

export const createQuizRequestSchema = z.object({
  documentIds: z.array(z.number().int().positive()).min(1).max(10),
  questionCount: z.number().int().min(5).max(30),
  language: z.enum(['vi', 'en', 'ja']).default('vi'),
});

export type CreateQuizRequest = z.infer<typeof createQuizRequestSchema>;

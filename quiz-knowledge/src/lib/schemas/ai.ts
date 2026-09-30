import { z } from 'zod';

export const aiQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5).max(800),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const aiResponseSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1),
});

export type AIQuestion = z.infer<typeof aiQuestionSchema>;
export type AIResponse = z.infer<typeof aiResponseSchema>;

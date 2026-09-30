import { z } from 'zod';

export const ACCEPTED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
  'text/csv',
  'text/html',
] as const;

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export const uploadFormSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'File is empty')
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      `File must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    )
    .refine(
      (file) =>
        ACCEPTED_MIMES.includes(
          file.type as (typeof ACCEPTED_MIMES)[number],
        ) ||
        file.name.toLowerCase().endsWith('.md'),
      'Only PDF, DOCX, Markdown, TXT, CSV, or HTML files are accepted',
    ),
});

export type UploadFormInput = z.infer<typeof uploadFormSchema>;

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const optionalEnvString = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    ANTHROPIC_API_KEY: z.string().min(10),
    SUPABASE_URL: optionalEnvString(z.string().url()),
    SUPABASE_SERVICE_ROLE_KEY: optionalEnvString(z.string().min(10)),
    SUPABASE_STORAGE_BUCKET: z.string().default('docs'),
    LOCAL_STORAGE_DIR: z.string().default('.uploads'),
    QUESTION_BANK_MULTIPLIER: z.coerce.number().int().min(1).max(3).default(2),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    LOCAL_STORAGE_DIR: process.env.LOCAL_STORAGE_DIR,
    QUESTION_BANK_MULTIPLIER: process.env.QUESTION_BANK_MULTIPLIER,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

const globalForSupabase = globalThis as unknown as {
  supabaseServerClient?: ReturnType<typeof createClient>;
};

export function getSupabaseServerClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Storage is not configured.');
  }

  if (!globalForSupabase.supabaseServerClient) {
    globalForSupabase.supabaseServerClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return globalForSupabase.supabaseServerClient;
}

export function isSupabaseStorageConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getDocsBucket() {
  return getSupabaseServerClient().storage.from(env.SUPABASE_STORAGE_BUCKET);
}

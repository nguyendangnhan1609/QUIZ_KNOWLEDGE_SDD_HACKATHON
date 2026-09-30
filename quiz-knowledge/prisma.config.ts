import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Use DATABASE_URL (pgBouncer pooled connection port 6432)
    // Works with Session Pooler for IPv6-only Supabase instances
    url: process.env['DATABASE_URL'],
  },
});

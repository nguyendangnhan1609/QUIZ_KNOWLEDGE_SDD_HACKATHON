# Database Conventions

**Version:** 1.0  
**Last Updated:** 2026-05-10  
**Scope:** Phase 1+ (data access patterns and migrations)

---

## Connection & Client Usage

### Singleton Pattern

Always import the Prisma client from the canonical location:

```typescript
import { prisma } from '@/lib/db/prisma';
```

Never instantiate `new PrismaClient()` directly in route handlers or services. The singleton pattern (cached on `globalThis`) prevents connection pool exhaustion during hot-reloads and serverless invocations.

### Server-Side Only

Database access is exclusively server-side:
- Route Handlers (`src/app/api/*/route.ts`)
- React Server Components (`src/app/**/page.tsx`)
- Service layer (`src/lib/services/*`)

**Never** import `prisma` or database-related modules into Client Components. If a Client Component needs database state, fetch it via a Route Handler and pass as props.

### Timeouts & Performance

- Default Prisma query timeout: 10 seconds
- For long-running queries (e.g., analytics aggregation), consider:
  - Chunking large datasets
  - Running queries in a background task
  - Using `$queryRaw` with explicit pagination

---

## Query Patterns

### Named Query Helpers (Repositories)

For frequently-used query patterns, create named helpers in `src/lib/db/repositories/`:

```typescript
// src/lib/db/repositories/quizzes.ts
import { prisma } from '../prisma';

export const quizzes = {
  findWithQuestions: async (quizId: number) =>
    prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    }),

  findByPublicToken: async (token: string) =>
    prisma.quiz.findUniqueOrThrow({
      where: { publicToken: token },
    }),
};
```

Import as: `import { quizzes } from '@/lib/db/repositories/quizzes'`

### Type Safety

Use generated Prisma types for function return types and data structures:

```typescript
import { Prisma } from '@prisma/client';

type QuizWithQuestions = Prisma.QuizGetPayload<{
  include: { questions: { include: { options: true } } };
}>;

async function getQuizView(id: number): Promise<QuizWithQuestions> {
  return prisma.quiz.findUniqueOrThrow({
    where: { id },
    include: { questions: { include: { options: true } } },
  });
}
```

Never use `any` for database return types.

### Transactions for Multi-Row Operations

For operations that modify multiple related rows (e.g., creating a quiz with questions and options), wrap in a transaction:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const quiz = await tx.quiz.create({
    data: { documentId, publicToken, resultsToken, questionCount },
  });

  const questions = await tx.question.createMany({
    data: questionPayloads.map((q) => ({ ...q, quizId: quiz.id })),
  });

  return { quiz, questionCount: questions.count };
});
```

This ensures atomicity: all rows are created or none are created on failure.

---

## Schema Changes & Migrations

### Local Development Workflow

1. **Edit schema:** Modify `prisma/schema.prisma`
2. **Create migration:** `pnpm prisma migrate dev --name <description>`
   - Generates migration file in `prisma/migrations/<timestamp>_<description>/`
   - Applies migration to local database immediately
   - Regenerates Prisma client
3. **Commit:** `git add prisma/schema.prisma prisma/migrations/` and commit
4. **Push:** `git push`

### Never Edit Applied Migrations

Once a migration is applied (committed), it is immutable:

```bash
# ❌ WRONG: Don't edit migration files after they're applied
vim prisma/migrations/20260509123456_init/migration.sql

# ✅ RIGHT: Create a new migration
pnpm prisma migrate dev --name fix_column_type
```

If a mistake is found in an applied migration:

```bash
# 1. Rollback the migration (dev only)
pnpm prisma migrate resolve --rolled-back 20260509123456_init

# 2. Fix the schema
# (edit schema.prisma)

# 3. Create a new migration
pnpm prisma migrate dev --name init_corrected
```

### Production Migrations

Migrations are applied via CLI in a one-off shell or deployment step, **never** during the build process:

```bash
# In Vercel deployment or one-off shell
pnpm prisma migrate deploy
```

This ensures deployments remain atomic and don't time out due to long-running migrations.

---

## Indexes & Query Performance

### Current Indexes (from technical-design §5.4)

| Table | Index | Reason |
|---|---|---|
| `quizzes` | `(documentId)` | Find all quizzes for a document |
| `quizzes` | `(createdAt)` | Future cleanup job |
| `questions` | `(quizId)` | Find all questions for a quiz |
| `options` | `(questionId)` | Find all options for a question (always joined) |
| `attempts` | `(quizId)` | Find all attempts for a quiz (for grading) |
| `attempts` | `(submittedAt)` | Recent attempts first (analytics) |
| `attempts` | `UNIQUE(quizId, identifier)` | Enforce identifier uniqueness per quiz |
| `attempt_answers` | `(attemptId)` | Join answers on grading |
| `attempt_answers` | `(questionId)` | Per-question accuracy aggregation |

### Adding New Indexes

When adding a query pattern that scans many rows, consider adding an index:

```prisma
model MyModel {
  id        Int
  userId    Int
  createdAt DateTime
  status    String

  @@index([userId, createdAt])  // Fast for: find recent items for a user
  @@index([status])             // Fast for: count by status
}
```

After adding an index:

```bash
pnpm prisma migrate dev --name add_indexes
```

---

## Seeding & Test Data

### Local Development Seeding

The seed script (`prisma/seed.ts`) is idempotent and clears prior test data:

```bash
pnpm prisma db seed
```

Seed once after `pnpm install` or after any schema changes. The script:
- Clears all tables in cascade order (respecting foreign keys)
- Inserts one sample Document for smoke testing
- Can be extended with realistic test data as phases progress

### Production Seeding

**No auto-seed in production.** Demo data is loaded manually via the UI:
1. Manager uploads a real document
2. Manager generates a real quiz
3. Manager shares links with participants

This ensures seed data is representative of actual usage.

---

## Reserved Names & Conventions

### Table Naming

- All table names are **plural** and **lowercase**: `documents`, `quizzes`, `questions`, `options`, `attempts`, `attempt_answers`
- In Prisma schema, model names are singular: `model Document` → table `documents` (via `@@map`)

### Column Naming

Avoid SQL reserved keywords:

| ❌ Avoid | ✅ Use |
|---|---|
| `order` | `displayOrder` or `orderIndex` |
| `status` | `quizStatus` or `attemptStatus` |
| `type` | `documentType` or `quizType` |
| `index` | `displayIndex` or `orderIndex` |

### ID Strategy

- **Internal IDs:** `Int @id @default(autoincrement())` — never exposed in URLs or API payloads
- **Public tokens:** `String @unique` (cuid2 generated) — the only identifier in public URLs

Example:
- Internal: `/api/quizzes/42` (private, never exposed)
- Public: `/q/abc123def456` (publicToken from database, safe to share)

---

## Common Pitfalls & Solutions

| Pitfall | Cause | Solution |
|---|---|---|
| `TypeError: prisma is not a function` | Importing from wrong path | Use `import { prisma } from '@/lib/db/prisma'` |
| Connection pool exhausted (hundreds of connections in dev) | No singleton caching | Restart `pnpm dev` or check for hot-reload leaks |
| Migration fails with "Cannot add foreign key" | Circular dependencies or missing tables | Run migrations in dependency order; check schema `onDelete` behavior |
| Query is slow | Missing index | Analyze query pattern, add index with `@@index`, re-run `migrate dev` |
| `Error: P1014: The underlying engine for PostgreSQL couldn't start` | Schema syntax error | Run `pnpm prisma format` to validate; check migration SQL for typos |
| Seed data persists across environments | Auto-seed in production | Confirm `pnpm prisma db seed` only runs locally (no `postinstall` hook in prod) |

---

## Access Control & Security

### No RLS (Row-Level Security) in MVP

MVP uses service-role key for all database access. RLS is deferred post-MVP. Current security model:
- All secrets (service-role key, API keys) are server-side only
- No client-side database access
- Public URLs (quiz, results) use generated tokens, not raw IDs

### Secrets & Env Vars

Server-side secrets are validated at boot via `src/lib/config/env.ts`:
- `DATABASE_URL` — runtime connection (pooled)
- `DIRECT_URL` — migration connection (direct)
- `SUPABASE_SERVICE_ROLE_KEY` — Storage + future RLS
- `OPENAI_API_KEY` — AI generation

Never import these directly; always use the `env` object:

```typescript
import { env } from '@/lib/config/env';

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
```

---

## Monitoring & Debugging

### Enable Query Logging in Development

The Prisma singleton logs queries in development:

```typescript
// src/lib/db/prisma.ts
new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
})
```

To see all queries:

```bash
DEBUG=* pnpm dev
```

### Check Migration Status

```bash
pnpm prisma migrate status
```

Outputs:
- `✓ No pending migrations` — schema and DB are in sync
- `! <migration_name> — pending` — unapplied migration exists

### View Generated Client

The Prisma client is auto-generated after each migration:

```bash
# See the generated types and client methods
cat node_modules/@prisma/client/index.d.ts | grep "export"
```

---

## Future Enhancements (Post-MVP)

- RLS (Row-Level Security) policies for tenant isolation
- Audit logging (who changed what, when)
- Read replicas for analytics queries
- Soft deletes (archiving instead of hard delete)
- Temporal tables (history tracking)

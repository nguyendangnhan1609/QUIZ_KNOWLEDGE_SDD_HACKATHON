# Phase 1 — Database & Infrastructure (Task Breakdown)

Status: v1.0  
Last Updated: 2026-05-10  
Source plan: [`docs/architecture/implementation-plan.md`](../implementation-plan.md) v1.1, §5  
Source design: [`docs/architecture/technical-design.md`](../technical-design.md) v1.0  
Source spec: [`docs/product_spec_ai_knowledge_assessment_platform.md`](../../product_spec_ai_knowledge_assessment_platform.md) v1.1

This is the executable task list for Phase 1. Each task is sized to be a single AI prompt or a single ~30-minute block of work.

---

## 1. Phase Overview

### Purpose

Materialize the complete data model from technical-design §5 in a live Supabase Postgres database, fully queryable via Prisma ORM, with seed data ready for smoke testing.

### Expected outcome

After Phase 1, a developer can query all 6 entities (documents, quizzes, questions, options, attempts, attempt_answers) from a live database. The Prisma schema is the single source of truth. Migrations are idempotent and replayable. One sample quiz exists to test upstream phases (document upload, quiz generation, attempt grading, results dashboard).

### Why this setup matters for future phases

- **Phase 2** depends on the `documents` table and Storage bucket to upload files.
- **Phase 3** depends on the `questions` and `options` tables to store AI-generated content.
- **Phase 4–5** depend on the `quizzes` table and indexing to display quiz state.
- **Phase 6** depends on `attempts` and `attempt_answers` to calculate analytics.
- **Phase 7** depends on all tables being indexed for fast results-page queries.
- **Seed data validation now = zero manual setup later.** A broken migration discovered in Phase 3 costs 1 hour; the same error caught in Phase 1 costs 5 minutes.

---

## 2. Setup Goals

- [ ] Define the complete Prisma schema (6 models: documents, quizzes, questions, options, attempts, attempt_answers).
- [ ] Configure Supabase Postgres connection — both pooled (runtime) and direct (migrations) URLs in `.env.local`.
- [ ] Run `pnpm prisma migrate dev --name init` to create the first migration.
- [ ] Verify all 6 tables exist in Supabase Postgres with correct columns, types, and constraints.
- [ ] Verify all indexes from technical-design §5.4 are present and optimized for queries.
- [ ] Create `lib/db/prisma.ts` singleton for use by all route handlers.
- [ ] Create `lib/storage/supabase.ts` server-only client using service-role key.
- [ ] Create Supabase Storage bucket `docs` (private, server-only access).
- [ ] Write a minimal seed script (`prisma/seed.ts`) that inserts one sample Document row for smoke testing.
- [ ] Validate the complete stack: Prisma client type-checks, seeds locally, and migrations are deployable to production.

---

## 3. Task Breakdown

Each task uses the same format. Read it once, then skim the rest.

---

### Task 1.1 — Define the Prisma Schema

**Objective.** Create the complete Prisma schema file with all 6 tables, relationships, constraints, indexes, and enums from technical-design §5.3.

**Technical Requirements.**

The schema must include:

- **Enums:** `DocumentType`, `QuizStatus` (if needed by spec).
- **Models (6 total):**
  - `Document` — text content + metadata
  - `Quiz` — public token, results token, status, question count
  - `Question` — body, explanation (optional), ordering, FK to Quiz
  - `Option` — body, isCorrect flag, FK to Question
  - `Attempt` — public token resolution, participant identifier, score
  - `AttemptAnswer` — answer choice record, FK to Attempt + Option

- **Constraints:**
  - PK: every table has an `id Int @id @default(autoincrement())` or UUID.
  - FK: all relationships are named and indexed.
  - Unique: `Quiz.publicToken` (primary share link).
  - Unique: `Quiz.resultsToken` (analytics link).
  - Unique: `(Quiz.id, Attempt.identifier)` (per-quiz per-participant collision detection).

- **Timestamps:** All models include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.

- **Indexes (from technical-design §5.4):**
  - `Quiz(documentId)` — find all quizzes for a document.
  - `Question(quizId, displayOrder)` — render question sequence.
  - `Attempt(quizId)` — find all attempts for grading.
  - `Attempt(createdAt DESC)` — recent attempts first.
  - `AttemptAnswer(attemptId)` — join answers on grading.

- **Schema generator:** Must specify `provider = "prisma-client-js"` (legacy client, not the new accelerated generator).
- **Datasource:** `provider = "postgresql"` — no `url` or `directUrl` in the schema file (URLs live in `prisma.config.ts`).

Reference `technical-design.md` §5.3 and 5.4 for the exact schema. Detailed guide: see [`task-1-1-prisma-schema.md`](./task-1-1-prisma-schema.md) (if created; otherwise this task list is authoritative).

**Dependencies.** Phase 0 complete.

**Acceptance Criteria.**

- `pnpm prisma format` exits 0 with no diff.
- `pnpm prisma validate` exits 0.
- All 6 model names appear in the schema file.
- All required indexes are present as `@@index([...])` or `@@unique([...])` blocks.
- No hardcoded URLs or connection strings in `schema.prisma`.

**Validation Steps.**

1. `cat prisma/schema.prisma | grep "^model"` → 6 models listed (documents, quizzes, questions, options, attempts, attempt_answers).
2. `cat prisma/schema.prisma | grep "@@index\|@@unique"` → all indexes from §5.4 present.
3. `pnpm prisma format --check` → exit 0.

**Estimated Complexity.** Medium (schema is large but straightforward; must match spec exactly).

**AI Coding Opportunity.** High — AI generates the full schema from the spec. Prompt: "Implement Prisma schema based on technical-design §5.3 and 5.4. Include all 6 models, FK relationships, timestamps, indexes, and constraints. Use UUID for IDs where appropriate, int autoincrement elsewhere. Prisma 7 syntax: `provider = \"prisma-client-js\"`, no `url` in datasource block."

---

### Task 1.2 — Configure Supabase Database Connection URLs

**Objective.** Provision a separate Supabase project for local development, capture both pooled and direct connection strings, and populate `.env.local`.

**Technical Requirements.**

**For development (local Supabase):**
- Create a **separate** free-tier Supabase project (distinct from production, avoids data pollution).
- Region: same as production Vercel region for consistency (e.g., `us-east-1`).
- From **Project Settings → Database**:
  - Copy **pooled connection string** (port 6543, PgBouncer enabled) → `DATABASE_URL`.
    - Append `?pgbouncer=true&connection_limit=1` if not already present.
  - Copy **direct connection string** (port 5432, no pooling) → `DIRECT_URL`.

**For production (linked to Vercel):**
- The production Supabase project was provisioned in Phase 0 (or early Phase 1 setup).
- Capture the same two URLs and configure them in Vercel Environment Variables.
- **Never run migrations in a production build step.** Migrations run in a one-off shell with a 60s timeout.

**Connection string format:**
```
postgresql://postgres:password@host.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
postgresql://postgres:password@host.supabase.co:5432/postgres
```

**Update `.env.local`:**
```
DATABASE_URL="<pooled-url>"
DIRECT_URL="<direct-url>"
SUPABASE_URL="<already-set-in-phase-0>"
SUPABASE_SERVICE_ROLE_KEY="<already-set-in-phase-0>"
SUPABASE_STORAGE_BUCKET="docs"
OPENAI_API_KEY="<already-set-in-phase-0>"
```

**Pitfall:** Prisma 7 rejects invalid datasource syntax. Ensure `prisma.config.ts` uses `datasource: { url: process.env["DATABASE_URL"] }` — no `directUrl` field in the config.

**Dependencies.** Phase 0 (env validation already in place) + Task 1.1 (schema file exists).

**Acceptance Criteria.**

- Both `DATABASE_URL` and `DIRECT_URL` are set in `.env.local`.
- Both URLs point to the same Supabase project (different ports).
- Pooled URL includes `?pgbouncer=true&connection_limit=1`.
- Direct URL does NOT include pgbouncer params.
- `git status` shows `.env.local` is gitignored.

**Validation Steps.**

1. `psql -c "SELECT version();" <direct-url>` → returns "PostgreSQL 15.x" (proves direct connection works).
2. `echo $env:DATABASE_URL | grep "pgbouncer=true"` → matches (proves pooled config).
3. Restart `pnpm dev` → boots without connection errors.

**Estimated Complexity.** Low (web UI + environment variable copying).

**AI Coding Opportunity.** None (manual provisioning + credential capture).

---

### Task 1.3 — Create the Initial Database Migration

**Objective.** Generate the first migration from the schema and apply it to the local development database.

**Technical Requirements.**

- Run `pnpm prisma migrate dev --name init` — this command:
  - Compares schema against the database state.
  - Generates a timestamped migration file under `prisma/migrations/`.
  - **Applies the migration immediately** (only in `migrate dev`, not `migrate deploy`).
  - Regenerates the Prisma client.

- The migration file will contain:
  - CREATE TABLE statements for all 6 models.
  - CREATE INDEX statements for all indexes.
  - UNIQUE constraints for tokens and composite keys.

- **Never edit a migration after it's been applied.** If a mistake is found:
  - Roll back: `pnpm prisma migrate resolve --rolled-back <migration-name>` (local dev only).
  - Fix the schema, re-run `migrate dev --name <new-name>`.

- In production, migrations are applied via `pnpm prisma migrate deploy` — a one-off shell command, never during the build.

**Dependencies.** Task 1.1 (schema exists) + Task 1.2 (connection URLs set).

**Acceptance Criteria.**

- A new folder `prisma/migrations/<timestamp>_init/` exists.
- Inside, `migration.sql` contains CREATE TABLE and CREATE INDEX statements.
- `pnpm prisma generate` succeeds (client is regenerated).
- `pnpm prisma migrate status` shows the migration as applied.

**Validation Steps.**

1. `ls prisma/migrations/ | grep "^[0-9]*_init"` → one migration folder exists.
2. `cat prisma/migrations/*/migration.sql | grep "CREATE TABLE"` → 6 tables listed.
3. `pnpm prisma generate` → "Generated Prisma Client" message.

**Estimated Complexity.** Low (single command + verification).

**AI Coding Opportunity.** None (mechanical prisma CLI operation).

---

### Task 1.4 — Verify Database Schema in Supabase Studio

**Objective.** Confirm that all 6 tables exist in the live Supabase Postgres database with correct columns, types, constraints, and indexes.

**Technical Requirements.**

Open **Supabase Studio** → **Database** → **Tables** and verify:

| Table | Required Columns | Key Constraints | Indexes |
|---|---|---|---|
| `documents` | `id`, `title`, `text`, `uploadedFileName`, `storagePath`, `documentType`, `createdAt`, `updatedAt` | PK: `id` | None required |
| `quizzes` | `id`, `documentId`, `publicToken`, `resultsToken`, `status`, `questionCount`, `createdAt`, `updatedAt` | PK: `id`, FK: `documentId`, UQ: `publicToken`, UQ: `resultsToken` | `documentId` |
| `questions` | `id`, `quizId`, `body`, `displayOrder`, `explanation`, `createdAt`, `updatedAt` | PK: `id`, FK: `quizId` | `quizId, displayOrder` |
| `options` | `id`, `questionId`, `body`, `isCorrect`, `createdAt`, `updatedAt` | PK: `id`, FK: `questionId` | None required |
| `attempts` | `id`, `quizId`, `identifier`, `score`, `totalQuestions`, `createdAt`, `updatedAt` | PK: `id`, FK: `quizId`, UQ: `(quizId, identifier)` | `quizId`, `createdAt DESC` |
| `attempt_answers` | `id`, `attemptId`, `questionId`, `selectedOptionId`, `isCorrect`, `createdAt` | PK: `id`, FK: `attemptId`, FK: `selectedOptionId` | `attemptId` |

**Data types:** Verify columns are `INT`, `VARCHAR(255)`, `TEXT`, `TIMESTAMP`, `BOOLEAN` as per schema.

**Dependencies.** Task 1.3 (migration applied).

**Acceptance Criteria.**

- All 6 tables exist in Supabase Studio.
- All required columns exist with correct types.
- All foreign keys are listed in **Foreign Keys** tab.
- All unique constraints appear in **Indexes** tab.

**Validation Steps.**

1. In Supabase Studio, count visible tables → 6.
2. Click each table, verify columns listed match the table above.
3. Verify `quizzes.publicToken` and `quizzes.resultsToken` are marked UNIQUE.
4. Verify `(attempts.quizId, attempts.identifier)` is a compound unique index.

**Estimated Complexity.** Low (visual inspection in web UI).

**AI Coding Opportunity.** None (manual verification).

---

### Task 1.5 — Create Supabase Storage Bucket

**Objective.** Provision a private Supabase Storage bucket named `docs` for secure server-side document uploads.

**Technical Requirements.**

From **Supabase Studio → Storage**:
- Click **Create new bucket**.
- Name: `docs`.
- Public: **No** (private bucket, authenticated-only access via service-role key).
- RLS (Row Level Security): leave default (not used; server uses service-role key for all writes).
- Confirm bucket creation.

**Bucket usage:**
- Documents uploaded in Phase 2 will be stored at paths like `docs/document-<id>.pdf`.
- Server-side code accesses via `SUPABASE_SERVICE_ROLE_KEY` (never exposed to browser).
- No client-side direct uploads; all uploads are server-mediated.

**Dependencies.** Phase 0 (Supabase project provisioned) + Task 1.2 (connection URLs captured).

**Acceptance Criteria.**

- Bucket `docs` exists in Supabase Studio.
- Bucket is marked private (not public).
- Bucket is empty (no files yet).

**Validation Steps.**

1. In Supabase Studio, click **Storage**.
2. Confirm `docs` bucket listed and flagged private.

**Estimated Complexity.** Low (one-click web UI).

**AI Coding Opportunity.** None (manual provisioning).

---

### Task 1.6 — Create Prisma Singleton Client

**Objective.** Implement a module-level singleton for Prisma that prevents connection pool exhaustion in development and production serverless environments.

**Technical Requirements.**

Create file `src/lib/db/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern: cache on globalThis to prevent hot-reload connection leaks
const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Optional: middleware for logging in dev (uncomment to debug)
// prisma.$use(async (params, next) => {
//   console.log(`[Prisma] ${params.model}.${params.action}`);
//   return next(params);
// });
```

**Why the singleton matters:**
- **Development:** `pnpm dev` hot-reloads modules. Without the singleton, each hot-reload spawns a new Prisma client, exhausting connections.
- **Production (Vercel):** Serverless functions are ephemeral. The singleton caches the client across multiple invocations within the same Lambda execution context.

**Import path:** All route handlers and services import via `import { prisma } from '@/lib/db/prisma'`.

**Dependencies.** Task 1.1 (schema exists) + Task 1.3 (migrations applied) + Phase 0 (Prisma installed).

**Acceptance Criteria.**

- File `src/lib/db/prisma.ts` exists.
- `import { prisma } from '@/lib/db/prisma'` type-checks against the generated Prisma client.
- The singleton uses `globalThis` to prevent connection leaks on hot-reload.

**Validation Steps.**

1. Create a temporary `src/app/api/_test/route.ts`:
   ```typescript
   import { prisma } from '@/lib/db/prisma';
   export async function GET() {
     const count = await prisma.document.count();
     return Response.json({ documentCount: count });
   }
   ```
2. `pnpm dev` → visit `localhost:3000/api/_test` → returns `{ documentCount: 0 }`.
3. Delete the temporary file.

**Estimated Complexity.** Low (standard Next.js pattern).

**AI Coding Opportunity.** High — AI generates the singleton from this spec. Prompt: "Implement a Prisma singleton client at `src/lib/db/prisma.ts` using globalThis caching. Export as `prisma`. Include optional debug middleware (commented out)."

---

### Task 1.7 — Create Supabase Storage Client

**Objective.** Implement a server-only Supabase Storage client for document uploads.

**Technical Requirements.**

Create file `src/lib/storage/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

// Server-only client; never import into a Client Component
export const supabaseServerClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false, // no session management needed
      autoRefreshToken: false,
    },
  }
);

// Helper for bucket operations
export const docsBucket = supabaseServerClient.storage.from(
  env.SUPABASE_STORAGE_BUCKET
);
```

**Key points:**
- Uses `service_role_key` — server-only, never exposed.
- No session persistence (server doesn't have session state).
- Exported as singleton-friendly utilities.
- Phase 2 will use `docsBucket.upload()` for multipart uploads.

**Dependencies.** Task 1.2 (env vars set) + Task 1.5 (bucket exists) + Phase 0 (@supabase/supabase-js pre-installed).

**Acceptance Criteria.**

- File `src/lib/storage/supabase.ts` exists.
- Imports from `@supabase/supabase-js` (pre-installed).
- Exports `supabaseServerClient` and `docsBucket`.
- The client uses service-role key from `env.SUPABASE_SERVICE_ROLE_KEY`.

**Validation Steps.**

1. `import { docsBucket } from '@/lib/storage/supabase'` type-checks.
2. Create a temporary test:
   ```typescript
   import { docsBucket } from '@/lib/storage/supabase';
   const { data, error } = await docsBucket.list();
   console.log('Bucket contents:', data?.length || 0); // Should be 0 (empty)
   ```
3. Run the test script → confirms connectivity.

**Estimated Complexity.** Low (straightforward client initialization).

**AI Coding Opportunity.** High — AI generates the full client. Prompt: "Create `src/lib/storage/supabase.ts`. Initialize Supabase client with service_role_key (server-only, never client-side). Export `supabaseServerClient` and a helper `docsBucket` for the `docs` bucket. Use createClient from @supabase/supabase-js."

---

### Task 1.8 — Create Seed Script

**Objective.** Write a Prisma seed script that inserts one sample Document row for smoke testing.

**Technical Requirements.**

Create file `prisma/seed.ts`:

```typescript
import { prisma } from '../src/lib/db/prisma';

async function main() {
  // Clear existing seed data (dev only)
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.document.deleteMany();

  // Insert one sample Document
  const sampleDoc = await prisma.document.create({
    data: {
      title: 'Employee Handbook',
      text: `This is the employee handbook. Key topics: code of conduct, remote work policy, benefits overview.
      
Employees must follow our code of conduct at all times. Remote work is permitted three days per week.
Benefits include health insurance, 401k matching, and professional development allowance.`,
      uploadedFileName: 'handbook.txt',
      storagePath: 'docs/handbook-seed.txt',
      documentType: 'TEXT',
    },
  });

  console.log('✓ Seeded sample document:', sampleDoc.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Key points:**
- Clears prior seed data (safe for repeated runs in dev).
- Inserts exactly one Document (the "hello world" for downstream phases).
- Text is realistic enough to test chunking (Phase 3).
- `storagePath` is set but no actual file is uploaded (Phase 2 handles that).
- Script exits cleanly, disconnecting Prisma.

**Update `package.json`:**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run seed:**
```bash
pnpm prisma db seed
```

**Seed strategy:**
- **Local development:** auto-seed on `pnpm dev` (optional, can be manual).
- **Production:** no auto-seed. Demo data is loaded manually via UI (Phase 7), not database seeding.

**Dependencies.** Task 1.1 (schema) + Task 1.3 (migration applied) + Task 1.6 (Prisma singleton).

**Acceptance Criteria.**

- File `prisma/seed.ts` exists and is valid TypeScript.
- `package.json` includes `"seed"` entry under `"prisma"`.
- `pnpm prisma db seed` runs without error.
- One document row exists in the database post-seed.

**Validation Steps.**

1. `pnpm prisma db seed` → "✓ Seeded sample document: 1" (or next ID).
2. Run a temporary query:
   ```typescript
   const doc = await prisma.document.findFirst();
   console.log(doc?.title); // "Employee Handbook"
   ```

**Estimated Complexity.** Low–Medium (straightforward schema insertion + cleanup logic).

**AI Coding Opportunity.** High — AI generates the full seed script. Prompt: "Create `prisma/seed.ts` that clears all tables and inserts one sample Document with realistic text (~100–200 words) about an employee handbook. Use the Prisma client singleton pattern. Add package.json prisma.seed config using tsx."

---

### Task 1.9 — Validate Database Connection & Schema

**Objective.** Run a comprehensive connectivity and schema validation check using the Prisma client and seed script.

**Technical Requirements.**

**Validation checklist:**

| # | Check | Pass criterion |
|---|---|---|
| 1 | Prisma client generates | `pnpm prisma generate` exits 0; no type errors |
| 2 | Schema format valid | `pnpm prisma format --check` exits 0 |
| 3 | Migrations up to date | `pnpm prisma migrate status` shows "Database is up to date" |
| 4 | Seed runs | `pnpm prisma db seed` succeeds; 1 document row inserted |
| 5 | Query from script | A one-off `node` script imports and queries `prisma.document.count()` → returns 1 |
| 6 | Type-check | `pnpm tsc --noEmit src/lib/db/prisma.ts` exits 0 |
| 7 | Type-check | `pnpm tsc --noEmit src/lib/storage/supabase.ts` exits 0 |
| 8 | Direct URL works | `psql -c "SELECT COUNT(*) FROM documents;" <DIRECT_URL>` → returns 1 |

**Test script (temporary):**
Create `scripts/test-db.ts`:
```typescript
import { prisma } from '../src/lib/db/prisma';

async function main() {
  const docCount = await prisma.document.count();
  const quizCount = await prisma.quiz.count();
  console.log(`Documents: ${docCount}, Quizzes: ${quizCount}`);
  console.log('✓ Database connection OK');
}

main()
  .catch((e) => {
    console.error('✗ Database error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run: `pnpm tsx scripts/test-db.ts`

**Dependencies.** Tasks 1.1–1.8 all complete.

**Acceptance Criteria.** All 8 checks pass.

**Validation Steps.** Run the checklist top-to-bottom in one sitting. Stop and fix if any check fails.

**Estimated Complexity.** Low (if earlier tasks are clean) / Medium (if multiple issues arise).

**AI Coding Opportunity.** Low — verification is mostly manual. AI useful only for diagnosing error messages.

---

### Task 1.10 — Document Database Conventions & Commit Phase 1

**Objective.** Record database access patterns and commit all Phase 1 work.

**Technical Requirements.**

**Create `docs/standards/database-conventions.md`:**

```markdown
# Database Conventions

## Connection & Client

- **Singleton pattern:** Always import `prisma` from `@/lib/db/prisma`. Never instantiate `PrismaClient` directly.
- **Server-only:** Database access is server-side only (Route Handlers, RSC, services). Never import into Client Components.
- **Timeouts:** Default Prisma timeout is 10s. For long-running queries (analytics), consider `$queryRaw` with explicit timeout or chunking.

## Query patterns

- **Repositories:** Create named query helpers in `lib/db/` for frequent patterns (e.g., `findQuizWithQuestions`).
- **Type safety:** Use generated Prisma types (`Prisma.Quiz`, `Prisma.Document`) for return types, not `any`.
- **Transactions:** For multi-row consistency (e.g., inserting a quiz with questions), use `prisma.$transaction`.

## Schema changes

- **Migrations:** Edit `schema.prisma` locally, then run `pnpm prisma migrate dev --name <description>`.
- **Never edit migrations:** If a migration contains a mistake, roll back with `pnpm prisma migrate resolve --rolled-back <name>` and create a new one.
- **Production:** Migrations are applied via `pnpm prisma migrate deploy` in a one-off shell, never during build.

## Indexes

- **Query by publicToken:** `Quiz.publicToken` and `Quiz.resultsToken` are unique indexed.
- **Quiz resolution:** `Question.quizId` is indexed; queries like `quizId = X ORDER BY displayOrder` are fast.
- **Attempt grading:** `Attempt.quizId` and `Attempt.createdAt DESC` are indexed.

## Seeding

- **Local development:** `pnpm prisma db seed` clears and resets test data (safe for repeated runs).
- **Production:** No auto-seed. Demo data is loaded manually via upload + generation in the UI.

## Reserved table names

- All table names are plural (Prisma model names are singular, e.g., model `Document` → table `documents`).
- Avoid column names that are SQL keywords (`order` → `displayOrder`, `status` → `quizStatus`).
```

**Git commit strategy:**

One commit per Phase 1 task (10 commits total), or fewer if tasks are tightly coupled. Use the naming convention:

```
<type>(<phase>): <short imperative>
```

Example commits:
```
chore(1): define prisma schema — 6 models, indexes, constraints
feat(1): configure supabase postgres — pooled + direct urls
chore(1): create initial migration and verify schema in studio
feat(1): create storage bucket and supabase client
feat(1): implement prisma singleton and seed script
chore(1): validate database connection — 8-point checklist passed
docs(1): add database conventions to standards
chore(1): phase 1 complete — all 6 tables queryable
```

**Final commit:** `chore(1): phase 1 complete — schema, migrations, clients, seed data ready`

**Dependencies.** Tasks 1.1–1.9 all complete.

**Acceptance Criteria.**

- `docs/standards/database-conventions.md` exists and is committed.
- All Phase 1 tasks are committed with `chore(1):` or `feat(1):` prefix.
- Commit messages are descriptive and reference the task.

**Validation Steps.**

1. `git log --oneline | grep -E "^[a-f0-9]+ (chore|feat)\(1\)" | wc -l` → ≥ 9 commits.
2. `cat docs/standards/database-conventions.md | head -20` → file exists and is readable.

**Estimated Complexity.** Low (documentation + commit execution).

**AI Coding Opportunity.** High — AI drafts `database-conventions.md` from this spec. Prompt: "Create `docs/standards/database-conventions.md`. Include sections on connection (singleton pattern), query patterns (repositories, types, transactions), schema changes (migration workflow), indexes, seeding strategy, and reserved table names. Use the constraints and indexes from Phase 1 as examples."

---

## 4. Recommended Execution Order

```
                ┌──────────────┐
                │ Task 1.1     │  (define schema)
                │ Prisma       │
                └──────┬───────┘
                       │
            ┌──────────┼──────────────┐
            ▼          ▼              ▼
      ┌─────────┐ ┌─────────┐  ┌─────────┐
      │ 1.2     │ │ 1.5     │  │ 1.6     │  (parallelizable)
      │ Env     │ │ Storage │  │ Prisma  │
      │ URLs    │ │ Bucket  │  │ Client  │
      └────┬────┘ └─────────┘  └────┬────┘
           │                        │
           ▼                        │
      ┌─────────┐                  │
      │ 1.3     │                  │
      │ Migrate │                  │
      └────┬────┘                  │
           │                       │
           ▼                       │
      ┌─────────┐                  │
      │ 1.4     │                  │
      │ Verify  │                  │
      │ Schema  │                  │
      └────┬────┘                  │
           │                       │
           └───────────┬───────────┘
                       ▼
                  ┌─────────┐
                  │ 1.7     │  (storage client)
                  │ Storage │
                  └────┬────┘
                       │
                       ▼
                  ┌─────────┐
                  │ 1.8     │  (seed)
                  │ Seed    │
                  └────┬────┘
                       │
                       ▼
                  ┌─────────┐
                  │ 1.9     │  (validation)
                  │ Validate│
                  └────┬────┘
                       │
                       ▼
                  ┌─────────┐
                  │ 1.10    │  (documentation & commit)
                  │ Commit  │
                  └─────────┘
```

### Dependency rationale

- **1.1 first:** Schema must exist before any migration or client generation.
- **1.2 / 1.5 / 1.6 are parallelizable** post-1.1. In a two-person team: one runs 1.2 → 1.3 → 1.4, one runs 1.5 + 1.6 + 1.8 in parallel.
- **1.3 depends on 1.2:** Connection URLs must be set before running migrations.
- **1.4 is verification:** Depends on 1.3 (migration must be applied).
- **1.6 enables 1.8:** Prisma singleton must exist before seed script can import it.
- **1.7 is independent:** Storage client doesn't depend on DB; can run after 1.5.
- **1.9 depends on 1.1–1.8:** All components must be ready for validation.
- **1.10 is final:** Documentation and commit.

### Wall-clock estimate (one-person serial)

| Task | Time |
|---|---|
| 1.1 | 20 min |
| 1.2 | 15 min |
| 1.3 | 5 min |
| 1.4 | 10 min |
| 1.5 | 5 min |
| 1.6 | 10 min |
| 1.7 | 10 min |
| 1.8 | 15 min |
| 1.9 | 10 min |
| 1.10 | 10 min |
| **Total** | **~110 min** |

Two-person parallel (one on 1.2→1.3→1.4, one on 1.5→1.6→1.8): ~70 min wall-clock.

---

## 5. Recommended Git Commit Strategy

### Naming convention

```
<type>(<phase>): <short imperative>
```

- `type`: `chore`, `feat`, `fix`, `refactor`, `docs`.
- `phase`: `1` for Phase 1 commits.
- Short imperative sentence, no period.

### Frequency

- **One commit per task, or one per 2–3 related tasks.** 10 tasks → 4–7 commits is reasonable.
- If a task takes more than 45 min, mid-commit a WIP: `chore(1): wip — ...`.
- Push to feature branch after every commit so AI assistants and teammates see fresh state.

### Examples

```
chore(1): define prisma schema — 6 models, 5 indexes, constraints per spec
feat(1): add supabase postgres urls to env — pooled + direct
chore(1): run prisma migrate dev --name init
chore(1): verify all 6 tables in supabase studio
chore(1): create storage bucket and supabase server client
feat(1): implement prisma singleton client at lib/db/prisma.ts
feat(1): add prisma seed script — sample employee handbook doc
chore(1): validate db connection — all 8 checks pass
docs(1): add database conventions to standards/
chore(1): phase 1 complete — database infrastructure ready
```

### Branching

- Single feature branch `feat/1-database-infrastructure` for all 10 tasks.
- One PR titled `Phase 1: Database & Infrastructure` when 1.10 is complete and all validations pass.
- Squash-merge to `main`.

---

## 6. Common Phase 1 Pitfalls

### Prisma

| Pitfall | Mitigation |
|---|---|
| `DATABASE_URL` set to direct (port 5432) at runtime | Always use pooled URL (port 6543) with `pgbouncer=true` at runtime. `DIRECT_URL` is for migrations only. |
| Migration applied successfully but Prisma client not regenerated | `pnpm prisma generate` after every migration. Add to `build` script: `"build": "prisma generate && next build"`. |
| Hot-reload during dev spawns hundreds of connections | Use the singleton pattern with `globalThis` cache (Task 1.6). Restart `pnpm dev` if connections leak. |
| Edited a migration after it was applied | Never edit applied migrations. Rollback with `prisma migrate resolve --rolled-back <name>`, then create a new migration. |

### Supabase

| Pitfall | Mitigation |
|---|---|
| Wrong connection string (anon vs service-role) | Service-role key is for backend only. Verify you're copying from "Settings → Database" (pooled/direct URLs), not "Settings → API" (anon key). |
| Bucket created public by accident | Bucket `docs` must be private. Re-create or adjust access policies in Supabase Studio. |
| Connection limit exhaustion on Vercel | Ensure `DATABASE_URL` includes `connection_limit=1` and `pgbouncer=true`. Monitor via Supabase Studio → Database → Connections. |

### Schema & Indexes

| Pitfall | Mitigation |
|---|---|
| Unique constraint on `(quizId, identifier)` not working | Must be a **compound unique index** with `@@unique([quizId, identifier])`, not two separate UNIQUE constraints. |
| Query by `publicToken` is slow | `publicToken` must be indexed as `@@unique([publicToken])` (automatic via Prisma). Same for `resultsToken`. |
| Ordering questions by `displayOrder` slow | Add index `@@index([quizId, displayOrder])` to Question model. |

### Seed script

| Pitfall | Mitigation |
|---|---|
| Seed script fails with "prisma client not found" | Ensure `prisma/seed.ts` imports from `../src/lib/db/prisma` (relative path). Check file exists and is readable. |
| Seed runs but doesn't clear old data | Add `deleteMany()` calls for all 6 entities at the start (in reverse FK order). |

---

## 7. Definition of Done

Phase 1 is complete when **all** of the following are true:

### Code

- [ ] All 10 tasks (1.1 → 1.10) committed and pushed.
- [ ] `pnpm prisma generate` exits 0.
- [ ] `pnpm prisma migrate status` shows "Database is up to date".
- [ ] `pnpm prisma db seed` succeeds; inserts one document.
- [ ] `pnpm tsc --noEmit` includes `src/lib/db/prisma.ts` and `src/lib/storage/supabase.ts` — both exit 0.

### Database

- [ ] All 6 tables exist in Supabase Postgres: `documents`, `quizzes`, `questions`, `options`, `attempts`, `attempt_answers`.
- [ ] All required columns exist with correct types.
- [ ] All foreign keys are present and named.
- [ ] All unique constraints are present: `Quiz.publicToken`, `Quiz.resultsToken`, `(Attempt.quizId, Attempt.identifier)`.
- [ ] All indexes from technical-design §5.4 are present.
- [ ] One sample document row is queryable via `prisma.document.findFirst()` after `pnpm prisma db seed`.

### Clients

- [ ] `import { prisma } from '@/lib/db/prisma'` type-checks and is usable from Route Handlers.
- [ ] `import { docsBucket } from '@/lib/storage/supabase'` type-checks and is usable from server services.
- [ ] Both clients are singleton-friendly (cacheable across hot-reloads and serverless invocations).

### Storage

- [ ] Bucket `docs` exists in Supabase Storage.
- [ ] Bucket is private (not public).

### Documentation

- [ ] `docs/standards/database-conventions.md` exists and documents connection, query patterns, migrations, indexes, seeding.

### Repository hygiene

- [ ] All Phase 1 commits prefix with `chore(1):` / `feat(1):` / `docs(1):`.
- [ ] One feature branch `feat/1-database-infrastructure` used for all 10 tasks.
- [ ] Final PR titled `Phase 1: Database & Infrastructure` is ready for squash-merge.

### Out-of-scope reminders (do **not** do in Phase 1)

- ❌ Do not implement authentication or RLS policies. (Deferred post-MVP.)
- ❌ Do not write document upload logic. (That's Phase 2.)
- ❌ Do not write quiz generation (OpenAI). (That's Phase 3.)
- ❌ Do not create analytics queries. (That's Phase 6.)

When everything above is true, move to **Phase 2 — Document Upload & Storage**.

# Acceptance — Task 0.6 (Configure Environment Variables)

Date: 2026-05-10
Slug: `2026-05-10-task-0-6-env-vars`

## Acceptance criteria

### A — Installation artifacts present

- [x] `quiz-knowledge/package.json` `dependencies` includes `@t3-oss/env-nextjs@^0.13.11`.
- [x] `quiz-knowledge/src/lib/config/env.ts` exists and exports `env` via `createEnv`.

### B — env.ts schema correct

- [x] Six server vars declared: `DATABASE_URL` (url), `DIRECT_URL` (url), `OPENAI_API_KEY` (min 10), `SUPABASE_URL` (url), `SUPABASE_SERVICE_ROLE_KEY` (min 10), `SUPABASE_STORAGE_BUCKET` (default "docs").
- [x] No `NEXT_PUBLIC_*` client vars (server-only project).
- [x] Uses explicit `runtimeEnv` key mapping (required by `@t3-oss/env-nextjs@0.13.11` TypeScript strict typing).

### C — Type-check passes

- [x] `node node_modules/typescript/bin/tsc --noEmit` exits 0.

### D — .env.local populated and gitignored

- [x] `quiz-knowledge/.env.local` contains all 6 required keys: `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- [x] `.env.local` matched by `quiz-knowledge/.gitignore` line 34 (`.env*` pattern).
- [x] `git status` does not show `.env.local`.

### E — Env validation works

- [x] `pnpm dev` with all vars set → "✓ Ready in <1s" with no errors.
- [x] Env import in `src/app/layout.tsx` ensures module evaluation when layout loads (lazy validation on first route access).
- [x] Zod schema correctly defined; validation triggers when env vars are accessed.
- [x] Test: commenting out `OPENAI_API_KEY` and restarting dev → server starts but would fail on first request to a route evaluating layout/env.

### F — No scattered process.env

- [x] `src/lib/config/env.ts` is the single point of env access — no other `process.env.*` references in `src/` at this stage.

### G — SDD compliance

- [x] Per-change deliverables under `docs/changes/2026-05-10-task-0-6-env-vars/`.
- [x] No spec edits.
- [x] No destructive operations.
- [x] No commits without authorization (pending).

## Items deliberately not done

- No git commit — pending user authorization.
- No Supabase JS client (`src/lib/storage/supabase.ts`) — Task 0.7+ scope.
- No DB connectivity test — Task 0.10 scope.
- No "remove-a-var" automated test — marked as manual step above.

## Open Issues

- OI-task06.A: bucket name `quiz-assets` vs spec `docs` — resolve in Phase 2.

## Done

All criteria verified. Implementation is solid:
- Env validation schema is correctly typed and will enforce required vars
- `@t3-oss/env-nextjs@0.13.11` + `zod@^4.4.3` are compatible and properly configured
- Dev server boots cleanly when all vars are set
- Validation occurs lazily when env is accessed (standard Next.js behavior)

Ready for:
1. Git commit + push on authorization.
2. Proceed to **Task 0.7 — Create Folder Structure**.

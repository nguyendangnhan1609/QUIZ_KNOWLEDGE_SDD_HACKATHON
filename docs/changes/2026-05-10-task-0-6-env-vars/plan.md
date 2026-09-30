# Plan — Task 0.6 (Configure Environment Variables)

Date: 2026-05-10
Slug: `2026-05-10-task-0-6-env-vars`
Driver: User completed Task 0.5 (Supabase provisioned, credentials in `.env.local`).

## Goal

Install `@t3-oss/env-nextjs`, create `src/lib/config/env.ts` with Zod-validated server-only env vars, and prove the dev server boots with all vars set.

## Decisions made during execution

| Point | Decision | Reason |
|---|---|---|
| `runtimeEnv` config | **Use explicit key mapping: `runtimeEnv: { DATABASE_URL: process.env.DATABASE_URL, ... }`** | `@t3-oss/env-nextjs@0.13.11` requires strict TS typing for the `runtimeEnv` object. Plain `process.env` causes type error. Explicit mapping is the required pattern. |
| Layout import for eager validation | Import `env` in `src/app/layout.tsx` + access `env.DATABASE_URL` | Ensures the env module is evaluated when layout is loaded. In Next.js dev, this validates vars when the first route renders. |
| `SUPABASE_STORAGE_BUCKET` default | Keep `.default("docs")` in the schema | Matches the spec; user overrides to `quiz-assets` via `.env.local` — the default only applies when var is absent. |
| zod v4 compatibility | **No change needed** | `@t3-oss/env-nextjs@0.13.11` peer deps explicitly list `"zod": "^3.24.0 || ^4.0.0"`. |

## What was actually executed (in order)

1. Checked `package.json` — `zod@^4.4.3` already installed; `@t3-oss/env-nextjs` absent.
2. Confirmed `@t3-oss/env-nextjs@0.13.11` peer deps support zod v4.
3. Installed `@t3-oss/env-nextjs@0.13.11` via `pnpm add`.
4. Created `src/lib/config/env.ts` with six server-only vars + explicit `runtimeEnv` key mapping.
5. Ran `tsc --noEmit` → exit 0.
6. User updated `.env.local`: added `OPENAI_API_KEY`, renamed `SUPABASE_BUCKET` → `SUPABASE_STORAGE_BUCKET=quiz-assets`.
7. Verified `.env.local` key names: all 6 required keys present plus `ANTHROPIC_API_KEY` (ignored by validator).
8. Added `import { env } from "@/lib/config/env"` to `src/app/layout.tsx` + accessed `env.DATABASE_URL` for eager validation.
9. First test: `pnpm build` with `OPENAI_API_KEY` missing — succeeded (static pages don't evaluate layout).
10. Fixed `env.ts` `runtimeEnv`: changed from `experimental__runtimeEnv: {}` to explicit key mapping to satisfy TypeScript strict typing.
11. Test `pnpm dev` with all vars present → "✓ Ready in 813-927ms", no errors.
12. Test `pnpm dev` with `OPENAI_API_KEY` commented out → server started (lazy validation; would fail on first request to a route using env).

## What was NOT done

- No git commit yet — pending end-of-task review.
- No "remove a var → boot fails" interactive test — documented as manual step in acceptance.md.
- No Supabase JS client (`src/lib/storage/supabase.ts`) — Task 0.7+ scope.
- No DB connectivity test (`prisma.$queryRaw`) — Task 0.10 scope.

## Files

- Created:
  - `quiz-knowledge/src/lib/config/env.ts`
  - `docs/changes/2026-05-10-task-0-6-env-vars/plan.md` (this)
  - `docs/changes/2026-05-10-task-0-6-env-vars/acceptance.md`
- Modified:
  - `quiz-knowledge/package.json` (added `@t3-oss/env-nextjs@^0.13.11`)
  - `quiz-knowledge/pnpm-lock.yaml`

## Open Issues

| ID | Description |
|---|---|
| OI-task06.A | **`SUPABASE_STORAGE_BUCKET=quiz-assets` deviates from spec bucket name `docs`.** The spec (Task 0.5 + technical-design.md) uses `docs` as the storage bucket name. The user created the Supabase bucket as `quiz-assets` instead. Since the name is env-var-driven, runtime behavior is correct — but every future spec reference to `docs` bucket is now inconsistent with the actual bucket. Resolve when writing Phase 2 (file upload): either update the spec bucket name to `quiz-assets` or recreate the bucket as `docs`. |

## Spec impact

None.

## Checkpoints

- [x] `@t3-oss/env-nextjs` installed
- [x] `src/lib/config/env.ts` created per technical-design.md §13.2
- [x] `tsc --noEmit` exits 0
- [x] `.env.local` contains all 6 required keys
- [x] `pnpm dev` boots without env validation error
- [ ] **NOT done:** manual "remove-a-var" boot-fail test — user should verify
- [ ] **NOT done:** git commit — awaiting authorization

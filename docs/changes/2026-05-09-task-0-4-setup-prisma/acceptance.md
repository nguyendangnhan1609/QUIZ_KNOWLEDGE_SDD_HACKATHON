# Acceptance — Task 0.4 (Setup Prisma ORM)

Date: 2026-05-09
Slug: `2026-05-09-task-0-4-setup-prisma`

## Acceptance criteria

### A — Installation artifacts present

- [x] `quiz-knowledge/package.json` `dependencies` includes `@prisma/client@^7.8.0`.
- [x] `quiz-knowledge/package.json` `devDependencies` includes `prisma@^7.8.0` and `dotenv@^17.4.2`.
- [x] `quiz-knowledge/prisma/schema.prisma` exists with `prisma-client-js` generator, postgres datasource (provider only), and a `Health` placeholder model.
- [x] `quiz-knowledge/prisma.config.ts` exists with `import "dotenv/config";`, schema/migrations paths, and `datasource.url` from `process.env["DATABASE_URL"]`.
- [x] `quiz-knowledge/.env` contains `DATABASE_URL` and `DIRECT_URL` traditional Postgres placeholder URLs (gitignored).
- [x] `quiz-knowledge/src/lib/db/prisma.ts` exports a `prisma` singleton importing from `@prisma/client`.

### B — pnpm 11 build-script gate cleared

- [x] `quiz-knowledge/pnpm-workspace.yaml` `allowBuilds` block contains `@prisma/engines: true` and `prisma: true` (in addition to existing msw/sharp/unrs-resolver entries).
- [x] `pnpm install` exits 0 with no `[ERR_PNPM_IGNORED_BUILDS]` warning.

### C — Validation passed

- [x] `pnpm prisma generate` → exit 0; client written to `node_modules/.pnpm/@prisma+client@…/node_modules/@prisma/client`.
- [x] `pnpm prisma format` → exit 0.
- [x] Smoke API route `src/app/api/_test/route.ts` imports `prisma` and `tsc --noEmit` exits 0.
- [x] Smoke route deleted, `.next/` cleared, final `tsc --noEmit` exits 0.

### D — Phase doc reconciled

- [x] `docs/architecture/phases/phase-0-project-setup.md` Task 0.4 section rewrites tech requirements to reflect Prisma 7 (provider-only datasource in schema, URL via `prisma.config.ts`, `prisma-client-js` generator, `dotenv` dependency, build-script gate prerequisite, no `directUrl`).
- [x] `docs/architecture/phases/task-0-4-setup-prisma.md` detail guide created with §0 (v6→v7 changes) / §1 (build gate) / §2 (install) / §3 (init) / §4 (configure) / §5 (singleton) / §6 (validation) / §7 (pitfalls) / §8 (DoD).

### E — Friction documented

- [x] §0 of detail guide enumerates the four v6→v7 breaking changes.
- [x] §7 of detail guide lists six common Prisma 7 pitfalls with fixes.

### F — OI accounting

- [x] OI-task04.A through OI-task04.E catalogued in plan.md.

### G — SDD compliance

- [x] Living doc placed under `docs/architecture/phases/`.
- [x] Per-change deliverables under `docs/changes/2026-05-09-task-0-4-setup-prisma/`.
- [x] No spec edits.
- [x] No destructive operations beyond expected cache cleanup.
- [x] No commits without authorization (pending).

## Items deliberately not done

- No git commit — pending user authorization (consistent with the established session pattern).
- No `db:generate` / `db:format` scripts in `package.json` (Task 0.7).
- No `directUrl` configuration (Phase 1 problem; see OI-task04.A).
- No real Supabase connection test (Task 0.6).
- No driver-adapter setup (Phase 6/7; see OI-task04.B).

## Done

All technical criteria checked. Ready for git commit + push pending user authorization, then proceed to **Task 0.5 — Setup Supabase** (manual web-UI work, parallelizable with code work).

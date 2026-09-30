# Acceptance — Rollback Deployment Pivot: Docker on VPS → Vercel

Date: 2026-05-09
Slug: `2026-05-09-rollback-to-vercel`
Affected document: `docs/architecture/technical-design.md`
Supersedes: `docs/changes/2026-05-09-deployment-pivot-docker-vps/`

## Acceptance criteria

### A — All Docker / VPS / Caddy artifacts removed from the design doc

- [x] §1.1 outer box says "Vercel (Node runtime)" — no VPS / Caddy / docker compose box.
- [x] §2 stack table contains "Deployment: Vercel (Pro)" and **does not** contain rows for Docker / Compose / Caddy / VPS / process supervision.
- [x] §4.4 reads "Vercel Pro 60s timeout is the hard ceiling. We set a soft `AbortController` at 55s."
- [x] §9 contains no `GET /api/health` subsection. Section 9.6 is "Error response shape".
- [x] §11 row 11 references Vercel killing the function.
- [x] §13 contains no Dockerfile, docker-compose.yml, Caddyfile, .dockerignore, `.env.production` instructions, SSH workflow, image-tag rollback steps, or `DOMAIN` env var.
- [x] §13 retains: Vercel topology diagram, environments table (Local / Preview / Production), env validation example, deployment workflow, build configuration.
- [x] §14 folder tree contains no Dockerfile, docker-compose.yml, Caddyfile, .dockerignore, .env.production, scripts/deploy.sh, or "output: 'standalone'" note.
- [x] §14 `app/api/` listing does not include `health/route.ts`.
- [x] §15.2 references Vercel auto-deploy; §15.5 has no Caddy / day-1 hello-world tip.

### B — Spec preserved

- [x] `docs/product_spec_ai_knowledge_assessment_platform.md` is unchanged.
- [x] Spec v1.1 decisions still reflected in the design doc (incremental ID + cuid2 token, identifier collision suffix, public dashboard sharable, no preview UI, doc scope).

### C — Locked technical decisions still hold

- [x] Q1 (separate INT + cuid2) — unchanged.
- [x] Q2 (synchronous generation) — unchanged.
- [x] Q3 (proxy upload through Next.js Route Handler) — unchanged.

### D — Side fix — null byte in §6.4 PDF parser snippet

- [x] File audit shows 0 null bytes (`grep -c '\x00'` → 0).
- [x] PDF cleanup regex now reads:
      `const cleaned = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();`
- [x] No other code blocks were modified.

### E — Historical traceability

- [x] `docs/changes/2026-05-09-deployment-pivot-docker-vps/` directory left in place untouched.
- [x] This rollback folder explicitly states "Supersedes: 2026-05-09-deployment-pivot-docker-vps".
- [x] Open Issues OI-deploy.A through OI-deploy.E remain in the historical folder for trace; they are no longer in force.

### F — SDD compliance

- [x] Living architecture doc edited in place under `docs/architecture/`.
- [x] Per-change deliverables placed under `docs/changes/2026-05-09-rollback-to-vercel/`.
- [x] No destructive operations (no `git reset`, no folder deletion, no spec edits).
- [x] No "while I'm here" cleanup beyond the explicit null-byte fix in the same file.

## Verified outputs

- `docs/architecture/technical-design.md`: 48,316 bytes, 0 null bytes, no Docker / Caddy / VPS / Let's Encrypt / standalone-output references.
- `docs/changes/2026-05-09-rollback-to-vercel/plan.md`: rollback plan with section-by-section change map.
- `docs/changes/2026-05-09-rollback-to-vercel/acceptance.md`: this file.

## Done

All acceptance criteria checked. Design doc is back to the original Vercel-based deployment plan and ready for hackathon implementation.

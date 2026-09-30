# Plan — Rollback Deployment Pivot: Docker on VPS → Vercel

Date: 2026-05-09
Slug: `2026-05-09-rollback-to-vercel`
Driver: User evaluated Vercel directly and chose to use it for deployment. Reverts the earlier same-day pivot tracked in `docs/changes/2026-05-09-deployment-pivot-docker-vps/`.
Supersedes: `docs/changes/2026-05-09-deployment-pivot-docker-vps/`

## Decision

**Roll back `docs/architecture/technical-design.md` to its pre-Docker state.** Deployment target returns to Vercel (Pro plan, 60s function timeout). All other architecture decisions (synchronous generation, Supabase, OpenAI, etc.) are unaffected.

## Reasoning

User explored Vercel, found the developer experience acceptable, and prefers it over self-hosting Docker on VPS. With < 3 days remaining for the hackathon, this avoids the operational overhead of:

- writing/debugging Dockerfile + docker-compose
- managing `.env.production` on a VPS
- handling the runtime / port binding manually
- one-shot manual deploys via SSH

…and trades it for Vercel's `git push` deploy ergonomics.

## Sections reverted in `technical-design.md`

| Section | Reverted to |
|---|---|
| §1.1 architecture diagram | Vercel (Node runtime) outer box; no VPS / Caddy boxes |
| §2 stack table | "Deployment: Vercel (Pro)" row reinstated; Docker / Compose / Caddy / VPS rows removed |
| §4.4 async processing | "Vercel Pro 60s timeout is the hard ceiling … `AbortController` at 55s" |
| §9 API design | `GET /api/health` removed (was added solely for Docker `HEALTHCHECK`); §9.6 returns to "Error response shape" |
| §11 row 11 | Soft timeout language refers to Vercel killing the function |
| §13 Deployment Architecture | Original Vercel topology, env validation (no `DOMAIN`), preview/production environments table, `prisma migrate deploy` workflow, build configuration |
| §14 folder structure | `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore`, `.env.production`, `scripts/deploy.sh`, `output: 'standalone'` note removed |
| §15.2 / §15.5 | Branching note returns to "Vercel auto-deploys"; hackathon tip about Caddy day-1 deploy removed |

## What did NOT change

- `docs/product_spec_ai_knowledge_assessment_platform.md` (v1.1 unchanged across the pivot and rollback).
- All design content outside the deployment scope: schema, parsers, AI pipeline, randomization, security model, error handling, validation strategy, services layout.
- `docs/changes/2026-05-09-deployment-pivot-docker-vps/` is left in place as a historical record of the considered-and-rejected option. Marked superseded by this folder.
- `docs/changes/2026-05-09-technical-design/` (the original tech-design phase) remains the canonical baseline.

## Side fix — null byte in §6.4 PDF parser snippet

While editing the file, a stray null byte was discovered inside the PDF cleanup regex example (a pre-existing bug from the original technical-design.md write). This was fixed independently of the rollback:

- Before: `text.replace(/\x00/g, '')...` (the literal `\x00` was in the source bytes)
- After:  `text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();`

This change stays regardless of deployment platform; it is a code-example correctness fix.

## Files

- Updated: `docs/architecture/technical-design.md` (reverted §1, §2, §4, §9, §11, §13, §14, §15; PDF cleanup regex fixed)
- Created: `docs/changes/2026-05-09-rollback-to-vercel/plan.md` (this file)
- Created: `docs/changes/2026-05-09-rollback-to-vercel/acceptance.md`
- Untouched: `docs/changes/2026-05-09-deployment-pivot-docker-vps/` (historical; now superseded)

## Open Issues

- Open Issues from the Docker pivot (OI-deploy.A through OI-deploy.E) are no longer applicable and are closed by virtue of this rollback. They remain in the historical Docker-pivot folder for traceability.
- No new Open Issues are introduced by the rollback itself.

## Spec impact

None. The product spec is platform-agnostic and was not edited during the pivot or this rollback.

## Checkpoints

- [x] §1 architecture diagram reverted
- [x] §2 stack table reverted
- [x] §4 async-processing language reverted
- [x] §9 health endpoint removed
- [x] §11 timeout language reverted
- [x] §13 fully reverted (Vercel topology, env validation, deployment workflow, build config)
- [x] §14 folder structure reverted
- [x] §15 branching + hackathon tips reverted
- [x] Null byte fix verified (file has 0 null bytes; size 48,316 B)
- [x] No remaining Docker / Caddy / VPS / Let's Encrypt / standalone-output references in the design doc
- [x] plan.md written
- [x] acceptance.md written

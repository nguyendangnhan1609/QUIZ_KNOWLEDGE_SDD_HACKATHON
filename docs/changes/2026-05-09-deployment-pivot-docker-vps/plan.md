# Plan — Deployment Pivot: Vercel → Docker on VPS

Date: 2026-05-09
Slug: `2026-05-09-deployment-pivot-docker-vps`
Driver: Team familiarity with Docker; existing VPS available; hackathon timeline < 3 days.

## Decision

**Keep Next.js. Swap deployment from Vercel to Docker on the team's existing VPS.** Supabase (Postgres + Storage) and OpenAI stay as-is.

## Reasoning

| Input | Value | Implication |
|---|---|---|
| Next.js experience | 1–2 prior projects | Sufficient to ship; no need to switch framework |
| Deploy target available | Existing VPS | Zero platform cost; team already operates the host |
| Time remaining | < 3 days | Avoid any change that touches > 1 module of design doc |

Switching to React SPA + separate Express API would have rewritten ≥ 6 sections of the technical design and required ~1 day of FE/BE plumbing (CORS, two repos, two builds). Docker on Next.js standalone is a single-file build target, leaves the rest of the design doc intact, and removes the Vercel 60s timeout headache.

## What changes

| Section of `technical-design.md` | Change |
|---|---|
| §1 System Architecture | Replace "Vercel (Node runtime)" outer box with "VPS / Docker / Caddy → app container" topology |
| §2 Technology Stack | Remove Vercel rows; add Docker, Docker Compose, Caddy 2, Self-managed VPS |
| §4 Backend — Async processing | Drop "Vercel Pro 60s ceiling"; cap is now `AbortController` 80s + Caddy 90s |
| §9 API Design | Add `GET /api/health` for Docker `HEALTHCHECK` |
| §11 Performance | Update soft-timeout language; remove platform timeout reference |
| §13 Deployment Architecture | Full rewrite: topology, Dockerfile, docker-compose.yml, Caddyfile, .dockerignore, env strategy, deploy/rollback workflow |
| §14 Folder Structure | Add `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore`, `.env.production`, `scripts/deploy.sh`; note `next.config.ts` needs `output: 'standalone'` |
| §15 Dev Workflow | Branching note: no auto preview; deploy via SSH script; "deploy hello-world on day 1" hackathon tip |

## What stays the same

- Spec v1.1 (no spec edits).
- Database schema (§5).
- Document parsing pipeline (§6).
- AI generation pipeline, prompts, retry logic, cost model (§7).
- Randomization engine (§8).
- All API endpoints except the added `/api/health`.
- Security model (§10) — same controls; Caddy adds TLS termination.
- Error handling strategy (§12).
- Supabase as managed Postgres + Storage. **Not** self-hosting Postgres on the VPS for the hackathon — managed saves multiple hours and eliminates a backup-and-recovery burden.

## Locked operational choices

- Reverse proxy: **Caddy 2** (auto Let's Encrypt; one-line config).
- Output mode: **Next.js standalone** (`output: 'standalone'`) for ~150MB final image.
- Base image: **node:20-alpine**.
- Container user: non-root (`nextjs:1001`).
- Health check path: `/api/health` (no DB hit).
- Env file on VPS: `.env.production` (chmod 600, never committed).
- DB still via Supabase Pooler (port 6543, `pgbouncer=true`).

## Open Issues forwarded

- **OI-deploy.A** — TLS certificate domain. Caddyfile uses `{$DOMAIN}` env var; needs DNS A record pointed at VPS before first `docker compose up`.
- **OI-deploy.B** — Backup strategy for Supabase Postgres. Free tier is fine for hackathon; production needs scheduled `pg_dump` or paid Supabase backups. Out of MVP scope.
- **OI-deploy.C** — Image registry. For hackathon, building locally on the VPS via `docker compose build` is sufficient. Multi-host setup would require pushing to GHCR / Docker Hub.
- **OI-deploy.D** — Log aggregation. Docker stdout → `journalctl` is the MVP default. No external log shipper.
- **OI-deploy.E** — Concurrency / instance count. Single replica for MVP. If load demands more, add `replicas: N` + a load-balancer service in compose, or move to Swarm.

## Files

- Updated: `docs/architecture/technical-design.md` (§1, §2, §4, §9, §11, §13, §14, §15)
- Created: `docs/changes/2026-05-09-deployment-pivot-docker-vps/plan.md` (this file)
- Created: `docs/changes/2026-05-09-deployment-pivot-docker-vps/acceptance.md`

## Spec impact

None. The product spec (`docs/product_spec_ai_knowledge_assessment_platform.md`) does not name any deployment platform. v1.1 stays unchanged.

## Checkpoints

- [x] Decision rationale recorded
- [x] §1 architecture diagram updated
- [x] §2 stack table updated
- [x] §4 timeout language updated
- [x] §9 health endpoint added
- [x] §11 timeout language updated
- [x] §13 fully rewritten with Dockerfile + compose + Caddyfile + workflows
- [x] §14 folder structure updated
- [x] §15 dev workflow updated
- [x] Open Issues catalogued (OI-deploy.A–E)
- [x] plan.md written
- [x] acceptance.md written

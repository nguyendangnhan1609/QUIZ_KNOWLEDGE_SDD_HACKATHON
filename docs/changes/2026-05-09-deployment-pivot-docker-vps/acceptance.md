# Acceptance — Deployment Pivot: Vercel → Docker on VPS

Date: 2026-05-09
Slug: `2026-05-09-deployment-pivot-docker-vps`
Affected document: `docs/architecture/technical-design.md`

## Acceptance criteria

### A — All Vercel-specific references removed

- [x] §1.1 outer box is no longer "Vercel (Node runtime)"; now shows VPS + Caddy + app container.
- [x] §2 stack table no longer lists "Vercel (Pro)"; replaced by Docker + Docker Compose + Caddy 2 + Self-managed VPS rows.
- [x] §4.4 no longer says "Vercel Pro 60s timeout is the hard ceiling".
- [x] §11 row 11 no longer references Vercel killing the function.
- [x] §13 contains no Vercel mentions.
- [x] §15.2 no longer says "Vercel auto-deploys".

### B — Docker artifacts specified

- [x] `Dockerfile` (multi-stage: deps → builder → runner) included verbatim in §13.3.
- [x] `docker-compose.yml` with `app` + `caddy` services included in §13.4.
- [x] `Caddyfile` with `{$DOMAIN}` reverse-proxy block included in §13.5.
- [x] `.dockerignore` listed in §13.6.
- [x] Health endpoint route handler example included in §13.7 and added to §9.6.
- [x] `next.config.ts` with `output: 'standalone'` requirement noted in §13.2 and §14.

### C — Folder structure updated

- [x] `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore`, `.env.production`, `scripts/deploy.sh` listed in §14 tree.
- [x] `app/api/health/route.ts` added under `app/api/`.

### D — Operational guidance present

- [x] First-time VPS setup commands in §13.10.
- [x] Subsequent-deploy SSH one-liner in §13.10.
- [x] Rollback approach (image tagging) in §13.11.
- [x] Env strategy in §13.8 / §13.9 (`.env.production` on VPS, never committed).
- [x] DB still via Supabase Pooler (`pgbouncer=true`) — confirmed in §13.9 example.

### E — Spec preserved

- [x] `docs/product_spec_ai_knowledge_assessment_platform.md` unchanged.
- [x] All spec v1.1 decisions still reflected (incremental ID + cuid2 token, identifier collision suffix, public dashboard sharable by design, no preview UI, doc scope).

### F — Locked technical decisions still hold

- [x] Q1 (separate INT + cuid2) — unchanged.
- [x] Q2 (synchronous generation) — unchanged; just timeout source changed.
- [x] Q3 (proxy upload) — unchanged.

### G — SDD compliance

- [x] Living architecture doc edited in place at `docs/architecture/technical-design.md`.
- [x] Per-change deliverables placed in `docs/changes/2026-05-09-deployment-pivot-docker-vps/`.
- [x] No destructive operations.
- [x] No spec edits.

## Verified outputs

The technical design now describes a cleanly self-hostable deployment:

```
git clone <repo> /opt/quiz-knowledge && cd /opt/quiz-knowledge
# put .env.production in place
docker compose build && docker compose up -d
docker compose exec app pnpm prisma migrate deploy
```

…and HTTPS works automatically via Caddy + Let's Encrypt as soon as `DOMAIN` resolves to the VPS.

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-deploy.A | TLS / DNS pre-req: A record pointed at VPS before first up |
| OI-deploy.B | Postgres backup strategy beyond Supabase free tier |
| OI-deploy.C | Image registry vs build-on-VPS |
| OI-deploy.D | Log aggregation past `journalctl` |
| OI-deploy.E | Replicas / horizontal scale |

## Done

All acceptance criteria checked. Design doc is consistent and ready for hackathon implementation.

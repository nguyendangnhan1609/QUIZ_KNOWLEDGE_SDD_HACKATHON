# Plan — Deployment: Docker Compose (self-hosted)

Date: 2026-05-13
Slug: `2026-05-13-docker-deploy`
Driver: Team chọn self-hosted Docker Compose thay vì Vercel; Docker files đã có sẵn trong `quiz-knowledge/`.
Supersedes: `docs/changes/2026-05-09-rollback-to-vercel/` (Vercel deployment)

## Decision

**Deploy bằng Docker Compose tự host, bỏ Vercel.** Lệnh deploy:

```bash
cd quiz-knowledge/
docker compose --env-file .env.docker up -d --build
```

## Reasoning

| Input | Value | Implication |
|---|---|---|
| Docker files hiện có | `Dockerfile`, `docker-compose.yml`, `.env.docker` | Không cần tạo mới; chỉ cập nhật tài liệu |
| Self-hosted Postgres | `postgres:16-alpine` trong compose | Loại bỏ Supabase Postgres; không cần account/project ngoài |
| Supabase Storage | Optional (env var) | Giữ khả năng dùng cloud storage nếu cần; fallback local disk |
| Anthropic API | `ANTHROPIC_API_KEY` trong `.env.docker` | Claude được hỗ trợ bên cạnh OpenAI |

## What changes

| Section của `technical-design.md` | Thay đổi |
|---|---|
| §2 Technology Stack | Database row: Supabase Postgres → Self-hosted Postgres 16; Storage row: optional Supabase / local disk; Deployment row: Vercel → Docker Compose |
| §13 Deployment Architecture | Full rewrite: topology mới, env vars, migration tự động, deployment workflow |
| §14 Folder Structure | Thêm `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker` |
| §15.2 Branching | Bỏ "Vercel auto-deploys"; thay bằng deploy thủ công qua Docker |
| §15.4 Env setup checklist | Cập nhật theo `.env.docker` vars |

## What stays the same

- Spec v1.1 (không thay đổi).
- Database schema (§5).
- Document parsing pipeline (§6).
- AI generation pipeline (§7) — chỉ thêm `ANTHROPIC_API_KEY` optional.
- Randomization engine (§8).
- Tất cả API endpoints.
- Security model (§10).
- Error handling (§12).

## Key architecture differences vs. earlier Docker pivot (2026-05-09)

| Aspect | Pivot cũ (rejected) | Pivot hiện tại |
|---|---|---|
| Postgres | Supabase managed | Self-hosted `postgres:16-alpine` trong compose |
| Reverse proxy | Caddy 2 (Let's Encrypt) | Không có trong compose; để ngỏ (OI-13.B) |
| Node image | `node:20-alpine` | `node:22-alpine` |
| Package manager | npm | pnpm |
| Migration | `prisma migrate deploy` | `prisma db push` (tự động khi container start) |
| Output mode | `output: 'standalone'` | Standard Next.js output |

## Open Issues

- **OI-13.A** — ~~`.env.docker` có bị commit vào git không?~~ **Đã xác nhận: bảo vệ bởi `.env*` trong `.gitignore`. Closed.**
- **OI-13.B** — Reverse proxy / HTTPS/TLS: compose hiện tại expose thẳng port 3000, không có Caddy/Nginx. Cần reverse proxy nếu deploy production với domain thật.
- **OI-13.C** — `prisma db push` vs `prisma migrate deploy`: `db push` không giữ migration history, không an toàn cho data production. Cần chuyển sang `migrate deploy` nếu có dữ liệu cần bảo toàn.
- **OI-13.D** — Image registry: hiện tại build on-machine (VPS). Multi-host cần push lên GHCR / Docker Hub.

## Files

- Tạo mới: `docs/changes/2026-05-13-docker-deploy/plan.md` (file này)
- Cập nhật: `docs/architecture/technical-design.md` (§2, §13, §14, §15.2, §15.4)
- Không thay đổi: `docs/changes/2026-05-09-rollback-to-vercel/` (giữ lại làm lịch sử)

## Spec impact

Không. Product spec không đề cập platform deploy.

## Checkpoints

- [x] plan.md viết xong
- [x] §2 stack table cập nhật
- [x] §13 rewritten (topology, env vars, migration, workflow)
- [x] §14 folder structure cập nhật
- [x] §15.2 branching cập nhật
- [x] §15.4 env checklist cập nhật
- [x] Open Issues catalogued (OI-13.A–D)

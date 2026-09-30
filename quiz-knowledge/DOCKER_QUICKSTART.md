# Docker Quick Start

Quick start for running `quiz-knowledge` with Docker Compose.

## 1. Prepare environment

Work inside the project directory:

```bash
cd quiz-knowledge
```

Use `.env.docker` as the source of runtime configuration:

```bash
cp .env.docker .env.docker.local
```

You can also edit `.env.docker` directly if that is how you deploy on the server.

Important variables:

```env
POSTGRES_USER=quizuser
POSTGRES_PASSWORD=quizpass123
POSTGRES_DB=quiz_db
POSTGRES_PORT=5432

PORT=3000
OPENAI_API_KEY=your-openai-key

# Optional Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=quiz-assets

# Local upload fallback
LOCAL_STORAGE_DIR=.uploads
```

Notes:

- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are empty, uploads fall back to local disk.
- Local uploaded files are stored in `/app/.uploads` inside the app container.
- Docker Compose persists local uploads with the `app_uploads` volume.

## 2. Start services

Build and start:

```bash
docker compose --env-file .env.docker up -d --build
```

Check container status:

```bash
docker compose --env-file .env.docker ps
```

View logs:

```bash
docker compose --env-file .env.docker logs app --tail 100
docker compose --env-file .env.docker logs postgres --tail 100
```

## 3. Run database migrations

Apply Prisma migrations after the containers are up:

```bash
docker compose --env-file .env.docker exec app pnpm prisma migrate deploy
```

If you use seeding:

```bash
docker compose --env-file .env.docker exec app pnpm prisma db seed
```

## 4. Access the app

Open:

- `http://localhost:3000`
- `http://<server-ip>:3000`

Example:

- `http://192.168.249.38:3000`

## 5. Database connection

Current default Docker DB settings:

- Host from outside server: `192.168.249.38`
- Port: `5432`
- Database: `quiz_db`
- User: `quizuser`
- Password: `quizpass123`

Connection string:

```text
postgresql://quizuser:quizpass123@192.168.249.38:5432/quiz_db
```

Test inside the server:

```bash
docker compose --env-file .env.docker exec postgres pg_isready -U quizuser -d quiz_db
docker compose --env-file .env.docker exec postgres psql -U quizuser -d quiz_db -c "\conninfo"
```

## 6. Upload storage modes

### Option A: Supabase Storage

Set valid values in `.env.docker`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=quiz-assets
```

Requirements:

- The bucket must already exist in Supabase.
- Use the project URL root, not the `/rest/v1/` endpoint.

Correct:

```env
SUPABASE_URL=https://your-project.supabase.co
```

Wrong:

```env
SUPABASE_URL=https://your-project.supabase.co/rest/v1/
```

### Option B: Local disk fallback

Leave Supabase values empty:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LOCAL_STORAGE_DIR=.uploads
```

Check uploaded files:

```bash
docker compose --env-file .env.docker exec app sh -lc "find /app/.uploads -maxdepth 3 -type f | head"
```

## 7. Common commands

Start existing containers:

```bash
docker compose --env-file .env.docker up -d
```

Stop containers:

```bash
docker compose --env-file .env.docker down
```

Stop and remove volumes:

```bash
docker compose --env-file .env.docker down -v
```

Restart app:

```bash
docker compose --env-file .env.docker restart app
```

Open shell in app container:

```bash
docker compose --env-file .env.docker exec app sh
```

Open shell in postgres container:

```bash
docker compose --env-file .env.docker exec postgres sh
```

## 8. Backup database

Create SQL dump:

```bash
docker compose --env-file .env.docker exec postgres pg_dump -U quizuser -d quiz_db > backup.sql
```

## 9. Troubleshooting

### App does not start

```bash
docker compose --env-file .env.docker logs app --tail 200
docker compose --env-file .env.docker restart app
```

### Database issues

```bash
docker compose --env-file .env.docker logs postgres --tail 200
docker compose --env-file .env.docker exec app pnpm prisma migrate deploy
```

### Port conflict

Override app port:

```bash
PORT=3001 docker compose --env-file .env.docker up -d --build
```

Override postgres port:

```env
POSTGRES_PORT=5433
```

Then restart:

```bash
docker compose --env-file .env.docker up -d --build
```

### Upload fails

Check app logs:

```bash
docker compose --env-file .env.docker logs app --tail 200
```

If using Supabase:

- verify `SUPABASE_URL` is the project root URL
- verify `SUPABASE_SERVICE_ROLE_KEY` is valid
- verify bucket `quiz-assets` exists

If not using Supabase:

- set `SUPABASE_URL=`
- set `SUPABASE_SERVICE_ROLE_KEY=`
- confirm local upload directory exists via the `find /app/.uploads` command above

## 10. Next references

See also:

- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- [../docs/huong_dan_VN.md](../docs/huong_dan_VN.md)

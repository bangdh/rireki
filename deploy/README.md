# Deploy Rireki with Docker Compose

Everything runs from this folder on one VPS (recommended: Tokyo region, 4 vCPU / 8 GB / 160 GB SSD).
The architecture and the reasons behind each choice are in [`../docs/tech-stack.md`](../docs/tech-stack.md).

## 1. Prepare

```bash
cp .env.example .env            # fill in passwords, domain, SMTP, Anthropic key
# DNS: A  rireki.app → VPS,  A  *.rireki.app → VPS,  A  s3.rireki.app → VPS
```

## 2. Infrastructure only (works today)

```bash
docker compose up -d
docker compose ps
```

Starts Caddy, PostgreSQL, Redis, MinIO and the one-shot `minio-init` job (buckets, lifecycle rules,
application user). Caddy already serves the design mockups at `https://design.<DOMAIN>/`.
MinIO console: `ssh -L 9001:localhost:9001 <vps>` then open http://localhost:9001.

## 3. Full application (once `apps/web`, `apps/worker`, `apps/extractor` exist)

```bash
docker compose --profile app up -d --build
docker compose --profile app --profile prod up -d      # + nightly Postgres backups
docker compose --profile app --profile dev up -d       # + Mailpit at http://localhost:8025
```

Images are tagged `ghcr.io/bangdh/rireki-{web,worker,extractor}:${IMAGE_TAG}`. `web` serves the UI and the API. In CI, build and push them,
then on the server: `docker compose --profile app pull && docker compose --profile app up -d`.

## 4. Day-2 operations

| Task | Command |
|---|---|
| Logs | `docker compose logs -f api worker` |
| Database shell | `docker compose exec postgres psql -U $POSTGRES_USER $POSTGRES_DB` |
| Manual backup | `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB \| gzip > backup.sql.gz` |
| Mirror MinIO to AWS S3 | `mc alias set s3 https://s3.ap-northeast-1.amazonaws.com <key> <secret> && mc mirror --watch local/rireki-originals s3/rireki-originals` |
| Move to AWS S3 for good | set `S3_ENDPOINT`/`S3_PUBLIC_ENDPOINT` to the AWS endpoint, `S3_FORCE_PATH_STYLE=false`, restart `api` and `worker` |
| Rotate app S3 credentials | change `S3_ACCESS_KEY`/`S3_SECRET_KEY` in `.env`, `docker compose up -d minio-init api worker` |

## 5. Buckets

| Bucket | Access | Lifecycle |
|---|---|---|
| `rireki-originals` | private, versioned | kept |
| `rireki-media` (HLS, posters) | private | kept |
| `rireki-renders` (履歴書 page images) | private | expire after 90 days |
| `rireki-uploads` (in-progress uploads) | private | expire after 1 day |
| `rireki-public` (tenant logos) | public read | kept |

Browsers never talk to MinIO directly except through short-lived presigned URLs on `s3.<DOMAIN>`.

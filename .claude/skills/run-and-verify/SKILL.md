---
name: run-and-verify
description: How to run the Rireki stack locally (docker compose infra, pnpm dev, migrations, seed, test accounts), the checks that must pass (typecheck, lint, vitest, build), the Playwright e2e flows, and how to verify a feature against its mockup. Load before integrating, testing or smoke-testing.
---
# Run and verify

## Infra and app

```bash
cp deploy/.env.example deploy/.env    # edit passwords; APP_DOMAIN=localhost:3000 for dev
docker compose -f deploy/docker-compose.yml --env-file deploy/.env --profile dev up -d postgres redis minio minio-init mailpit
pnpm install
pnpm --filter @rireki/db migrate:dev && pnpm --filter @rireki/db seed
pnpm dev
```
Open `http://saoviet.localhost:3000` (seeded tenant). Mailpit UI: `http://localhost:8025`. MinIO console:
`http://localhost:9001`. Extractor: `cd apps/extractor && uvicorn main:app --reload` (or the docker profile).

Seed (`packages/db/seed.ts`): tenant `saoviet` (Sao Việt Manpower, prefix SV), admin
`huong.nguyen@saoviet.vn` / `Rireki-demo-2026`, user `trang.pham@saoviet.vn` / same, the 8 candidates from
`app/candidates.html` with CV bodies from the mockup, 3 share links from `app/shares.html` with a few view events.
Idempotent (upsert by code/email/token).

## Cloud container (no Docker)

When the repo is built inside the Claude Code cloud container (the `build-rireki` workflow) there is no Docker
daemon. Do not run `docker compose`; these services are already running on localhost and are shared by all agents:

| Service | Use |
|---|---|
| PostgreSQL 16 | `DATABASE_URL=postgresql://rireki:rireki@localhost:5432/rireki` (superuser; Prisma may create its shadow DB) |
| Redis 7 | `REDIS_URL=redis://localhost:6379` |
| S3 (moto server, S3-compatible, no auth check) | `S3_ENDPOINT=http://127.0.0.1:9000`, `S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000`, `S3_ACCESS_KEY=minioadmin`, `S3_SECRET_KEY=minioadmin`, `S3_REGION=us-east-1`, `forcePathStyle: true`. Buckets `rireki-originals rireki-media rireki-renders rireki-uploads rireki-public` exist. If it is down: `/opt/moto/bin/moto_server -p 9000 -H 127.0.0.1 &` and recreate the buckets with boto3 from `/opt/moto/bin/python` |
| Mail | no SMTP: with `SMTP_URL` empty, nodemailer must use `jsonTransport` and log the message |
| Binaries | `ffmpeg` 6.1, `tesseract` 5 (`ben eng ind jpn mya vie`), `pdftoppm` (poppler) are on PATH |
| Browsers | Playwright **1.56.1** browsers in `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is set): pin `@playwright/test@1.56.1`, never run `playwright install` |
| Unreachable | `huggingface.co` (no Docling/transformer models), GitHub release downloads (no YuNet ONNX, MinIO or Mailpit binaries); `ANTHROPIC_API_KEY` is not set, so Claude calls are mocked in tests |
| Ports | web 3000 (`http://saoviet.localhost:3000`), extractor 8000; a feature agent that needs its own dev server uses 3001–3010 and stops it afterwards |
| Hostname | Chromium resolves `*.localhost` by itself; curl / Node (Playwright `request`) need `127.0.0.1 saoviet.localhost` in `/etc/hosts` (already added in this container, re-add if missing) |
| Git | the orchestrator commits after each phase; agents never commit, stash, checkout, reset or clean |

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm --filter @rireki/web e2e            # needs the stack running; PLAYWRIGHT_BASE_URL=http://saoviet.localhost:3000
cd apps/extractor && pytest
```
CI (`.github/workflows/ci.yml`) runs the same on every push against Postgres/Redis/MinIO started from
`deploy/docker-compose.yml`, then `migrate:deploy` + `seed` and the Playwright e2e against `next start`, and builds
the three images on `main`.

## Playwright e2e (apps/web/e2e/*.spec.ts) — the four flows

1. `auth.spec.ts`: login as admin → dashboard shows KPIs; wrong password shows error; `/settings/members` is 403
   for the user role.
2. `candidate.spec.ts`: new candidate via the 7-step form (fill step 1–2, skip optional, review, create) → detail
   shows code `SV00xxxx` and the 履歴書 tab in Japanese; switch UI language to `my` and check the form labels.
3. `share.spec.ts`: create a link with 2 candidates, password, view-only, expiry → copy page shows the URL.
4. `viewer.spec.ts`: open the URL in a fresh context → gate asks password + identity → list → detail: the CV is
   served as images (`img[src*="/cv/"]`), right-click is blocked (`contextmenu` default prevented), no download
   button; mark "Interested" → tenant's share-detail shows 1 interest and the viewer log.

## Verifying against a mockup

Open the mockup HTML and the implemented page side by side at 1280px and 400px. Checklist: same sections and
order, same labels (5 languages), same empty/loading/error states where the mockup shows them, no raw i18n keys,
no horizontal scroll at 400px, keyboard focus visible, dark theme readable.

## Troubleshooting

- Subdomain not resolving: use `*.localhost`, not `/etc/hosts`; Safari needs an explicit entry.
- Presigned PUT fails with CORS: check `MINIO_API_CORS_ALLOW_ORIGIN` and that the URL was signed with
  `S3_PUBLIC_ENDPOINT`.
- HLS not playing: manifest segments must be absolute presigned URLs; check TTL and clock skew.

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

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm --filter @rireki/web e2e            # needs the stack running; PLAYWRIGHT_BASE_URL=http://saoviet.localhost:3000
cd apps/extractor && pytest
```
CI (`.github/workflows/ci.yml`) runs the same on every push, with Postgres/Redis/MinIO as services, then builds
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

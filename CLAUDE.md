# Rireki — rules for every agent working in this repo

Rireki is a SaaS for sending organizations (VN/MM/BD/ID) that manage trainees' 履歴書 (CV), self-introduction
videos and send password-protected, view-only links to clients in Japan. The design package in this repo is the
spec: `index.html` (sitemap, roles, flows, data model), the mockups in `app/`, `public/`, `viewer/`, the strings in
`assets/i18n.js`, the stack in `docs/tech-stack.md`, the deployment in `deploy/`. Phase 1 is free for all tenants.

## Golden rule: the simplest thing that works, with the least code

- Prefer a well-maintained library over writing code. Before writing more than ~50 lines of generic logic
  (auth, uploads, queues, OCR, PDF, i18n, validation, email), search for a library first and use it.
- Prefer one app over two: the web app serves the UI **and** the API (Next.js Route Handlers / Server Actions).
  There is no separate API server.
- Prefer JSON columns validated by zod over dozens of relational tables when the data is read as a whole
  (the CV body is one `Json` column).
- Prefer the mockup's existing CSS and markup over re-styling: copy `assets/style.css` as global CSS and port
  the mockup HTML to React components class-for-class. No Tailwind, no component library.
- Do not build: a custom auth system, a custom queue, a custom OCR, a custom PDF renderer, an admin panel for
  Rireki staff, billing, 2FA, SSO, a mobile app. Out of scope for phase 1.
- When two options differ in effort, pick the smaller one and leave a `// TODO(phase2):` note instead of
  building for the future.
- Delete code you replace. Don't leave two ways of doing the same thing.

## Decisions (do not re-litigate)

| Concern | Decision |
|---|---|
| Monorepo | pnpm workspaces: `apps/web`, `apps/worker`, `apps/extractor`, `packages/db`, `packages/shared` |
| Web + API | Next.js 15 (App Router, TypeScript), Route Handlers under `app/api/*`, Server Actions for forms |
| Styling | `assets/style.css` copied to `apps/web/app/globals.css`; markup ported from mockups |
| i18n | `next-intl`; messages generated from `assets/i18n.js` into `packages/shared/messages/{en,ja,vi,id,my}.json` (flat `a.b` keys → nested objects) |
| Auth | `better-auth` (email + password, `organization` plugin = tenant; roles `owner/admin` → Admin, `member` → User). No 2FA. |
| Tenant | subdomain `{slug}.{DOMAIN}` resolved in `middleware.ts` → header `x-tenant`; every DB query filters by `tenantId` |
| Database | PostgreSQL 16 + Prisma in `packages/db` (schema, migrations, seed). CV body = `Json` validated by zod schema in `packages/shared` |
| Validation | `zod` everywhere; the 履歴書 schema lives once in `packages/shared/src/cv.ts` |
| Files | MinIO/S3 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`; browser uploads with presigned PUT; keys `tenants/{tenantId}/candidates/{candidateId}/{kind}/{file}` |
| Queue | BullMQ on Redis; worker = `apps/worker` (plain Node, same Prisma client) |
| Video | `ffmpeg` CLI → HLS 720p + poster, static watermark (candidate code) via drawtext; player `hls.js` |
| CV render | Next.js print route `/print/candidates/{id}` (same React component) → worker screenshots pages with Playwright (Chromium) → PNG in `rireki-renders`; per-viewer watermark composited with `sharp` at request time |
| Extraction | `apps/extractor` (Python 3.12, FastAPI, Docling, Tesseract, OpenCV/YuNet) returns Markdown + confidence + photo; template CVs mapped by rules; otherwise Claude `claude-opus-5-5` via `@anthropic-ai/sdk` with structured output (JSON schema from zod) |
| Email | `nodemailer` (SMTP from env); Mailpit in dev |
| Candidate code | `AZ123456` = tenant prefix (2 capital letters) + 6-digit counter in `tenants.nextCode`, assigned in a transaction |
| Tests | Vitest for pure logic (code generator, template mapping, zod); Playwright e2e for: login, create candidate, create share link, open link as client |
| Charts | inline SVG components ported from `assets/app.js` |
| Deployment | `deploy/docker-compose.yml`; images `ghcr.io/bangdh/rireki-{web,worker,extractor}` |

## Layout

```
apps/web          Next.js: app/(public) landing+signup · app/(tenant) dashboard,candidates,shares,settings · app/s/[token] viewer · app/api/* · app/print/*
apps/worker       BullMQ processors: media (ffmpeg), render (Playwright+sharp), extract (extractor+Claude), mail
apps/extractor    Python FastAPI: POST /extract
packages/db       prisma/schema.prisma, migrations, seed.ts, exports PrismaClient
packages/shared   zod schemas (cv.ts, shareLink.ts), messages/*.json, constants (statuses, buckets)
design/           (unchanged) the HTML mockups = the spec
deploy/           docker compose, Caddyfile, Dockerfiles
```

## Commands

```bash
pnpm install
docker compose -f deploy/docker-compose.yml --profile dev up -d postgres redis minio minio-init mailpit
pnpm --filter @rireki/db migrate:dev && pnpm --filter @rireki/db seed
pnpm dev                      # web on :3000, worker, extractor (uvicorn :8000)
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @rireki/web e2e # Playwright
```

## Definition of done (every feature)

1. Matches the mockup page it implements (same sections, labels, states) and works in all 5 languages.
2. Every query/route is scoped by `tenantId` and checks the session role; client viewer routes check the link token/password/expiry.
3. Zod validation on every input; errors shown in the form.
4. Works on a 400px-wide screen (the CSS already handles it; don't add fixed widths).
5. `pnpm typecheck`, `pnpm lint`, `pnpm test` pass; new logic has a Vitest test when it is pure; e2e updated when a flow changes.
6. No secrets in code; config via env (see `deploy/.env.example`).
7. Commit with a clear message on the current branch. Do not force-push.

## Path ownership when agents work in parallel

- lane **tenant-app**: `apps/web/app/(tenant)/candidates/**`, `apps/web/app/(tenant)/settings/**`, `apps/web/app/api/candidates/**`, `apps/web/lib/candidates/**`
- lane **client-side**: `apps/web/app/s/**`, `apps/web/app/(tenant)/shares/**`, `apps/web/app/api/shares/**`, `apps/web/app/api/s/**`, `apps/web/lib/shares/**`
- lane **media**: `apps/worker/**`, `apps/web/app/api/uploads/**`, `apps/web/app/print/**`, `apps/web/lib/storage/**`
- lane **extractor**: `apps/extractor/**`, `apps/web/app/(tenant)/candidates/import/**`, `apps/web/lib/extraction/**`
- Shared files (`packages/*`, `apps/web/app/layout.tsx`, nav, `package.json`) are edited only in the scaffold/foundation/integration steps, never by two lanes at once. Need a shared helper? Create it under your lane's `lib/` folder.

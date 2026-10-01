---
name: rireki-conventions
description: The decision table, repo layout, commands, definition of done and path ownership for the Rireki codebase. Load at the start of any coding task in this repo when CLAUDE.md is not already in context.
---
# Rireki conventions

Everything in `CLAUDE.md` at the repo root applies (golden rule: simplest, least code, library first). This skill
adds the details agents ask about most.

## Package naming and scripts

| Package | Name | Scripts |
|---|---|---|
| `apps/web` | `@rireki/web` | `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`next lint`), `test` (vitest), `e2e` (playwright) |
| `apps/worker` | `@rireki/worker` | `dev` (tsx watch), `build` (tsup), `start`, `typecheck`, `test` |
| `apps/extractor` | python | `uvicorn main:app --reload`, `pytest` |
| `packages/db` | `@rireki/db` | `migrate:dev`, `migrate:deploy`, `seed`, `generate`, `studio` |
| `packages/shared` | `@rireki/shared` | `build` (tsup), `test` |

Root `package.json` scripts fan out with `pnpm -r --parallel` for `dev` and `pnpm -r` for `typecheck`, `lint`,
`test`, `build`. Node 22, pnpm 9, TypeScript strict.

## Libraries (use these, don't write equivalents)

`next`, `react`, `next-intl`, `better-auth` (+ `organization` plugin), `@prisma/client`, `zod`,
`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `bullmq`, `ioredis`, `nodemailer`, `hls.js`, `sharp`,
`playwright` (worker), `@anthropic-ai/sdk`, `nanoid`, `date-fns`, `zod-to-json-schema`, `vitest`,
`@playwright/test`. Python: `fastapi`, `uvicorn`, `docling`, `pdfplumber`, `pypdf`, `opencv-python-headless`,
`pillow`, `pillow-heif`, `boto3`.

Not allowed: NestJS, Tailwind/shadcn, Redux, GraphQL, ORMs other than Prisma, custom session/auth code, LibreOffice
for our own template, AGPL/GPL Python libraries linked into the extractor (PyMuPDF, MinerU, Marker, Surya).

## Naming

- Routes: kebab-case folders; `app/(tenant)/candidates/[id]/page.tsx`; API `app/api/candidates/[id]/route.ts`.
- DB: PascalCase models, camelCase fields, `tenantId` on every tenant-owned model, `createdAt/updatedAt`.
- Env: `UPPER_SNAKE`, read once in `lib/env.ts` with zod; never `process.env` elsewhere.
- i18n keys: keep the mockup keys (`nav.dashboard`, `form.s1`, …); namespaces = first segment.
- Commits: `feat(candidates): 7-step form`, `fix(viewer): block print`, `chore: deps`.

## Definition of done

See CLAUDE.md. In addition: a feature is not done until the page is reachable from the nav or the flow that the
sitemap (`index.html`) shows, and until `pnpm build` succeeds.

## When you are unsure

Pick the option with fewer files and fewer lines, write a `// TODO(phase2):` comment for the richer option, and
move on. Do not ask the user.

# BullMQ worker (apps/worker): video → HLS (ffmpeg), 履歴書 pages → PDF + PNG (Playwright page.pdf of the web print route + pdftoppm),
# CV extraction orchestration, mail. Debian-based for ffmpeg, Chromium and JP / Myanmar / Bengali fonts.
# Build context: the repo root (pnpm workspace). The same image runs `prisma migrate deploy` (compose `migrate`).
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile          # root postinstall generates the Prisma client
RUN pnpm --filter @rireki/worker build \
 && pnpm --filter @rireki/worker deploy --legacy --prod /out   # dist/, node_modules/.bin/prisma, node_modules/@rireki/db/prisma*

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg poppler-utils fonts-dejavu-core fonts-noto-cjk fonts-noto-core fonts-noto-ui-core fonts-beng fonts-noto-extra \
      ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx --yes playwright@1.56.1 install --with-deps chromium
RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=build --chown=app:app /out /app
USER app
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]

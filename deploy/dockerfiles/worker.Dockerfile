# BullMQ worker (apps/worker): video → HLS, 履歴書 pages → PNG (Playwright screenshots of the web print route),
# CV extraction orchestration, mail. Debian-based for ffmpeg, Chromium and JP / Myanmar / Bengali fonts.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg fonts-noto-cjk fonts-noto-core fonts-noto-ui-core fonts-beng fonts-noto-extra \
      ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx --yes playwright@1.56.0 install --with-deps chromium
RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./
USER app
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]

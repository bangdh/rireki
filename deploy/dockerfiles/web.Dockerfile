# Next.js (apps/web) — multi-stage, standalone output. Build context: the repo root (pnpm workspace).
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN mkdir -p apps/web/public                # may be absent from the context (git keeps no empty dirs)
RUN pnpm install --frozen-lockfile          # root postinstall generates the Prisma client
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder env: `next build` imports route modules (lib/env.ts validates env at import) while collecting page
# data. Nothing from this file is baked into the output; runtime env comes from docker compose.
RUN cp .env.example .env && pnpm --filter @rireki/web build && rm .env

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]

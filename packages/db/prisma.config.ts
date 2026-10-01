import { defineConfig } from "prisma/config";

// Local dev reads the root .env; injected env (Docker, CI) always wins because loadEnvFile never overrides.
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

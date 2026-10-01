import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

// Local dev reads the root .env; variables already set (Docker, CI) are never overridden and a missing file is fine.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@rireki/db", "@rireki/shared"],
};

// next-intl without i18n routing: the locale comes from ./i18n/request.ts (cookie set by <LangSwitch/>).
export default createNextIntlPlugin()(nextConfig);

import { z } from "zod";

// Local dev reads the root .env; variables already set (Docker, CI) are never overridden and a missing file is fine.
try {
  process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {}

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

// The only process.env read in apps/worker.
export const env = z
  .object({
    REDIS_URL: z.string(),
    DATABASE_URL: z.string(),
    S3_ENDPOINT: z.url(),
    S3_PUBLIC_ENDPOINT: z.url(),
    S3_REGION: z.string(),
    S3_FORCE_PATH_STYLE: bool,
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_BUCKET_ORIGINALS: z.string(),
    S3_BUCKET_MEDIA: z.string(),
    S3_BUCKET_RENDERS: z.string(),
    S3_BUCKET_UPLOADS: z.string(),
    S3_BUCKET_PUBLIC: z.string(),
    WORKER_CONCURRENCY: z.coerce.number().default(2),
    WEB_INTERNAL_URL: z.url(),
    RENDER_SECRET: z.string().min(32), // sent as x-render-key to the web print route; same rule as apps/web/lib/env.ts
    EXTRACTOR_URL: z.url(),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string(),
    // ffmpeg drawtext font for the static video watermark (ASCII text, so DejaVu from fonts-dejavu-core is enough)
    WATERMARK_FONT: z.string().default("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
  })
  .parse(process.env);

import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

// Server-only. The only process.env read in apps/web; next.config.ts loads the root .env first.
export const env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_DOMAIN: z.string(),
    APP_URL: z.url(),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
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
    SESSION_SECRET: z.string().min(32),
    RENDER_SECRET: z.string(),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string(),
  })
  .parse(process.env);

-- Additive: notes and activity details for candidate audit events (tenant-app lane). Idempotent so a psql apply and `prisma migrate` can both run it.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "meta" JSONB;

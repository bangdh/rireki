-- Additive: Branch label of members and invitations (app/settings-members.html, auth-tenant lane). Idempotent so a psql apply and `prisma migrate` can both run it.
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "branch" TEXT;

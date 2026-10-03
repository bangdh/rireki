import { requireMember } from "@/lib/tenant";

/**
 * The session every import page, route and action runs under: any signed-in member may import (the mockup marks nothing
 * Admin-only here). requireMember() (auth-tenant lane) redirects visitors to /login and non-members to /login?error=no_access.
 */
export async function requireImportSession(): Promise<{ tenantId: string; userId: string; codePrefix: string; nextCode: number }> {
  const { tenant, user } = await requireMember();
  return { tenantId: tenant.id, userId: user.id, codePrefix: tenant.settings.codePrefix, nextCode: tenant.settings.nextCode };
}

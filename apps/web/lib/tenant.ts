import { prisma } from "@rireki/db";
import { BUCKETS } from "@rireki/shared";
import { headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { parseOrgMeta } from "./auth-schemas";
import { env } from "./env";

/** The subdomain of this request, set by middleware.ts (null on the root domain). */
export const tenantSlug = async () => (await headers()).get("x-tenant");

/** Organization + TenantSettings + parsed metadata of the current subdomain; 404 when there is none. Cached per request. */
export const getTenant = cache(async () => {
  const slug = await tenantSlug();
  const org = slug ? await prisma.organization.findUnique({ where: { slug } }) : null;
  const settings = org ? await prisma.tenantSettings.findUnique({ where: { tenantId: org.id } }) : null;
  if (!org || !settings) notFound();
  return { id: org.id, slug: org.slug, name: org.name, settings, meta: parseOrgMeta(org.metadata) };
});
export type Tenant = Awaited<ReturnType<typeof getTenant>>;

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type Role = "admin" | "user";

/** Signed-in member of the current tenant: owner/admin → "admin", member → "user"; otherwise redirects to /login. */
export const requireMember = cache(async () => {
  const tenant = await getTenant();
  const session = await getSession();
  if (!session) redirect("/login");
  const member = await prisma.member.findFirst({ where: { organizationId: tenant.id, userId: session.user.id }, select: { role: true } });
  if (!member || member.role === "suspended") redirect("/login?error=no_access");
  const role: Role = member.role === "member" ? "user" : "admin";
  return { tenant, user: session.user, role };
});

/** Admin-only pages, actions and routes → HTTP 403 (app/forbidden.tsx or settings/forbidden.tsx) for the User role. */
export async function requireRole(role: "admin") {
  const member = await requireMember();
  if (member.role !== role) forbidden();
  return member;
}

export const clientIp = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;

/** AuditLog row for the current member and tenant. Vocabulary: auth.login, member.*, settings.*, link.*, candidate.*, video.upload. */
export async function audit(action: string, target?: string | null) {
  const { tenant, user } = await requireMember();
  await prisma.auditLog.create({ data: { tenantId: tenant.id, userId: user.id, action, target: target ?? null, ip: await clientIp() } });
}

export const tenantUrl = (slug: string) => `${new URL(env.APP_URL).protocol}//${slug}.${env.APP_DOMAIN}`;
export const tenantDomain = (slug: string) => `${slug}.${env.APP_DOMAIN}`;
/** Public URL of an object in the public bucket (tenant logos); `version` busts the browser cache after a re-upload. */
export const logoUrl = (key: string, version?: Date) => `${env.S3_PUBLIC_ENDPOINT}/${BUCKETS.public}/${key}${version ? `?v=${version.getTime()}` : ""}`;

"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@rireki/db";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AcceptInviteInput, zodErrorMap } from "@/lib/auth-schemas";
import { clientIp, getSession, getTenant } from "@/lib/tenant";

export type AcceptState = { error?: string };

/**
 * Invitation accept: a new user sets the password and is signed in; an existing user must already be signed in as the
 * invitee (the page sends them through /login first, as better-auth's own acceptInvitation requires), so no password is
 * ever checked outside the rate-limited sign-in endpoint.
 * Member + invitation are written with Prisma (2 lines) instead of acceptInvitation, which needs the new session's cookies re-threaded.
 */
export async function acceptInvitation(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const t = await getTranslations("auth");
  const tenant = await getTenant();
  const id = String(formData.get("invitationId") ?? "");
  const invitation = await prisma.invitation.findFirst({ where: { id, organizationId: tenant.id, status: "pending", expiresAt: { gt: new Date() } } });
  if (!invitation) return { error: t("invite_invalid") };

  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  let userId: string;
  let password: string | undefined;
  if (existing) {
    if ((await getSession())?.user.email !== invitation.email) redirect(`/login?next=/login/invite/${id}`);
    userId = existing.id;
  } else {
    const parsed = AcceptInviteInput.safeParse(Object.fromEntries(formData), zodErrorMap(await getLocale()));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("err_invalid") };
    password = parsed.data.password;
    const { user } = await auth.api.signUpEmail({ body: { name: parsed.data.name ?? invitation.email.split("@")[0], email: invitation.email, password } });
    userId = user.id;
  }
  // TODO(phase2): an existing user of another tenant would now belong to two organizations.
  await prisma.$transaction([
    prisma.member.create({ data: { id: randomUUID(), organizationId: tenant.id, userId, role: invitation.role ?? "member", branch: invitation.branch, createdAt: new Date() } }),
    prisma.invitation.update({ where: { id }, data: { status: "accepted" } }),
  ]);
  // Signs the new user in and sets the session cookie (nextCookies) with a password this action has just set: no oracle.
  if (password) await auth.api.signInEmail({ body: { email: invitation.email, password }, headers: await headers() });
  // audit() reads the session from the request cookies, which do not carry the session created above yet.
  await prisma.auditLog.create({ data: { tenantId: tenant.id, userId, action: "member.join", target: invitation.email, ip: await clientIp() } });
  redirect("/dashboard");
}

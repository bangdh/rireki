"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@rireki/db";
import { addDays } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendInvitationMail } from "@/lib/auth-mail";
import { asLocale, InviteInput, MemberRoleInput, zodErrorMap } from "@/lib/auth-schemas";
import { audit, requireRole, tenantUrl } from "@/lib/tenant";

const PATH = "/settings/members";
const INVITE_DAYS = 7;
const isAdmin = (role: string) => role === "owner" || role === "admin";
const inviteUrl = (slug: string, id: string) => `${tenantUrl(slug)}/login/invite/${id}`;

export type InviteState = { ok?: boolean; error?: string };

/** Invite modal: one invitation per address; existing members are skipped, a pending invitation is renewed (resend). */
export async function invite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { tenant, user: me } = await requireRole("admin");
  const t = await getTranslations("members");
  const parsed = InviteInput.safeParse(Object.fromEntries(formData), zodErrorMap(await getLocale()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { emails, role, lang, branch = null } = parsed.data;

  const members = await prisma.member.findMany({ where: { organizationId: tenant.id, user: { email: { in: emails } } }, select: { user: { select: { email: true } } } });
  const taken = new Set(members.map((m) => m.user.email));
  const skipped: string[] = [];
  for (const email of emails) {
    if (taken.has(email)) {
      skipped.push(email);
      continue;
    }
    const expiresAt = addDays(new Date(), INVITE_DAYS);
    const pending = await prisma.invitation.findFirst({ where: { organizationId: tenant.id, email, status: "pending" } });
    const invitation = pending
      ? await prisma.invitation.update({ where: { id: pending.id }, data: { expiresAt, role, branch } })
      : await prisma.invitation.create({ data: { id: randomUUID(), organizationId: tenant.id, email, role, branch, status: "pending", expiresAt, inviterId: me.id } });
    await sendInvitationMail(lang, { to: email, org: tenant.name, inviter: me.name, url: inviteUrl(tenant.slug, invitation.id) });
    await audit(pending ? "member.resend" : "member.invite", `${email} (${role})`);
  }
  revalidatePath(PATH);
  return { ok: skipped.length < emails.length, error: skipped.length ? t("err_already", { emails: skipped.join(", ") }) : undefined };
}

async function pendingInvitation(id: string, tenantId: string) {
  const invitation = await prisma.invitation.findFirst({ where: { id, organizationId: tenantId, status: "pending" } });
  if (!invitation) redirect(PATH);
  return invitation;
}

export async function resendInvite(id: string) {
  const { tenant, user: me } = await requireRole("admin");
  const invitation = await pendingInvitation(id, tenant.id);
  await prisma.invitation.update({ where: { id }, data: { expiresAt: addDays(new Date(), INVITE_DAYS) } });
  await sendInvitationMail(asLocale(tenant.settings.defaultLang), { to: invitation.email, org: tenant.name, inviter: me.name, url: inviteUrl(tenant.slug, id) });
  await audit("member.resend", invitation.email);
  revalidatePath(PATH);
}

export async function cancelInvite(id: string) {
  const { tenant } = await requireRole("admin");
  const invitation = await pendingInvitation(id, tenant.id);
  await prisma.invitation.update({ where: { id }, data: { status: "canceled" } });
  await audit("member.cancel_invite", invitation.email);
  revalidatePath(PATH);
}

async function memberOf(id: string, tenantId: string) {
  const member = await prisma.member.findFirst({ where: { id, organizationId: tenantId }, include: { user: { select: { email: true } } } });
  if (!member) redirect(PATH);
  return member;
}

/** members.roles_d: you cannot act on yourself, and the last owner/admin cannot be demoted, suspended or removed. */
async function guard(tenantId: string, meId: string, member: { userId: string; role: string }) {
  if (member.userId === meId) redirect(`${PATH}?error=roles_d`);
  if (!isAdmin(member.role)) return;
  const admins = await prisma.member.count({ where: { organizationId: tenantId, role: { in: ["owner", "admin"] } } });
  if (admins <= 1) redirect(`${PATH}?error=roles_d`);
}

export async function setRole(formData: FormData) {
  const { tenant, user: me } = await requireRole("admin");
  const parsed = MemberRoleInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(PATH);
  const { memberId, role } = parsed.data;
  const member = await memberOf(memberId, tenant.id);
  if (role === "admin" && isAdmin(member.role)) return; // an owner stays owner
  if (role === "admin") {
    if (member.userId === me.id) redirect(`${PATH}?error=roles_d`);
  } else await guard(tenant.id, me.id, member);
  await prisma.member.update({ where: { id: memberId }, data: { role } });
  await audit("member.role", `${member.user.email} → ${role}`);
  revalidatePath(PATH);
}

export async function suspendMember(id: string) {
  const { tenant, user: me } = await requireRole("admin");
  const member = await memberOf(id, tenant.id);
  await guard(tenant.id, me.id, member);
  // "suspended" is a Member.role value: better-auth grants it nothing and requireMember() turns them away; sessions end now.
  await prisma.$transaction([prisma.member.update({ where: { id }, data: { role: "suspended" } }), prisma.session.deleteMany({ where: { userId: member.userId } })]);
  await audit("member.suspend", member.user.email);
  revalidatePath(PATH);
}

export async function reactivateMember(id: string) {
  const { tenant } = await requireRole("admin");
  const member = await memberOf(id, tenant.id);
  await prisma.member.update({ where: { id }, data: { role: "member" } }); // the original role is not restored: admins re-promote
  await audit("member.reactivate", member.user.email);
  revalidatePath(PATH);
}

export async function removeMember(id: string) {
  const { tenant, user: me } = await requireRole("admin");
  const member = await memberOf(id, tenant.id);
  await guard(tenant.id, me.id, member);
  await prisma.$transaction([prisma.member.delete({ where: { id } }), prisma.session.deleteMany({ where: { userId: member.userId } })]);
  await audit("member.remove", member.user.email);
  revalidatePath(PATH);
}

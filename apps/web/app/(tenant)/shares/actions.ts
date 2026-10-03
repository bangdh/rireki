"use server";

// Server Actions of the share links (client-side lane). Every Prisma call carries tenantId; revoke/extend/update/resend
// need canManage() (admin or creator); each writes an AuditLog row share_link.<verb>.
import { prisma, type Prisma } from "@rireki/db";
import { LinkDefaults, ShareLinkInput, type ShareLinkValues } from "@rireki/shared";
import { hashPassword } from "better-auth/crypto";
import { addDays } from "date-fns";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { forbidden, notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { toDataURL } from "qrcode";
import { z } from "zod";
import { firstErrors, linkInputFromForm } from "@/lib/shares/form";
import { applyLinkDefaults, canManage, passwordRequired } from "@/lib/shares/link";
import { clientEmailDraft, enqueueMail } from "@/lib/shares/mail";
import { linkUrl } from "@/lib/shares/queries";
import { audit, requireMember } from "@/lib/tenant";

export type LinkCreated = {
  id: string;
  token: string;
  name: string;
  url: string;
  password: string | null; // shown once, on step 3; only the hash is stored
  qrDataUrl: string;
  draft: { to: string; subject: string; body: string };
  candidateCount: number;
  downloadAllowed: boolean;
  hasPassword: boolean;
  expiresAt: string | null;
};
export type FieldErrors = Record<string, string>;
export type LinkFormState = { ok: false; fieldErrors: FieldErrors } | ({ ok: true } & LinkCreated) | null;
export type SendState = { ok: false; fieldErrors: FieldErrors } | { ok: true; to: string } | null;

const bust = () => {
  revalidatePath("/shares", "layout");
  revalidatePath("/dashboard");
};

/** zod's own messages in the UI language (zod ships en/ja/vi/id; others fall back to English). */
async function errorMap() {
  const locale = await getLocale();
  return (z.locales as Record<string, (() => { localeError: z.core.$ZodErrorMap }) | undefined>)[locale]?.().localeError;
}

/** The localized "required" message for the password field (a locked tenant default demands one). */
const passwordMissing = (error: z.core.$ZodErrorMap | undefined) => ({ password: z.string().min(8).safeParse(undefined, { error }).error?.issues[0]?.message ?? "Required" });

/** ShareLink columns from validated values (shared by create and update). */
function columns(v: Omit<ShareLinkValues, "candidateIds" | "password">) {
  return {
    name: v.name,
    clientCompany: v.clientCompany ?? null,
    clientName: v.clientName ?? null,
    clientEmail: v.clientEmail ?? null,
    message: v.message ?? null,
    viewerLang: v.viewerLang,
    requireIdentity: v.requireIdentity,
    allowedDomains: v.allowedDomains,
    downloadAllowed: v.downloadAllowed,
    expiresAt: v.expiresAt ?? null,
    maxViews: v.maxViews ?? null,
    sections: v.sections as Prisma.InputJsonObject,
    notifyFirstView: v.notifyFirstView,
    notifyInterest: v.notifyInterest,
  };
}

/** The link of this tenant the current member may manage (admin or creator): 404 / 403 otherwise. */
async function managed(id: string) {
  const { tenant, user, role } = await requireMember();
  const link = await prisma.shareLink.findFirst({ where: { id, tenantId: tenant.id } });
  if (!link) notFound();
  if (!canManage(link, user.id, role)) forbidden();
  return { tenant, user, link };
}

/** Step 2 → 3 of app/share-new.html: validates ShareLinkInput, enforces the locked tenant defaults, hashes the password. */
export async function createShareLink(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const { tenant, user } = await requireMember();
  const defaults = LinkDefaults.parse(tenant.settings.linkDefaults);
  const error = await errorMap();
  const parsed = ShareLinkInput.safeParse(linkInputFromForm(formData), { error });
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error.issues) };
  if (passwordRequired(defaults) && !parsed.data.password) return { ok: false, fieldErrors: passwordMissing(error) };
  const v = applyLinkDefaults(parsed.data, defaults);
  const ids = [...new Set(v.candidateIds)];
  const owned = await prisma.candidate.count({ where: { tenantId: tenant.id, id: { in: ids }, archivedAt: null } });
  if (owned !== ids.length) notFound();

  const link = await prisma.shareLink.create({
    data: {
      ...columns(v),
      tenantId: tenant.id,
      token: nanoid(22),
      passwordHash: v.password ? await hashPassword(v.password) : null,
      createdById: user.id,
      candidates: { create: ids.map((candidateId, position) => ({ candidateId, position })) }, // order = selection order
    },
  });
  await audit("share_link.create", link.id);
  bust();
  const url = linkUrl(tenant.slug, link.token);
  return {
    ok: true,
    id: link.id,
    token: link.token,
    name: link.name,
    url,
    password: v.password ?? null,
    qrDataUrl: await toDataURL(url, { margin: 1, width: 240 }),
    draft: clientEmailDraft(link, url, { tenant: tenant.name, sender: user.name, candidateCount: ids.length }),
    candidateCount: ids.length,
    downloadAllowed: link.downloadAllowed,
    hasPassword: link.passwordHash !== null,
    expiresAt: link.expiresAt?.toISOString() ?? null,
  };
}

/** /shares/[id]/edit: same fields without the candidates; a blank password keeps the stored hash, the switch off removes it. */
export async function updateShareLink(id: string, _prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const { tenant, link } = await managed(id);
  const defaults = LinkDefaults.parse(tenant.settings.linkDefaults);
  const error = await errorMap();
  const parsed = ShareLinkInput.omit({ candidateIds: true }).safeParse(linkInputFromForm(formData), { error });
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error.issues) };
  const keep = formData.get("passwordEnabled") === "on" && !parsed.data.password;
  const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : keep ? link.passwordHash : null;
  if (passwordRequired(defaults) && !passwordHash) return { ok: false, fieldErrors: passwordMissing(error) };
  await prisma.shareLink.update({ where: { id: link.id }, data: { ...columns(applyLinkDefaults(parsed.data, defaults)), passwordHash } });
  await audit("share_link.update", link.id);
  bust();
  redirect(`/shares/${link.id}`);
}

/** The client sees viewer/expired.html from the next request on; tracking data is kept. */
export async function revokeShareLink(id: string): Promise<void> {
  const { link } = await managed(id);
  await prisma.shareLink.update({ where: { id: link.id }, data: { status: "revoked" } });
  await audit("share_link.revoke", link.id);
  bust();
}

/** Extend / Reactivate: +14 days from max(now, expiresAt), back to active. Never for a revoked link: its token is already out. TODO(phase2): pick the date in a dialog. */
export async function extendShareLink(id: string): Promise<void> {
  const { link } = await managed(id);
  if (link.status === "revoked") forbidden();
  const now = new Date();
  const base = link.expiresAt && link.expiresAt > now ? link.expiresAt : now;
  await prisma.shareLink.update({ where: { id: link.id }, data: { expiresAt: addDays(base, 14), status: "active" } });
  await audit("share_link.extend", link.id);
  bust();
}

/** Re-sends the email draft to the client contact (no-op without a client email; the button is hidden then); never a revoked URL. */
export async function resendShareLink(id: string): Promise<void> {
  const { tenant, user, link } = await managed(id);
  if (link.status === "revoked") forbidden();
  if (!link.clientEmail) return;
  const candidateCount = await prisma.shareLinkCandidate.count({ where: { shareLinkId: link.id } });
  const draft = clientEmailDraft(link, linkUrl(tenant.slug, link.token), { tenant: tenant.name, sender: user.name, candidateCount });
  await enqueueMail({ to: draft.to, subject: draft.subject, text: draft.body });
  await audit("share_link.resend", link.id);
}

const SendInput = z.object({
  id: z.string().min(1),
  to: z.string().trim().toLowerCase().pipe(z.email()),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000).transform((s) => s.replace(/\r\n/g, "\n")), // form submission normalizes the textarea to CRLF
});

/** Step 3 "Send email": the (edited) draft as a mail.send job. */
export async function sendShareEmail(_prev: SendState, formData: FormData): Promise<SendState> {
  const parsed = SendInput.safeParse(Object.fromEntries(formData), { error: await errorMap() });
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error.issues) };
  const { link } = await managed(parsed.data.id);
  await enqueueMail({ to: parsed.data.to, subject: parsed.data.subject, text: parsed.data.body });
  await audit("share_link.send", link.id);
  return { ok: true, to: parsed.data.to };
}

"use server";

// Server Actions of the client viewer (no tenant session): the gate, feedback and "Close".
import { prisma } from "@rireki/db";
import { FeedbackInput } from "@rireki/shared";
import { verifyPassword } from "better-auth/crypto";
import { subMinutes } from "date-fns";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { asLocale } from "@/lib/auth-schemas";
import { env } from "@/lib/env";
import { signViewer, viewerCookieName, viewerCookieOptions } from "@/lib/shares/cookie";
import { GateInput, logEvent } from "@/lib/shares/events";
import { identityOk } from "@/lib/shares/link";
import { enqueueMail, firstViewMail, interestMail } from "@/lib/shares/mail";
import { inLink, loadViewer, requestMeta, requireViewer } from "@/lib/shares/viewer";
import { tenantUrl } from "@/lib/tenant";

export type GateError = "password" | "identity" | "locked";
/** name/email echo back so the form keeps them after React's post-action reset (the password is never echoed). */
export type GateState = { error: GateError; name: string; email: string } | null;
export type FeedbackState = { ok: true; verdict: string } | { ok: false } | null;

const LOCK_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const secure = new URL(env.APP_URL).protocol === "https:";

/**
 * viewer/gate.html: link active → rate limit (5 failed_password rows for this link and ip in 15 min) → password →
 * identity (required when the link asks for it or restricts domains) → Viewer upsert by email → cookie signed with the
 * password hash → `unlock` (+ first-view mail) → list.
 */
export async function unlock(token: string, _prev: GateState, formData: FormData): Promise<GateState> {
  const ctx = await loadViewer(token);
  if (!ctx) notFound();
  if (ctx.state !== "active") redirect(`/s/${token}`);
  const { link } = ctx;
  const meta = await requestMeta();
  const ip = meta.ip ?? "";
  const text = (key: string) => (typeof formData.get(key) === "string" ? (formData.get(key) as string) : "");
  const fail = async (error: GateError): Promise<GateState> => {
    await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, type: "failed_password", meta: { ip, ua: meta.ua, geo: meta.geo, reason: error } });
    return { error, name: text("name"), email: text("email") };
  };
  const recent = await prisma.viewEvent.count({
    where: { shareLinkId: link.id, type: "failed_password", createdAt: { gte: subMinutes(new Date(), LOCK_MINUTES) }, meta: { path: ["ip"], equals: ip } },
  });
  if (recent >= LOCK_ATTEMPTS) return fail("locked");
  const input = GateInput.safeParse(Object.fromEntries(formData));
  if (!input.success) return fail("identity");
  const { password, name, email } = input.data;
  if (link.passwordHash && !(password && (await verifyPassword({ hash: link.passwordHash, password })))) return fail("password");
  if (!identityOk(link, { name, email })) return fail("identity");

  const data = { name: name ?? null, email: email ?? null, ip: meta.ip, userAgent: meta.ua, geo: meta.geo, lastSeenAt: new Date() };
  const existing = email ? await prisma.viewer.findFirst({ where: { shareLinkId: link.id, email } }) : null;
  const viewer = existing ? await prisma.viewer.update({ where: { id: existing.id }, data }) : await prisma.viewer.create({ data: { ...data, shareLinkId: link.id } });
  (await cookies()).set(viewerCookieName(token), signViewer(viewer.id, env.SESSION_SECRET, link.passwordHash), viewerCookieOptions(secure));
  await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, type: "unlock" });
  if (ctx.unlockCount === 0 && link.notifyFirstView && ctx.creator) {
    const mail = await firstViewMail(asLocale(ctx.tenant.settings?.defaultLang), {
      to: ctx.creator.email,
      linkName: link.name,
      trackingUrl: `${tenantUrl(ctx.tenant.slug)}/shares/${link.id}`,
      viewer,
      at: new Date(),
    });
    await enqueueMail(mail);
  }
  redirect(`/s/${token}`);
}

/**
 * viewer/detail.html feedback: one Feedback row per viewer and candidate. A post without a comment field (the header's
 * "Interested" button) keeps the stored comment. `interest` is logged and the creator mailed only when something is new:
 * the verdict became "interested" or its comment changed (the sender reads comments in that event and mail only).
 */
export async function sendFeedback(token: string, _prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const ctx = await requireViewer(token);
  const parsed = FeedbackInput.safeParse(Object.fromEntries(formData));
  if (!ctx.sections.feedback || !parsed.success || !inLink(ctx, parsed.data.candidateId)) return { ok: false };
  const { link, viewer } = ctx;
  const { candidateId, verdict } = parsed.data;
  const existing = await prisma.feedback.findFirst({ where: { shareLinkId: link.id, viewerId: viewer.id, candidateId } });
  const comment = formData.has("comment") ? (parsed.data.comment ?? null) : (existing?.comment ?? null);
  const data = { verdict, comment };
  if (existing) await prisma.feedback.update({ where: { id: existing.id }, data });
  else await prisma.feedback.create({ data: { ...data, shareLinkId: link.id, viewerId: viewer.id, candidateId } });
  if (verdict === "interested" && (existing?.verdict !== "interested" || existing.comment !== comment)) {
    await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, candidateId, type: "interest", meta: { comment } });
    const c = link.candidates.find((x) => x.candidateId === candidateId)?.candidate;
    if (link.notifyInterest && ctx.creator && c) {
      const mail = await interestMail(asLocale(ctx.tenant.settings?.defaultLang), {
        to: ctx.creator.email,
        linkName: link.name,
        trackingUrl: `${tenantUrl(ctx.tenant.slug)}/shares/${link.id}`,
        viewer,
        candidate: c.nameNative || c.nameLatin,
        comment,
        at: new Date(),
      });
      await enqueueMail(mail);
    }
  }
  return { ok: true, verdict };
}

/** "Close" in the viewer menu: forget the viewer cookie and show the gate again. */
export async function closeViewer(token: string): Promise<void> {
  (await cookies()).delete({ name: viewerCookieName(token), path: "/" });
  redirect(`/s/${token}`);
}

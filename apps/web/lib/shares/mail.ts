// Creator notifications and the client email draft. Mails are `mail.send` jobs { to, subject, text }, rendered here in the
// tenant's language (next-intl) and sent as is by apps/worker/src/jobs/mail.ts (nodemailer; jsonTransport logs them when
// SMTP_URL is empty). One renderer: the worker has none. TODO(integration): move the worker's MailJob zod schema into
// @rireki/shared and type `Mail` from it.
import { JOB, QUEUE_NAME, type Locale } from "@rireki/shared";
import { Queue } from "bullmq";
import { getFormatter, getTranslations } from "next-intl/server";
import { asLocale } from "@/lib/auth-schemas";
import { env } from "@/lib/env";

export type Mail = { to: string; subject: string; text: string };

// One queue connection per process (globalThis survives HMR in dev, like the Prisma client).
const g = globalThis as unknown as { rirekiQueue?: Queue };
export const queue = () => (g.rirekiQueue ??= new Queue(QUEUE_NAME, { connection: { url: env.REDIS_URL } }));

/** Enqueues a mail.send job; a Redis hiccup is logged, never shown to the client viewer. */
export async function enqueueMail(mail: Mail): Promise<void> {
  try {
    await queue().add(JOB.mailSend, mail);
  } catch (e) {
    console.error("[mail] enqueue failed", e);
  }
}

const JST = { timeZone: "Asia/Tokyo" } as const;

type DraftLink = { clientCompany: string | null; clientName: string | null; clientEmail: string | null; viewerLang: string; expiresAt: Date | null; passwordHash: string | null };

/**
 * Step 3 of app/share-new.html: the editable draft in the viewer's language (the mockup's template as mail.share_* keys),
 * plus the "Password: …" line the sender may append, in that language too (only at creation, while the password is known).
 */
export async function clientEmailDraft(link: DraftLink, url: string, p: { tenant: string; sender: string; candidateCount: number; password?: string | null }) {
  const locale = asLocale(link.viewerLang);
  const [t, f] = await Promise.all([getTranslations({ locale }), getFormatter({ locale })]);
  const lines = [
    link.clientCompany,
    t("mail.share_greeting", { name: link.clientName || t("mail.share_to_whom") }),
    "",
    t("mail.share_body", { tenant: p.tenant, sender: p.sender, count: p.candidateCount }),
    "",
    url,
    link.expiresAt && t("mail.share_until", { date: f.dateTime(link.expiresAt, { dateStyle: "long", ...JST }) }),
    "",
    link.passwordHash && t("mail.share_pw_later"),
    t("mail.share_closing"),
  ];
  return {
    to: link.clientEmail ?? "",
    subject: t("mail.share_subject", { tenant: p.tenant, count: p.candidateCount }),
    body: lines.filter((l): l is string => typeof l === "string").join("\n"),
    passwordLine: p.password ? `${t("viewer.password")}: ${p.password}` : null,
  };
}

type Viewer = { name: string | null; email: string | null };
const who = (v: Viewer, anonymous: string) => `${v.name ?? anonymous}${v.email ? ` <${v.email}>` : ""}`;

/** First unlock of a link (notifyFirstView): one mail to the creator, in the tenant's language. */
export async function firstViewMail(lang: Locale, p: { to: string; linkName: string; trackingUrl: string; viewer: Viewer; at: Date }): Promise<Mail> {
  const [t, f] = await Promise.all([getTranslations({ locale: lang }), getFormatter({ locale: lang })]);
  return {
    to: p.to,
    subject: `${t("track.a_unlocked")} · ${p.linkName}`,
    text: `${t("track.viewer")}: ${who(p.viewer, t("track.anonymous"))}\n${t("common.time")}: ${f.dateTime(p.at, { dateStyle: "medium", timeStyle: "short", ...JST })} JST\n\n${p.trackingUrl}`,
  };
}

/** A viewer marked a candidate "Interested" (notifyInterest). */
export async function interestMail(lang: Locale, p: { to: string; linkName: string; trackingUrl: string; viewer: Viewer; candidate: string; comment?: string | null; at: Date }): Promise<Mail> {
  const [t, f] = await Promise.all([getTranslations({ locale: lang }), getFormatter({ locale: lang })]);
  return {
    to: p.to,
    subject: `${t("track.a_interested")}: ${p.candidate} · ${p.linkName}`,
    text: [
      `${t("track.viewer")}: ${who(p.viewer, t("track.anonymous"))}`,
      `${t("common.time")}: ${f.dateTime(p.at, { dateStyle: "medium", timeStyle: "short", ...JST })} JST`,
      p.comment ? `\n${p.comment}` : "",
      `\n${p.trackingUrl}`,
    ].join("\n"),
  };
}

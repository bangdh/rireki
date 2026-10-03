// Creator notifications and the client email draft. Mails are `mail.send` jobs { to, subject, text }, rendered here in the
// tenant's language (next-intl) and sent as is by apps/worker/src/jobs/mail.ts (nodemailer; jsonTransport logs them when
// SMTP_URL is empty). One renderer: the worker has none. TODO(integration): move the worker's MailJob zod schema into
// @rireki/shared and type `Mail` from it.
import { JOB, QUEUE_NAME, type Locale } from "@rireki/shared";
import { Queue } from "bullmq";
import { getFormatter, getTranslations } from "next-intl/server";
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
const dateJa = (d: Date) => new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", ...JST }).format(d);
const dateEn = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", ...JST }).format(d);

type DraftLink = { clientCompany: string | null; clientName: string | null; clientEmail: string | null; viewerLang: string; expiresAt: Date | null; passwordHash: string | null };

/** Step 3 of app/share-new.html: the editable draft (ja template from the mockup; English for every other viewer language). */
export function clientEmailDraft(link: DraftLink, url: string, { tenant, sender, candidateCount: n }: { tenant: string; sender: string; candidateCount: number }) {
  const ja = link.viewerLang === "ja";
  const expires = link.expiresAt ? (ja ? dateJa : dateEn)(link.expiresAt) : null;
  const lines = ja
    ? [
        link.clientCompany,
        link.clientName && `${link.clientName} 様`,
        "",
        `お世話になっております。${tenant}の ${sender} です。`,
        `候補者${n}名の履歴書・自己紹介動画を下記リンクよりご確認ください。`,
        "",
        url,
        expires && `（閲覧期限：${expires}）`,
        "",
        link.passwordHash && "パスワードは別途お電話・LINEにてお伝えいたします。",
        "ご不明点がございましたらお気軽にご連絡ください。",
      ]
    : [
        `Dear ${link.clientName || link.clientCompany || "Sir or Madam"},`,
        "",
        `This is ${sender} from ${tenant}. Please find the CV${n === 1 ? "" : "s"} and self-introduction video${n === 1 ? "" : "s"} of ${n} candidate${n === 1 ? "" : "s"} at the link below:`,
        "",
        url,
        expires && `(available until ${expires})`,
        "",
        link.passwordHash && "The password will be sent to you separately.",
        "Please let us know if you have any questions.",
      ];
  return {
    to: link.clientEmail ?? "",
    subject: ja ? `【${tenant}】候補者${n}名 履歴書のご送付` : `${tenant}: CV${n === 1 ? "" : "s"} of ${n} candidate${n === 1 ? "" : "s"}`,
    body: lines.filter((l): l is string => typeof l === "string").join("\n"),
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

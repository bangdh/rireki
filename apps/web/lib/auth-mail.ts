import type { Locale } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import { createTransport } from "nodemailer";
import { env } from "./env";

// SMTP from env; with SMTP_URL empty (dev, cloud container) nodemailer's jsonTransport logs the message instead.
const transport = createTransport(env.SMTP_URL || { jsonTransport: true });

async function send(to: string, subject: string, text: string) {
  const info = await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
  if (!env.SMTP_URL) console.log(`[mail] ${info.message}`);
}

export async function sendInvitationMail(lang: Locale, { to, org, inviter, url }: { to: string; org: string; inviter: string; url: string }) {
  const t = await getTranslations({ locale: lang, namespace: "mail" });
  await send(to, t("invite_subject", { org }), t("invite_body", { org, inviter, url }));
}

export async function sendResetMail(lang: Locale, { to, url }: { to: string; url: string }) {
  const t = await getTranslations({ locale: lang, namespace: "mail" });
  await send(to, t("reset_subject"), t("reset_body", { url }));
}

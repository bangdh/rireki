// mail.send { to, subject, text, html? }: what apps/web/lib/shares/mail.ts enqueues, already rendered by the web app in the
// tenant's language (next-intl). nodemailer over SMTP_URL; with SMTP_URL empty (dev, cloud container) the jsonTransport logs
// the message instead of sending it. Invitation and password-reset mails are sent by the web app's better-auth hooks.
import type { Job } from "bullmq";
import { createTransport } from "nodemailer";
import { z } from "zod";
import { env } from "../env";

export const MailJob = z.object({ to: z.string(), subject: z.string(), text: z.string(), html: z.string().optional() });
export type MailJob = z.input<typeof MailJob>;

const transport = createTransport(env.SMTP_URL || { jsonTransport: true });

export async function mailSend(job: Job<MailJob>): Promise<unknown> {
  const info = await transport.sendMail({ from: env.MAIL_FROM, ...MailJob.parse(job.data) });
  if (!env.SMTP_URL) console.log(`[mail] ${info.message}`);
  return { messageId: info.messageId };
}

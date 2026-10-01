// Share links: the create-wizard input (app/share-new.html), the per-link sections stored in ShareLink.sections,
// the tenant defaults stored in TenantSettings.linkDefaults (app/settings-company.html) and the client feedback.
import { z } from "zod";
import { FEEDBACK_VERDICTS, LOCALES } from "./constants";

// HTML forms post "" for empty inputs; treat blank as "not provided" before the inner schema runs.
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

export const SHARE_SECTIONS = ["photo", "contact", "family", "health", "videos", "documents", "feedback"] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

// Contact info and documents are hidden unless switched on (sharenew.sec_contact_hint).
export const ShareSections = z.object({
  photo: z.boolean().default(true),
  contact: z.boolean().default(false),
  family: z.boolean().default(true),
  health: z.boolean().default(true),
  videos: z.boolean().default(true),
  documents: z.boolean().default(false),
  feedback: z.boolean().default(true),
});
export type ShareSections = z.infer<typeof ShareSections>;

// "@Yamato-K.co.jp" → "yamato-k.co.jp"
export const EmailDomain = z
  .string()
  .trim()
  .toLowerCase()
  .transform((domain) => domain.replace(/^@/, ""))
  .pipe(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/, "Invalid domain"));

export const ShareLinkInput = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(200),
  name: z.string().trim().min(1).max(120),
  clientCompany: optional(z.string().trim().max(120)),
  clientName: optional(z.string().trim().max(120)),
  clientEmail: optional(z.email()),
  message: optional(z.string().max(2000)),
  viewerLang: z.enum(LOCALES).default("ja"),
  password: optional(z.string().min(8).max(72)), // plain text; the Server Action hashes it into passwordHash
  requireIdentity: z.boolean().default(true),
  allowedDomains: z.array(EmailDomain).max(20).default([]),
  downloadAllowed: z.boolean().default(false),
  expiresAt: optional(z.coerce.date()),
  maxViews: optional(z.coerce.number().int().positive()),
  sections: ShareSections.prefault({}),
  notifyFirstView: z.boolean().default(true),
  notifyInterest: z.boolean().default(true),
});
export type ShareLinkInput = z.input<typeof ShareLinkInput>;
export type ShareLinkValues = z.output<typeof ShareLinkInput>;

// Tenant-wide defaults for new links; *Locked = members cannot turn the setting off.
export const LinkDefaults = z.object({
  password: z.boolean().default(true),
  passwordLocked: z.boolean().default(false),
  viewOnly: z.boolean().default(true),
  viewOnlyLocked: z.boolean().default(true),
  identity: z.boolean().default(true),
  identityLocked: z.boolean().default(false),
  showContact: z.boolean().default(false),
  expiryDays: z.number().int().positive().nullable().default(14), // null = no expiry
  protection: z.enum(["strict", "standard"]).default("strict"),
});
export type LinkDefaults = z.infer<typeof LinkDefaults>;

export const FeedbackInput = z.object({
  candidateId: z.string().min(1),
  verdict: z.enum(FEEDBACK_VERDICTS),
  comment: optional(z.string().trim().max(1000)),
});
export type FeedbackInput = z.input<typeof FeedbackInput>;

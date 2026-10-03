import type { Locale } from "@rireki/shared";
import { z } from "zod";
import { LANGS } from "@/i18n/config";

// zod schemas and pure helpers of the auth-tenant lane. Client-safe on purpose (the signup form imports suggestSlug):
// no server imports and no @rireki/shared runtime import (its index pulls in the S3 client).

export const LOCALE_CODES = LANGS.map(([code]) => code) as [Locale, ...Locale[]];
export const asLocale = (v: string | null | undefined): Locale => ((LOCALE_CODES as readonly string[]).includes(v ?? "") ? (v as Locale) : "en");

export const SLUG_RE = /^[a-z0-9-]{3,24}$/;
export const RESERVED_SLUGS = ["www", "s3", "design", "admin", "api"]; // refused by the signup action like a taken slug
export const COUNTRIES = ["VN", "MM", "BD", "ID", "other"] as const; // signup.country select
export const TIMEZONES = ["Asia/Ho_Chi_Minh", "Asia/Yangon", "Asia/Dhaka", "Asia/Jakarta", "Asia/Tokyo"] as const;

// HTML forms post "" for empty inputs and "on" for ticked checkboxes.
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const locale = z.enum(LOCALE_CODES);
const password = z.string().min(10).max(128);

export const SignupInput = z.object({
  company: z.string().trim().min(1).max(120),
  country: z.enum(COUNTRIES),
  lang: locale,
  slug: z.string().trim().toLowerCase().regex(SLUG_RE),
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  password,
  agree: z.literal("on"),
});
export type SignupValues = z.infer<typeof SignupInput>;

/** "a@x.vn, b@x.vn\nA@x.vn" → ["a@x.vn", "b@x.vn"] (trimmed, lower-cased, de-duplicated). */
export const parseEmails = (text: string): string[] => [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];

export const InviteInput = z.object({
  emails: z.string().transform(parseEmails).pipe(z.array(z.email()).min(1).max(20)),
  role: z.enum(["admin", "member"]),
  branch: optional(z.string().trim().min(1).max(60)), // free-text label (members.branch); TODO(phase2): roles per branch
  lang: locale,
});

export const MemberRoleInput = z.object({ memberId: z.string().min(1), role: z.enum(["admin", "member"]) });

export const AcceptInviteInput = z.object({ name: optional(z.string().trim().min(1).max(120)), password });

export const CompanyInput = z.object({
  nameLocal: z.string().trim().min(1).max(120), // → Organization.name
  nameJa: optional(z.string().trim().max(120)),
  nameEn: optional(z.string().trim().max(120)),
  country: z.enum(COUNTRIES),
  licenseNo: optional(z.string().trim().max(60)),
  defaultLang: locale,
  phone: optional(z.string().trim().max(40)),
  address: optional(z.string().trim().max(200)),
  timezone: z.enum(TIMEZONES),
});

export const CodeFormatInput = z.object({
  prefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  nextCode: z.coerce.number().int().min(1).max(999999), // "≥ current" is checked against the DB in the action
});

export const BrandingInput = z.object({
  brandColor: z.string().trim().toUpperCase().regex(/^#[0-9A-F]{6}$/),
  displayName: z.string().trim().min(1).max(80),
  footer: optional(z.string().trim().max(200)),
  poweredBy: checkbox,
});

// Stored as a JSON string in Organization.metadata (no schema change for phase 1).
export const OrgMeta = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  displayName: z.string().optional(),
  poweredBy: z.boolean().default(true),
});
export type OrgMeta = z.infer<typeof OrgMeta>;
export function parseOrgMeta(raw: string | null | undefined): OrgMeta {
  try {
    return OrgMeta.parse(JSON.parse(raw || "{}"));
  } catch {
    return OrgMeta.parse({});
  }
}

/** zod's bundled messages in the UI language, as the parse context of `schema.safeParse(data, zodErrorMap(locale))`; Burmese is not shipped → English. */
export const zodErrorMap = (locale: Locale): { error: z.core.$ZodErrorMap } => {
  const bundled = z.locales as Partial<Record<string, () => { localeError: z.core.$ZodErrorMap }>>;
  return { error: (bundled[locale] ?? z.locales.en)().localeError };
};

/** First message per field of a failed parse, for `error-text` spans under the inputs. */
export const fieldErrors = (error: z.ZodError): Record<string, string> =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors as Record<string, string[] | undefined>).flatMap(([field, msgs]) => (msgs?.[0] ? [[field, msgs[0]]] : [])),
  );

/** Subdomain suggested from the company name — port of data-subdomain-source in assets/app.js. "Hà Nội Manpower JSC" → "hanoi". */
export function suggestSlug(company: string): string {
  return company
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\b(jsc|co|ltd|company|manpower|corp|inc)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

/** Candidate-code prefix from the slug: first two letters upper-cased, padded with X. "hanoi" → "HA", "s3-x" → "SX". */
export function prefixFromSlug(slug: string): string {
  return `${slug.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase()}XX`.slice(0, 2);
}

/** Avatar initials: first letter of the first and last word ("Nguyễn Thị Hương" → "NH"); two letters for a single word. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}


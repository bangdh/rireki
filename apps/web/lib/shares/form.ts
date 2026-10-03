// The link settings form (step 2 of app/share-new.html, reused by /shares/[id]/edit): its field values and the
// FormData → ShareLinkInput conversion. Pure (tested in form.test.ts); server-side only because it reads @rireki/shared.
import { SHARE_SECTIONS, type LinkDefaults, type ShareSection, type ShareSections } from "@rireki/shared";
import { addDays, format } from "date-fns";
import type { z } from "zod";
import { generateLinkPassword } from "./link";

export type LinkFormValues = {
  name: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  message: string;
  viewerLang: string;
  passwordEnabled: boolean;
  password: string; // plain text while creating; "" on the edit page (blank = keep the stored hash)
  requireIdentity: boolean;
  allowedDomains: string[];
  downloadAllowed: boolean;
  expiresAt: string; // "YYYY-MM-DD" or ""
  maxViews: string;
  sections: Record<ShareSection, boolean>;
  notify: boolean;
};

type ExistingLink = {
  name: string;
  clientCompany: string | null;
  clientName: string | null;
  clientEmail: string | null;
  message: string | null;
  viewerLang: string;
  passwordHash: string | null;
  requireIdentity: boolean;
  allowedDomains: string[];
  downloadAllowed: boolean;
  expiresAt: Date | null;
  maxViews: number | null;
  sections: ShareSections;
  notifyFirstView: boolean;
  notifyInterest: boolean;
};

/** Initial values: the tenant defaults for a new link (fresh password, expiry in N days), or the stored link on edit. */
export function initialLinkValues(d: LinkDefaults, link?: ExistingLink, today = new Date()): LinkFormValues {
  if (link) {
    return {
      name: link.name,
      clientCompany: link.clientCompany ?? "",
      clientName: link.clientName ?? "",
      clientEmail: link.clientEmail ?? "",
      message: link.message ?? "",
      viewerLang: link.viewerLang,
      passwordEnabled: link.passwordHash !== null,
      password: "",
      requireIdentity: link.requireIdentity,
      allowedDomains: link.allowedDomains,
      downloadAllowed: link.downloadAllowed,
      expiresAt: link.expiresAt ? jstDate(link.expiresAt) : "",
      maxViews: link.maxViews === null ? "" : String(link.maxViews),
      sections: link.sections,
      notify: link.notifyFirstView || link.notifyInterest,
    };
  }
  return {
    name: "",
    clientCompany: "",
    clientName: "",
    clientEmail: "",
    message: "",
    viewerLang: "ja",
    passwordEnabled: d.password,
    password: generateLinkPassword(),
    requireIdentity: d.identity,
    allowedDomains: [],
    downloadAllowed: !d.viewOnly,
    expiresAt: d.expiryDays === null ? "" : format(addDays(today, d.expiryDays), "yyyy-MM-dd"),
    maxViews: "",
    sections: { photo: true, contact: d.showContact, family: true, health: true, videos: true, documents: false, feedback: true },
    notify: true,
  };
}

/** The JST calendar day of an expiry instant (links expire at 23:59 JST). */
const jstDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const on = (fd: FormData, key: string) => fd.get(key) === "on";
const strings = (fd: FormData, key: string) => fd.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");

/**
 * FormData of <LinkSettingsFields/> → the object ShareLinkInput validates. A blank or disabled password is undefined
 * (the action decides between "no password" and "keep the stored hash"); the expiry date becomes 23:59 JST.
 */
export function linkInputFromForm(fd: FormData) {
  const expires = text(fd, "expiresAt");
  const notify = on(fd, "notify");
  return {
    candidateIds: strings(fd, "candidateIds"),
    name: text(fd, "name"),
    clientCompany: text(fd, "clientCompany"),
    clientName: text(fd, "clientName"),
    clientEmail: text(fd, "clientEmail"),
    message: text(fd, "message"),
    viewerLang: text(fd, "viewerLang") || "ja",
    password: on(fd, "passwordEnabled") ? text(fd, "password") || undefined : undefined,
    requireIdentity: on(fd, "requireIdentity"),
    allowedDomains: strings(fd, "allowedDomains"),
    downloadAllowed: text(fd, "downloadAllowed") === "true",
    expiresAt: expires ? `${expires}T23:59:00+09:00` : undefined,
    maxViews: text(fd, "maxViews") || undefined,
    sections: Object.fromEntries(SHARE_SECTIONS.map((s) => [s, on(fd, `sections.${s}`)])) as Record<ShareSection, boolean>,
    notifyFirstView: notify,
    notifyInterest: notify,
  };
}

/** First message per field of a failed parse, for the error-text spans under the inputs. */
export const firstErrors = (issues: z.core.$ZodIssue[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const field = String(i.path[0] ?? "form");
    out[field] ??= i.message;
  }
  return out;
};

// The link settings form (step 2 of app/share-new.html, reused by /shares/[id]/edit): its field values and the
// FormData → ShareLinkInput conversion; and the GET filter forms of /shares and /shares/[id]. Pure (tested in
// form.test.ts); server-side only because it reads @rireki/shared.
import { SHARE_LINK_STATUSES, SHARE_SECTIONS, type LinkDefaults, type ShareSection, type ShareSections } from "@rireki/shared";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { generateLinkPassword } from "./link";

// Every field falls back to its default on garbage so a hand-edited URL never 500s.
export const ListQuery = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(SHARE_LINK_STATUSES).optional().catch(undefined),
  client: z.string().trim().min(1).max(120).optional().catch(undefined),
  createdBy: z.string().min(1).max(60).optional().catch(undefined),
  password: z.enum(["1"]).optional().catch(undefined),
  viewOnly: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type ListQuery = z.infer<typeof ListQuery>;

/** app/share-detail.html: ?range= of the chart, ?viewer= and ?page= of the viewer log. */
export const DetailQuery = z.object({
  range: z.enum(["7", "30", "all"]).catch("7"),
  viewer: z.string().min(1).max(60).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SearchParams = Record<string, string | string[] | undefined>;

/** searchParams of a GET filter form: a repeated key keeps its last value (hidden inputs come before the buttons and selects of the same name), blanks are dropped. */
export function parseQuery<S extends z.ZodType>(schema: S, sp: SearchParams): z.output<S> {
  const entries = Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v] as const).filter(([, v]) => v !== undefined && v !== "");
  return schema.parse(Object.fromEntries(entries));
}

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

// Pure helpers and label maps of the candidates lane (tested in format.test.ts). No React, no Prisma, no I/O.
import { subDays } from "date-fns";
import { CV_COMPLETENESS_FIELDS, type CandidateStatus, type CvDraft, type DocumentType, type VideoStatus } from "@rireki/shared";

/** "NGUYEN VAN AN" → "NA" (first + last token); one token → its first two letters; empty → "?". */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Device class from a user agent, as printed in the mockups' "Device · Location" column. */
export const deviceOf = (ua?: string | null): "Desktop" | "Mobile" | "Tablet" =>
  /ipad|tablet|android(?!.*mobile)/i.test(ua ?? "") ? "Tablet" : /mobi|iphone|android/i.test(ua ?? "") ? "Mobile" : "Desktop";

export const deviceIcon = (device: ReturnType<typeof deviceOf>) => (device === "Mobile" ? "phone" : "monitor");

/** Counts dates per calendar day of `timeZone` (the tenant's; default the process's) over the last `days` days ending at `now`; labels are the day of month (BarChart props). */
export function bucketByDay(dates: Date[], days: number, now = new Date(), timeZone?: string): { values: number[]; labels: string[] } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone }); // "2026-09-30"
  const keys = Array.from({ length: days }, (_, i) => day.format(subDays(now, days - 1 - i)));
  const values = keys.map(() => 0);
  for (const d of dates) {
    const i = keys.indexOf(day.format(d));
    if (i >= 0) values[i]++;
  }
  return { values, labels: keys.map((k) => String(Number(k.slice(8)))) };
}

/** One CSV line (RFC 4180): fields holding a comma, quote or line break are quoted and quotes are doubled. */
export function csvLine(values: ReadonlyArray<string | number | null | undefined>): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export type CvField = (typeof CV_COMPLETENESS_FIELDS)[number];

/** The recommended 履歴書 fields still empty (same emptiness rule as cvCompleteness). */
export function missingFields(cv: CvDraft): CvField[] {
  return CV_COMPLETENESS_FIELDS.filter((key) => {
    const v = cv[key];
    return Array.isArray(v) ? v.length === 0 : v === undefined || v === null || v === "";
  });
}

/** Drops "", null, undefined and NaN (through nested rows) so optional zod fields read as "not provided". */
export function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = compact(v);
      if (c !== "" && c !== null && c !== undefined && !(typeof c === "number" && Number.isNaN(c))) out[k] = c;
    }
    return out as T;
  }
  return value;
}

/** Page numbers to show: 1 … p-1 p p+1 … last (null = ellipsis), everything when there are at most 7 pages. */
export function pageWindow(page: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = [...new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last))].sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? [null, p] : [p]));
}

/** 92 → "1:32" */
export const fmtDuration = (sec?: number | null) => (sec == null ? "" : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);

/** 421888 → "412 KB", 1153434 → "1.1 MB", 88080384 → "84 MB" */
export const fmtBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(n >= 10_485_760 ? 0 : 1)} MB` : `${Math.round(n / 1024)} KB`);

/** /shares/new?candidate=a&candidate=b — the share wizard (client-side lane) preselects these candidates. */
export const shareHref = (ids: ReadonlyArray<string>) => `/shares/new?${ids.map((id) => `candidate=${encodeURIComponent(id)}`).join("&")}`;

/** "Nguyễn Thị Hương" → "Hương" (the given name comes last in VN/JA order; the dashboard greets by it). */
export const givenName = (name: string) => name.trim().split(/\s+/).pop() ?? name;

/** i18n key of a candidate status badge (the column only holds CandidateStatus values). */
export const statusKey = (s: CandidateStatus | string) => `status.${s}` as `status.${CandidateStatus}`;

/** Label of a video status: "uploaded" waits for the transcode, so it reads as processing too. TODO(phase2): real progress. */
export const VIDEO_STATUS_LABEL = {
  uploaded: "common.processing",
  processing: "common.processing",
  ready: "common.ready",
  failed: "common.failed",
} as const satisfies Record<VideoStatus, string>;

/** Label keys of the recommended fields (the mockup's form labels), used by the completeness callout. */
export const CV_FIELD_LABEL = {
  nameKana: "form.name_kana",
  nameLatin: "form.name_romaji",
  nameNative: "form.name_native",
  dob: "form.dob",
  gender: "form.gender",
  nationality: "cand.nationality",
  familyCount: "form.family_count",
  mobile: "form.mobile",
  email: "auth.email",
  address: "form.address",
  addressKana: "form.address_kana",
  education: "form.education",
  work: "form.work",
  currentStatus: "form.current_status",
  licenses: "form.licenses",
  jlpt: "form.jlpt",
  jaLevel: "form.ja_level",
  enLevel: "form.en_level",
  hobbies: "form.hobbies",
  motivationPr: "form.motivation_pr",
  heightCm: "form.height",
  weightKg: "form.weight",
  clothingSize: "form.clothing",
  shoeCm: "form.shoe",
  religionNotes: "form.religion_notes",
  foodRestrictions: "form.food",
  allergies: "form.allergies",
  otherNotes: "form.other_notes",
} as const satisfies Record<CvField, string>;

/** Form step that owns each CV field (to jump to the first step with a validation error). */
export const STEP_OF_FIELD: Record<string, number> = {
  nameKana: 1, nameLatin: 1, nameNative: 1, dob: 1, gender: 1, nationality: 1, situation: 1, familyCount: 1, familyDetail: 1, spouse: 1, spouseDependency: 1,
  mobile: 2, email: 2, address: 2, addressKana: 2,
  education: 3, work: 3, currentStatus: 3,
  licenses: 4, jlpt: 4, otherLanguages: 4, jaLevel: 4, enLevel: 4,
  hobbies: 5, motivationPr: 5, wishSalary: 5, wishLocation: 5, wishHours: 5, tags: 5,
  heightCm: 6, weightKg: 6, clothingSize: 6, shoulderCm: 6, waistCm: 6, shoeCm: 6, religionNotes: 6, foodRestrictions: 6, allergies: 6, otherNotes: 6,
};

export const DOC_TYPE_LABEL = {
  original_cv: "detail.doc_original",
  passport: "form.doc_passport",
  certificate: "form.doc_cert",
  health: "detail.doc_health",
  other: "common.other",
} as const satisfies Record<DocumentType, string>;

/** Localized country name ("VN" → "Vietnam" / "ベトナム" / "ဗီယက်နမ်"), falling back to the code. */
export function countryName(locale: string, code: string): string {
  try {
    return new Intl.DisplayNames(locale, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Audit actions shown as activity (candidate Activity tab, dashboard team activity): icon + past-tense act.* verb that follows the actor's name (ja keys start with が, my with သည်). */
export const AUDIT_LABEL = {
  "candidate.create": { icon: "plus", key: "act.created_candidate" },
  "candidate.update": { icon: "edit", key: "act.updated_candidate" },
  "candidate.status": { icon: "refresh", key: "act.status_changed" },
  "candidate.archive": { icon: "archive", key: "act.archived" },
  "candidate.duplicate": { icon: "copy", key: "act.duplicated" },
  "candidate.note": { icon: "edit", key: "act.added_note" },
  "video.upload": { icon: "upload", key: "act.uploaded_video" }, // AuditLine: act.uploaded_video_solo on the candidate's own tab
  "video.rename": { icon: "video", key: "act.renamed_video" },
  "video.delete": { icon: "trash", key: "act.deleted_video" },
  "document.update": { icon: "file", key: "act.updated_document" },
  "document.delete": { icon: "trash", key: "act.deleted_document" },
  "share_link.create": { icon: "link", key: "act.created_link" },
  "member.invite": { icon: "user-check", key: "act.invited" }, // target = "email (role)"
} as const;
export type AuditAction = keyof typeof AUDIT_LABEL;

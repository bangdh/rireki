// Pure helpers of the share-viewer lane (tested in format.test.ts). No React, no Prisma, no I/O.
import type { CvDraft, ShareSections } from "@rireki/shared";

// Browser · OS from a user agent, as the mockups' "Device · Location" column prints it. ua-parser-js v2 is AGPL, so a
// small ordered table instead: Edge/Opera before Chrome, Chrome before Safari (every WebKit UA mentions Safari).
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];
export function describeUserAgent(ua?: string | null): string {
  if (!ua) return "—";
  const parts = [BROWSERS, SYSTEMS].map((table) => table.find(([re]) => re.test(ua))?.[1]).filter(Boolean);
  return parts.join(" · ") || "—";
}

/** "210.140.12.34" → "210.140.x.x"; IPv6 keeps its first half; missing → "". */
export function maskIp(ip?: string | null): string {
  if (!ip) return "";
  if (ip.includes(":")) return `${ip.split(":").slice(0, 4).join(":")}::x`;
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip;
}

/** 160 → "2:40", 3725 → "1:02:05"; nothing for a missing value. */
export function fmtDuration(sec?: number | null): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Avatar initials: "NGUYEN VAN AN" → "NA"; a CJK name ("田中 健一") shows its first character, as in the mockup. */
export function initials(name?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (/[　-鿿가-힯]/.test(words[0][0])) return words[0][0];
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Months between two "YYYY-MM" values (open end = `now`). */
const months = (from: string, to: string | undefined, now: Date) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to ? to.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
};

/** 実務N年 (rounded) / 実務Nヶ月 from the full-time work rows, excluding our own training centre; nothing → 新卒. */
export function experienceLabel(cv: Pick<CvDraft, "work">, now = new Date()): string {
  const total = (cv.work ?? []).filter((w) => !w.partTime && !/研修/.test(`${w.employer} ${w.jobDesc ?? ""}`)).reduce((sum, w) => sum + months(w.from, w.to, now), 0);
  if (total === 0) return "新卒";
  return total < 12 ? `実務${total}ヶ月` : `実務${Math.round(total / 12)}年`;
}

const FAMILY_FIELDS = ["familyCount", "familyDetail", "spouse", "spouseDependency"] as const;
const HEALTH_FIELDS = ["heightCm", "weightKg", "clothingSize", "shoulderCm", "waistCm", "shoeCm", "religionNotes", "foodRestrictions", "allergies"] as const;

/** The CV body without the blocks the link hides (family, body & health). Contact stays: <Rirekisho hideContact> shows the note instead. */
export function stripSections(cv: CvDraft, sections: Pick<ShareSections, "family" | "health">): CvDraft {
  const out: CvDraft = { ...cv };
  if (!sections.family) for (const k of FAMILY_FIELDS) delete out[k];
  if (!sections.health) for (const k of HEALTH_FIELDS) delete out[k];
  return out;
}

/** One CSV line (RFC 4180): fields with a comma, quote or line break are quoted, quotes doubled. */
export const csvRow = (values: ReadonlyArray<string | number | null | undefined>) =>
  values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");

/** The calendar day of an instant in Japan ("2026-10-01"); clients read the tracking page in JST. */
export const jstDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Every JST day from `from` to `to` inclusive ("YYYY-MM-DD"), capped at 400 bars. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); out.length < 400 && d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

/** 就職活動中 etc. — the Japanese situation label of the 履歴書 (also in components/rirekisho, which this lane does not edit). */
export const SITUATION_JA = { job_hunting: "就職活動中", in_training: "研修中", employed: "在職中", offer: "内定" } as const;

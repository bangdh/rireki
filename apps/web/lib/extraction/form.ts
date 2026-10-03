// The import review form, pure (form.test.ts): the upload POST's rules (same origin, file type and size), FormData → the
// object CvDraft / CvSchema validate, and the confidence helpers the page and the form share. Numbers arrive as strings,
// booleans as "true"/"false", the read-only education/work/licence tables as hidden JSON; an empty string means "not provided".
import { CvDraft, CvSchema } from "@rireki/shared";
import { z } from "zod";
import { STEP_OF_FIELD } from "@/lib/candidates/format";

/** Below this a field gets the `conf low` chip and the yellow `hl` input (cv-extraction skill). */
export const LOW_CONFIDENCE = 0.85;

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/**
 * The one allowlist of CV files (upload check, `accept`, preview kind): extension → the Content-Type the original is stored
 * and served with. Never the browser's type: a part named cv.jpg sent as text/html would be served as a page from the S3 host.
 */
export const CV_TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
} as const;
/** Content-Type of a CV file name from its extension; application/octet-stream (a download, never rendered) for any other. */
export const cvContentType = (fileName: string): string =>
  Object.entries(CV_TYPES).find(([ext]) => fileName.toLowerCase().endsWith(ext))?.[1] ?? "application/octet-stream";
/** The uploaded CV file: non-empty, ≤ 20 MB, an allowed extension (the extractor sniffs the real type). */
export const CvFile = z
  .instanceof(File)
  .refine((f) => f.size > 0 && f.size <= MAX_FILE_BYTES, "size")
  .refine((f) => Object.keys(CV_TYPES).some((ext) => f.name.toLowerCase().endsWith(ext)), "type");

/**
 * CSRF check of the upload POST, the one Next.js makes for Server Actions only: the Origin must name the host the request came
 * to. The session cookie is SameSite=Lax, which sibling tenant hosts and the S3 host (same site) still receive.
 */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return !!origin && !!host && URL.parse(origin)?.host === host;
}

const NUMBER_KEYS = new Set(["familyCount", "jaLevel", "enLevel", "heightCm", "weightKg", "shoulderCm", "waistCm", "shoeCm"]);
const BOOLEAN_KEYS = new Set(["spouse", "spouseDependency"]);
const LIST_KEYS = new Set(["education", "work", "licenses"]);
const CV_KEYS = Object.keys(CvDraft.shape);

const json = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return s; // left as a string so z.array reports a field error instead of a crash
  }
};

/** FormData → plain object: blanks dropped, numbers coerced (NaN fails validation), "true"/"false" → boolean, tables parsed from hidden JSON. */
export function formToCv(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CV_KEYS) {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const value = raw.trim();
    out[key] = NUMBER_KEYS.has(key) ? Number(value) : BOOLEAN_KEYS.has(key) ? value === "true" : LIST_KEYS.has(key) ? json(value) : value;
  }
  return out;
}

const fromForm = z.instanceof(FormData).transform(formToCv);
/** "Save as draft": any subset of the fields. */
export const ReviewForm = fromForm.pipe(CvDraft);
/** "Save candidate": the full 履歴書 schema (required fields and formats), errors keyed by field. */
export const ReviewFormFull = fromForm.pipe(CvSchema);

/** Extracted fields the review page does not show: posted as hidden inputs, edited later in the 7-step form. */
export const CARRIED = ["familyDetail", "spouseDependency", "otherLanguages", "hobbies", "motivationPr", "wishSalary", "wishLocation", "wishHours"] as const;
const carried = new Set<string>(CARRIED);

/** Shown keys whose confidence is below the threshold: the yellow fields, so the "{n} to check" counts match the page. */
export const lowFields = (confidence: Record<string, number>) => Object.keys(confidence).filter((key) => confidence[key] < LOW_CONFIDENCE && !carried.has(key));

/** Low-confidence fields per form section (1–6, the 7-step form's STEP_OF_FIELD) for the "{n} to check" badges. */
export function sectionCounts(confidence: Record<string, number>): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const key of lowFields(confidence)) {
    const step = STEP_OF_FIELD[key];
    if (step) counts[step] = (counts[step] ?? 0) + 1;
  }
  return counts;
}

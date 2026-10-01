export const LOCALES = ["en", "ja", "vi", "id", "my"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const BUCKETS = {
  originals: "rireki-originals",
  media: "rireki-media",
  renders: "rireki-renders",
  uploads: "rireki-uploads",
  public: "rireki-public",
} as const;

export const QUEUE_NAME = "rireki";

export const JOB = {
  mediaTranscode: "media.transcode",
  renderPages: "render.pages",
  extractCv: "extract.cv",
  mailSend: "mail.send",
} as const;

// Candidate code: 2-letter tenant prefix + 6-digit counter, e.g. SV000123. Numbers are never reused.
export const CANDIDATE_CODE_RE = /^[A-Z]{2}\d{6}$/;
export const formatCandidateCode = (prefix: string, n: number) => `${prefix}${String(n).padStart(6, "0")}`;

// Statuses and enums shared by the DB columns, the zod schemas and the UI badges (status.* i18n keys).
export const CANDIDATE_STATUSES = ["draft", "available", "proposed", "interviewing", "selected", "departed", "archived"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const VIDEO_STATUSES = ["uploaded", "processing", "ready", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const SHARE_LINK_STATUSES = ["active", "expired", "revoked"] as const;
export type ShareLinkStatus = (typeof SHARE_LINK_STATUSES)[number];

export const VIEW_EVENT_TYPES = [
  "unlock",
  "open_list",
  "open_cv",
  "play_video",
  "video_progress",
  "download",
  "interest",
  "blocked_action",
  "failed_password",
] as const;
export type ViewEventType = (typeof VIEW_EVENT_TYPES)[number];

export const DOCUMENT_TYPES = ["original_cv", "passport", "certificate", "health", "other"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const FEEDBACK_VERDICTS = ["interested", "maybe", "pass"] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

export const NATIONALITIES = ["VN", "MM", "BD", "ID"] as const;
export type Nationality = (typeof NATIONALITIES)[number];

export const JLPT_LEVELS = ["N1", "N2", "N3", "N4", "N5", "none"] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

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

// Candidate code: 2-letter tenant prefix + 6-digit counter, e.g. SV000123.
export const CANDIDATE_CODE_RE = /^[A-Z]{2}\d{6}$/;

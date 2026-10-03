// extract.cv { tenantId, importJobId } (cv-extraction skill): ImportJob → POST {EXTRACTOR_URL}/extract (Markdown, template
// fields and the cropped photo are produced in Python) → the fields are validated per key into a CvDraft with a confidence
// per field; Claude reads the Markdown only when the document is not the company template → ImportJob.extracted/confidence.
// Never logs the Markdown or the photo. Idempotent: a job that is already ready/saved is left alone.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma, type Prisma } from "@rireki/db";
import { CvDraft } from "@rireki/shared";
import type { Job } from "bullmq";
import { z } from "zod";
import { env } from "../env";

export type ExtractCvJob = { tenantId: string; importJobId: string };

/** The part of the extractor's response the worker uses (the rest — timings, per-page confidence — is logged by the extractor). */
export const ExtractorResponse = z.object({
  markdown: z.string(),
  pages: z.number().int(),
  ocr_used: z.boolean(),
  template_match: z.boolean(),
  fields: z.record(z.string(), z.unknown()).nullish(),
  photo_key: z.string().nullish(),
});
export type ExtractorResponse = z.infer<typeof ExtractorResponse>;

/** A validated draft plus one confidence (0–1) per key it contains; ImportJob.extracted.cv and ImportJob.confidence. */
export type Scored = { cv: CvDraft; confidence: Record<string, number> };

const TEMPLATE_CONFIDENCE = 0.9;
const OCR_CONFIDENCE = 0.7;
const LLM_DEFAULT_CONFIDENCE = 0.6;
const KEYS = Object.keys(CvDraft.shape) as (keyof typeof CvDraft.shape)[];

/**
 * Keeps every CvDraft key whose value passes that key's own schema and drops undefined/null and invalid values, so one
 * bad e-mail or a "tall" height does not void the rest. Per key on purpose: CvDraft.parse() would add the defaults.
 */
export function pickValid(fields: unknown): CvDraft {
  const out: Record<string, unknown> = {};
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return out;
  const src = fields as Record<string, unknown>;
  for (const key of KEYS) {
    if (src[key] === undefined || src[key] === null) continue;
    const parsed = (CvDraft.shape[key] as z.ZodType).safeParse(src[key]);
    if (parsed.success && parsed.data !== undefined) out[key] = parsed.data;
  }
  return out as CvDraft;
}

const scored = (fields: unknown, score: (key: string) => number): Scored => {
  const cv = pickValid(fields);
  return { cv, confidence: Object.fromEntries(Object.keys(cv).map((key) => [key, score(key)])) };
};

/** Fields mapped by the template rules: 0.9 each, 0.7 when the text came from OCR. */
export const fromTemplate = (fields: unknown, ocrUsed: boolean): Scored => scored(fields, () => (ocrUsed ? OCR_CONFIDENCE : TEMPLATE_CONFIDENCE));

const Score = z.object({ field: z.string(), score: z.number() });
/** What Claude returns: the draft plus its own per-field scores (an array: the API rejects the additionalProperties a z.record needs). */
export const CvExtraction = CvDraft.extend({ confidence: z.array(Score).default([]) });

/** Claude's structured output: its score for each field it rated, 0.6 for the others. */
export function fromClaude(parsed: unknown): Scored {
  const list = z.array(Score).safeParse((parsed as { confidence?: unknown } | null)?.confidence);
  const given = new Map(list.success ? list.data.map((s) => [s.field, s.score]) : []);
  return scored(parsed, (key) => given.get(key) ?? LLM_DEFAULT_CONFIDENCE);
}

/** Template fields win for every key they have; Claude only fills the gaps. */
export const merge = (template: Scored, claude: Scored): Scored => ({
  cv: { ...claude.cv, ...template.cv },
  confidence: { ...claude.confidence, ...template.confidence },
});

export const SYSTEM_PROMPT = `You extract the fields of a Japanese 履歴書 (rirekisho) of a trainee from Vietnam, Myanmar, Bangladesh or Indonesia out of Markdown converted from a CV file. Answer only with the JSON object of the schema.
Rules: copy names, phone numbers, e-mail addresses and addresses exactly as written. nationality is VN, MM, BD or ID. dob is YYYY-MM-DD; dates in education, work and licenses are YYYY-MM; an ongoing school or job has no "to". Write school and employer as written followed by the country in Japanese in parentheses, e.g. (ベトナム). Write jobDesc, currentStatus, religionNotes, foodRestrictions, allergies and otherNotes in natural Japanese; keep hobbies and motivationPr in the document's language. jlpt is the highest JLPT level the document names (N1…N5), otherwise omit it. Leave jaLevel and enLevel out: they are the company's own assessment. Omit every field the document does not state — never guess or invent — with one exception: if the document has no katakana name, transliterate nameLatin into katakana (words joined with ・) as nameKana and rate it 0.5. In "confidence", rate each field you filled from 0 to 1 by how sure you are the value is exactly right.`;

/** nameKana that Claude transliterated (the exception above): the Markdown has no katakana at all, so the document cannot have stated it. */
export const kanaGenerated = (cv: CvDraft, markdown: string) => !!cv.nameKana && !/[\u30a0-\u30ff]/.test(markdown);

export type ClaudeClient = { messages: { create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> } };

/** One non-streaming call with structured output; refusals, truncation and API errors fall back to the template fields (null). */
export async function extractWithClaude(markdown: string, client: ClaudeClient): Promise<Scored | null> {
  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Extract the 履歴書 fields from this Markdown. Dates as YYYY-MM or YYYY-MM-DD. Unknown → omit.\n\n${markdown}` }],
      output_config: { format: zodOutputFormat(CvExtraction) },
    });
  } catch (e) {
    console.error("claude extraction failed:", e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    return null;
  }
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
    console.warn(`claude extraction stopped with ${res.stop_reason}; keeping the template fields`);
    return null;
  }
  const text = res.content.find((block) => block.type === "text")?.text;
  try {
    return text ? fromClaude(JSON.parse(text)) : null;
  } catch {
    console.warn("claude extraction returned invalid JSON; keeping the template fields");
    return null;
  }
}

/** fields + Markdown → draft with confidences. Claude runs only for non-template documents and only when a client is configured. */
export async function scoreExtraction(res: ExtractorResponse, claude: ClaudeClient | null): Promise<Scored & { llm: boolean }> {
  const template = fromTemplate(res.fields, res.ocr_used);
  if (res.template_match || !claude) return { ...template, llm: false };
  const llm = await extractWithClaude(res.markdown, claude);
  return llm ? { ...merge(template, llm), llm: true } : { ...template, llm: false };
}

/**
 * Where the extractor writes the cropped ID photo: a photo/ folder next to the original, inside the tenant prefix (the web presigns
 * it from ImportJob.photoKey). No upload can land on it: the web's safeName() turns "/" into "_", so an original named photo.jpg
 * stays {jobId}/photo.jpg and is never overwritten by the crop. TODO(integration): one key module with the web's importKey.
 */
export const importPhotoKey = (tenantId: string, importJobId: string) => `tenants/${tenantId}/imports/${importJobId}/photo/auto.jpg`;

/** Tesseract language of each sending country (TenantSettings.country). */
const OCR_LANG: Record<string, string> = { VN: "vie", MM: "mya", BD: "ben", ID: "ind" };
/** OCR languages of a tenant's CVs: Japanese and English plus its country's; the extractor drops any not installed (resolve_langs). */
export const ocrLangs = (country: string | null | undefined) => ["jpn", "eng", OCR_LANG[country ?? ""]].filter(Boolean).join("+");

async function callExtractor(fileKey: string, photoKey: string, langs: string): Promise<ExtractorResponse> {
  const res = await fetch(`${env.EXTRACTOR_URL}/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bucket: env.S3_BUCKET_ORIGINALS, key: fileKey, langs, photo_bucket: env.S3_BUCKET_ORIGINALS, photo_key: photoKey }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`extractor answered ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return ExtractorResponse.parse(await res.json());
}

export async function extractCv(job: Job<ExtractCvJob>): Promise<unknown> {
  const { tenantId, importJobId } = job.data;
  // The tenant filter also refuses a payload whose tenantId is not the job's.
  const row = await prisma.importJob.findFirst({ where: { id: importJobId, tenantId } });
  if (!row) return { skipped: "missing" };
  if (row.status === "ready" || row.status === "saved") return { skipped: row.status };
  await prisma.importJob.update({ where: { id: row.id, tenantId }, data: { status: "processing" } });
  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId }, select: { country: true } });
    const res = await callExtractor(row.fileKey, importPhotoKey(tenantId, row.id), ocrLangs(settings?.country));
    const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
    const { cv, confidence, llm } = await scoreExtraction(res, client);
    // The web's Extracted schema (apps/web/lib/extraction/jobs.ts) reads this shape.
    const extracted = { cv, pages: res.pages, ocrUsed: res.ocr_used, templateMatch: res.template_match, llm, kanaGenerated: kanaGenerated(cv, res.markdown) };
    await prisma.importJob.update({
      where: { id: row.id, tenantId },
      data: { status: "ready", extracted: extracted as Prisma.InputJsonValue, confidence, photoKey: res.photo_key ?? null },
    });
    return { fields: Object.keys(cv).length, pages: res.pages, templateMatch: res.template_match, llm, photo: !!res.photo_key };
  } catch (e) {
    await prisma.importJob.update({ where: { id: row.id, tenantId }, data: { status: "failed" } });
    throw e;
  }
}

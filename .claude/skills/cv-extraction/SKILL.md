---
name: cv-extraction
description: The CV import pipeline — extractor service contract (Python: Docling, Tesseract, OpenCV/YuNet, poppler), template-based field mapping without an LLM, and the Claude call (claude-opus-5-5, structured output from the zod schema) only for non-template CVs or free text. Load before touching apps/extractor, the import review page or the extract.cv job.
---
# CV extraction

Goal: text, tables and the ID photo are extracted **locally**; the LLM only sees Markdown and only when needed.

## Extractor service (apps/extractor) — contract

`POST /extract` JSON `{ "bucket": "rireki-originals", "key": "tenants/…/cv/x.pdf", "langs": "jpn+eng", "photo_bucket": "rireki-originals", "photo_key": "tenants/…/photo/auto.jpg" }`
→ `200 { "markdown": "...", "pages": 3, "text_layer": true, "ocr_used": false, "confidence": 0.97, "page_confidence": [0.98,0.97,0.96], "tables": 6, "photo_key": "…" | null, "template_match": true, "fields": { "nameKana": "…", … } | null, "timing_ms": 4200 }`
`GET /health` → `{ "ok": true }`. Errors: 422 unsupported type, 500 with message. Reads/writes MinIO with `boto3`.

Stack (all permissive licenses): `docling` (DOCX/PDF/images → DoclingDocument → `export_to_markdown()`, tables
kept; `PdfPipelineOptions(do_ocr=…, do_table_structure=True, generate_picture_images=True)`;
`TesseractCliOcrOptions(lang=[…])`, `force_full_page_ocr=True` for scans), `pdfplumber` (text-layer check:
< 50 chars/page ⇒ scan), `pypdf`/`pdfimages` (embedded photo), `opencv-python-headless` (deskew: find the page
quadrilateral → `warpPerspective`; adaptive threshold before OCR), YuNet (`cv2.FaceDetectorYN.create(model, "",
(w, h))` on the top-right quadrant → crop 3:4 around the face with 1.6× face width, resize 600×800), `pillow-heif`.
Photo selection for DOCX: unzip `word/media/*`, pick the first image with aspect 0.7–0.8 and ≥200 px.

Docker: `deploy/dockerfiles/extractor.Dockerfile` (Tesseract jpn/eng/vie/mya/ben/ind, poppler, libgl, models
downloaded at build). Two uvicorn workers; `OMP_NUM_THREADS=2`.

## Template mapping (no LLM) — `apps/web/lib/extraction/template.ts` + `apps/extractor/template.py`

The company template has fixed Japanese labels. Map label → field from the Markdown tables:
`フリガナ→nameKana`, `氏名→nameLatin`, `生年月日→dob` (parse `1997年5月10日`), `性別→gender` (男/女), `国籍→nationality`
(ミャンマー→MM, ベトナム→VN, バングラデシュ→BD, インドネシア→ID), `携帯電話番号→mobile`, `メール→email`, `現住所→address`
(+ the フリガナ row above it → addressKana), `家族構成→familyCount` (`3人`), `就職活動中|在職中|研修中|内定→situation`,
`学歴` table rows (年, 月, text, 入学|卒業) → `education[]` (pair 入学/卒業 of the same school),
`職歴` table rows (入社|退職 + following `仕事内容：` rows) → `work[]`, `現在→currentStatus`, `免許・資格` rows →
`licenses[]`, `JLPT N\d` in licenses → `jlpt`, `趣味・特技→hobbies`, `日本での就職志望動機、自己PR→motivationPr`,
`配偶者→spouse` (有/無), `配偶者の扶養義務→spouseDependency`, `給与|勤務地|勤務時間→wish*`, `身長→heightCm` (`160CM`),
`体重→weightKg`, `服のサイズ→clothingSize`, `肩→shoulderCm`, `ウエスト→waistCm`, `靴のサイズ→shoeCm`,
`宗教的に注意が必要な事項→religionNotes`, `食べられないもの→foodRestrictions`, `アレルギー→allergies`, `その他連絡事項→otherNotes`.
The language scale (`日本語会話レベル`) is a company assessment: leave `jaLevel/enLevel` empty for staff.
`template_match = true` when ≥ 8 of the labels are found. Confidence 0.9 for mapped fields (0.7 when OCR was used).
Write the mapper as pure functions with Vitest tests on Markdown fixtures.

## Claude step (only when `template_match` is false, fields are missing, or free text needs normalising)

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
const client = new Anthropic();                       // ANTHROPIC_API_KEY from env (worker only)
const schema = zodToJsonSchema(CvDraft.extend({ confidence: z.record(z.number()) }), "CvExtraction");
const msg = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  max_tokens: 16000,
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }], // stable prefix → cached
  messages: [{ role: "user", content: [
    { type: "text", text: `Extract the 履歴書 fields from this Markdown. Dates as YYYY-MM or YYYY-MM-DD. Unknown → omit.\n\n${markdown}` },
    ...lowConfidencePages.map(p => ({ type: "image", source: { type: "base64", media_type: "image/png", data: p } })), // only pages with OCR confidence < 0.85
  ]}],
  output_config: { format: { type: "json_schema", schema } },
});
```
Parse the JSON text block, validate with `CvDraft`, merge over template fields (template wins for exact strings:
code, phone, dates). Budget: ~1–2K input tokens per CV; `claude-sonnet-5-5` for bulk imports via env.
Never log the Markdown or the photo; store only the result in `ImportJob.extracted`.

## Review screen (mockup `app/candidate-import.html`)

Shows the fields with confidence chips (`conf high` ≥ 0.85, `conf low` otherwise), the original document pages
(rendered PNG), the cropped photo, and "Save candidate" → creates the `Candidate` with the code and attaches the
original file + photo.

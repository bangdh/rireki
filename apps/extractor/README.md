# Rireki extractor (Python 3.12, FastAPI)

Turns a DOCX / PDF / photo stored in S3 into Markdown (tables kept), OCR confidence, the cropped ID photo and —
for the company 履歴書 template — the mapped fields, all locally. Contract and library choices:
`.claude/skills/cv-extraction/SKILL.md`.

```
POST /extract  {"bucket","key","langs":"jpn+eng","photo_bucket","photo_key"}
  → {"markdown","pages","text_layer","ocr_used","confidence","page_confidence","tables",
     "photo_key"|null,"template_match","fields"|null,"timing_ms"}      422 unsupported type · 500 with message
GET  /health   → {"ok": true}
```

| File | Role |
|---|---|
| `main.py` | FastAPI app, boto3 S3 I/O (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_FORCE_PATH_STYLE`), timing log |
| `convert.py` | file sniffing; DOCX (python-docx); PDF text layer (pdfplumber, < 50 chars/page ⇒ scan → OCR); photos (deskew → OCR); optional Docling engine |
| `ocr.py` | pypdfium2 page render (300 dpi), OpenCV deskew (page quadrilateral → warpPerspective) + adaptive threshold, Tesseract via pytesseract with word confidences |
| `layout.py` | word boxes → rows → pipe tables (same shape for text layer and OCR) |
| `photo.py` | embedded portrait (DOCX `word/media`, PDF images; aspect 0.7–0.8, ≥ 200 px) or face crop on page 1 (YuNet if `YUNET_MODEL` exists, else OpenCV Haar cascade) → 3:4, 600×800 JPEG |
| `template.py` | pure rule-based mapping of the Japanese labels → CV fields; `template_match` when ≥ 8 labels are found |

Engines: `EXTRACTOR_ENGINE=auto|basic|docling`. `auto` (default) uses Docling for PDFs and photos only when the
package is installed **and** `DOCLING_ARTIFACTS_PATH` exists (the Docker image downloads the models at build time);
everything else — and every test — runs the basic engine. `OCR_LANGS` is the default Tesseract language list,
`EXTRACTOR_MAX_PAGES` (30) caps a document.

## Develop

```bash
pnpm --filter @rireki/extractor run setup   # uv venv + requirements-dev.txt (no Docling)
pnpm --filter @rireki/extractor test        # pytest: synthetic DOCX / PDF / scan / phone photo, mocked S3 (moto)
pnpm --filter @rireki/extractor dev         # uvicorn on :8000
```

Without `uv`: `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`. Needs `tesseract` (with
`jpn`, `eng`, …) on PATH. Image: `deploy/dockerfiles/extractor.Dockerfile` (context `apps/extractor`).

"""Rireki extractor: POST /extract turns a DOCX / PDF / photo stored in MinIO into Markdown (tables kept), OCR
confidence, the cropped ID photo and — for the company 履歴書 template — the mapped fields. Contract:
.claude/skills/cv-extraction/SKILL.md."""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from tempfile import TemporaryDirectory

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import convert
import photo
import template
from ocr import resolve_langs

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("extractor")
OCR_LANGS = os.environ.get("OCR_LANGS", "jpn+eng")

app = FastAPI(title="Rireki extractor")


class ExtractRequest(BaseModel):
    bucket: str
    key: str
    langs: str = OCR_LANGS  # Tesseract codes joined with "+"
    photo_bucket: str | None = None  # where to write the cropped photo (defaults to `bucket`)
    photo_key: str | None = None  # omit to skip the photo


class ExtractResponse(BaseModel):
    markdown: str
    pages: int
    text_layer: bool
    ocr_used: bool
    confidence: float
    page_confidence: list[float]
    tables: int
    photo_key: str | None
    template_match: bool
    fields: dict | None
    timing_ms: int


def s3():
    path_style = os.environ.get("S3_FORCE_PATH_STYLE", "true").lower() != "false"
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT") or None,
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY") or None,
        aws_secret_access_key=os.environ.get("S3_SECRET_KEY") or None,
        region_name=os.environ.get("S3_REGION") or "us-east-1",
        config=Config(s3={"addressing_style": "path" if path_style else "auto"}),
    )


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest) -> ExtractResponse:
    t0 = time.perf_counter()
    langs = resolve_langs(req.langs or OCR_LANGS)
    with TemporaryDirectory() as tmp:
        path = Path(tmp) / (Path(req.key).name or "file")
        try:
            s3().download_file(req.bucket, req.key, str(path))
        except (ClientError, BotoCoreError) as e:
            raise HTTPException(500, f"download failed for {req.bucket}/{req.key}: {e}") from e
        try:
            kind = convert.sniff_kind(path)
            doc = convert.extract(kind, path, langs)
            jpeg = photo.find_photo(kind, path, doc.page1, doc.pictures) if req.photo_key else None
        except convert.Unsupported as e:
            raise HTTPException(422, str(e)) from e
        except Exception as e:
            log.exception("extraction failed for %s", req.key)
            raise HTTPException(500, f"extraction failed: {e}") from e
    photo_key = None
    if jpeg:
        try:
            s3().put_object(Bucket=req.photo_bucket or req.bucket, Key=req.photo_key, Body=jpeg, ContentType="image/jpeg")
            photo_key = req.photo_key
        except (ClientError, BotoCoreError) as e:
            raise HTTPException(500, f"photo upload failed: {e}") from e
    matched, fields = template.match_template(doc.markdown)
    timing_ms = int((time.perf_counter() - t0) * 1000)
    log.info("%s %s: pages=%d text_layer=%s ocr=%s conf=%.2f tables=%d photo=%s template=%s fields=%d total %d ms",
             kind, Path(req.key).name, doc.pages, doc.text_layer, doc.ocr_used, doc.confidence, doc.tables,
             photo_key is not None, matched, len(fields or {}), timing_ms)
    return ExtractResponse(
        markdown=doc.markdown,
        pages=doc.pages,
        text_layer=doc.text_layer,
        ocr_used=doc.ocr_used,
        confidence=doc.confidence,
        page_confidence=doc.page_confidence,
        tables=doc.tables,
        photo_key=photo_key,
        template_match=matched,
        fields=fields,
        timing_ms=timing_ms,
    )

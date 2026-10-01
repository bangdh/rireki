"""End-to-end through FastAPI with a mocked S3 (moto): the POST /extract contract from the cv-extraction skill."""
import io

import pytest
from conftest import make_docx, make_pdf, make_scan, needs_tesseract
from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)
CONTRACT_KEYS = {"markdown", "pages", "text_layer", "ocr_used", "confidence", "page_confidence", "tables",
                 "photo_key", "template_match", "fields", "timing_ms"}


def extract(s3, path, key, **extra):
    s3.upload_file(str(path), "rireki-originals", key)
    body = {"bucket": "rireki-originals", "key": key, "langs": "jpn+eng",
            "photo_bucket": "rireki-originals", "photo_key": "tenants/t1/candidates/c1/photo/auto.jpg", **extra}
    return client.post("/extract", json=body)


def photo_size(s3) -> tuple[int, int]:
    obj = s3.get_object(Bucket="rireki-originals", Key="tenants/t1/candidates/c1/photo/auto.jpg")
    assert obj["ContentType"] == "image/jpeg"
    return Image.open(io.BytesIO(obj["Body"].read())).size


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_extract_docx(s3, tmp_path):
    r = extract(s3, make_docx(tmp_path / "cv.docx"), "tenants/t1/candidates/c1/cv/cv.docx")
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == CONTRACT_KEYS
    assert body["pages"] == 1 and body["text_layer"] is True and body["ocr_used"] is False
    assert body["confidence"] == 1.0 and body["page_confidence"] == [1.0] and body["tables"] >= 8
    assert body["template_match"] is True and body["fields"]["nameLatin"] == "NGUYEN VAN AN"
    assert body["fields"]["dob"] == "2002-03-15" and body["fields"]["jlpt"] == "N4"
    assert body["photo_key"] == "tenants/t1/candidates/c1/photo/auto.jpg" and photo_size(s3) == (600, 800)
    assert isinstance(body["timing_ms"], int)


def test_extract_pdf(s3, tmp_path):
    r = extract(s3, make_pdf(tmp_path / "cv.pdf"), "tenants/t1/candidates/c1/cv/cv.pdf")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pages"] == 2 and body["text_layer"] and not body["ocr_used"] and body["confidence"] == 1.0
    assert body["template_match"] and body["fields"]["nameKana"] == "グエン・バン・アン"
    assert body["photo_key"] and photo_size(s3) == (600, 800)


@needs_tesseract
def test_extract_phone_photo(s3, tmp_path):
    png, japanese = make_scan(tmp_path / "IMG_0001.jpg", warp=True)
    r = extract(s3, png, "tenants/t1/candidates/c1/cv/IMG_0001.jpg")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pages"] == 1 and body["text_layer"] is False and body["ocr_used"] is True
    assert body["confidence"] > 0.5 and "NGUYEN" in body["markdown"]
    assert body["photo_key"] and photo_size(s3) == (600, 800)
    if japanese:
        assert body["template_match"] is True


def test_photo_is_optional(s3, tmp_path):
    r = extract(s3, make_docx(tmp_path / "cv.docx"), "cv.docx", photo_bucket=None, photo_key=None)
    assert r.status_code == 200 and r.json()["photo_key"] is None


def test_unsupported_type_is_422(s3, tmp_path):
    txt = tmp_path / "cv.txt"
    txt.write_text("not a cv")
    r = extract(s3, txt, "tenants/t1/cv.txt")
    assert r.status_code == 422 and "unsupported" in r.json()["detail"]


def test_missing_object_is_500(s3):
    r = client.post("/extract", json={"bucket": "rireki-originals", "key": "missing.pdf", "langs": "jpn+eng"})
    assert r.status_code == 500 and "download failed" in r.json()["detail"]

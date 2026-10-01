"""The ID photo: an embedded portrait (DOCX word/media, PDF images) or a face found on page 1 (YuNet when its ONNX
model is present, else OpenCV's bundled Haar cascade), cropped 3:4 and resized to 600×800 JPEG."""
from __future__ import annotations

import io
import os
import re
import zipfile
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Iterator

import cv2
import numpy as np
import pypdf
from PIL import Image, ImageOps

import ocr

OUT_SIZE = (600, 800)
ASPECT = (0.7, 0.8)  # width / height of an ID photo
MIN_SIDE = 200
FACE_SCALE = 1.6  # crop width = 1.6 × detected face width
YUNET_MODEL = os.environ.get("YUNET_MODEL", str(Path(__file__).with_name("models") / "face_detection_yunet_2023mar.onnx"))


def is_portrait(im: Image.Image) -> bool:
    w, h = im.size
    return min(w, h) >= MIN_SIDE and ASPECT[0] <= w / h <= ASPECT[1]


def docx_pictures(path: Path) -> Iterator[Image.Image]:
    with zipfile.ZipFile(path) as z:
        media = [n for n in z.namelist() if n.startswith("word/media/")]
        for name in sorted(media, key=lambda n: [int(s) if s.isdigit() else s for s in re.split(r"(\d+)", n)]):
            try:
                yield Image.open(io.BytesIO(z.read(name)))
            except Exception:
                continue


def pdf_pictures(path: Path, max_pages: int = 2) -> Iterator[Image.Image]:
    try:
        pages = pypdf.PdfReader(str(path)).pages[:max_pages]
    except Exception:
        return
    for page in pages:
        try:
            files = list(page.images)
        except Exception:
            continue
        for f in files:
            try:
                yield f.image
            except Exception:
                continue


def to_jpeg(im: Image.Image) -> bytes:
    im = ImageOps.fit(ImageOps.exif_transpose(im).convert("RGB"), OUT_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return buf.getvalue()


@lru_cache(maxsize=1)
def _haar() -> cv2.CascadeClassifier:
    return cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def detect_faces(bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Face boxes (x, y, w, h) in the given image; detection runs on a ≤1000 px copy for speed."""
    h, w = bgr.shape[:2]
    s = min(1.0, 1000 / max(h, w))
    small = cv2.resize(bgr, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else bgr
    if os.path.exists(YUNET_MODEL):
        det = cv2.FaceDetectorYN.create(YUNET_MODEL, "", (small.shape[1], small.shape[0]), 0.8, 0.3, 50)
        _, faces = det.detect(small)
        boxes = [] if faces is None else [f[:4] for f in faces]
    else:
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        boxes = list(_haar().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)))
    return [tuple(int(round(v / s)) for v in b) for b in boxes]


def face_box(bgr: np.ndarray) -> tuple[int, int, int, int] | None:
    """Largest face in the top-right quadrant (where the 履歴書 photo sits), else anywhere on the page."""
    h, w = bgr.shape[:2]
    for x0, roi in ((w // 2, bgr[: h // 2, w // 2 :]), (0, bgr)):
        faces = detect_faces(roi)
        if faces:
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            return x + x0, y, fw, fh
    return None


def crop_face(bgr: np.ndarray, box: tuple[int, int, int, int]) -> bytes:
    """3:4 crop, FACE_SCALE × face width, face centre at ~42 % of the height; padded with white at the page edge."""
    x, y, fw, fh = box
    cw = FACE_SCALE * fw
    ch = cw * 4 / 3
    x0, y0 = int(x + fw / 2 - cw / 2), int(y + fh / 2 - 0.42 * ch)
    x1, y1 = int(x0 + cw), int(y0 + ch)
    h, w = bgr.shape[:2]
    pad = max(0, -x0, -y0, x1 - w, y1 - h)
    if pad:
        bgr = cv2.copyMakeBorder(bgr, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        x0, y0, x1, y1 = x0 + pad, y0 + pad, x1 + pad, y1 + pad
    crop = bgr[y0:y1, x0:x1]
    interp = cv2.INTER_CUBIC if crop.shape[1] < OUT_SIZE[0] else cv2.INTER_AREA
    _, buf = cv2.imencode(".jpg", cv2.resize(crop, OUT_SIZE, interpolation=interp), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes()


def find_photo(kind: str, path: Path, page1: np.ndarray | None, pictures: Iterable[Image.Image] = ()) -> bytes | None:
    """Embedded portrait first (exact pixels), then a face crop from page 1 (rendered on demand for PDFs)."""
    embedded = docx_pictures(path) if kind == "docx" else pdf_pictures(path) if kind == "pdf" else iter(())
    for im in (*pictures, *embedded):
        if is_portrait(im):
            return to_jpeg(im)
    if page1 is None and kind == "pdf":
        page1 = ocr.render_pdf_page(path, 0, dpi=200)
    if page1 is not None:
        box = face_box(page1)
        if box:
            return crop_face(page1, box)
    return None

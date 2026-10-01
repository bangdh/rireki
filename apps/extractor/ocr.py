"""Page rendering (pypdfium2), OpenCV page deskew, and Tesseract OCR (pytesseract → tesseract CLI) with per-word
confidence; adaptive (Sauvola) binarisation for photos is Tesseract's own."""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from statistics import median

import cv2
import numpy as np
import pypdfium2 as pdfium
import pytesseract
from PIL import Image, ImageOps

from layout import Word

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()  # iPhone HEIC photos open through Pillow
except ImportError:  # pragma: no cover
    pass

log = logging.getLogger("extractor")
DPI = 300  # render resolution for scanned PDF pages
MIN_SIDE = 2000  # upscale smaller phone photos so glyphs reach roughly 300 dpi


def render_pdf_page(path: Path, index: int, dpi: int = DPI) -> np.ndarray:
    """One PDF page as a BGR image."""
    pdf = pdfium.PdfDocument(str(path))
    try:
        pil = pdf[index].render(scale=dpi / 72).to_pil().convert("RGB")
    finally:
        pdf.close()
    return cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)


def load_image(path: Path) -> np.ndarray:
    """Any Pillow-readable image (JPEG/PNG/HEIC/TIFF…) as BGR, honouring the EXIF orientation."""
    with Image.open(path) as im:
        rgb = ImageOps.exif_transpose(im).convert("RGB")
    return cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)


def deskew(img: np.ndarray) -> np.ndarray:
    """Find the page quadrilateral in a photo and warp it flat (warpPerspective). Unchanged when no page outline
    covering at least a quarter of the picture is found (plain scans)."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.dilate(cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150), None, iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        if cv2.contourArea(c) < 0.25 * w * h:
            break
        quad = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        if len(quad) != 4:
            continue
        pts = quad.reshape(4, 2).astype(np.float32)
        s, d = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
        tl, br, tr, bl = pts[s.argmin()], pts[s.argmax()], pts[d.argmin()], pts[d.argmax()]
        width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
        if width < 0.3 * w or height < 0.3 * h:
            continue
        src = np.float32([tl, tr, br, bl])
        dst = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
        return cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (width, height), borderValue=(255, 255, 255))
    return img


def prepare(img: np.ndarray, camera: bool) -> Image.Image:
    """Grayscale for Tesseract; small phone photos are upscaled so glyphs reach roughly 300 dpi."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if camera and max(gray.shape) < MIN_SIDE:
        f = MIN_SIDE / max(gray.shape)
        gray = cv2.resize(gray, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
    return Image.fromarray(gray)


@lru_cache(maxsize=1)
def available_langs() -> frozenset[str]:
    try:
        return frozenset(pytesseract.get_languages())
    except Exception:  # tesseract missing: the OCR call itself will report it
        return frozenset()


def resolve_langs(langs: str) -> str:
    """Keep the requested Tesseract languages that are installed ("jpn+eng"); fall back to eng."""
    avail = available_langs()
    wanted = dict.fromkeys(part.strip() for part in langs.replace(",", "+").split("+"))
    return "+".join(code for code in wanted if code and (not avail or code in avail)) or "eng"


def ocr_words(img: Image.Image, langs: str, adaptive: bool = False) -> tuple[list[Word], float]:
    """Tesseract words with boxes; page confidence = length-weighted mean word confidence (0..1).
    The DPI is estimated from the page height (A4 long side): without it Tesseract misjudges glyph sizes on large
    renders and reads kanji as Latin garbage. `adaptive` switches Tesseract's binarisation from Otsu to Sauvola
    (adaptive threshold) for photos with uneven lighting; measured on synthetic phone photos it keeps every label
    where an OpenCV adaptiveThreshold pass lost most of the dense kanji."""
    dpi = min(600, max(70, round(max(img.size) / 11.69)))
    config = f"--dpi {dpi}" + (" -c thresholding_method=2" if adaptive else "")
    data = pytesseract.image_to_data(img, lang=langs, config=config, output_type=pytesseract.Output.DICT)
    words = []
    for text, conf, x, y, w, h in zip(data["text"], data["conf"], data["left"], data["top"], data["width"], data["height"]):
        text = text.strip()
        if text and float(conf) >= 0:  # -1 marks layout rows, not words
            words.append(Word(text, x, x + w, y, y + h, float(conf) / 100))
    if words:  # drop boxes far taller than the typical glyph (table rules, photo noise)
        m = median(w.h for w in words)
        words = [w for w in words if w.h <= 3 * m]
    n = sum(len(w.text) for w in words)
    return words, (round(sum(w.conf * len(w.text) for w in words) / n, 3) if n else 0.0)

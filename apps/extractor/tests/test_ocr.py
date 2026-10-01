from conftest import make_scan, needs_tesseract

import ocr
from layout import words_to_rows


@needs_tesseract
def test_resolve_langs_keeps_installed_languages_only():
    assert ocr.resolve_langs("jpn+eng+zzz") == "jpn+eng"
    assert ocr.resolve_langs("zzz") == "eng"
    assert ocr.resolve_langs("") == "eng"


@needs_tesseract
def test_deskew_phone_photo_and_ocr(tmp_path):
    png, _ = make_scan(tmp_path / "photo.jpg", warp=True)
    img = ocr.load_image(png)
    flat = ocr.deskew(img)
    h, w = flat.shape[:2]
    assert flat.shape != img.shape  # the page quadrilateral was found and warped flat
    assert abs(w / h - 1654 / 2339) < 0.08  # back to the A4 aspect
    words, conf = ocr.ocr_words(ocr.prepare(flat, camera=True), "jpn+eng", adaptive=True)
    rows = [cells for _, cells in words_to_rows(words)]
    assert conf > 0.5
    assert any("NGUYEN" in c for cells in rows for c in cells)


def test_plain_scan_is_left_alone(tmp_path):
    png, _ = make_scan(tmp_path / "scan.png")
    img = ocr.load_image(png)
    assert ocr.deskew(img).shape == img.shape

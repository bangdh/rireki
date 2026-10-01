import io

import numpy as np
from conftest import FACE, make_docx, make_pdf, make_scan
from PIL import Image

import ocr
import photo


def jpeg_size(data: bytes) -> tuple[int, int]:
    im = Image.open(io.BytesIO(data))
    assert im.format == "JPEG"
    return im.size


def test_docx_embedded_portrait(tmp_path):
    assert jpeg_size(photo.find_photo("docx", make_docx(tmp_path / "cv.docx"), None)) == (600, 800)
    assert photo.find_photo("docx", make_docx(tmp_path / "nophoto.docx", photo=False), None) is None


def test_pdf_embedded_portrait_then_face_fallback(tmp_path):
    assert jpeg_size(photo.find_photo("pdf", make_pdf(tmp_path / "cv.pdf"), None)) == (600, 800)
    assert photo.find_photo("pdf", make_pdf(tmp_path / "nophoto.pdf", photo=False), None) is None  # rendered page, no face


def test_face_crop_from_scanned_page(tmp_path):
    png, _ = make_scan(tmp_path / "scan.png")
    page = ocr.load_image(png)
    box = photo.face_box(page)
    assert box is not None
    x, y, w, h = box
    assert x > page.shape[1] / 2 and y < page.shape[0] / 2  # found in the top-right quadrant
    assert 1200 < x < 1530 and 160 < y < 600
    assert jpeg_size(photo.crop_face(page, box)) == (600, 800)
    assert jpeg_size(photo.find_photo("image", png, page)) == (600, 800)


def test_crop_pads_at_the_image_edge():
    img = np.full((300, 300, 3), 200, dtype=np.uint8)
    assert jpeg_size(photo.crop_face(img, (0, 0, 100, 100))) == (600, 800)
    assert jpeg_size(photo.crop_face(img, (250, 250, 50, 50))) == (600, 800)


def test_is_portrait():
    assert photo.is_portrait(Image.open(FACE))
    assert not photo.is_portrait(Image.new("RGB", (400, 400)))
    assert not photo.is_portrait(Image.new("RGB", (150, 200)))

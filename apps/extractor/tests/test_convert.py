import pytest
from conftest import make_docx, make_pdf, make_scan, make_scan_pdf, needs_tesseract

import convert
from layout import Word, count_tables, rows_to_markdown, words_to_rows
from template import match_template


def test_words_to_rows_splits_cells_on_wide_gaps_and_glues_cjk():
    words = [
        Word("フリ", 10, 40, 100, 120), Word("ガナ", 42, 72, 100, 120), Word("グエン", 200, 260, 101, 121),
        Word("氏名", 10, 50, 150, 170), Word("NGUYEN", 200, 260, 150, 170), Word("VAN", 265, 290, 150, 170),
    ]
    assert [cells for _, cells in words_to_rows(words)] == [["フリガナ", "グエン"], ["氏名", "NGUYEN VAN"]]


def test_rows_to_markdown_tables_and_paragraphs():
    md = rows_to_markdown([["## 履歴書"], ["氏名", "NGUYEN"], ["国籍", "VN", "extra"], ["a paragraph"], ["x", "y"]])
    assert md.split("\n\n") == [
        "## 履歴書",
        "| 氏名 | NGUYEN |  |\n|---|---|---|\n| 国籍 | VN | extra |",
        "a paragraph",
        "| x | y |\n|---|---|",
    ]
    assert count_tables(md) == 2


def test_sniff_kind(tmp_path):
    assert convert.sniff_kind(make_docx(tmp_path / "a.docx")) == "docx"
    assert convert.sniff_kind(make_pdf(tmp_path / "a.pdf")) == "pdf"
    assert convert.sniff_kind(make_scan(tmp_path / "a.png")[0]) == "image"
    txt = tmp_path / "a.txt"
    txt.write_text("hello")
    with pytest.raises(convert.Unsupported):
        convert.sniff_kind(txt)


def test_docx_to_markdown_keeps_tables_and_order(tmp_path):
    doc = convert.extract_docx(make_docx(tmp_path / "cv.docx"))
    assert doc.text_layer and not doc.ocr_used and doc.confidence == 1.0 and doc.pages == 1
    assert doc.markdown.startswith("# 履歴書")
    assert "| フリガナ | グエン・バン・アン |" in doc.markdown
    assert "| 2017 | 9 | ホアンホア第2高等学校（ベトナム） | 入学 |" in doc.markdown
    assert doc.markdown.count("## ") == 5 and doc.tables >= 8
    assert doc.markdown.index("## 学歴") < doc.markdown.index("## 職歴")
    matched, fields = match_template(doc.markdown)
    assert matched and fields["nameLatin"] == "NGUYEN VAN AN" and len(fields["education"]) == 2


def test_pdf_text_layer(tmp_path):
    doc = convert.extract_pdf(make_pdf(tmp_path / "cv.pdf"), "jpn+eng")
    assert doc.pages == 2 and doc.text_layer and not doc.ocr_used
    assert doc.page_confidence == [1.0, 1.0] and doc.tables == 6  # pdfplumber merges visually continuous ruled tables
    assert "| 氏名 | NGUYEN VAN AN |" in doc.markdown
    matched, fields = match_template(doc.markdown)
    assert matched
    assert fields["nameKana"] == "グエン・バン・アン" and fields["dob"] == "2002-03-15" and fields["jlpt"] == "N4"
    assert fields["heightCm"] == 168 and fields["education"][0]["from"] == "2017-09"


@needs_tesseract
def test_scanned_pdf_is_ocrd(tmp_path):
    png, japanese = make_scan(tmp_path / "scan.png")
    doc = convert.extract_pdf(make_scan_pdf(tmp_path / "scan.pdf", png), "jpn+eng")
    assert doc.pages == 1 and not doc.text_layer and doc.ocr_used
    assert doc.confidence > 0.5 and doc.page1 is not None
    assert "NGUYEN" in doc.markdown and "678" in doc.markdown
    if japanese:
        matched, fields = match_template(doc.markdown)
        assert matched and fields["nameLatin"].startswith("NGUYEN")

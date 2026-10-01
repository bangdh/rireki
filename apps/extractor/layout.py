"""Word boxes → visual rows → Markdown.

Shared by the pdfplumber (text layer) and Tesseract (OCR) paths so both produce the same pipe-table shape, which
template.py then reads. A row is a list of cells; runs of multi-cell rows become one Markdown table.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from statistics import median

_CJK = re.compile(r"[　-ヿ㐀-鿿豈-﫿＀-￯]")
_SEPARATOR = re.compile(r"^\|(?:-+\|)+$", re.M)


@dataclass
class Word:
    text: str
    x0: float
    x1: float
    top: float
    bottom: float
    conf: float = 1.0  # 0..1 (Tesseract word confidence; 1.0 for text layers)

    @property
    def cy(self) -> float:
        return (self.top + self.bottom) / 2

    @property
    def h(self) -> float:
        return self.bottom - self.top


def join_words(words: list[Word]) -> str:
    """Tesseract splits Japanese into fragments: glue CJK neighbours, keep one space between Latin words."""
    out = words[0].text
    for a, b in zip(words, words[1:]):
        out += ("" if _CJK.search(a.text[-1]) or _CJK.search(b.text[0]) else " ") + b.text
    return out


def words_to_rows(words: list[Word], gap: float = 1.5) -> list[tuple[float, list[str]]]:
    """Cluster boxes into lines by vertical centre, then split each line into cells where the horizontal gap
    exceeds `gap` × the line height (a form's label | value boundary). Returns (top, cells) per row."""
    lines: list[list[Word]] = []
    for w in sorted(words, key=lambda w: w.cy):
        if lines:
            cur = lines[-1]
            cy = sum(v.cy for v in cur) / len(cur)
            if abs(w.cy - cy) <= 0.6 * max(max(v.h for v in cur), w.h):
                cur.append(w)
                continue
        lines.append([w])
    rows: list[tuple[float, list[str]]] = []
    for line in lines:
        line.sort(key=lambda w: w.x0)
        h = median(w.h for w in line) or 1
        cells: list[list[Word]] = [[line[0]]]
        for a, b in zip(line, line[1:]):
            (cells.append([b]) if b.x0 - a.x1 > gap * h else cells[-1].append(b))
        rows.append((min(w.top for w in line), [join_words(c) for c in cells]))
    return rows


def md_cell(text: str) -> str:
    return " ".join((text or "").split()).replace("|", "\\|")


def rows_to_markdown(rows: list[list[str]]) -> str:
    """Runs of multi-cell rows become one pipe table each; single-cell rows become paragraphs; an empty row only
    ends the current table (a boundary between two source tables)."""
    out: list[str] = []
    table: list[list[str]] = []

    def flush() -> None:
        if table:
            n = max(len(r) for r in table)
            lines = ["| " + " | ".join(md_cell(c) for c in r + [""] * (n - len(r))) + " |" for r in table]
            lines.insert(1, "|" + "---|" * n)
            out.append("\n".join(lines))
            table.clear()

    for cells in rows:
        if len(cells) >= 2:
            table.append(list(cells))
        else:
            flush()
            if cells and md_cell(cells[0]):
                out.append(md_cell(cells[0]))
    flush()
    return "\n\n".join(out)


def count_tables(markdown: str) -> int:
    return len(_SEPARATOR.findall(markdown))  # one separator row per table (also true for Docling's output)

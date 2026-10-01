"""Rule-based mapping of the company 履歴書 template (fixed Japanese labels) from Markdown to CV fields — no LLM.

Pure functions. Labels and field names follow .claude/skills/cv-extraction/SKILL.md and packages/shared/src/cv.ts
(the web app has the same mapper in apps/web/lib/extraction/template.ts). Works on pipe tables (DOCX, PDF text
layer, Docling) and on OCR rows (label and value split into cells by layout.py, or glued in one cell).
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date

MIN_LABELS = 8  # template_match when at least this many distinct labels are found
NATIONALITIES = {"ベトナム": "VN", "vietnam": "VN", "viet nam": "VN", "việt nam": "VN",
                 "ミャンマー": "MM", "myanmar": "MM", "burma": "MM",
                 "バングラデシュ": "BD", "bangladesh": "BD",
                 "インドネシア": "ID", "indonesia": "ID"}
SITUATIONS = {"就職活動中": "job_hunting", "研修中": "in_training", "在職中": "employed", "内定": "offer"}


def nfkc(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "").strip()


def _lenient(label: str) -> str:
    """Regex source for a label tolerating stray spaces and middle-dot variants (OCR)."""
    return r"\s*".join("[・·•.]" if ch == "・" else re.escape(ch) for ch in label)


def label_re(*labels: str, tail: str = "") -> re.Pattern[str]:
    """Matches a cell that starts with one of the labels (longest first) followed by a boundary; group 1 is the
    rest of the cell — the value when label and value share a cell (`性別 男`). A parenthesised qualifier after the
    label (`肩(上半身)`) and a colon are skipped."""
    alts = "|".join(_lenient(l) for l in sorted(labels, key=len, reverse=True))
    return re.compile(rf"^\s*(?:{alts}){tail}(?=\s|$|[:(])\s*(?:\([^)]*\))?\s*:?\s*(.*)$", re.S)


KANA = label_re("フリガナ", "ふりがな")
ADDRESS = label_re("現住所", "住所")
LABELS: dict[str, re.Pattern[str]] = {
    "nameLatin": label_re("氏名", "名前", "Name"),
    "dob": label_re("生年月日"),
    "gender": label_re("性別"),
    "nationality": label_re("国籍"),
    "situation": label_re("状況", "現在の状況", "現況"),
    "familyCount": label_re("家族構成", "家族"),
    "spouse": label_re("配偶者", tail=r"(?!\s*の)"),
    "spouseDependency": label_re("配偶者の扶養義務", "扶養義務"),
    "mobile": label_re("携帯電話番号", "携帯電話", "電話番号", "携帯", "電話"),
    "email": label_re("メールアドレス", "メール", "Eメール", "E-mail", "Email"),
    "address": ADDRESS,
    "currentStatus": label_re("現在", tail=r"(?!\s*[のに])"),
    "hobbies": label_re("趣味・特技", "趣味"),
    "motivationPr": label_re("日本での就職志望動機、自己PR", "日本での就職志望動機・自己PR", "志望動機、自己PR",
                             "志望動機・自己PR", "志望動機", "自己PR"),
    "wishSalary": label_re("給与", "希望給与"),
    "wishLocation": label_re("勤務地", "希望勤務地"),
    "wishHours": label_re("勤務時間"),
    "heightCm": label_re("身長"),
    "weightKg": label_re("体重"),
    "clothingSize": label_re("服のサイズ", "服サイズ"),
    "shoulderCm": label_re("肩幅", "肩"),
    "waistCm": label_re("ウエスト", "ウェスト"),
    "shoeCm": label_re("靴のサイズ", "靴サイズ", "靴"),
    "religionNotes": label_re("宗教的に注意が必要な事項", "宗教"),
    "foodRestrictions": label_re("食べられないもの", "食べられない物"),
    "allergies": label_re("アレルギー"),
    "otherNotes": label_re("その他連絡事項", "その他"),
}
SECTIONS = {
    "education": label_re("学歴", "学歴・職歴"),
    "work": label_re("職歴"),
    "licenses": label_re("免許・資格", "資格・免許", "免許資格", "資格"),
}
HEADERS = label_re("年", "月", "写真", "入学・卒業", "入社・退職", "日本語", "英語", "語学力")
ALL_LABELS = [KANA, *LABELS.values(), *SECTIONS.values(), HEADERS]
YEAR_ROW = re.compile(r"^\s*(\d{4})\s*年?\s*[.\-/]?\s*(\d{1,2})\s*月?\s*(.*)$", re.S)
FLAG = re.compile(r"(入学|卒業(?:見込み?)?|入社|退職|退社|現在に至る|在学中|在職中)\s*[。.]?\s*$")
JOB_DESC = re.compile(r"^\s*仕事内容\s*:?\s*(.*)$", re.S)
JLPT = re.compile(r"(?:JLPT|日本語能力試験)\s*N\s*([1-5])|\bN([1-5])\b", re.I)


# --- Markdown → rows --------------------------------------------------------------------------------------------

def parse_rows(markdown: str) -> list[list[str]]:
    """Pipe-table rows become cell lists, other lines single-cell rows; everything NFKC-normalised."""
    rows: list[list[str]] = []
    for line in markdown.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("|"):
            if re.fullmatch(r"\|(?:\s*:?-+:?\s*\|)+", s):
                continue  # header separator
            rows.append([nfkc(c.replace("\\|", "|")) for c in re.split(r"(?<!\\)\|", s.strip("|"))])
        else:
            rows.append([nfkc(s.lstrip("#"))])
    return rows


def is_label(cell: str) -> bool:
    return any(rx.match(cell) and not rx.match(cell).group(1).strip() for rx in ALL_LABELS)


def _row_value(row: list[str], i: int, rest: str) -> str | None:
    """Value for a label found in row[i]: the rest of that cell, else the next non-empty cell that is not a label."""
    if rest:
        return rest
    for nxt in row[i + 1:]:
        if is_label(nxt):
            return None
        if nxt.strip():
            return nxt.strip()
    return None


def find_value(rows: list[list[str]], rx: re.Pattern[str]) -> str | None:
    for row in rows:
        for i, cell in enumerate(row):
            m = rx.match(cell)
            if m and (v := _row_value(row, i, m.group(1).strip())):
                return v
    return None


def find_block(rows: list[list[str]], rx: re.Pattern[str]) -> str | None:
    """Section text: value on the label's row, else the single-cell rows that follow the heading."""
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            m = rx.match(cell)
            if not m:
                continue
            if v := _row_value(row, j, m.group(1).strip()):
                return v
            out = []
            for nxt in rows[i + 1:]:
                if len(nxt) != 1 or is_label(nxt[0]) or YEAR_ROW.match(nxt[0]):
                    break
                out.append(nxt[0])
            if out:
                return "\n".join(out)
    return None


def find_kana(rows: list[list[str]]) -> tuple[str | None, str | None]:
    """フリガナ appears twice: above 氏名 (name) and above 現住所 (address)."""
    name = addr = None
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            m = KANA.match(cell)
            if not m:
                continue
            v = _row_value(row, j, m.group(1).strip())
            below = rows[i + 1] if i + 1 < len(rows) else []
            if any(ADDRESS.match(c) for c in below):
                addr = addr or v
            else:
                name = name or v
    return name, addr


# --- value parsers ----------------------------------------------------------------------------------------------

def parse_date(s: str | None) -> str | None:
    """`2002年3月15日`, `2002/03/15`, `15/03/2002` → `2002-03-15`."""
    s = nfkc(s or "")
    m = re.search(r"(\d{4})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})", s)
    if m:
        y, mo, d = map(int, m.groups())
    else:
        m = re.search(r"(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4})", s)
        if not m:
            return None
        d, mo, y = map(int, m.groups())
    try:
        return date(y, mo, d).isoformat()
    except ValueError:
        return None


def parse_number(s: str | None) -> int | float | None:
    m = re.search(r"\d+(?:\.\d+)?", s or "")
    if not m:
        return None
    return float(m.group()) if "." in m.group() else int(m.group())


def parse_bool(s: str | None) -> bool | None:
    s = (s or "").strip().lower()
    if re.match(r"^(有|あり|有り|はい|yes|y|○)", s):
        return True
    if re.match(r"^(無|なし|無し|いいえ|no|n|×|-)", s):
        return False
    return None


def parse_gender(s: str | None) -> str | None:
    s = s or ""
    male = bool(re.search(r"男|\bmale\b|\bm\b", s, re.I)) and not re.search(r"female", s, re.I)
    female = bool(re.search(r"女|female|\bf\b", s, re.I))
    return "male" if male and not female else "female" if female and not male else None


def parse_nationality(s: str | None) -> str | None:
    s = (s or "").lower()
    return next((code for name, code in NATIONALITIES.items() if name in s), None)


def parse_situation(s: str | None) -> str | None:
    hits = [v for k, v in SITUATIONS.items() if k in (s or "")]
    return hits[0] if len(hits) == 1 else None


def _ym(y: str, mo: str) -> str | None:
    return f"{y}-{int(mo):02d}" if 1 <= int(mo) <= 12 else None


def history(rows: list[list[str]]) -> tuple[list[dict], list[dict], list[dict]]:
    """学歴 / 職歴 / 免許・資格 tables: rows `年 | 月 | text | 入学|卒業|入社|退職`, `仕事内容：` continuation rows."""
    edu: list[dict] = []
    work: list[dict] = []
    lic: list[dict] = []
    section = None
    for row in rows:
        cells = [c for c in row if c.strip()]
        if not cells:
            continue
        found = [name for name, rx in SECTIONS.items() if any(rx.match(c) and not rx.match(c).group(1).strip() for c in cells)]
        if found:
            section = found[-1]
            continue
        text = " ".join(cells)
        if (m := JOB_DESC.match(text)) and work:
            work[-1]["jobDesc"] = (work[-1]["jobDesc"] + "\n" + m.group(1).strip()).strip()
            continue
        m = YEAR_ROW.match(text)
        if not m or not section:
            if is_label(cells[0]):
                section = None
            continue
        ym = _ym(m.group(1), m.group(2))
        if not ym:
            continue
        body = m.group(3).strip()
        f = FLAG.search(body)
        flag = f.group(1) if f else ""
        name = FLAG.sub("", body).strip(" 　。、,.") if f else body
        part_time = "アルバイト" in name
        name = re.sub(r"\(?アルバイト\)?", "", name).strip(" 　")
        if flag.startswith("入学") or (section == "education" and not flag):
            edu.append({"from": ym, "school": _same(name, edu, "school")})
        elif flag.startswith("卒業") or flag == "在学中":
            _close(edu, ym, name, "school", open_only=flag == "在学中")
        elif flag == "入社" or (section == "work" and not flag):
            work.append({"from": ym, "employer": _same(name, work, "employer"), "jobDesc": "", "partTime": part_time})
        elif flag in ("退職", "退社"):
            _close(work, ym, name, "employer")
        elif section == "licenses":
            lic.append({"date": ym, "name": body})
    return edu, work, lic


def _same(name: str, entries: list[dict], key: str) -> str:
    return entries[-1][key] if entries and re.match(r"^(同校|同社|同上|同大学|〃)", name) else name


def _close(entries: list[dict], ym: str, name: str, key: str, open_only: bool = False) -> None:
    """Pair a 卒業/退職 row with the last open entry; a graduation without an entry becomes its own row."""
    opened = [e for e in entries if "to" not in e]
    if opened:
        if not open_only:
            opened[-1]["to"] = ym
        opened[-1][key] = opened[-1][key] or _same(name, entries[:-1], key)
    elif not open_only:
        entries.append({"from": ym, "to": ym, key: name, **({"jobDesc": "", "partTime": False} if key == "employer" else {})})


# --- the mapper -------------------------------------------------------------------------------------------------

def match_template(markdown: str) -> tuple[bool, dict | None]:
    """(template_match, fields): fields only contains what was found; None when nothing matched."""
    rows = parse_rows(markdown)
    cells = [c for row in rows for c in row]
    found = {name for name, rx in {**LABELS, **SECTIONS, "nameKana": KANA}.items() if any(rx.match(c) for c in cells)}
    v = {name: find_value(rows, rx) for name, rx in LABELS.items()}
    name_kana, addr_kana = find_kana(rows)
    edu, work, lic = history(rows)
    jlpt = sorted(int(a or b) for n in lic for a, b in JLPT.findall(n["name"]))

    def text(key: str) -> str | None:
        s = (v.get(key) or "").strip()
        return s if re.search(r"\w", s) else None  # "—" and other symbol-only cells mean empty

    family = re.search(r"(\d+)\s*人", v["familyCount"] or "")
    family_detail = re.search(r"\(([^)]+)\)", v["familyCount"] or "")
    email = text("email")
    clothing = re.search(r"\b(XL|L|M|S)\b", (v["clothingSize"] or "").upper())
    situations_in_cells = " ".join(c for c in cells if c in SITUATIONS)

    fields = {
        "nameKana": name_kana,
        "nameLatin": text("nameLatin"),
        "dob": parse_date(v["dob"]),
        "gender": parse_gender(v["gender"]),
        "nationality": parse_nationality(v["nationality"]),
        "situation": parse_situation(v["situation"]) or parse_situation(situations_in_cells),
        "familyCount": int(family.group(1)) if family else None,
        "familyDetail": family_detail.group(1) if family_detail else None,
        "spouse": parse_bool(v["spouse"]),
        "spouseDependency": parse_bool(v["spouseDependency"]),
        "mobile": text("mobile"),
        "email": email.lower() if email and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) else None,
        "address": text("address"),
        "addressKana": addr_kana,
        "education": edu or None,
        "work": work or None,
        "currentStatus": text("currentStatus"),
        "licenses": lic or None,
        "jlpt": f"N{jlpt[0]}" if jlpt else None,
        "hobbies": find_block(rows, LABELS["hobbies"]),
        "motivationPr": find_block(rows, LABELS["motivationPr"]),
        "wishSalary": text("wishSalary"),
        "wishLocation": text("wishLocation"),
        "wishHours": text("wishHours"),
        "heightCm": parse_number(v["heightCm"]),
        "weightKg": parse_number(v["weightKg"]),
        "clothingSize": clothing.group(1) if clothing else None,
        "shoulderCm": parse_number(v["shoulderCm"]),
        "waistCm": parse_number(v["waistCm"]),
        "shoeCm": parse_number(v["shoeCm"]),
        "religionNotes": text("religionNotes"),
        "foodRestrictions": text("foodRestrictions"),
        "allergies": text("allergies"),
        "otherNotes": text("otherNotes"),
    }
    fields = {k: val for k, val in fields.items() if val not in (None, "", [])}
    return len(found) >= MIN_LABELS, fields or None

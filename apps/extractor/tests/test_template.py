"""template.py is pure: Markdown fixtures in, fields out."""
from conftest import BASIC, BODY, CURRENT, EDU, HEAD, HOBBIES, LIC, MOTIVATION, NOTES, SPOUSE, WISH, WORK
from layout import rows_to_markdown
from template import label_re, match_template, parse_bool, parse_date, parse_gender, parse_nationality, parse_rows


def template_markdown() -> str:
    parts = ["# 履歴書", rows_to_markdown(HEAD), rows_to_markdown(BASIC), "## 学歴", rows_to_markdown(EDU),
             "## 職歴（アルバイト含む）", rows_to_markdown(WORK), rows_to_markdown(CURRENT), "## 免許・資格",
             rows_to_markdown(LIC), "## 趣味・特技", HOBBIES, "## 日本での就職志望動機、自己PR", MOTIVATION,
             rows_to_markdown(SPOUSE), rows_to_markdown(WISH), rows_to_markdown(BODY), rows_to_markdown(NOTES)]
    return "\n\n".join(parts)


EXPECTED = {
    "nameKana": "グエン・バン・アン",
    "nameLatin": "NGUYEN VAN AN",
    "dob": "2002-03-15",
    "gender": "male",
    "nationality": "VN",
    "situation": "job_hunting",
    "familyCount": 4,
    "familyDetail": "父・母・妹",
    "spouse": False,
    "spouseDependency": False,
    "mobile": "+84 912 345 678",
    "email": "an.nguyen@example.com",
    "address": "ベトナム タインホア省ホアンホア県",
    "addressKana": "ベトナム タインホア",
    "education": [
        {"from": "2017-09", "to": "2020-06", "school": "ホアンホア第2高等学校(ベトナム)"},
        {"from": "2020-09", "to": "2022-06", "school": "タインホア職業短期大学(ベトナム)"},
    ],
    "work": [
        {"from": "2022-08", "to": "2024-05", "employer": "ミンファット機械有限会社(ベトナム)", "jobDesc": "鉄骨フレームの溶接、品質チェック", "partTime": False},
        {"from": "2024-06", "employer": "サオベト研修センター(ベトナム)", "jobDesc": "日本語研修、溶接実技訓練", "partTime": False},
    ],
    "currentStatus": "現在 N3を勉強しています。",
    "licenses": [{"date": "2023-04", "name": "溶接技能証明書 3G"}, {"date": "2025-12", "name": "JLPT N4"}],
    "jlpt": "N4",
    "hobbies": HOBBIES,
    "motivationPr": MOTIVATION,
    "wishSalary": "貴社規定に従います。",
    "wishLocation": "全国どこでも大丈夫です。",
    "wishHours": "会社スケジュールで大丈夫です。",
    "heightCm": 168,
    "weightKg": 61,
    "clothingSize": "M",
    "shoulderCm": 46,
    "waistCm": 78,
    "shoeCm": 26,
    "religionNotes": "仏教です。特に注意が必要なことはありません。",
    "foodRestrictions": "ありません。なんでも食べられます。",
    "allergies": "ありません。",
}


def test_full_template_maps_every_field():
    matched, fields = match_template(template_markdown())
    assert matched
    assert fields == EXPECTED  # その他連絡事項 "—" is empty and therefore absent


def test_docling_style_markdown_with_headings():
    md = "\n\n".join([
        "## 学歴",
        "| 年 | 月 | 学歴 | 入学・卒業 |\n|---|---|---|---|\n| 2017 | 9 | A校 | 入学 |\n| 2020 | 6 | 同校 | 卒業 |",
        "## 職歴",
        "| 年 | 月 | 職歴 | 入社・退職 |\n|---|---|---|---|\n| 2021 | 1 | B社（アルバイト） | 入社 |\n| 2022 | 3 | 現在に至る |  |",
        "| フリガナ | スー・スー |\n|---|---|\n| 氏名 | SU SU |",
    ])
    _, fields = match_template(md)
    assert fields["education"] == [{"from": "2017-09", "to": "2020-06", "school": "A校"}]
    assert fields["work"] == [{"from": "2021-01", "employer": "B社", "jobDesc": "", "partTime": True}]
    assert fields["nameKana"] == "スー・スー" and fields["nameLatin"] == "SU SU"


def test_ocr_noise_is_tolerated():
    md = "\n".join([
        "| フリ ガナ | グエン・バン・アン |", "|---|---|", "| 氏名 | NGUYEN VAN AN |", "| 生年月日 | 2002 年 3 月 15 日 |",
        "| 国 籍 | ベトナム |", "| 携帯電話番号 | +84 912 345 678 |", "| 免許 ・ 資格 |  |", "| 2025 | 12 | JLPT N4 |",
        "| 配偶者 | 有 | 配偶者の扶養義務 | 無 |", "| 身長 | 168CM | 体重 | 61KG |",
    ])
    matched, fields = match_template(md)
    assert matched
    assert fields["nameKana"] == "グエン・バン・アン" and fields["dob"] == "2002-03-15" and fields["nationality"] == "VN"
    assert fields["jlpt"] == "N4" and fields["spouse"] is True and fields["spouseDependency"] is False
    assert fields["heightCm"] == 168 and fields["weightKg"] == 61


def test_non_template_document_does_not_match():
    md = "# Curriculum Vitae\n\nJohn Smith, software engineer.\n\n| Period | Company |\n|---|---|\n| 2019-2022 | ACME |"
    matched, fields = match_template(md)
    assert matched is False
    assert fields is None


def test_fewer_than_eight_labels_is_not_a_match_but_fields_are_returned():
    md = "| 氏名 | NGUYEN VAN AN |\n|---|---|\n| 国籍 | ベトナム |\n| 身長 | 170 cm |"
    matched, fields = match_template(md)
    assert matched is False
    assert fields == {"nameLatin": "NGUYEN VAN AN", "nationality": "VN", "heightCm": 170}


def test_value_parsers():
    assert parse_date("１９９７年５月１０日") == "1997-05-10"
    assert parse_date("1997/05/10") == "1997-05-10"
    assert parse_date("10/05/1997") == "1997-05-10"
    assert parse_date("1997年13月1日") is None and parse_date("unknown") is None
    assert parse_gender("男") == "male" and parse_gender("女性") == "female" and parse_gender("男・女") is None
    assert parse_nationality("ミャンマー") == "MM" and parse_nationality("Bangladesh") == "BD" and parse_nationality("インドネシア") == "ID"
    assert parse_bool("有") is True and parse_bool("なし") is False and parse_bool("?") is None


def test_label_regex_boundaries():
    assert label_re("配偶者", tail=r"(?!\s*の)").match("配偶者の扶養義務") is None
    assert label_re("その他").match("その他・本人希望") is None
    assert label_re("肩").match("肩(上半身) 46 cm").group(1) == "46 cm"
    assert label_re("性別").match("性別 男").group(1) == "男"
    assert parse_rows("| a \\| b | c |\n|---|---|\nplain") == [["a | b", "c"], ["plain"]]

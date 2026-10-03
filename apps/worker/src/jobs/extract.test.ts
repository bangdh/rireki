import type Anthropic from "@anthropic-ai/sdk";
import { CvDraft } from "@rireki/shared";
import { expect, test, vi } from "vitest";
import {
  CvExtraction,
  type ClaudeClient,
  type ExtractorResponse,
  fromClaude,
  fromTemplate,
  importPhotoKey,
  kanaGenerated,
  merge,
  ocrLangs,
  pickValid,
  scoreExtraction,
  SYSTEM_PROMPT,
} from "./extract";

// The `fields` the extractor returns for the synthetic company-template DOCX/PDF: EXPECTED of apps/extractor/tests/test_template.py.
const TEMPLATE_FIELDS = {
  nameKana: "グエン・バン・アン",
  nameLatin: "NGUYEN VAN AN",
  dob: "2002-03-15",
  gender: "male",
  nationality: "VN",
  situation: "job_hunting",
  familyCount: 4,
  familyDetail: "父・母・妹",
  spouse: false,
  spouseDependency: false,
  mobile: "+84 912 345 678",
  email: "an.nguyen@example.com",
  address: "ベトナム タインホア省ホアンホア県",
  addressKana: "ベトナム タインホア",
  education: [
    { from: "2017-09", to: "2020-06", school: "ホアンホア第2高等学校(ベトナム)" },
    { from: "2020-09", to: "2022-06", school: "タインホア職業短期大学(ベトナム)" },
  ],
  work: [
    { from: "2022-08", to: "2024-05", employer: "ミンファット機械有限会社(ベトナム)", jobDesc: "鉄骨フレームの溶接、品質チェック", partTime: false },
    { from: "2024-06", employer: "サオベト研修センター(ベトナム)", jobDesc: "日本語研修、溶接実技訓練", partTime: false },
  ],
  currentStatus: "現在 N3を勉強しています。",
  licenses: [
    { date: "2023-04", name: "溶接技能証明書 3G" },
    { date: "2025-12", name: "JLPT N4" },
  ],
  jlpt: "N4",
  hobbies: "趣味は料理とサッカーです。",
  motivationPr: "専門学校で溶接を学び、2年間の実務でMIG/TIG溶接を担当してきました。",
  wishSalary: "貴社規定に従います。",
  wishLocation: "全国どこでも大丈夫です。",
  wishHours: "会社スケジュールで大丈夫です。",
  heightCm: 168,
  weightKg: 61,
  clothingSize: "M",
  shoulderCm: 46,
  waistCm: 78,
  shoeCm: 26,
  religionNotes: "仏教です。特に注意が必要なことはありません。",
  foodRestrictions: "ありません。なんでも食べられます。",
  allergies: "ありません。",
};

const response = (over: Partial<ExtractorResponse> = {}): ExtractorResponse => ({
  markdown: "# 履歴書\n\n| フリガナ | グエン・バン・アン |\n|---|---|",
  pages: 1,
  ocr_used: false,
  template_match: true,
  fields: TEMPLATE_FIELDS,
  photo_key: "tenants/t1/imports/j1/photo/auto.jpg",
  ...over,
});

const message = (text: string, stop_reason: Anthropic.Message["stop_reason"] = "end_turn") =>
  ({ content: [{ type: "text", text, citations: null }], stop_reason }) as unknown as Anthropic.Message;

function stub(msg: Anthropic.Message) {
  const create = vi.fn<ClaudeClient["messages"]["create"]>(async () => msg);
  return { create, client: { messages: { create } } satisfies ClaudeClient };
}

const everyValue = (confidence: Record<string, number>, value: number) => Object.values(confidence).every((c) => c === value);

test("the full template fixture is a valid CvDraft with every field at 0.9", () => {
  const { cv, confidence } = fromTemplate(TEMPLATE_FIELDS, false);
  expect(cv).toEqual(TEMPLATE_FIELDS);
  expect(CvDraft.safeParse(cv).success).toBe(true);
  expect(Object.keys(confidence).sort()).toEqual(Object.keys(TEMPLATE_FIELDS).sort());
  expect(everyValue(confidence, 0.9)).toBe(true);
});

test("OCR'd documents score 0.7; null fields give an empty draft", () => {
  expect(everyValue(fromTemplate(TEMPLATE_FIELDS, true).confidence, 0.7)).toBe(true);
  expect(fromTemplate(null, false)).toEqual({ cv: {}, confidence: {} });
});

test("pickValid keeps valid values only and never adds the schema defaults", () => {
  expect(pickValid({ nameLatin: "NGUYEN VAN AN", email: "bad", heightCm: "tall", spouse: null, nationality: "TH", jlpt: "N4", unknown: 1 })).toEqual({ nameLatin: "NGUYEN VAN AN", jlpt: "N4" });
  expect(pickValid({ work: [{ from: "2024-06", employer: "A" }] })).toEqual({ work: [{ from: "2024-06", employer: "A", jobDesc: "", partTime: false }] });
  expect(pickValid({ education: [{ from: "2024", school: "A" }] })).toEqual({});
  expect(pickValid("not an object")).toEqual({});
});

test("a template match never calls Claude", async () => {
  const { create, client } = stub(message("{}"));
  const result = await scoreExtraction(response(), client);
  expect(create).not.toHaveBeenCalled();
  expect(result.llm).toBe(false);
  expect(result.cv).toEqual(TEMPLATE_FIELDS);
});

test("non-template: Claude fills the gaps, the template wins on shared keys, invalid values are dropped", async () => {
  const claudeJson = JSON.stringify({
    nameLatin: "Nguyen Van An", // template has it → ignored
    nameKana: "グエン・バン・アン",
    mobile: "+84 912 345 678",
    email: "bad",
    heightCm: "tall",
    dob: "2002-03-15",
    confidence: [{ field: "nameKana", score: 0.8 }, { field: "dob", score: 0.95 }],
  });
  const { create, client } = stub(message(claudeJson));
  const partial = { nameLatin: "NGUYEN VAN AN", nationality: "VN", heightCm: 170 };
  const result = await scoreExtraction(response({ template_match: false, fields: partial }), client);

  expect(create).toHaveBeenCalledOnce();
  const params = create.mock.calls[0][0];
  expect(params.max_tokens).toBe(16000);
  expect(params.output_config?.format?.type).toBe("json_schema");
  expect(params.system).toEqual([{ type: "text", text: expect.stringContaining("履歴書"), cache_control: { type: "ephemeral" } }]);
  expect(params.messages[0].content).toContain("| フリガナ | グエン・バン・アン |");
  expect("thinking" in params).toBe(false);

  expect(result.llm).toBe(true);
  expect(result.cv).toEqual({ nameLatin: "NGUYEN VAN AN", nationality: "VN", heightCm: 170, nameKana: "グエン・バン・アン", mobile: "+84 912 345 678", dob: "2002-03-15" });
  expect(result.confidence).toEqual({ nameLatin: 0.9, nationality: 0.9, heightCm: 0.9, nameKana: 0.8, mobile: 0.6, dob: 0.95 });
});

test("a refusal, truncation, an API error or invalid JSON keep the template fields only", async () => {
  const partial = { nameLatin: "NGUYEN VAN AN" };
  for (const msg of [message("{}", "refusal"), message('{"nameKana":"ア"', "max_tokens"), message("not json")]) {
    const result = await scoreExtraction(response({ template_match: false, fields: partial }), stub(msg).client);
    expect(result).toEqual({ cv: partial, confidence: { nameLatin: 0.9 }, llm: false });
  }
  const failing = { messages: { create: vi.fn<ClaudeClient["messages"]["create"]>(async () => { throw new Error("529 overloaded"); }) } };
  expect(await scoreExtraction(response({ template_match: false, fields: partial }), failing)).toEqual({ cv: partial, confidence: { nameLatin: 0.9 }, llm: false });
});

test("without ANTHROPIC_API_KEY (no client) a non-template document still completes with the template fields", async () => {
  const result = await scoreExtraction(response({ template_match: false, fields: { nameLatin: "NGUYEN VAN AN" }, ocr_used: true }), null);
  expect(result).toEqual({ cv: { nameLatin: "NGUYEN VAN AN" }, confidence: { nameLatin: 0.7 }, llm: false });
});

test("fromClaude and merge", () => {
  const claude = fromClaude({ nameKana: "ア", mobile: "+84", confidence: [{ field: "nameKana", score: 0.5 }] });
  expect(claude).toEqual({ cv: { nameKana: "ア", mobile: "+84" }, confidence: { nameKana: 0.5, mobile: 0.6 } });
  const template = fromTemplate({ mobile: "+84 912", heightCm: 168 }, false);
  expect(merge(template, claude)).toEqual({ cv: { nameKana: "ア", mobile: "+84 912", heightCm: 168 }, confidence: { nameKana: 0.5, mobile: 0.9, heightCm: 0.9 } });
  expect(fromClaude({ nameKana: "ア", confidence: "garbage" }).confidence).toEqual({ nameKana: 0.6 });
});

test("CvExtraction accepts Claude's shape and defaults the scores to an empty list", () => {
  expect(CvExtraction.parse({ nameKana: "ア" }).confidence).toEqual([]);
  expect(CvExtraction.safeParse({ confidence: [{ field: "x", score: "high" }] }).success).toBe(false);
});

test("the system prompt asks for a 履歴書 in Japanese and a katakana name generated from the romanized one", () => {
  expect(SYSTEM_PROMPT).toContain("Write school and employer as written followed by the country in Japanese in parentheses, e.g. (ベトナム)");
  expect(SYSTEM_PROMPT).toContain("Write jobDesc, currentStatus, religionNotes, foodRestrictions, allergies and otherNotes in natural Japanese");
  expect(SYSTEM_PROMPT).toContain("keep hobbies and motivationPr in the document's language");
  expect(SYSTEM_PROMPT).toContain("if the document has no katakana name, transliterate nameLatin into katakana (words joined with ・) as nameKana and rate it 0.5");
});

test("kanaGenerated: a nameKana from a document without any katakana was transliterated", () => {
  expect(kanaGenerated({ nameKana: "スー・スー・ライン" }, "# CV\n\nName: Su Su Hlaing\nNationality: Myanmar")).toBe(true);
  expect(kanaGenerated({ nameKana: "グエン・バン・アン" }, "| フリガナ | グエン・バン・アン |")).toBe(false);
  expect(kanaGenerated({ nameLatin: "SU SU HLAING" }, "Name: Su Su Hlaing")).toBe(false);
});

test("OCR runs in Japanese, English and the tenant country's language", () => {
  expect(ocrLangs("VN")).toBe("jpn+eng+vie");
  expect(ocrLangs("MM")).toBe("jpn+eng+mya");
  expect(ocrLangs("BD")).toBe("jpn+eng+ben");
  expect(ocrLangs("ID")).toBe("jpn+eng+ind");
  expect(ocrLangs("other")).toBe("jpn+eng");
  expect(ocrLangs(null)).toBe("jpn+eng");
});

test("the cropped photo goes to a photo/ folder, a key no uploaded file name reaches (photo.jpg stays the original)", () => {
  expect(importPhotoKey("t1", "j1")).toBe("tenants/t1/imports/j1/photo/auto.jpg");
});

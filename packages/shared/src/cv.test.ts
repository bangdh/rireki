import { describe, expect, test } from "vitest";
import { CV_COMPLETENESS_FIELDS, CvDraft, CvSchema, cvCompleteness } from "./cv";

// Nguyễn Văn An from app/candidate-detail.html (the 3-page company template)
const an = {
  nameKana: "グエン・バン・アン",
  nameLatin: "NGUYEN VAN AN",
  nameNative: "Nguyễn Văn An",
  dob: "2002-03-15",
  gender: "male",
  nationality: "VN",
  familyCount: 4,
  familyDetail: "父・母・妹",
  mobile: "+84 912 345 678",
  email: "an.nguyen@example.com",
  address: "ベトナム　タインホア省ホアンホア県ホアンティエン村",
  addressKana: "ベトナム　タインホア",
  education: [
    { from: "2017-09", to: "2020-06", school: "ホアンホア第2高等学校（ベトナム）" },
    { from: "2020-09", to: "2022-06", school: "タインホア職業短期大学　溶接科（ベトナム）" },
  ],
  work: [
    { from: "2022-08", to: "2024-05", employer: "ミンファット機械有限会社（ベトナム）", jobDesc: "鉄骨フレームのMIG/TIG溶接、図面確認、品質チェック" },
    { from: "2024-06", employer: "サオベト研修センター（ベトナム）", jobDesc: "日本語研修（週30時間）、溶接実技訓練" },
  ],
  currentStatus: "現在 N3を勉強しています。",
  licenses: [
    { date: "2023-04", name: "溶接技能証明書 3G", issuer: "タインホア職業短期大学" },
    { date: "2025-12", name: "JLPT N4" },
  ],
  jlpt: "N4",
  jaLevel: 5,
  enLevel: 3,
  hobbies: "趣味は料理とサッカーです。",
  motivationPr: "専門学校で溶接を学び、2年間の実務でMIG/TIG溶接を担当してきました。",
  heightCm: 168,
  weightKg: 61,
  clothingSize: "M",
  shoulderCm: 46,
  waistCm: 78,
  shoeCm: 26,
  religionNotes: "仏教です。特に注意が必要なことはありません。",
  foodRestrictions: "ありません。なんでも食べられます。",
  allergies: "ありません。",
} as const;

describe("CvSchema", () => {
  test("parses the mockup CV and fills the template defaults", () => {
    const cv = CvSchema.parse(an);
    expect(cv.wishSalary).toBe("貴社規定に従います。");
    expect(cv.wishLocation).toBe("全国どこでも大丈夫です。");
    expect(cv.wishHours).toBe("会社スケジュールで大丈夫です。");
    expect(cv.situation).toBe("job_hunting");
    expect(cv.spouse).toBe(false);
    expect(cv.work[0].partTime).toBe(false);
    expect(cv.work[1].to).toBeUndefined();
  });

  test.each([
    ["dob not ISO", { dob: "15/03/2002" }],
    ["year-month malformed", { education: [{ from: "2017-13", school: "x" }] }],
    ["jaLevel not a half step", { jaLevel: 5.3 }],
    ["unknown nationality", { nationality: "TH" }],
    ["bad email", { email: "not-an-email" }],
  ])("rejects %s", (_name, patch) => {
    expect(CvSchema.safeParse({ ...an, ...patch }).success).toBe(false);
  });

  test("drafts may be incomplete", () => {
    expect(CvDraft.safeParse({ nameKana: "グエン" }).success).toBe(true);
    expect(CvDraft.parse({}).education).toEqual([]);
  });
});

describe("cvCompleteness", () => {
  test("mockup CV is 96% complete (only その他連絡事項 is empty)", () => {
    expect(cvCompleteness(CvSchema.parse(an))).toBe(96);
    expect(cvCompleteness(CvSchema.parse({ ...an, otherNotes: "—" }))).toBe(100);
  });

  test("empty draft is 0%, lists count only when non-empty", () => {
    expect(cvCompleteness({})).toBe(0);
    expect(cvCompleteness({ education: [], nameKana: "" })).toBe(0);
    expect(cvCompleteness({ nameKana: "グエン" })).toBe(Math.round(100 / CV_COMPLETENESS_FIELDS.length));
  });
});

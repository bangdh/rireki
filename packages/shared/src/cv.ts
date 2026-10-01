// The 履歴書 (CV) body: one Json column on Candidate, validated here (rirekisho-schema skill). Field names map to
// the mockup i18n keys (form.*); the Japanese render in app/candidate-detail.html reads these fields directly.
import { z } from "zod";
import { JLPT_LEVELS, NATIONALITIES } from "./constants";

const ym = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/); // "2024-03"

export const Education = z.object({ from: ym, to: ym.optional(), school: z.string().min(1) }); // rendered as 入学 / 卒業 rows
export const Work = z.object({
  from: ym,
  to: ym.optional(),
  employer: z.string().min(1),
  jobDesc: z.string().default(""), // 仕事内容
  partTime: z.boolean().default(false), // アルバイト
});
export const License = z.object({ date: ym, name: z.string().min(1), issuer: z.string().optional() });

export const CvSchema = z.object({
  // step 1 basic
  nameKana: z.string().min(1), // フリガナ
  nameLatin: z.string().min(1), // 氏名 as in passport
  nameNative: z.string().optional(),
  dob: z.iso.date(), // "2002-03-15"
  gender: z.enum(["male", "female"]),
  nationality: z.enum(NATIONALITIES),
  situation: z.enum(["job_hunting", "in_training", "employed", "offer"]).default("job_hunting"), // 就職活動中…
  familyCount: z.number().int().min(1).optional(), // 家族構成
  familyDetail: z.string().optional(),
  spouse: z.boolean().default(false), // 配偶者
  spouseDependency: z.boolean().default(false), // 配偶者の扶養義務
  // step 2 contact
  mobile: z.string().min(3),
  email: z.email().optional(),
  address: z.string().min(1), // 現住所
  addressKana: z.string().optional(), // フリガナ of address
  // step 3 education & work
  education: z.array(Education).default([]),
  work: z.array(Work).default([]),
  currentStatus: z.string().optional(), // 現在 (e.g. 現在 N3を勉強しています。)
  // step 4 qualifications & language
  licenses: z.array(License).default([]), // 免許・資格
  jlpt: z.enum(JLPT_LEVELS).default("none"),
  otherLanguages: z.string().optional(),
  jaLevel: z.number().min(0).max(10).multipleOf(0.5).optional(), // 当社評価
  enLevel: z.number().min(0).max(10).multipleOf(0.5).optional(),
  // step 5 motivation & wishes
  hobbies: z.string().optional(), // 趣味・特技
  motivationPr: z.string().optional(), // 日本での就職志望動機、自己PR
  wishSalary: z.string().default("貴社規定に従います。"),
  wishLocation: z.string().default("全国どこでも大丈夫です。"),
  wishHours: z.string().default("会社スケジュールで大丈夫です。"),
  // step 6 body, religion, diet
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  clothingSize: z.enum(["S", "M", "L", "XL"]).optional(),
  shoulderCm: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  shoeCm: z.number().positive().optional(),
  religionNotes: z.string().optional(), // 宗教的に注意が必要な事項
  foodRestrictions: z.string().optional(), // 食べられないもの
  allergies: z.string().optional(),
  otherNotes: z.string().optional(), // その他連絡事項
});
export type Cv = z.infer<typeof CvSchema>;
export type CvInput = z.input<typeof CvSchema>;

export const CvDraft = CvSchema.partial(); // autosaved drafts may be incomplete
export type CvDraft = z.infer<typeof CvDraft>;

// Required + recommended fields a client expects on the 3-page template; completeness % = filled / total.
export const CV_COMPLETENESS_FIELDS = [
  "nameKana", "nameLatin", "nameNative", "dob", "gender", "nationality", "familyCount",
  "mobile", "email", "address", "addressKana",
  "education", "work", "currentStatus",
  "licenses", "jlpt", "jaLevel", "enLevel",
  "hobbies", "motivationPr",
  "heightCm", "weightKg", "clothingSize", "shoeCm", "religionNotes", "foodRestrictions", "allergies", "otherNotes",
] as const satisfies readonly (keyof Cv)[];

export function cvCompleteness(cv: CvDraft): number {
  const filled = CV_COMPLETENESS_FIELDS.filter((key) => {
    const value = cv[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
  });
  return Math.round((filled.length / CV_COMPLETENESS_FIELDS.length) * 100);
}

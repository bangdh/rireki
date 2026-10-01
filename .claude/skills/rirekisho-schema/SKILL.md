---
name: rirekisho-schema
description: Single source of truth for the candidate / 履歴書 data model — the zod schema (7 form steps, company template fields), the Prisma models, statuses, the AZ123456 code rule and how fields map to the mockup i18n keys. Load before touching candidates, the form, import, the 履歴書 render or the viewer.
---
# 履歴書 data model

The CV follows the company's three-page template (see `app/candidate-form.html` and the render in
`app/candidate-detail.html`). The body is stored as one `Json` column on `Candidate` and validated with the zod
schema below (`packages/shared/src/cv.ts`). Searchable/filterable fields are duplicated as columns.

## zod schema (packages/shared/src/cv.ts)

```ts
import { z } from "zod";

const ym = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/); // "2024-03"

export const Education = z.object({ from: ym, to: ym.optional(), school: z.string().min(1) }); // rendered as 入学 / 卒業 rows
export const Work = z.object({ from: ym, to: ym.optional(), employer: z.string().min(1), jobDesc: z.string().default(""), partTime: z.boolean().default(false) });
export const License = z.object({ date: ym, name: z.string().min(1), issuer: z.string().optional() });

export const CvSchema = z.object({
  // step 1 basic
  nameKana: z.string().min(1),                 // フリガナ
  nameLatin: z.string().min(1),                // 氏名 as in passport
  nameNative: z.string().optional(),
  dob: z.string().date(),
  gender: z.enum(["male", "female"]),
  nationality: z.enum(["VN", "MM", "BD", "ID"]),
  situation: z.enum(["job_hunting", "in_training", "employed", "offer"]).default("job_hunting"), // 就職活動中…
  familyCount: z.number().int().min(1).optional(),  // 家族構成
  familyDetail: z.string().optional(),
  spouse: z.boolean().default(false),               // 配偶者
  spouseDependency: z.boolean().default(false),     // 配偶者の扶養義務
  // step 2 contact
  mobile: z.string().min(3),
  email: z.string().email().optional(),
  address: z.string().min(1),                       // 現住所
  addressKana: z.string().optional(),               // フリガナ of address
  // step 3 education & work
  education: z.array(Education).default([]),
  work: z.array(Work).default([]),
  currentStatus: z.string().optional(),             // 現在 (e.g. 現在 N3を勉強しています。)
  // step 4 qualifications & language
  licenses: z.array(License).default([]),           // 免許・資格
  jlpt: z.enum(["N1", "N2", "N3", "N4", "N5", "none"]).default("none"),
  otherLanguages: z.string().optional(),
  jaLevel: z.number().min(0).max(10).multipleOf(0.5).optional(), // 当社評価
  enLevel: z.number().min(0).max(10).multipleOf(0.5).optional(),
  // step 5 motivation & wishes
  hobbies: z.string().optional(),                   // 趣味・特技
  motivationPr: z.string().optional(),              // 日本での就職志望動機、自己PR
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
  religionNotes: z.string().optional(),             // 宗教的に注意が必要な事項
  foodRestrictions: z.string().optional(),          // 食べられないもの
  allergies: z.string().optional(),
  otherNotes: z.string().optional(),                // その他連絡事項
});
export type Cv = z.infer<typeof CvSchema>;
export const CvDraft = CvSchema.partial();          // autosaved drafts may be incomplete
```

Completeness % = filled required-or-recommended fields / total (list the recommended ones in `cvCompleteness()`).

## Prisma models (packages/db/prisma/schema.prisma)

better-auth owns `User`, `Session`, `Account`, `Verification`, `Organization`, `Member`, `Invitation` (generate
them with `npx @better-auth/cli generate`). `Organization` **is** the tenant: `slug` = subdomain. Add our own:

```prisma
model TenantSettings { id String @id @default(cuid()); tenantId String @unique; codePrefix String @default("SV") @db.VarChar(2); nextCode Int @default(1); nameJa String?; nameEn String?; country String?; licenseNo String?; brandColor String?; logoKey String?; footer String?; defaultLang String @default("vi"); linkDefaults Json @default("{}"); updatedAt DateTime @updatedAt }
model Candidate { id String @id @default(cuid()); tenantId String; code String; nameKana String; nameLatin String; nameNative String?; dob DateTime?; gender String?; nationality String?; status String @default("draft"); jlpt String @default("none"); tags String[] @default([]); photoKey String?; cv Json @default("{}"); completeness Int @default(0); createdById String?; updatedById String?; archivedAt DateTime?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; videos Video[]; documents Document[]; @@unique([tenantId, code]) @@index([tenantId, status]) }
model Video { id String @id @default(cuid()); tenantId String; candidateId String; title String; lang String?; position Int @default(0); originalKey String; hlsKey String?; posterKey String?; durationSec Int?; status String @default("uploaded"); createdAt DateTime @default(now()); candidate Candidate @relation(fields:[candidateId], references:[id], onDelete: Cascade) }
model Document { id String @id @default(cuid()); tenantId String; candidateId String; type String; name String; key String; size Int; shareable Boolean @default(false); createdAt DateTime @default(now()); candidate Candidate @relation(fields:[candidateId], references:[id], onDelete: Cascade) }
model Render { id String @id @default(cuid()); tenantId String; candidateId String; version Int; page Int; key String; createdAt DateTime @default(now()); @@unique([candidateId, version, page]) }
model ShareLink { id String @id @default(cuid()); tenantId String; token String @unique; name String; clientCompany String?; clientName String?; clientEmail String?; message String?; viewerLang String @default("ja"); passwordHash String?; requireIdentity Boolean @default(true); allowedDomains String[] @default([]); downloadAllowed Boolean @default(false); expiresAt DateTime?; maxViews Int?; sections Json @default("{}"); notifyFirstView Boolean @default(true); notifyInterest Boolean @default(true); status String @default("active"); createdById String; createdAt DateTime @default(now()); candidates ShareLinkCandidate[]; viewers Viewer[]; events ViewEvent[] }
model ShareLinkCandidate { shareLinkId String; candidateId String; position Int @default(0); @@id([shareLinkId, candidateId]) }
model Viewer { id String @id @default(cuid()); shareLinkId String; name String?; email String?; ip String?; userAgent String?; geo String?; firstSeenAt DateTime @default(now()); lastSeenAt DateTime @default(now()) }
model ViewEvent { id String @id @default(cuid()); tenantId String; shareLinkId String; viewerId String?; candidateId String?; type String; durationSec Int?; meta Json?; createdAt DateTime @default(now()); @@index([shareLinkId, createdAt]) @@index([candidateId]) }
model Feedback { id String @id @default(cuid()); shareLinkId String; viewerId String; candidateId String; verdict String; comment String?; createdAt DateTime @default(now()) }
model ImportJob { id String @id @default(cuid()); tenantId String; fileKey String; fileName String; status String @default("queued"); extracted Json?; confidence Json?; photoKey String?; candidateId String?; createdById String; createdAt DateTime @default(now()) }
model AuditLog { id String @id @default(cuid()); tenantId String; userId String?; action String; target String?; ip String?; createdAt DateTime @default(now()); @@index([tenantId, createdAt]) }
```

Statuses: candidate `draft | available | proposed | interviewing | selected | departed | archived`;
video `uploaded | processing | ready | failed`; share link `active | expired | revoked`;
view event `unlock | open_list | open_cv | play_video | video_progress | download | interest | blocked_action | failed_password`.

## Candidate code

`code = prefix + String(nextCode).padStart(6, "0")` inside a transaction that increments `TenantSettings.nextCode`.
Validate `^[A-Z]{2}\d{6}$`. Never reuse a number.

## i18n keys for fields

Labels already exist in `assets/i18n.js`: `form.name_kana`, `form.name_romaji`, `form.dob`, `form.family_count`,
`form.status*`, `form.spouse`, `form.mobile`, `form.address_kana`, `form.education`, `form.work`, `form.job_desc`,
`form.current_status`, `form.licenses`, `form.ja_level`, `form.en_level`, `form.hobbies`, `form.motivation_pr`,
`form.wish_*`, `form.clothing`, `form.shoulder`, `form.waist`, `form.shoe`, `form.religion_notes`, `form.food`,
`form.allergies`, `form.other_notes`, steps `form.s1`…`form.s7`. The Japanese render (`app/candidate-detail.html`)
is always in Japanese regardless of UI language.

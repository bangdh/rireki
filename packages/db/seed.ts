// Demo seed (run-and-verify skill): tenant saoviet, two users, the 8 candidates of app/candidates.html with CV
// bodies from the mockups, and 3 share links of app/shares.html with viewers and view events.
// Idempotent: upserts by slug / email / code / token; child rows (videos, documents, link candidates, viewers,
// events, feedback) are rebuilt for each seeded parent. TenantSettings.nextCode is only set on first creation.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import {
  CvSchema,
  cvCompleteness,
  LinkDefaults,
  ShareSections,
  type CandidateStatus,
  type CvInput,
  type DocumentType,
  type JlptLevel,
  type Nationality,
  type ViewEventType,
} from "@rireki/shared";
import { prisma, type Prisma } from "./src/index";

const PASSWORD = "Rireki-demo-2026";
const ORG = { id: "org_saoviet", name: "Sao Việt Manpower", slug: "saoviet" };
const USERS = [
  { id: "user_huong", name: "Nguyễn Thị Hương", email: "huong.nguyen@saoviet.vn", role: "owner" }, // Admin
  { id: "user_trang", name: "Phạm Thu Trang", email: "trang.pham@saoviet.vn", role: "member" }, // User
];

// The mockups' "today" is 30 Sep 2026 (JST); the seed keeps the same day offsets relative to the day it runs.
const DAY = 86_400_000;
function jst(daysAgo: number, hm = "09:00") {
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  return new Date(new Date(`${today}T${hm}:00+09:00`).getTime() - daysAgo * DAY);
}

// --- candidates (app/candidates.html, CV of SV000182 from app/candidate-detail.html) --------------------------

type SeedCandidate = {
  code: string;
  nameNative: string;
  nameKana: string;
  nameLatin: string;
  dob: string;
  gender: "male" | "female";
  nationality: Nationality;
  status: CandidateStatus;
  jlpt: JlptLevel;
  tags: string[];
  createdDaysAgo: number;
  updatedDaysAgo: number;
  videos: { title: string; lang?: string; durationSec: number }[];
  cv: Omit<CvInput, "nameKana" | "nameLatin" | "nameNative" | "dob" | "gender" | "nationality" | "jlpt">;
};

const TRAINING = (place: string, extra = "") => ({
  from: "2025-01",
  employer: `サオベト研修センター（${place}）`,
  jobDesc: `日本語研修（週30時間）${extra}`,
});
const BUDDHIST = "仏教です。特に注意が必要なことはありません。";
const MUSLIM = "イスラム教です。1日5回の礼拝（各5〜10分）があり、勤務中は休憩時間に行います。ラマダン期間中は日中の断食をします。";
const HALAL = "豚肉・アルコールは食べられません。ハラール食品を希望します。";
const NONE = "ありません。";

const CANDIDATES: SeedCandidate[] = [
  {
    code: "SV000182", nameNative: "Nguyễn Văn An", nameKana: "グエン・バン・アン", nameLatin: "NGUYEN VAN AN",
    dob: "2002-03-15", gender: "male", nationality: "VN", status: "proposed", jlpt: "N4", tags: ["溶接", "機械加工"],
    createdDaysAgo: 141, updatedDaysAgo: 2,
    videos: [
      { title: "自己紹介（日本語）", lang: "ja", durationSec: 92 },
      { title: "溶接実技デモ", durationSec: 165 },
      { title: "面接練習 Q&A", lang: "ja", durationSec: 190 },
    ],
    cv: {
      familyCount: 4, familyDetail: "父・母・妹",
      mobile: "+84 912 345 678", email: "an.nguyen@example.com",
      address: "ベトナム　タインホア省ホアンホア県ホアンティエン村", addressKana: "ベトナム　タインホア",
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
        { date: "2025-12", name: "JLPT N4", issuer: "Japan Foundation" },
      ],
      jaLevel: 5, enLevel: 3,
      hobbies: "趣味は料理とサッカーです。お客様や仲間とのコミュニケーションを大切にし、相手の立場に立って行動することが得意です。",
      motivationPr: "専門学校で溶接を学び、2年間の実務でMIG/TIG溶接を担当してきました。前職では月間の不良率を3%から1%に改善しました。日本の高い品質基準の中で技術を磨き、将来はベトナムで技術者として働きたいと考えています。真面目で体力に自信があり、チームで協力して働くことが好きです。\nどうぞよろしくお願い致します。",
      heightCm: 168, weightKg: 61, clothingSize: "M", shoulderCm: 46, waistCm: 78, shoeCm: 26,
      religionNotes: BUDDHIST, foodRestrictions: "ありません。なんでも食べられます。", allergies: NONE,
    },
  },
  {
    code: "SV000197", nameNative: "Trần Thị Mai", nameKana: "チャン・ティ・マイ", nameLatin: "TRAN THI MAI",
    dob: "2004-07-08", gender: "female", nationality: "VN", status: "available", jlpt: "N4", tags: ["食品加工"],
    createdDaysAgo: 120, updatedDaysAgo: 3,
    videos: [{ title: "自己紹介（日本語）", lang: "ja", durationSec: 98 }],
    cv: {
      familyCount: 5, familyDetail: "父・母・兄・妹",
      mobile: "+84 987 654 321", email: "mai.tran@example.com",
      address: "ベトナム　ハイズオン省ナムサック県アンラム村", addressKana: "ベトナム　ハイズオン",
      education: [{ from: "2019-09", to: "2022-06", school: "ナムサック高等学校（ベトナム）" }],
      work: [
        { from: "2022-08", to: "2024-12", employer: "ハイズオン食品加工株式会社（ベトナム）", jobDesc: "冷凍野菜の選別・包装、衛生管理" },
        TRAINING("ベトナム"),
      ],
      currentStatus: "現在 N3を勉強しています。",
      licenses: [
        { date: "2024-03", name: "食品衛生講習修了証", issuer: "ハイズオン省保健局" },
        { date: "2025-07", name: "JLPT N4", issuer: "Japan Foundation" },
      ],
      jaLevel: 4.5, enLevel: 2,
      hobbies: "趣味は読書と料理です。細かい作業が得意で、長時間でも集中して丁寧に作業できます。",
      motivationPr: "食品工場で2年間、選別と包装の仕事をしてきました。衛生管理の大切さを学び、ミスのない作業を心がけてきました。日本の食品工場で品質管理の技術を学び、将来はベトナムで食品の安全に関わる仕事をしたいです。",
      heightCm: 158, weightKg: 50, clothingSize: "S", shoulderCm: 40, waistCm: 66, shoeCm: 23,
      religionNotes: BUDDHIST, foodRestrictions: NONE, allergies: NONE,
    },
  },
  {
    code: "SV000203", nameNative: "Aung Ko Ko", nameKana: "アウン・コー・コー", nameLatin: "AUNG KO KO",
    dob: "2000-01-20", gender: "male", nationality: "MM", status: "available", jlpt: "N5", tags: ["建設"],
    createdDaysAgo: 95, updatedDaysAgo: 4,
    videos: [
      { title: "自己紹介（日本語）", lang: "ja", durationSec: 88 },
      { title: "建設実技デモ", durationSec: 142 },
    ],
    cv: {
      familyCount: 6, familyDetail: "父・母・兄・弟・妹",
      mobile: "+95 9 777 123 456", email: "aungkoko@example.com",
      address: "ミャンマー　ヤンゴン市タケタ区", addressKana: "ミャンマー　ヤンゴン",
      education: [
        { from: "2015-06", to: "2018-03", school: "タケタ第1高等学校（ミャンマー）" },
        { from: "2018-12", to: "2021-10", school: "ヤンゴン工科大学　土木工学科（ミャンマー）" },
      ],
      work: [
        { from: "2021-11", to: "2024-08", employer: "シュエタウン建設有限会社（ミャンマー）", jobDesc: "型枠工事、鉄筋組立、現場の安全管理補助" },
        { ...TRAINING("ヤンゴン校"), from: "2024-09" },
      ],
      currentStatus: "現在 N4を勉強しています。",
      licenses: [
        { date: "2023-02", name: "建設現場安全講習修了証", issuer: "ミャンマー建設省" },
        { date: "2026-07", name: "JLPT N5", issuer: "Japan Foundation" },
      ],
      jaLevel: 3, enLevel: 4,
      hobbies: "趣味はサッカーと読書です。体力に自信があり、暑い現場でも集中して作業できます。",
      motivationPr: "大学で土木工学を学び、建設会社で3年間現場の仕事をしました。日本の建設技術と安全管理を学び、将来はミャンマーの建設業の発展に貢献したいです。",
      heightCm: 172, weightKg: 65, clothingSize: "L", shoulderCm: 48, waistCm: 80, shoeCm: 27,
      religionNotes: "仏教です。毎朝短時間のお祈りをします。", foodRestrictions: NONE, allergies: NONE,
    },
  },
  {
    code: "SV000211", nameNative: "Md. Rahim Uddin", nameKana: "ラヒム・ウディン", nameLatin: "MD. RAHIM UDDIN",
    dob: "2001-05-02", gender: "male", nationality: "BD", status: "available", jlpt: "N5", tags: ["農業"],
    createdDaysAgo: 80, updatedDaysAgo: 5,
    videos: [],
    cv: {
      familyCount: 4, familyDetail: "父・母・妻", spouse: true, spouseDependency: true,
      mobile: "+880 1711 234567", email: "rahim.uddin@example.com",
      address: "バングラデシュ　クミッラ県ダウドカンディ", addressKana: "バングラデシュ　クミッラ",
      education: [
        { from: "2016-01", to: "2018-12", school: "ダウドカンディ高等学校（バングラデシュ）" },
        { from: "2019-01", to: "2021-12", school: "クミッラ農業短期大学（バングラデシュ）" },
      ],
      work: [
        { from: "2022-02", to: "2025-03", employer: "グリーンフィールド農園（バングラデシュ）", jobDesc: "野菜・果物の栽培管理、収穫、出荷作業" },
        { ...TRAINING("ダッカ校"), from: "2025-04" },
      ],
      currentStatus: "現在 N4を勉強しています。",
      licenses: [
        { date: "2021-12", name: "農業技術修了証", issuer: "クミッラ農業短期大学" },
        { date: "2026-07", name: "JLPT N5", issuer: "Japan Foundation" },
      ],
      jaLevel: 2.5, enLevel: 4,
      hobbies: "趣味はクリケットと家庭菜園です。早起きが得意で、屋外での作業が好きです。",
      motivationPr: "農業短期大学を卒業し、3年間農園で栽培と収穫の仕事をしました。日本の農業技術、特に温室栽培と品質管理を学びたいです。家族を支えるために真面目に働きます。",
      heightCm: 170, weightKg: 62, clothingSize: "M", shoulderCm: 46, waistCm: 78, shoeCm: 26.5,
      religionNotes: MUSLIM, foodRestrictions: HALAL, allergies: NONE,
    },
  },
  {
    code: "SV000215", nameNative: "Phạm Minh Đức", nameKana: "ファム・ミン・ドゥック", nameLatin: "PHAM MINH DUC",
    dob: "2003-02-11", gender: "male", nationality: "VN", status: "interviewing", jlpt: "N3", tags: ["機械加工"],
    createdDaysAgo: 70, updatedDaysAgo: 6,
    videos: [
      { title: "自己紹介（日本語）", lang: "ja", durationSec: 105 },
      { title: "機械加工実技デモ", durationSec: 150 },
    ],
    cv: {
      familyCount: 4, familyDetail: "父・母・姉",
      mobile: "+84 936 111 222", email: "duc.pham@example.com",
      address: "ベトナム　ナムディン省ナムディン市ロックハ区", addressKana: "ベトナム　ナムディン",
      education: [
        { from: "2018-09", to: "2021-06", school: "ナムディン第1高等学校（ベトナム）" },
        { from: "2021-09", to: "2023-06", school: "ナムディン工業短期大学　機械加工科（ベトナム）" },
      ],
      work: [
        { from: "2023-07", to: "2025-06", employer: "ホアファット機械株式会社（ベトナム）", jobDesc: "NC旋盤・フライス盤による金属部品加工、寸法検査" },
        { ...TRAINING("ベトナム", "、機械加工実技訓練"), from: "2025-07" },
      ],
      currentStatus: "現在 N2を勉強しています。",
      licenses: [
        { date: "2023-06", name: "機械加工技能証明書", issuer: "ナムディン工業短期大学" },
        { date: "2025-12", name: "JLPT N3", issuer: "Japan Foundation" },
      ],
      jaLevel: 6, enLevel: 3,
      hobbies: "趣味はバドミントンと機械の分解・組立です。図面を読むことと正確な作業が得意です。",
      motivationPr: "短期大学で機械加工を学び、2年間NC旋盤とフライス盤を担当しました。0.01mm単位の精度を求められる部品加工で、不良ゼロを目標に取り組んできました。日本の高精度な加工技術を学び、将来は技術者として後輩を指導したいです。",
      heightCm: 170, weightKg: 63, clothingSize: "M", shoulderCm: 46, waistCm: 78, shoeCm: 26,
      religionNotes: BUDDHIST, foodRestrictions: NONE, allergies: NONE,
    },
  },
  {
    code: "SV000219", nameNative: "Su Su Hlaing", nameKana: "スー・スー・ライン", nameLatin: "SU SU HLAING",
    dob: "2005-04-18", gender: "female", nationality: "MM", status: "proposed", jlpt: "N3", tags: ["介護"],
    createdDaysAgo: 60, updatedDaysAgo: 0,
    videos: [
      { title: "自己紹介（日本語）", lang: "ja", durationSec: 95 },
      { title: "介護実技デモ", durationSec: 170 },
    ],
    cv: {
      familyCount: 4, familyDetail: "父・母・弟",
      mobile: "+95 9 450 987 654", email: "susuhlaing@example.com",
      address: "ミャンマー　マンダレー市チャンエーターザン区", addressKana: "ミャンマー　マンダレー",
      education: [
        { from: "2016-06", to: "2019-03", school: "マンダレー第4高等学校（ミャンマー）" },
        { from: "2019-12", to: "2023-05", school: "マンダレー大学　心理学科（ミャンマー）" },
      ],
      work: [
        { from: "2023-06", to: "2025-02", employer: "ゴールデンエイジ高齢者ホーム（ミャンマー）", jobDesc: "高齢者の食事・入浴・移動の介助、レクリエーション補助" },
        { ...TRAINING("ヤンゴン校", "、介護実技訓練"), from: "2025-03" },
      ],
      currentStatus: "現在 N2を勉強しています。",
      licenses: [
        { date: "2025-02", name: "介護初任者研修修了証", issuer: "ミャンマー社会福祉省" },
        { date: "2025-12", name: "JLPT N3", issuer: "Japan Foundation" },
      ],
      jaLevel: 6.5, enLevel: 5,
      hobbies: "趣味は歌と料理です。人の話をよく聞き、相手に合わせて丁寧に対応することが得意です。",
      motivationPr: "大学で心理学を学び、高齢者ホームで2年間介護の仕事をしました。利用者の方に「ありがとう」と言われることが一番の喜びです。日本の介護の知識と技術を学び、介護福祉士の資格を取りたいです。",
      heightCm: 160, weightKg: 52, clothingSize: "M", shoulderCm: 42, waistCm: 68, shoeCm: 24,
      religionNotes: BUDDHIST, foodRestrictions: NONE, allergies: NONE,
    },
  },
  {
    code: "SV000224", nameNative: "Lê Hoàng Long", nameKana: "レ・ホアン・ロン", nameLatin: "LE HOANG LONG",
    dob: "1999-08-30", gender: "male", nationality: "VN", status: "selected", jlpt: "N4", tags: ["自動車整備"],
    createdDaysAgo: 150, updatedDaysAgo: 10,
    videos: [{ title: "自己紹介（日本語）", lang: "ja", durationSec: 110 }],
    cv: {
      familyCount: 4, familyDetail: "父・母・妻", spouse: true, spouseDependency: true,
      mobile: "+84 912 888 999", email: "long.le@example.com",
      address: "ベトナム　ゲアン省ヴィン市フンビン区", addressKana: "ベトナム　ゲアン",
      education: [
        { from: "2014-09", to: "2017-06", school: "ヴィン市第1高等学校（ベトナム）" },
        { from: "2017-09", to: "2020-06", school: "ヴィン工業短期大学　自動車整備科（ベトナム）" },
      ],
      work: [
        { from: "2020-08", to: "2025-05", employer: "タインコン自動車サービス有限会社（ベトナム）", jobDesc: "乗用車の定期点検、エンジン・ブレーキ整備、故障診断" },
        { ...TRAINING("ベトナム"), from: "2025-06" },
      ],
      currentStatus: "現在 N3を勉強しています。",
      licenses: [
        { date: "2019-03", name: "自動車運転免許（B2）", issuer: "ゲアン省交通局" },
        { date: "2020-06", name: "自動車整備技能証明書", issuer: "ヴィン工業短期大学" },
        { date: "2025-12", name: "JLPT N4", issuer: "Japan Foundation" },
      ],
      jaLevel: 5, enLevel: 2.5,
      hobbies: "趣味はバイクの整備と釣りです。故障の原因を順番に調べて見つけることが得意です。",
      motivationPr: "自動車整備士として5年間、点検・整備・故障診断を担当しました。日本車の整備技術とハイブリッド車の知識を学びたいです。家族のために安定して長く働きたいと考えています。",
      heightCm: 171, weightKg: 66, clothingSize: "L", shoulderCm: 47, waistCm: 80, shoeCm: 26.5,
      religionNotes: BUDDHIST, foodRestrictions: NONE, allergies: NONE,
    },
  },
  {
    code: "SV000230", nameNative: "Dewi Lestari", nameKana: "デウィ・レスタリ", nameLatin: "DEWI LESTARI",
    dob: "2003-06-05", gender: "female", nationality: "ID", status: "proposed", jlpt: "N3", tags: ["介護"],
    createdDaysAgo: 45, updatedDaysAgo: 11,
    videos: [{ title: "自己紹介（日本語）", lang: "ja", durationSec: 100 }],
    cv: {
      familyCount: 5, familyDetail: "父・母・兄・妹",
      mobile: "+62 812 3456 7890", email: "dewi.lestari@example.com",
      address: "インドネシア　中部ジャワ州スマラン市", addressKana: "インドネシア　スマラン",
      education: [
        { from: "2018-07", to: "2021-05", school: "スマラン第3高等学校（インドネシア）" },
        { from: "2021-08", to: "2024-07", school: "スマラン看護専門学校（インドネシア）" },
      ],
      work: [
        { from: "2024-08", to: "2025-09", employer: "スマラン市民病院（インドネシア）", jobDesc: "看護助手として患者の身体介助、バイタル測定補助" },
        { ...TRAINING("ジャカルタ校", "、介護実技訓練"), from: "2025-10" },
      ],
      currentStatus: "現在 N2を勉強しています。",
      licenses: [
        { date: "2024-07", name: "看護助手資格", issuer: "インドネシア保健省" },
        { date: "2025-12", name: "JLPT N3", issuer: "Japan Foundation" },
      ],
      jaLevel: 6, enLevel: 5.5,
      hobbies: "趣味は料理と映画鑑賞です。明るい性格で、初めて会う人ともすぐに話せます。",
      motivationPr: "看護専門学校を卒業し、病院で看護助手として働きました。高齢者の方と接する中で介護の仕事にやりがいを感じ、日本で専門的な介護を学びたいと思いました。将来はインドネシアで介護施設を開くことが夢です。",
      heightCm: 157, weightKg: 49, clothingSize: "S", shoulderCm: 40, waistCm: 65, shoeCm: 23,
      religionNotes: "イスラム教です。1日5回の礼拝があります（勤務中は休憩時間に行います）。ヒジャブを着用します。",
      foodRestrictions: HALAL, allergies: NONE,
    },
  },
];

// Documents tab of app/candidate-detail.html (SV000182)
const DOCUMENTS: Record<string, { type: DocumentType; name: string; size: number; shareable: boolean }[]> = {
  SV000182: [
    { type: "original_cv", name: "CV_NguyenVanAn_original.docx", size: 421_888, shareable: false },
    { type: "passport", name: "passport_scan.pdf", size: 1_153_434, shareable: false },
    { type: "certificate", name: "JLPT_N4_certificate.jpg", size: 655_360, shareable: true },
    { type: "health", name: "health_check_2026-08.pdf", size: 2_411_725, shareable: true },
  ],
};

// --- share links (app/shares.html, tracking of the first one from app/share-detail.html) -----------------------

type SeedViewer = { key: string; name?: string; email?: string; ip: string; userAgent: string; geo: string };
type SeedEvent = {
  type: ViewEventType;
  viewer?: string; // SeedViewer.key; absent = anonymous (failed password)
  candidate?: string; // candidate code
  daysAgo: number;
  hm: string;
  durationSec?: number;
  meta?: Prisma.InputJsonObject;
};
type SeedLink = {
  token: string;
  name: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  message?: string;
  password?: string;
  requireIdentity: boolean;
  allowedDomains: string[];
  downloadAllowed: boolean;
  expiresInDays: number;
  sections?: Partial<ShareSections>;
  createdBy: string; // user email
  createdDaysAgo: number;
  candidates: string[]; // codes, in display order
  viewers: SeedViewer[];
  events: SeedEvent[];
  feedback?: { viewer: string; candidate: string; verdict: string; comment?: string; daysAgo: number; hm: string };
};

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const EDGE_WIN = `${CHROME_WIN} Edg/130.0.0.0`;
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SAFARI_IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const LINKS: SeedLink[] = [
  {
    token: "8fK2mQx",
    name: "ヤマト建設様 溶接候補者",
    clientCompany: "株式会社ヤマト建設", clientName: "田中 健一", clientEmail: "tanaka@yamato-k.co.jp",
    message: "田中様　お世話になっております。溶接職種の候補者3名の履歴書と自己紹介動画をご確認ください。",
    password: "Yk7-mQ2p-4Wv", requireIdentity: true, allowedDomains: ["yamato-k.co.jp"], downloadAllowed: false,
    expiresInDays: 3, sections: { contact: false, documents: false },
    createdBy: "trang.pham@saoviet.vn", createdDaysAgo: 4,
    candidates: ["SV000182", "SV000215", "SV000224"],
    viewers: [
      { key: "tanaka", name: "田中 健一", email: "tanaka@yamato-k.co.jp", ip: "210.140.12.34", userAgent: CHROME_WIN, geo: "Nagoya, JP" },
      { key: "sato", name: "佐藤 亮", email: "sato@yamato-k.co.jp", ip: "210.140.12.35", userAgent: EDGE_WIN, geo: "Nagoya, JP" },
      { key: "yamamoto", name: "山本 恵", email: "yamamoto@yamato-k.co.jp", ip: "126.33.8.201", userAgent: SAFARI_IPHONE, geo: "Tokyo, JP" },
    ],
    events: [
      { type: "unlock", viewer: "tanaka", daysAgo: 4, hm: "15:02" },
      { type: "open_list", viewer: "tanaka", daysAgo: 4, hm: "15:02", durationSec: 35 },
      { type: "open_cv", viewer: "tanaka", candidate: "SV000182", daysAgo: 4, hm: "15:05", durationSec: 130 },
      { type: "failed_password", daysAgo: 3, hm: "08:31", meta: { attempts: 3, ip: "14.162.0.0", userAgent: CHROME_ANDROID, geo: "Hanoi, VN" } },
      { type: "unlock", viewer: "yamamoto", daysAgo: 2, hm: "12:08" },
      { type: "open_list", viewer: "yamamoto", daysAgo: 2, hm: "12:08", durationSec: 25 },
      { type: "open_cv", viewer: "yamamoto", candidate: "SV000182", daysAgo: 2, hm: "12:10", durationSec: 140 },
      { type: "unlock", viewer: "sato", daysAgo: 1, hm: "17:44" },
      { type: "open_cv", viewer: "sato", candidate: "SV000224", daysAgo: 1, hm: "17:45", durationSec: 108 },
      { type: "open_cv", viewer: "sato", candidate: "SV000215", daysAgo: 1, hm: "17:50", durationSec: 185 },
      { type: "blocked_action", viewer: "sato", candidate: "SV000215", daysAgo: 1, hm: "17:58", meta: { action: "print", keys: "Ctrl+P" } },
      { type: "open_cv", viewer: "tanaka", candidate: "SV000215", daysAgo: 1, hm: "11:48", durationSec: 95 },
      { type: "open_list", viewer: "tanaka", daysAgo: 0, hm: "09:35", durationSec: 40 },
      { type: "open_cv", viewer: "tanaka", candidate: "SV000182", daysAgo: 0, hm: "09:36", durationSec: 372 },
      { type: "play_video", viewer: "tanaka", candidate: "SV000182", daysAgo: 0, hm: "09:42", durationSec: 92, meta: { title: "自己紹介（日本語）", progress: 100 } },
      { type: "interest", viewer: "tanaka", candidate: "SV000182", daysAgo: 0, hm: "09:47", meta: { comment: "10月8日に面接希望" } },
    ],
    feedback: { viewer: "tanaka", candidate: "SV000182", verdict: "interested", comment: "10月8日に面接希望", daysAgo: 0, hm: "09:47" },
  },
  {
    token: "t7Hb2Ws",
    name: "東海協同組合 介護 2名",
    clientCompany: "東海協同組合", clientName: "鈴木 美咲", clientEmail: "suzuki@tokai-kyodo.or.jp",
    message: "鈴木様　介護職種の候補者2名の履歴書と動画をお送りします。ご確認よろしくお願いいたします。",
    requireIdentity: true, allowedDomains: [], downloadAllowed: true,
    expiresInDays: 8, sections: { documents: true },
    createdBy: "huong.nguyen@saoviet.vn", createdDaysAgo: 8,
    candidates: ["SV000219", "SV000230"],
    viewers: [
      { key: "suzuki", name: "鈴木 美咲", email: "suzuki@tokai-kyodo.or.jp", ip: "133.106.44.10", userAgent: SAFARI_IPHONE, geo: "Tokyo, JP" },
      { key: "takahashi", name: "高橋 大輔", email: "takahashi@tokai-kyodo.or.jp", ip: "133.106.44.22", userAgent: CHROME_WIN, geo: "Nagoya, JP" },
    ],
    events: [
      { type: "unlock", viewer: "suzuki", daysAgo: 7, hm: "10:12" },
      { type: "open_list", viewer: "suzuki", daysAgo: 7, hm: "10:12", durationSec: 30 },
      { type: "open_cv", viewer: "suzuki", candidate: "SV000219", daysAgo: 7, hm: "10:13", durationSec: 150 },
      { type: "open_cv", viewer: "suzuki", candidate: "SV000230", daysAgo: 7, hm: "10:16", durationSec: 120 },
      { type: "download", viewer: "suzuki", candidate: "SV000230", daysAgo: 7, hm: "10:19", meta: { file: "rirekisho.pdf" } },
      { type: "unlock", viewer: "takahashi", daysAgo: 3, hm: "16:40" },
      { type: "open_cv", viewer: "takahashi", candidate: "SV000219", daysAgo: 3, hm: "16:41", durationSec: 200 },
      { type: "play_video", viewer: "takahashi", candidate: "SV000219", daysAgo: 3, hm: "16:45", durationSec: 71, meta: { title: "自己紹介（日本語）", progress: 75 } },
      { type: "open_cv", viewer: "suzuki", candidate: "SV000219", daysAgo: 0, hm: "09:15", durationSec: 90 },
    ],
  },
  {
    token: "zR4nC1e",
    name: "Su Su Hlaing 個別",
    clientCompany: "さくら介護グループ", clientName: "小林 直子", clientEmail: "kobayashi@sakura-care.jp",
    password: "Hn4-pR8s-2Kt", requireIdentity: false, allowedDomains: [], downloadAllowed: false,
    expiresInDays: 29,
    createdBy: "huong.nguyen@saoviet.vn", createdDaysAgo: 1,
    candidates: ["SV000219"],
    viewers: [
      { key: "anon1", ip: "133.200.5.77", userAgent: CHROME_WIN, geo: "Osaka, JP" },
      { key: "anon2", ip: "126.78.120.9", userAgent: SAFARI_IPAD, geo: "Fukuoka, JP" },
    ],
    events: [
      { type: "unlock", viewer: "anon1", daysAgo: 1, hm: "18:19" },
      { type: "open_cv", viewer: "anon1", candidate: "SV000219", daysAgo: 1, hm: "18:20", durationSec: 160 },
      { type: "unlock", viewer: "anon2", daysAgo: 1, hm: "20:02" },
      { type: "open_cv", viewer: "anon2", candidate: "SV000219", daysAgo: 1, hm: "20:03", durationSec: 75 },
      { type: "play_video", viewer: "anon2", candidate: "SV000219", daysAgo: 1, hm: "20:06", durationSec: 48, meta: { title: "自己紹介（日本語）", progress: 50 } },
    ],
  },
];

// --- seed -------------------------------------------------------------------------------------------------------

async function main() {
  const tenantId = ORG.id;
  const org = await prisma.organization.upsert({
    where: { slug: ORG.slug },
    update: { name: ORG.name },
    create: { ...ORG, createdAt: jst(200) },
  });
  const settings = {
    codePrefix: "SV",
    nameJa: "サオベト人材株式会社",
    nameEn: "Sao Việt Manpower JSC",
    country: "VN",
    licenseNo: "1234/LĐTBXH-GP",
    brandColor: "#2455A4",
    footer: "Sao Việt Manpower JSC · Hà Nội · +84 24 3856 7890 · sales@saoviet.vn",
    defaultLang: "vi",
    linkDefaults: LinkDefaults.parse({}),
  };
  await prisma.tenantSettings.upsert({
    where: { tenantId: org.id },
    update: settings,
    create: { ...settings, tenantId: org.id, nextCode: 231 }, // app/settings-company.html: next number 000231
  });

  // Users: better-auth rows (User + credential Account) and organization membership (owner = Admin, member = User).
  const userIdByEmail = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { id: u.id, name: u.name, email: u.email, emailVerified: true },
    });
    userIdByEmail.set(u.email, user.id);
    const password = await hashPassword(PASSWORD);
    const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (account) await prisma.account.update({ where: { id: account.id }, data: { password } });
    else await prisma.account.create({ data: { id: `${user.id}_credential`, accountId: user.id, providerId: "credential", userId: user.id, password } });
    const member = await prisma.member.findFirst({ where: { organizationId: org.id, userId: user.id } });
    if (member) await prisma.member.update({ where: { id: member.id }, data: { role: u.role } });
    else await prisma.member.create({ data: { id: `${user.id}_member`, organizationId: org.id, userId: user.id, role: u.role, createdAt: jst(200) } });
  }
  const huong = userIdByEmail.get(USERS[0].email)!;
  const trang = userIdByEmail.get(USERS[1].email)!;

  // Candidates with their videos and documents.
  const candidateIdByCode = new Map<string, string>();
  const videoIdByCode = new Map<string, string>(); // first video = main video
  for (const c of CANDIDATES) {
    const cv = CvSchema.parse({ nameKana: c.nameKana, nameLatin: c.nameLatin, nameNative: c.nameNative, dob: c.dob, gender: c.gender, nationality: c.nationality, jlpt: c.jlpt, ...c.cv });
    const data = {
      nameKana: c.nameKana,
      nameLatin: c.nameLatin,
      nameNative: c.nameNative,
      dob: new Date(c.dob),
      gender: c.gender,
      nationality: c.nationality,
      status: c.status,
      jlpt: c.jlpt,
      tags: c.tags,
      cv: cv as Prisma.InputJsonObject,
      completeness: cvCompleteness(cv),
      createdById: huong,
      updatedById: trang,
      createdAt: jst(c.createdDaysAgo, "10:00"),
      updatedAt: jst(c.updatedDaysAgo, "14:10"),
    };
    const candidate = await prisma.candidate.upsert({
      where: { tenantId_code: { tenantId, code: c.code } },
      update: data,
      create: { ...data, tenantId, code: c.code },
    });
    candidateIdByCode.set(c.code, candidate.id);
    const prefix = `tenants/${tenantId}/candidates/${candidate.id}`;

    await prisma.video.deleteMany({ where: { candidateId: candidate.id } });
    for (const [position, v] of c.videos.entries()) {
      const id = randomUUID();
      if (position === 0) videoIdByCode.set(c.code, id);
      // TODO(phase2): upload real demo media; these keys point to objects that do not exist in S3.
      await prisma.video.create({
        data: {
          id, tenantId, candidateId: candidate.id, title: v.title, lang: v.lang, position, durationSec: v.durationSec, status: "ready",
          originalKey: `${prefix}/video/${id}-video${position + 1}.mp4`,
          hlsKey: `${prefix}/video/${id}/index.m3u8`,
          posterKey: `${prefix}/video/${id}/poster.jpg`,
          createdAt: jst(c.createdDaysAgo - position * 2, "11:00"),
        },
      });
    }

    await prisma.document.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.document.createMany({
      data: (DOCUMENTS[c.code] ?? []).map((d) => ({ ...d, tenantId, candidateId: candidate.id, key: `${prefix}/doc/${randomUUID()}-${d.name}`, createdAt: jst(c.createdDaysAgo, "10:05") })),
    });
  }

  // Share links with candidates, viewers, events and feedback.
  for (const l of LINKS) {
    const data = {
      name: l.name,
      clientCompany: l.clientCompany,
      clientName: l.clientName,
      clientEmail: l.clientEmail,
      message: l.message,
      viewerLang: "ja",
      passwordHash: l.password ? await hashPassword(l.password) : null,
      requireIdentity: l.requireIdentity,
      allowedDomains: l.allowedDomains,
      downloadAllowed: l.downloadAllowed,
      expiresAt: jst(-l.expiresInDays, "23:59"),
      sections: ShareSections.parse(l.sections ?? {}),
      status: "active",
      createdById: userIdByEmail.get(l.createdBy)!,
      createdAt: jst(l.createdDaysAgo, "10:30"),
    };
    const link = await prisma.shareLink.upsert({ where: { token: l.token }, update: data, create: { ...data, tenantId, token: l.token } });

    await prisma.shareLinkCandidate.deleteMany({ where: { shareLinkId: link.id } });
    await prisma.shareLinkCandidate.createMany({
      data: l.candidates.map((code, position) => ({ shareLinkId: link.id, candidateId: candidateIdByCode.get(code)!, position })),
    });

    await prisma.viewEvent.deleteMany({ where: { shareLinkId: link.id } });
    await prisma.feedback.deleteMany({ where: { shareLinkId: link.id } });
    await prisma.viewer.deleteMany({ where: { shareLinkId: link.id } });
    const viewerId = new Map<string, string>();
    for (const v of l.viewers) {
      const seen = l.events.filter((e) => e.viewer === v.key).map((e) => jst(e.daysAgo, e.hm).getTime());
      const viewer = await prisma.viewer.create({
        data: { shareLinkId: link.id, name: v.name, email: v.email, ip: v.ip, userAgent: v.userAgent, geo: v.geo, firstSeenAt: new Date(Math.min(...seen)), lastSeenAt: new Date(Math.max(...seen)) },
      });
      viewerId.set(v.key, viewer.id);
    }
    await prisma.viewEvent.createMany({
      data: l.events.map((e) => ({
        tenantId,
        shareLinkId: link.id,
        viewerId: e.viewer ? viewerId.get(e.viewer) : null,
        candidateId: e.candidate ? candidateIdByCode.get(e.candidate) : null,
        type: e.type,
        durationSec: e.durationSec,
        meta: e.type === "play_video" && e.candidate ? { ...e.meta, videoId: videoIdByCode.get(e.candidate) } : e.meta,
        createdAt: jst(e.daysAgo, e.hm),
      })),
    });
    if (l.feedback) {
      const f = l.feedback;
      await prisma.feedback.create({
        data: { shareLinkId: link.id, viewerId: viewerId.get(f.viewer)!, candidateId: candidateIdByCode.get(f.candidate)!, verdict: f.verdict, comment: f.comment, createdAt: jst(f.daysAgo, f.hm) },
      });
    }

    await prisma.auditLog.deleteMany({ where: { tenantId, action: "share_link.create", target: link.id } });
    await prisma.auditLog.create({ data: { tenantId, userId: data.createdById, action: "share_link.create", target: link.id, createdAt: data.createdAt } });
  }

  const counts = {
    candidates: await prisma.candidate.count({ where: { tenantId } }),
    videos: await prisma.video.count({ where: { tenantId } }),
    shareLinks: await prisma.shareLink.count({ where: { tenantId } }),
    viewEvents: await prisma.viewEvent.count({ where: { tenantId } }),
  };
  console.log(`Seeded tenant ${ORG.slug} (${ORG.name})`, counts);
  console.log(`Sign in at http://${ORG.slug}.localhost:3000 — admin ${USERS[0].email} / user ${USERS[1].email}, password ${PASSWORD}`);
  console.log(`Share links: ${LINKS.map((l) => `/s/${l.token}${l.password ? ` (password ${l.password})` : ""}`).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

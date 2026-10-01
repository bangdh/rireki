import type { Cv } from "@rireki/shared";

// Sample data of the fictional tenant Sao Việt Manpower, copied from the mockups, for the static foundation pages.
// Every feature lane replaces its usage with Prisma queries scoped by tenantId and deletes what it no longer needs.
// TODO(integration): delete this file once no page imports it.

export const TENANT = {
  slug: "saoviet",
  name: "Sao Việt Manpower",
  nameJa: "サオベト人材株式会社",
  legalName: "Sao Việt Manpower JSC",
  domain: "saoviet.rireki.app",
  initials: "SV",
  footer: "Sao Việt Manpower JSC · Hà Nội · +84 24 3856 7890 · sales@saoviet.vn",
  contact: { name: "Nguyễn Thị Hương", email: "sales@saoviet.vn", phone: "+84 24 3856 7890" },
  nextCode: "SV000231",
};

export const ME = { name: "Nguyễn Thị Hương", firstName: "Hương", email: "huong.nguyen@saoviet.vn", initials: "NH", role: "admin" as const };

export type SampleCandidate = {
  id: string;
  code: string;
  name: string;
  kana: string;
  initials: string;
  nationality: "VN" | "MM" | "BD" | "ID";
  gender: "m" | "f";
  age: number;
  job: string;
  jlpt: string;
  videos: number;
  status: "draft" | "available" | "proposed" | "interviewing" | "selected" | "departed";
  updated: string;
};

// The 8 rows of app/candidates.html plus the extra "available" welders of app/share-new.html.
export const CANDIDATES: SampleCandidate[] = [
  { id: "SV000182", code: "SV000182", name: "Nguyễn Văn An", kana: "グエン・バン・アン", initials: "NA", nationality: "VN", gender: "m", age: 24, job: "溶接", jlpt: "N4", videos: 3, status: "proposed", updated: "28 Sep 2026" },
  { id: "SV000197", code: "SV000197", name: "Trần Thị Mai", kana: "チャン・ティ・マイ", initials: "TM", nationality: "VN", gender: "f", age: 22, job: "食品加工", jlpt: "N4", videos: 1, status: "available", updated: "27 Sep 2026" },
  { id: "SV000203", code: "SV000203", name: "Aung Ko Ko", kana: "アウン・コー・コー", initials: "AK", nationality: "MM", gender: "m", age: 26, job: "建設", jlpt: "N5", videos: 2, status: "available", updated: "26 Sep 2026" },
  { id: "SV000211", code: "SV000211", name: "Md. Rahim Uddin", kana: "ラヒム・ウディン", initials: "RU", nationality: "BD", gender: "m", age: 25, job: "農業", jlpt: "N5", videos: 0, status: "available", updated: "25 Sep 2026" },
  { id: "SV000215", code: "SV000215", name: "Phạm Minh Đức", kana: "ファム・ミン・ドゥック", initials: "MĐ", nationality: "VN", gender: "m", age: 23, job: "機械加工", jlpt: "N3", videos: 2, status: "interviewing", updated: "24 Sep 2026" },
  { id: "SV000219", code: "SV000219", name: "Su Su Hlaing", kana: "スー・スー・ライン", initials: "SH", nationality: "MM", gender: "f", age: 21, job: "介護", jlpt: "N3", videos: 2, status: "proposed", updated: "30 Sep 2026" },
  { id: "SV000224", code: "SV000224", name: "Lê Hoàng Long", kana: "レ・ホアン・ロン", initials: "HL", nationality: "VN", gender: "m", age: 27, job: "自動車整備", jlpt: "N4", videos: 1, status: "selected", updated: "20 Sep 2026" },
  { id: "SV000230", code: "SV000230", name: "Dewi Lestari", kana: "デウィ・レスタリ", initials: "DL", nationality: "ID", gender: "f", age: 23, job: "介護", jlpt: "N3", videos: 1, status: "proposed", updated: "19 Sep 2026" },
  { id: "SV000188", code: "SV000188", name: "Trần Văn Hùng", kana: "チャン・バン・フン", initials: "VH", nationality: "VN", gender: "m", age: 25, job: "溶接", jlpt: "N4", videos: 1, status: "available", updated: "18 Sep 2026" },
  { id: "SV000201", code: "SV000201", name: "Vũ Đức Anh", kana: "ヴー・ドゥック・アイン", initials: "ĐA", nationality: "VN", gender: "m", age: 22, job: "溶接", jlpt: "N5", videos: 2, status: "available", updated: "17 Sep 2026" },
  { id: "SV000176", code: "SV000176", name: "Hoàng Quốc Trung", kana: "ホアン・クオック・チュン", initials: "QT", nationality: "VN", gender: "m", age: 28, job: "溶接", jlpt: "N4", videos: 0, status: "available", updated: "15 Sep 2026" },
];

export const byCode = (code: string) => CANDIDATES.find((c) => c.code === code) ?? CANDIDATES[0];

export type SampleShare = {
  id: string;
  token: string;
  name: string;
  createdBy: string;
  created: string;
  single?: boolean;
  client: string;
  clientEmail?: string;
  candidates: string[]; // initials shown as avatars
  candidateCount: number;
  password: boolean;
  download: boolean;
  expires: string;
  expiringDays?: number;
  views: number;
  uniqueViewers: number;
  lastViewed: { time: string; day?: "today" | "yesterday" };
  status: "active" | "expired" | "revoked";
};

// The rows of app/shares.html.
export const SHARES: SampleShare[] = [
  { id: "8fK2mQx", token: "8fK2mQx", name: "ヤマト建設様 溶接候補者", createdBy: "Phạm Thu Trang", created: "26 Sep", client: "株式会社ヤマト建設", clientEmail: "tanaka@yamato-k.co.jp", candidates: ["NA", "MĐ", "HL"], candidateCount: 5, password: true, download: false, expires: "3 Oct", expiringDays: 3, views: 24, uniqueViewers: 3, lastViewed: { time: "09:42", day: "today" }, status: "active" },
  { id: "t7Hb2Ws", token: "t7Hb2Ws", name: "東海協同組合 介護 2名", createdBy: "Nguyễn Thị Hương", created: "22 Sep", client: "東海協同組合", clientEmail: "suzuki@tokai-kyodo.or.jp", candidates: ["SH", "DL"], candidateCount: 2, password: false, download: true, expires: "8 Oct 2026", views: 8, uniqueViewers: 2, lastViewed: { time: "09:15", day: "today" }, status: "active" },
  { id: "zR4nC1e", token: "zR4nC1e", name: "Su Su Hlaing 個別", createdBy: "Aung Myat", created: "29 Sep", single: true, client: "さくら介護グループ", clientEmail: "kobayashi@sakura-care.jp", candidates: ["SH"], candidateCount: 1, password: true, download: false, expires: "29 Oct 2026", views: 3, uniqueViewers: 2, lastViewed: { time: "18:20", day: "yesterday" }, status: "active" },
  { id: "Wq9Lm3d", token: "Wq9Lm3d", name: "さくら介護 9月候補", createdBy: "Phạm Thu Trang", created: "30 Sep", client: "さくら介護グループ", candidates: ["DL", "SH", "TM"], candidateCount: 3, password: true, download: false, expires: "5 Oct", expiringDays: 5, views: 6, uniqueViewers: 1, lastViewed: { time: "16:05", day: "yesterday" }, status: "active" },
  { id: "p3Ldk9a", token: "p3Ldk9a", name: "Nguyễn Văn An 個別リンク", createdBy: "Nguyễn Thị Hương", created: "15 Sep", single: true, client: "東海協同組合", candidates: ["NA"], candidateCount: 1, password: false, download: true, expires: "31 Oct 2026", views: 7, uniqueViewers: 3, lastViewed: { time: "24 Sep" }, status: "active" },
  { id: "Bn7Yt2k", token: "Bn7Yt2k", name: "JITCO見学 建設候補者 8名", createdBy: "Aung Myat", created: "2 Sep", client: "大和協同組合", candidates: ["AK", "RU", "+6"], candidateCount: 8, password: true, download: false, expires: "15 Nov 2026", views: 41, uniqueViewers: 9, lastViewed: { time: "27 Sep" }, status: "active" },
  { id: "Ke017h", token: "Ke017h", name: "6月提案 溶接3名", createdBy: "Phạm Thu Trang", created: "2 Jun", client: "株式会社ヤマト建設", candidates: [], candidateCount: 3, password: true, download: false, expires: "30 Jun 2026", views: 12, uniqueViewers: 2, lastViewed: { time: "28 Jun" }, status: "expired" },
  { id: "test01", token: "test01", name: "テスト送付", createdBy: "Nguyễn Thị Hương", created: "1 Sep", client: "—", candidates: [], candidateCount: 2, password: false, download: false, expires: "—", views: 1, uniqueViewers: 1, lastViewed: { time: "1 Sep" }, status: "revoked" },
];

export const shareById = (id: string) => SHARES.find((s) => s.id === id) ?? SHARES[0];

// The link of app/share-detail.html and the viewer mockups, as the client sees it.
export const LINK = {
  ...SHARES[0],
  url: "https://saoviet.rireki.app/s/8fK2mQx",
  contact: "田中 健一",
  password: "Yk7-mQ2p-4Wv",
  expiresFull: "3 Oct 2026",
  expiresJa: "2026年10月3日",
  message: "田中様　お世話になっております。溶接職種の候補者5名の履歴書と自己紹介動画をご確認ください。",
  domains: ["@yamato-k.co.jp"],
  viewerLang: "ja",
};

export const VIEWER = { name: "田中 健一", email: "tanaka@yamato-k.co.jp", initials: "田" };

export type SampleMember = {
  name: string;
  email: string;
  initials: string;
  role: "admin" | "user";
  branch: string;
  status: "active" | "invited" | "suspended";
  lastActive: { time?: string; day?: "today" | "yesterday" | "now" };
  me?: boolean;
};

export const MEMBERS: SampleMember[] = [
  { name: "Nguyễn Thị Hương", email: "huong.nguyen@saoviet.vn", initials: "NH", role: "admin", branch: "Hà Nội HQ", status: "active", lastActive: { day: "now" }, me: true },
  { name: "Lê Văn Tùng", email: "tung.le@saoviet.vn", initials: "LT", role: "admin", branch: "Hà Nội HQ", status: "active", lastActive: { time: "17:50", day: "yesterday" } },
  { name: "Phạm Thu Trang", email: "trang.pham@saoviet.vn", initials: "TT", role: "user", branch: "Hà Nội HQ", status: "active", lastActive: { time: "10:05", day: "today" } },
  { name: "Aung Myat", email: "aung.myat@saoviet.vn", initials: "AM", role: "user", branch: "Yangon", status: "active", lastActive: { time: "09:31", day: "today" } },
  { name: "Md. Karim Hossain", email: "karim@saoviet.vn", initials: "MK", role: "user", branch: "Dhaka", status: "active", lastActive: { time: "25 Sep" } },
  { name: "Trần Minh", email: "minh.tran@saoviet.vn", initials: "TM", role: "user", branch: "Hà Nội HQ", status: "invited", lastActive: { time: "—" } },
  { name: "Đỗ Thị Lan", email: "lan.do@saoviet.vn", initials: "ĐL", role: "user", branch: "Hà Nội HQ", status: "suspended", lastActive: { time: "12 Aug" } },
];

// CV body of Nguyễn Văn An as rendered in app/candidate-detail.html (field names = CvSchema in packages/shared/src/cv.ts).
export const SAMPLE_CV: Cv = {
  nameKana: "グエン・バン・アン",
  nameLatin: "NGUYEN VAN AN",
  nameNative: "Nguyễn Văn An",
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
  address: "ベトナム　タインホア省ホアンホア県ホアンティエン村",
  addressKana: "ベトナム　タインホア",
  education: [
    { from: "2017-09", to: "2020-06", school: "ホアンホア第2高等学校（ベトナム）" },
    { from: "2020-09", to: "2022-06", school: "タインホア職業短期大学　溶接科（ベトナム）" },
  ],
  work: [
    { from: "2022-08", to: "2024-05", employer: "ミンファット機械有限会社（ベトナム）", jobDesc: "鉄骨フレームのMIG/TIG溶接、図面確認、品質チェック", partTime: false },
    { from: "2024-06", employer: "サオベト研修センター（ベトナム）", jobDesc: "日本語研修（週30時間）、溶接実技訓練", partTime: false },
  ],
  currentStatus: "現在 N3を勉強しています。",
  licenses: [
    { date: "2023-04", name: "溶接技能証明書 3G", issuer: "タインホア職業短期大学" },
    { date: "2025-12", name: "JLPT N4" },
  ],
  jlpt: "N4",
  otherLanguages: "English (basic)",
  jaLevel: 5,
  enLevel: 3,
  hobbies: "趣味は料理とサッカーです。お客様や仲間とのコミュニケーションを大切にし、相手の立場に立って行動することが得意です。",
  motivationPr:
    "専門学校で溶接を学び、2年間の実務でMIG/TIG溶接を担当してきました。前職では月間の不良率を3%から1%に改善しました。日本の高い品質基準の中で技術を磨き、将来はベトナムで技術者として働きたいと考えています。真面目で体力に自信があり、チームで協力して働くことが好きです。\nどうぞよろしくお願い致します。",
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
export const SAMPLE_CV_UPDATED_AT = new Date("2026-09-28T00:00:00+09:00");

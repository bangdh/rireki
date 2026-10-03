import { expect, test } from "vitest";
import { csvRow, dayRange, describeUserAgent, experienceLabel, fmtDuration, initials, jstDay, maskIp, stripSections } from "./format";

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

test("describeUserAgent names browser · OS for the seed user agents", () => {
  expect(describeUserAgent(CHROME_WIN)).toBe("Chrome · Windows");
  expect(describeUserAgent(`${CHROME_WIN} Edg/130.0.0.0`)).toBe("Edge · Windows");
  expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone");
  expect(describeUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36")).toBe("Chrome · Android");
  expect(describeUserAgent("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPad");
  expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")).toBe("Safari · macOS");
  expect(describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("Firefox · Linux");
  expect(describeUserAgent("curl/8.5.0")).toBe("—");
  expect(describeUserAgent(null)).toBe("—");
});

test("maskIp hides the host part", () => {
  expect(maskIp("210.140.12.34")).toBe("210.140.x.x");
  expect(maskIp("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3:8d3::x");
  expect(maskIp("")).toBe("");
  expect(maskIp(null)).toBe("");
});

test("fmtDuration prints m:ss and h:mm:ss", () => {
  expect(fmtDuration(160)).toBe("2:40");
  expect(fmtDuration(5)).toBe("0:05");
  expect(fmtDuration(3725)).toBe("1:02:05");
  expect(fmtDuration(null)).toBe("");
  expect(fmtDuration(undefined)).toBe("");
});

test("initials: latin first+last, single word, CJK first character", () => {
  expect(initials("NGUYEN VAN AN")).toBe("NA");
  expect(initials("Su Su Hlaing")).toBe("SH");
  expect(initials("Madonna")).toBe("MA");
  expect(initials("田中 健一")).toBe("田");
  expect(initials("")).toBe("?");
  expect(initials(undefined)).toBe("?");
});

test("experienceLabel sums full-time work excluding the training centre", () => {
  const now = new Date("2026-09-30");
  const an = { work: [{ from: "2022-08", to: "2024-05", employer: "ミンファット機械有限会社", jobDesc: "MIG/TIG溶接", partTime: false }, { from: "2024-06", employer: "サオベト研修センター", jobDesc: "日本語研修", partTime: false }] };
  expect(experienceLabel(an, now)).toBe("実務2年"); // 21 months → 2年 (mockup)
  expect(experienceLabel({ work: [{ from: "2026-02", employer: "X", jobDesc: "", partTime: false }] }, now)).toBe("実務7ヶ月");
  expect(experienceLabel({ work: [{ from: "2020-01", to: "2026-01", employer: "Cafe", jobDesc: "", partTime: true }] }, now)).toBe("新卒");
  expect(experienceLabel({ work: [] }, now)).toBe("新卒");
  expect(experienceLabel({}, now)).toBe("新卒");
});

test("stripSections removes the hidden family and health blocks only", () => {
  const cv = { nameKana: "ア", familyCount: 4, familyDetail: "父", spouse: true, spouseDependency: false, heightCm: 168, weightKg: 61, allergies: "なし", mobile: "+84" };
  expect(stripSections(cv, { family: false, health: true })).toEqual({ nameKana: "ア", heightCm: 168, weightKg: 61, allergies: "なし", mobile: "+84" });
  expect(stripSections(cv, { family: true, health: false })).toEqual({ nameKana: "ア", familyCount: 4, familyDetail: "父", spouse: true, spouseDependency: false, mobile: "+84" });
  expect(stripSections(cv, { family: true, health: true })).toEqual(cv);
});

test("csvRow quotes separators, quotes and line breaks", () => {
  expect(csvRow(["a", 1, null, undefined])).toBe("a,1,,");
  expect(csvRow(['say "hi"', "x,y", "l1\nl2"])).toBe('"say ""hi""","x,y","l1\nl2"');
});

test("jstDay and dayRange work in Japan Standard Time", () => {
  expect(jstDay(new Date("2026-09-30T20:00:00Z"))).toBe("2026-10-01"); // 05:00 JST next day
  expect(jstDay(new Date("2026-09-30T14:59:00Z"))).toBe("2026-09-30");
  expect(dayRange("2026-09-28", "2026-10-01")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  expect(dayRange("2026-10-01", "2026-10-01")).toEqual(["2026-10-01"]);
  expect(dayRange("2026-10-02", "2026-10-01")).toEqual([]);
});

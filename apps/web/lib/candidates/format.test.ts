import { describe, expect, test } from "vitest";
import { CANDIDATE_STATUSES } from "@rireki/shared";
import { MESSAGES } from "@/i18n/messages";
import { AUDIT_LABEL, bucketByDay, compact, countryName, csvLine, deviceOf, fmtBytes, fmtDuration, givenName, initials, missingFields, pageWindow, shareHref, statusKey } from "./format";

test("initials takes the first and last token (the mockup avatars)", () => {
  expect(initials("NGUYEN VAN AN")).toBe("NA");
  expect(initials("Su Su Hlaing")).toBe("SH");
  expect(initials("Madonna")).toBe("MA");
  expect(initials("")).toBe("?");
  expect(initials(null)).toBe("?");
});

test("deviceOf classifies the seed user agents", () => {
  expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36")).toBe("Desktop");
  expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe("Mobile");
  expect(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36")).toBe("Mobile");
  expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe("Tablet");
  expect(deviceOf("Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/128.0 Safari/537.36")).toBe("Tablet");
  expect(deviceOf(undefined)).toBe("Desktop");
});

test("bucketByDay counts per calendar day with day-of-month labels", () => {
  const now = new Date(2026, 8, 30, 12); // 30 Sep 2026
  const { values, labels } = bucketByDay([new Date(2026, 8, 30, 9), new Date(2026, 8, 30, 18), new Date(2026, 8, 17, 1), new Date(2026, 8, 16, 23), new Date(2026, 9, 1)], 14, now);
  expect(labels).toEqual(["17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"]);
  expect(values[13]).toBe(2);
  expect(values[0]).toBe(1);
  expect(values.reduce((a, b) => a + b)).toBe(3); // outside the window is ignored
});

test("bucketByDay cuts days in the tenant's zone (a Vietnam tenant on a UTC server)", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  const early = new Date("2026-09-29T18:30:00Z"); // 01:30 on 30 Sep in Hà Nội, still 29 Sep in UTC
  expect(bucketByDay([early], 2, now, "Asia/Ho_Chi_Minh")).toEqual({ values: [0, 1], labels: ["29", "30"] });
  expect(bucketByDay([early], 2, now, "UTC").values).toEqual([1, 0]);
});

test("csvLine quotes separators, quotes and line breaks", () => {
  expect(csvLine(["SV000182", "Nguyễn Văn An", 24, null, undefined])).toBe("SV000182,Nguyễn Văn An,24,,");
  expect(csvLine(['He said "hi"', "a,b", "x\ny"])).toBe('"He said ""hi""","a,b","x\ny"');
});

test("missingFields lists the empty recommended fields", () => {
  expect(missingFields({})).toHaveLength(28);
  expect(missingFields({ nameKana: "グエン", education: [], email: "" })).not.toContain("nameKana");
  expect(missingFields({ nameKana: "グエン", education: [], email: "" })).toEqual(expect.arrayContaining(["education", "email"]));
});

test("compact drops blanks so optional zod fields parse", () => {
  expect(compact({ a: "", b: null, c: undefined, d: NaN, e: 0, f: "x", g: [{ h: "", i: "2024-03" }] })).toEqual({ e: 0, f: "x", g: [{ i: "2024-03" }] });
  expect(compact([1, "", 2])).toEqual([1, "", 2]); // array items are kept positionally
});

test("pageWindow", () => {
  expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  expect(pageWindow(1, 23)).toEqual([1, 2, null, 23]);
  expect(pageWindow(12, 23)).toEqual([1, null, 11, 12, 13, null, 23]);
  expect(pageWindow(23, 23)).toEqual([1, null, 22, 23]);
});

describe("small formatters", () => {
  test("duration and bytes as in the mockups", () => {
    expect(fmtDuration(92)).toBe("1:32");
    expect(fmtDuration(165)).toBe("2:45");
    expect(fmtDuration(null)).toBe("");
    expect(fmtBytes(421_888)).toBe("412 KB");
    expect(fmtBytes(1_153_434)).toBe("1.1 MB");
    expect(fmtBytes(88_080_384)).toBe("84 MB");
  });
  test("givenName and statusKey", () => {
    expect(givenName("Nguyễn Thị Hương")).toBe("Hương");
    expect(statusKey("proposed")).toBe("status.proposed");
  });
});

test("countryName localizes region codes and falls back to the code", () => {
  expect(countryName("en", "VN")).toBe("Vietnam");
  expect(countryName("ja", "VN")).toBe("ベトナム");
  expect(countryName("my", "MM")).not.toBe("MM");
  expect(countryName("en", "x1")).toBe("x1");
});

test("shareHref repeats the candidate param", () => {
  expect(shareHref(["a", "b c"])).toBe("/shares/new?candidate=a&candidate=b%20c");
});

test("every candidate status has a status.* label (not a button) in all 5 message files", () => {
  for (const [locale, m] of Object.entries(MESSAGES)) {
    for (const s of CANDIDATE_STATUSES) expect((m.status as Record<string, unknown>)[s], `${locale} ${statusKey(s)}`).toBeTypeOf("string");
  }
});

test("every AUDIT_LABEL verb is an act.* phrase present in all 5 message files", () => {
  for (const [locale, m] of Object.entries(MESSAGES)) {
    for (const { key } of Object.values(AUDIT_LABEL)) {
      const [ns, k] = key.split(".");
      expect(ns, `${key} is a timeline verb, not a button label`).toBe("act");
      expect((m as Record<string, Record<string, unknown>>)[ns]?.[k], `${locale} ${key}`).toBeTypeOf("string");
    }
  }
});

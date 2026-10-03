import { expect, test } from "vitest";
import { CreateInput, DraftInput, listHref, NoteInput, parseListQuery } from "./schemas";

test("parseListQuery applies defaults and ignores garbage", () => {
  expect(parseListQuery({})).toEqual({ q: "", view: "table", page: 1, per: 8 });
  expect(parseListQuery({ q: " SV000182 ", nationality: "VN", job: "溶接", jlpt: "N4", status: "proposed", video: "1", view: "cards", page: "2", per: "25" })).toEqual({
    q: "SV000182", nationality: "VN", job: "溶接", jlpt: "N4", status: "proposed", video: "1", view: "cards", page: 2, per: 25,
  });
  expect(parseListQuery({ nationality: "TH", jlpt: "N9", page: "-3", per: "999", view: "grid", video: "yes" })).toEqual({ q: "", view: "table", page: 1, per: 8 });
});

test("parseListQuery keeps the last value of a repeated key and drops blanks", () => {
  const q = parseListQuery({ view: ["table", "cards"], video: ["1", ""], nationality: "" });
  expect(q.view).toBe("cards");
  expect(q.video).toBeUndefined();
  expect(q.nationality).toBeUndefined();
});

test("listHref keeps the filters and omits defaults", () => {
  const q = parseListQuery({ q: "an", status: "available", per: "25", page: "3" });
  expect(listHref(q)).toBe("/candidates?q=an&status=available&page=3&per=25");
  expect(listHref(q, { page: 1, view: "cards" })).toBe("/candidates?q=an&status=available&view=cards&per=25");
  expect(listHref(parseListQuery({}))).toBe("/candidates");
});

test("DraftInput accepts partial CVs, CreateInput needs the required fields", () => {
  expect(DraftInput.safeParse({ cv: { nameKana: "グエン" }, tags: ["溶接"] }).success).toBe(true);
  expect(DraftInput.parse({ cv: {} }).tags).toEqual([]);
  const full = { nameKana: "グエン", nameLatin: "NGUYEN", dob: "2002-03-15", gender: "male", nationality: "VN", mobile: "+84 912", address: "Hà Nội" };
  expect(CreateInput.safeParse({ cv: full }).success).toBe(true);
  const missing = CreateInput.safeParse({ cv: { ...full, mobile: undefined } });
  expect(missing.success).toBe(false);
  expect(DraftInput.safeParse({ cv: {}, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success).toBe(false);
  expect(NoteInput.safeParse("  ").success).toBe(false);
});

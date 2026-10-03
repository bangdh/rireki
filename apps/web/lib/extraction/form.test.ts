import { expect, test } from "vitest";
import { z } from "zod";
import { CvFile, formToCv, lowFields, ReviewForm, ReviewFormFull, sectionCounts } from "./form";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
};
const FULL = { nameKana: "グエン", nameLatin: "NGUYEN", dob: "2002-03-15", gender: "male", nationality: "VN", mobile: "+84 912", address: "Hà Nội" };

test("formToCv coerces numbers and booleans, drops blanks and unknown keys, parses the hidden tables", () => {
  const education = [{ from: "2017-09", to: "2020-06", school: "A" }];
  const cv = formToCv(
    fd({ nameKana: " グエン ", familyCount: "4", spouse: "false", spouseDependency: "true", jaLevel: "", email: "  ", heightCm: "168.5", education: JSON.stringify(education), work: "[]", licenses: "", intent: "save", code: "000231" }),
  );
  expect(cv).toEqual({ nameKana: "グエン", familyCount: 4, spouse: false, spouseDependency: true, heightCm: 168.5, education, work: [] });
});

test("ReviewForm accepts a partial CV for drafts; ReviewFormFull needs the required fields and reports errors per field", () => {
  const draft = ReviewForm.safeParse(fd({ nameKana: "グエン", heightCm: "168" }));
  expect(draft.success).toBe(true);
  if (draft.success) expect(draft.data).toMatchObject({ nameKana: "グエン", heightCm: 168, jlpt: "none", education: [] });

  const full = ReviewFormFull.safeParse(fd(FULL));
  expect(full.success).toBe(true);
  if (full.success) expect(full.data).toMatchObject({ ...FULL, situation: "job_hunting", spouse: false, wishSalary: "貴社規定に従います。" });

  const bad = ReviewFormFull.safeParse(fd({ ...FULL, nameKana: "", heightCm: "tall", email: "bad" }));
  expect(bad.success).toBe(false);
  if (!bad.success) expect(Object.keys(z.flattenError(bad.error).fieldErrors).sort()).toEqual(["email", "heightCm", "nameKana"]);
});

test("garbage in a hidden table is a field error, not a crash; non-FormData is rejected", () => {
  const r = ReviewForm.safeParse(fd({ education: "{oops" }));
  expect(r.success).toBe(false);
  if (!r.success) expect(Object.keys(z.flattenError(r.error).fieldErrors)).toEqual(["education"]);
  expect(ReviewForm.safeParse({ nameKana: "x" }).success).toBe(false);
});

test("lowFields and sectionCounts follow the 0.85 threshold and the form sections", () => {
  const conf = { nameKana: 0.7, nameLatin: 0.9, familyCount: 0.6, mobile: 0.85, jlpt: 0.5, shoeCm: 0.84 };
  expect(lowFields(conf)).toEqual(["nameKana", "familyCount", "jlpt", "shoeCm"]);
  expect(sectionCounts(conf)).toEqual({ 1: 2, 4: 1, 6: 1 });
  expect(sectionCounts({})).toEqual({});
});

test("CvFile allows PDF/DOCX/JPG/PNG/HEIC up to 20 MB only", () => {
  const file = (name: string, bytes = 10) => new File([new Uint8Array(bytes)], name, { type: "application/octet-stream" });
  expect(CvFile.safeParse(file("CV_Su_Su_Hlaing.PDF")).success).toBe(true);
  expect(CvFile.safeParse(file("cv.docx")).success).toBe(true);
  expect(CvFile.safeParse(file("scan.jpeg")).success).toBe(true);
  expect(CvFile.safeParse(file("cv.txt")).success).toBe(false);
  expect(CvFile.safeParse(file("empty.pdf", 0)).success).toBe(false);
  expect(CvFile.safeParse(file("big.pdf", 20 * 1024 * 1024 + 1)).success).toBe(false);
  expect(CvFile.safeParse("cv.pdf").success).toBe(false);
});

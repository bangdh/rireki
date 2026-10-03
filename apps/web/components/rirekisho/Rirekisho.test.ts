import { expect, test } from "vitest";
import { ageAt, dateJa } from "./Rirekisho";

test("dateJa prints Japanese dates without zero padding", () => {
  expect(dateJa("2002-03-15")).toBe("2002年3月15日");
  expect(dateJa("2026-10-01")).toBe("2026年10月1日");
});

test("ageAt counts full years (the mockup: born 2002-03-15 is 24 on 2026-09-28)", () => {
  expect(ageAt("2002-03-15", new Date("2026-09-28"))).toBe(24);
  expect(ageAt("2002-03-15", new Date("2026-03-14"))).toBe(23);
  expect(ageAt("2002-03-15", new Date("2026-03-15"))).toBe(24);
});

test("drafts without a date of birth render blanks instead of NaN", () => {
  expect(dateJa("")).toBe("");
  expect(dateJa(undefined)).toBe("");
  expect(ageAt(undefined, new Date("2026-09-28"))).toBeNull();
});

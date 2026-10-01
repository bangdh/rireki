import { expect, test } from "vitest";
import { niceMax } from "./BarChart";

test("niceMax picks the mockup's axis tops", () => {
  expect(niceMax(3)).toBe(5);
  expect(niceMax(10)).toBe(10);
  expect(niceMax(19)).toBe(20);
  expect(niceMax(23)).toBe(25);
  expect(niceMax(41)).toBe(50);
  expect(niceMax(142)).toBe(200);
  expect(niceMax(1250)).toBe(2000);
});

import { expect, test } from "vitest";
import { watermarkGrid } from "./Watermark";

test("watermark grid covers the host with staggered rows (port of renderWatermarks)", () => {
  const cells = watermarkGrid(800, 300);
  expect(cells.length).toBeGreaterThan(0);
  // rows every 96px starting at 30, extending past the bottom edge
  const ys = [...new Set(cells.map((c) => c.y))];
  expect(ys).toEqual([30, 126, 222, 318]);
  // odd rows are shifted left so the labels interleave
  expect(cells.filter((c) => c.y === 30)[0].x).toBe(-20);
  expect(cells.filter((c) => c.y === 126)[0].x).toBe(-160);
  // every row spans beyond the right edge
  for (const y of ys) expect(Math.max(...cells.filter((c) => c.y === y).map((c) => c.x))).toBeGreaterThanOrEqual(800 - 140);
});

test("an empty host still gets at least one label", () => {
  expect(watermarkGrid(0, 0).length).toBeGreaterThan(0);
});

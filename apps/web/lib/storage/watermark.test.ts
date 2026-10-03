import { expect, test } from "vitest";
import { watermarkGrid } from "@/components/Watermark";
import { watermarkSvg } from "./watermark";

const count = (s: string, needle: string) => s.split(needle).length - 1;

test("lays the labels on the same grid as the client Watermark component", () => {
  const svg = watermarkSvg("田中 健一 · tanaka@yamato-k.co.jp · 2026-10-01 09:36", 800, 300);
  expect(count(svg, "<text ")).toBe(watermarkGrid(800, 300).length);
  for (const { x, y } of watermarkGrid(800, 300)) expect(svg).toContain(`<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})">`);
  expect(svg).toContain('font-size="12"');
  expect(svg).toContain('fill-opacity="0.1"');
  expect(svg).toContain('width="800" height="300"');
});

test("scales the grid up for a 200-dpi A4 page instead of shrinking the text", () => {
  const svg = watermarkSvg("x", 1654, 2339);
  const scale = 1654 / 860;
  expect(svg).toContain(`transform="scale(${scale})"`);
  expect(count(svg, "<text ")).toBe(watermarkGrid(1654 / scale, 2339 / scale).length);
});

test("escapes XML in the viewer text", () => {
  const svg = watermarkSvg(`R&D <Tanaka> "x"`, 100, 50);
  expect(svg).toContain("R&amp;D &lt;Tanaka&gt; &quot;x&quot;");
  expect(svg).not.toContain("<Tanaka>");
});

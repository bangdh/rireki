// Per-viewer watermark composited onto the rendered 履歴書 pages at request time (media-pipeline skill).
import sharp from "sharp";

/** Width the CSS grid of components/Watermark.tsx was designed for (.rirekisho max-width); larger images scale the grid up. */
const DESIGN_WIDTH = 860;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * SVG overlay of `text` repeated on the same staggered grid as watermarkGrid() in components/Watermark.tsx (rows every
 * 96 px from y=30, odd rows shifted left, 340 px columns), rotated -28°, 12 px monospace at 10 % opacity. That module is
 * "use client" and cannot be imported here, hence the re-implemented loop. The grid is laid out at design size and
 * scaled so a 200-dpi page image gets the same density and legibility as the on-screen watermark.
 */
export function watermarkSvg(text: string, w: number, h: number): string {
  const s = Math.max(1, w / DESIGN_WIDTH);
  const dw = w / s;
  const dh = h / s;
  const label = esc(text);
  let cells = "";
  for (let y = 30, row = 0; y < dh + 60; y += 96, row++)
    for (let x = row % 2 ? -160 : -20; x < dw + 200; x += 340) cells += `<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})">${label}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<g transform="scale(${s})" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, DejaVu Sans Mono, monospace" font-size="12" fill="#131c2e" fill-opacity="0.1">${cells}</g></svg>`
  );
}

/** The stored page PNG with the viewer's watermark burnt in. */
export async function composite(basePng: Buffer, text: string): Promise<Buffer> {
  const { width, height } = await sharp(basePng).metadata();
  if (!width || !height) throw new Error("watermark: image has no dimensions");
  return sharp(basePng)
    .composite([{ input: Buffer.from(watermarkSvg(text, width, height)) }])
    .png()
    .toBuffer();
}

import { expect, test } from "vitest";
import { rewriteManifest } from "./hls";

const manifest = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-TARGETDURATION:4", "#EXTINF:4.000000,", "seg_000.ts", "#EXTINF:1.000000,", "seg_001.ts", "", "#EXT-X-ENDLIST", ""].join("\n");

test("rewrites only segment lines, keeps tags, blanks and order", async () => {
  const out = await rewriteManifest(manifest, (f) => `https://s3.example/rireki-media/dir/${f}?X-Amz-Signature=sig`);
  const lines = out.split("\n");
  expect(lines[0]).toBe("#EXTM3U");
  expect(lines[4]).toBe("https://s3.example/rireki-media/dir/seg_000.ts?X-Amz-Signature=sig");
  expect(lines[6]).toBe("https://s3.example/rireki-media/dir/seg_001.ts?X-Amz-Signature=sig");
  expect(lines[7]).toBe("");
  expect(lines[8]).toBe("#EXT-X-ENDLIST");
  expect(lines).toHaveLength(10);
});

test("accepts an async signer and CRLF input", async () => {
  const out = await rewriteManifest("#EXTM3U\r\nseg_000.ts\r\n", async (f) => `signed:${f}`);
  expect(out).toBe("#EXTM3U\nsigned:seg_000.ts\n");
});

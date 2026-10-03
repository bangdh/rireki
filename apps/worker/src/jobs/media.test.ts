import { expect, test } from "vitest";
import { ffmpegArgs } from "./media";

const args = ffmpegArgs({ input: "/tmp/x/in.mp4", outDir: "/tmp/x/out", code: "SV000182", font: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" });

test("HLS command: 720p, static watermark with the candidate code, 4 s VOD segments, quiet and non-interactive", () => {
  const { hls } = args;
  expect(hls.slice(0, 5)).toEqual(["-y", "-nostdin", "-hide_banner", "-loglevel", "error"]);
  expect(hls[hls.indexOf("-i") + 1]).toBe("/tmp/x/in.mp4");
  const vf = hls[hls.indexOf("-vf") + 1];
  expect(vf.startsWith("scale=-2:720,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:")).toBe(true);
  expect(vf).toContain("text='SV000182  Confidential'");
  expect(vf).toContain("fontcolor=white@0.55:x=w-tw-24:y=h-th-24");
  expect(hls.join(" ")).toContain("-c:v libx264 -preset veryfast -crf 23 -profile:v main -pix_fmt yuv420p -g 48 -keyint_min 48 -sc_threshold 0 -c:a aac -b:a 128k -ac 2");
  expect(hls.join(" ")).toContain("-f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename /tmp/x/out/seg_%03d.ts /tmp/x/out/index.m3u8");
});

test("poster at 1 s scaled to 480p and the ffprobe duration query", () => {
  expect(args.poster.join(" ")).toBe("-y -nostdin -hide_banner -loglevel error -ss 00:00:01 -i /tmp/x/in.mp4 -frames:v 1 -vf scale=-2:480 /tmp/x/out/poster.jpg");
  expect(args.probe).toEqual(["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "/tmp/x/in.mp4"]);
});

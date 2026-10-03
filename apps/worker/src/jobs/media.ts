// media.transcode { tenantId, videoId }: original → HLS 720p (one rendition) + poster with the static candidate-code
// watermark, in rireki-media/tenants/{t}/candidates/{c}/video/{videoId}/ (media-pipeline skill). Idempotent: a ready video
// is skipped; outputs are written under deterministic keys and overwritten.
import { prisma } from "@rireki/db";
import type { Job } from "bullmq";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { env } from "../env";
import { mediaPrefix } from "../keys";
import { run } from "../run";
import { BUCKET, downloadToFile, uploadDir } from "../s3";

export type MediaTranscodeJob = { tenantId: string; videoId: string };

const QUIET = ["-y", "-nostdin", "-hide_banner", "-loglevel", "error"];

/** The three command lines of the skill (ffmpeg HLS, ffmpeg poster, ffprobe duration) as execFile argument arrays. Pure; see media.test.ts. */
export function ffmpegArgs({ input, outDir, code, font }: { input: string; outDir: string; code: string; font: string }) {
  const drawtext = `drawtext=fontfile=${font}:text='${code}  Confidential':fontsize=28:fontcolor=white@0.55:x=w-tw-24:y=h-th-24`;
  return {
    hls: [
      ...QUIET, "-i", input,
      "-vf", `scale=-2:720,${drawtext}`,
      // -pix_fmt yuv420p: the main profile (and browsers) take 4:2:0 only; RGB / 4:4:4 sources (screen captures, lavfi) would fail otherwise
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-profile:v", "main", "-pix_fmt", "yuv420p", "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_segment_filename", join(outDir, "seg_%03d.ts"), join(outDir, "index.m3u8"),
    ],
    poster: [...QUIET, "-ss", "00:00:01", "-i", input, "-frames:v", "1", "-vf", "scale=-2:480", join(outDir, "poster.jpg")],
    probe: ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input],
  };
}

export async function mediaTranscode(job: Job<MediaTranscodeJob>): Promise<unknown> {
  const { tenantId, videoId } = job.data;
  const video = await prisma.video.findFirst({ where: { id: videoId, tenantId }, include: { candidate: { select: { code: true } } } });
  if (!video) return { skipped: "deleted" };
  if (video.status === "ready") return { skipped: "ready" };
  await prisma.video.update({ where: { id: videoId }, data: { status: "processing" } });

  const dir = await mkdtemp(join(tmpdir(), "transcode-"));
  try {
    const input = join(dir, `in${extname(video.originalKey) || ".bin"}`);
    const outDir = join(dir, "out");
    await mkdir(outDir);
    await downloadToFile(BUCKET.originals, video.originalKey, input);
    const args = ffmpegArgs({ input, outDir, code: video.candidate.code, font: env.WATERMARK_FONT });
    await run("ffmpeg", args.hls);
    await run("ffmpeg", args.poster);
    const durationSec = Math.round(Number.parseFloat(await run("ffprobe", args.probe)));
    const prefix = mediaPrefix(tenantId, video.candidateId, videoId);
    const files = await uploadDir(BUCKET.media, prefix, outDir);
    await prisma.video.update({
      where: { id: videoId },
      data: { hlsKey: `${prefix}/index.m3u8`, posterKey: `${prefix}/poster.jpg`, durationSec: Number.isFinite(durationSec) ? durationSec : null, status: "ready" },
    });
    return { durationSec, files: files.length };
  } catch (e) {
    await prisma.video.update({ where: { id: videoId }, data: { status: "failed" } });
    throw e;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

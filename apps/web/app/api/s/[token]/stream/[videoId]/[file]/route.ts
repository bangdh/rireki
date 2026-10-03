import { prisma } from "@rireki/db";
import { inLink, requireViewerApi } from "@/lib/shares/viewer";
import { rewriteManifest } from "@/lib/storage/hls";
import { BUCKET, getObject, getObjectBuffer, presignGet } from "@/lib/storage/s3";

/** Segment URLs live this long: hls.js fetches them lazily during playback, so a 60 s TTL would break long or paused videos. */
const SEGMENT_TTL = 900;
const FILES = new Set(["index.m3u8", "poster.jpg"]);

/**
 * GET /api/s/{token}/stream/{videoId}/index.m3u8 | poster.jpg — signed HLS for a viewer of the link (media-pipeline skill).
 * The manifest's segment lines become presigned GET URLs on the public endpoint; the poster is proxied. Never a URL to the
 * original. Plays are logged by the player (play_video through /api/s/{token}/events), not here: hls.js fetches the manifest
 * on mount, on every video switch and on recovery.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; videoId: string; file: string }> }) {
  const { token, videoId, file } = await params;
  if (!FILES.has(file)) return Response.json({ error: "not_found" }, { status: 404 });
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  const video = await prisma.video.findFirst({ where: { id: videoId, tenantId: ctx.link.tenantId } });
  if (!video || !ctx.sections.videos || !inLink(ctx, video.candidateId)) return Response.json({ error: "not_found" }, { status: 404 });
  if (video.status !== "ready" || !video.hlsKey || !video.posterKey) return Response.json({ error: "not_ready" }, { status: 409 });

  if (file === "poster.jpg") {
    const { body } = await getObject(BUCKET.media, video.posterKey);
    return new Response(new Uint8Array(body), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60" } });
  }
  const dir = video.hlsKey.slice(0, video.hlsKey.lastIndexOf("/") + 1);
  const manifest = await rewriteManifest((await getObjectBuffer(BUCKET.media, video.hlsKey)).toString("utf8"), (segment) =>
    presignGet(dir + segment, { bucket: BUCKET.media, expiresIn: SEGMENT_TTL }),
  );
  return new Response(manifest, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" } });
}

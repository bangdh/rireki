import { prisma } from "@rireki/db";
import { inLink, requireViewerApi } from "@/lib/shares/viewer";
import { BUCKET, getObject, presignGet } from "@/lib/storage/s3";

/** The stored playlist, the poster and the segments the playlist names (its relative seg_NNN.ts lines resolve back to this route). */
const FILE = /^(index\.m3u8|poster\.jpg|seg_\d+\.ts)$/;

/**
 * GET /api/s/{token}/stream/{videoId}/index.m3u8 | seg_NNN.ts | poster.jpg — HLS for a viewer of the link (media-pipeline
 * skill). Every file, each segment included, passes the viewer session and link checks, so a revoked or expired link, a
 * used-up maxViews or a changed password stops playback at the next segment. The playlist and the poster are proxied as
 * stored; a segment is a 302 to a 60-second presigned GET (hls.js asks for each segment when it needs it, so long or paused
 * videos still play). Never a URL to the original. Plays are logged by the player (play_video through /api/s/{token}/events),
 * not here: hls.js fetches the playlist on mount, on every video switch and on recovery.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; videoId: string; file: string }> }) {
  const { token, videoId, file } = await params;
  if (!FILE.test(file)) return Response.json({ error: "not_found" }, { status: 404 });
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  const video = await prisma.video.findFirst({ where: { id: videoId, tenantId: ctx.link.tenantId } });
  if (!video || !ctx.sections.videos || !inLink(ctx, video.candidateId)) return Response.json({ error: "not_found" }, { status: 404 });
  if (video.status !== "ready" || !video.hlsKey || !video.posterKey) return Response.json({ error: "not_ready" }, { status: 409 });

  if (file === "poster.jpg") {
    const { body } = await getObject(BUCKET.media, video.posterKey);
    return new Response(new Uint8Array(body), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60" } });
  }
  if (file === "index.m3u8") {
    const { body } = await getObject(BUCKET.media, video.hlsKey);
    return new Response(new Uint8Array(body), { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" } });
  }
  const dir = video.hlsKey.slice(0, video.hlsKey.lastIndexOf("/") + 1);
  return Response.redirect(await presignGet(dir + file, { bucket: BUCKET.media, expiresIn: 60 }), 302);
}

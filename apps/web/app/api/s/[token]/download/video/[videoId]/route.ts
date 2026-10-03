import { extname } from "node:path";
import { prisma } from "@rireki/db";
import { logEvent } from "@/lib/shares/events";
import { BUCKET, presignGet } from "@/lib/shares/s3";
import { requireViewerApi } from "@/lib/shares/viewer";

/** The original file of a ready video of a candidate in the link, on download-allowed links with the videos section: logs `download`, 302 to a 5-minute presigned GET (attachment). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; videoId: string }> }) {
  const { token, videoId } = await params;
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  const { link, viewer, sections } = ctx;
  if (!link.downloadAllowed || !sections.videos) return new Response("Forbidden", { status: 403 });
  const video = await prisma.video.findFirst({ where: { id: videoId, tenantId: link.tenantId, status: "ready", candidateId: { in: link.candidates.map((c) => c.candidateId) } } });
  if (!video) return new Response("Not found", { status: 404 });
  const file = `${video.title}${extname(video.originalKey)}`;
  await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, candidateId: video.candidateId, type: "download", meta: { file } });
  return Response.redirect(await presignGet(BUCKET.originals, video.originalKey, 300, file), 302);
}

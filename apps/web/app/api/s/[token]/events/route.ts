import { prisma } from "@rireki/db";
import { HEARTBEAT_SEC, logEvent, metaOf, ViewerEventInput } from "@/lib/shares/events";
import { inLink, requireViewerApi } from "@/lib/shares/viewer";

/**
 * Tracking events posted by the viewer pages after the gate. Rows addressed by id must belong to this viewer and link.
 * open_cv is logged by the detail page itself (never from the browser); the media lane's cv/stream routes log nothing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  const parsed = ViewerEventInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const e = parsed.data;
  const { link, viewer } = ctx;
  const own = { shareLinkId: link.id, viewerId: viewer.id };
  const base = { tenantId: link.tenantId, ...own };
  const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

  switch (e.type) {
    case "play_video": {
      const video = await prisma.video.findFirst({ where: { id: e.videoId, tenantId: link.tenantId, candidateId: { in: link.candidates.map((c) => c.candidateId) } }, select: { id: true, title: true, candidateId: true } });
      if (!video) return notFound();
      const id = await logEvent({ ...base, candidateId: video.candidateId, type: "play_video", durationSec: 0, meta: { videoId: video.id, title: video.title, progress: 0 } });
      return Response.json({ id });
    }
    case "video_progress": {
      const row = await prisma.viewEvent.findFirst({ where: { id: e.eventId, ...own, type: "play_video" } });
      if (!row) return notFound();
      const meta = metaOf(row.meta);
      const progress = Math.max(typeof meta.progress === "number" ? meta.progress : 0, e.progress);
      await prisma.viewEvent.update({ where: { id: row.id }, data: { meta: { ...meta, progress }, durationSec: Math.max(row.durationSec ?? 0, e.positionSec) } });
      return Response.json({ id: row.id });
    }
    case "heartbeat": {
      const r = await prisma.viewEvent.updateMany({ where: { id: e.eventId, ...own, type: "open_cv" }, data: { durationSec: { increment: HEARTBEAT_SEC } } });
      return r.count ? Response.json({ id: e.eventId }) : notFound();
    }
    case "blocked_action": {
      if (e.candidateId && !inLink(ctx, e.candidateId)) return notFound();
      const id = await logEvent({ ...base, candidateId: e.candidateId, type: "blocked_action", meta: { action: e.action, keys: e.keys ?? null } });
      return Response.json({ id });
    }
    case "download": {
      if (!inLink(ctx, e.candidateId) || !link.downloadAllowed) return notFound();
      const id = await logEvent({ ...base, candidateId: e.candidateId, type: "download", meta: { file: "rirekisho-print" } });
      return Response.json({ id });
    }
  }
}

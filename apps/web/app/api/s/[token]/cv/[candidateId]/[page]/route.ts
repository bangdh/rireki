import { prisma } from "@rireki/db";
import { format } from "date-fns";
import { logEvent } from "@/lib/shares/events";
import { inLink, requireViewerApi } from "@/lib/shares/viewer";
import { enqueueRender, HIDEABLE, type Hideable, latestRender, pdfKey, renderKey, renderVersion, variantOf } from "@/lib/storage/renders";
import { BUCKET, getObjectIfExists, objectExists, presignGet } from "@/lib/storage/s3";
import { composite } from "@/lib/storage/watermark";

const notFound = (error: string) => Response.json({ error }, { status: 404 });

/**
 * GET /api/s/{token}/cv/{candidateId}/{page} — the 履歴書 for a viewer (media-pipeline skill), in the render variant that hides
 * what the link's sections switch off (photo, contact, family, health). page 1..n: the stored PNG of the newest render with the
 * viewer's watermark composited in (never cached). page "pdf": 403 on view-only links, else a `download` event and a 302 to a
 * 5-minute presigned GET of the PDF. A stale render (candidate edited since) is served as is and a new render.pages job is
 * queued; a variant not rendered yet answers 404 and queues it (the page shows it on reload). open_cv is the detail page's row.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; candidateId: string; page: string }> }) {
  const { token, candidateId, page } = await params;
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  if (!inLink(ctx, candidateId)) return notFound("not_found");
  const { link, viewer, sections } = ctx;
  const tenantId = link.tenantId;
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { code: true, updatedAt: true } });
  if (!candidate) return notFound("not_found");
  const latest = await latestRender(tenantId, candidateId);
  if (!latest) return notFound("no_render");
  const hide = HIDEABLE.filter((s) => !sections[s]);
  const variant = variantOf(hide);
  const render = (forHide?: Hideable[]) => enqueueRender(tenantId, candidateId, candidate.updatedAt, forHide).catch(console.error);
  if (latest.version < renderVersion(candidate.updatedAt)) void render();

  if (page === "pdf") {
    if (!link.downloadAllowed) return Response.json({ error: "view_only" }, { status: 403 });
    const key = pdfKey(tenantId, candidateId, latest.version, variant);
    if (!(await objectExists(BUCKET.renders, key))) {
      void render(hide);
      return notFound("no_render");
    }
    await logEvent({ tenantId, shareLinkId: link.id, viewerId: viewer.id, candidateId, type: "download", meta: { file: "rirekisho.pdf" } });
    return Response.redirect(await presignGet(key, { bucket: BUCKET.renders, download: `${candidate.code}_rirekisho.pdf`, expiresIn: 300 }), 302);
  }

  const n = /^\d{1,3}$/.test(page) ? Number(page) : 0;
  if (n < 1 || n > latest.pages) return notFound("not_found");
  const base = await getObjectIfExists(BUCKET.renders, renderKey(tenantId, candidateId, latest.version, n, variant));
  if (!base) {
    void render(hide);
    return notFound("no_render");
  }
  const text = [viewer.name, viewer.email ?? viewer.ip, format(new Date(), "yyyy-MM-dd HH:mm")].filter(Boolean).join(" · ");
  return new Response(new Uint8Array(await composite(base, text)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}

import { prisma } from "@rireki/db";
import { logEvent } from "@/lib/shares/events";
import { BUCKET, presignGet } from "@/lib/shares/s3";
import { requireViewerApi } from "@/lib/shares/viewer";

/** A shareable document of a candidate in the link, on download-allowed links with the documents section: logs `download`, 302 to a 5-minute presigned GET (attachment). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; documentId: string }> }) {
  const { token, documentId } = await params;
  const ctx = await requireViewerApi(token);
  if (ctx instanceof Response) return ctx;
  const { link, viewer, sections } = ctx;
  if (!link.downloadAllowed || !sections.documents) return new Response("Forbidden", { status: 403 });
  const doc = await prisma.document.findFirst({ where: { id: documentId, tenantId: link.tenantId, shareable: true, candidateId: { in: link.candidates.map((c) => c.candidateId) } } });
  if (!doc) return new Response("Not found", { status: 404 });
  await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, candidateId: doc.candidateId, type: "download", meta: { file: doc.name } });
  return Response.redirect(await presignGet(BUCKET.originals, doc.key, 300, doc.name), 302);
}

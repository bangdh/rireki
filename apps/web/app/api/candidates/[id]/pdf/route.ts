import { prisma } from "@rireki/db";
import { logEvent } from "@/lib/candidates/activity";
import { BUCKET, presignedGet } from "@/lib/candidates/files";
import { latestRender, pdfKey } from "@/lib/storage/renders";
import { requireMember } from "@/lib/tenant";

/**
 * GET → 302 to a 5-minute presigned GET of the worker's rendered 履歴書 PDF in rireki-renders (saved as {code}.pdf); logs
 * candidate.export_pdf. Staff export/print go through here, never through /print/candidates (RENDER_SECRET stays on the
 * server). 404 until the first render.pages job ran. TODO(integration): enqueueRender when the newest render is older than updatedAt.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, user } = await requireMember();
  const c = await prisma.candidate.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true, code: true } });
  const render = c && (await latestRender(tenant.id, c.id));
  if (!c || !render) return new Response("Not found", { status: 404 });
  const url = await presignedGet(BUCKET.renders, pdfKey(tenant.id, c.id, render.version), `${c.code}.pdf`);
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.export_pdf", target: c.id, meta: { version: render.version } });
  return Response.redirect(url, 302);
}

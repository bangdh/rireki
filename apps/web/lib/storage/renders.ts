// 履歴書 page renders (media-pipeline skill): which version is on S3 for a candidate and how to ask the worker for a new one.
// Called by the candidates lane after create/update and by the viewer cv route when the stored version or variant is missing.
import { prisma } from "@rireki/db";
import { JOB } from "@rireki/shared";
import { type Hideable, renderVersion } from "./keys";
import { enqueue } from "./queue";

export { HIDEABLE, type Hideable, pdfKey, renderKey, renderVersion, variantOf } from "./keys";

/** Newest rendered version of a candidate and its page count (pages are numbered 1..n), or null before the first render. */
export async function latestRender(tenantId: string, candidateId: string): Promise<{ version: number; pages: number } | null> {
  const row = await prisma.render.findFirst({ where: { tenantId, candidateId }, orderBy: [{ version: "desc" }, { page: "desc" }], select: { version: true, page: true } });
  return row && { version: row.version, pages: row.page };
}

/**
 * Queues render.pages for the candidate's current updatedAt. Without `hide` the worker renders the full pages and the default
 * link variant (contact hidden); with it, that one variant (a link whose sections differ). The jobId makes repeated calls for
 * the same version and variant a no-op.
 */
export function enqueueRender(tenantId: string, candidateId: string, updatedAt: Date, hide?: Hideable[]) {
  const version = renderVersion(updatedAt);
  return enqueue(JOB.renderPages, { tenantId, candidateId, version, ...(hide && { hide }) }, `render-${candidateId}-${version}${hide ? `-${hide.join("-") || "full"}` : ""}`);
}

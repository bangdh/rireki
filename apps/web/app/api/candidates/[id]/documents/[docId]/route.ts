import { prisma } from "@rireki/db";
import { logEvent } from "@/lib/candidates/activity";
import { BUCKET, presignedGet } from "@/lib/candidates/files";
import { requireMember } from "@/lib/tenant";

/** GET → 302 to a 5-minute presigned GET (attachment) of an internal document; logs document.download. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { tenant, user } = await requireMember();
  const doc = await prisma.document.findFirst({ where: { id: docId, candidateId: id, tenantId: tenant.id } });
  if (!doc) return new Response("Not found", { status: 404 });
  const url = await presignedGet(BUCKET.originals, doc.key, doc.name);
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "document.download", target: doc.candidateId, meta: { name: doc.name } });
  return Response.redirect(url, 302);
}

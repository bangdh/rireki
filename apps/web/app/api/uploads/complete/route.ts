import { prisma } from "@rireki/db";
import { JOB } from "@rireki/shared";
import { enqueue } from "@/lib/storage/queue";
import { enqueueRender } from "@/lib/storage/renders";
import { completeMultipartUpload, promoteUpload, tmpPrefix } from "@/lib/storage/s3";
import { UploadComplete } from "@/lib/storage/uploads";
import { getSession, requireMember } from "@/lib/tenant";

/**
 * POST /api/uploads/complete { key, candidateId, kind, title?, lang?, type?, shareable?, multipart? } after the bytes are in
 * rireki-uploads: finishes a multipart upload, copies the object into rireki-originals and creates the row —
 * photo → Candidate.photoKey (+ render.pages), video → Video "uploaded" (+ media.transcode), doc → Document. Returns the row.
 */
export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { tenant } = await requireMember();
  const body = UploadComplete.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid", issues: body.error.issues }, { status: 400 });
  const { key, candidateId, kind, multipart, title, lang, type, shareable } = body.data;
  if (!key.startsWith(tmpPrefix(tenant.id))) return Response.json({ error: "forbidden" }, { status: 403 });
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, tenantId: tenant.id }, select: { id: true } });
  if (!candidate) return Response.json({ error: "not_found" }, { status: 404 });

  let promoted: Awaited<ReturnType<typeof promoteUpload>>;
  try {
    if (multipart) await completeMultipartUpload(key, multipart.uploadId, multipart.parts);
    promoted = await promoteUpload({ tenantId: tenant.id, key, candidateId, kind });
  } catch (e) {
    if ((e as { name?: string }).name === "NotFound") return Response.json({ error: "upload_missing" }, { status: 404 });
    throw e;
  }
  const fileName = key.slice(key.lastIndexOf("/") + 1);

  switch (kind) {
    case "photo": {
      const row = await prisma.candidate.update({ where: { id: candidateId, tenantId: tenant.id }, data: { photoKey: promoted.key }, select: { id: true, photoKey: true, updatedAt: true } });
      await enqueueRender(tenant.id, candidateId, row.updatedAt);
      return Response.json(row);
    }
    case "video": {
      const position = await prisma.video.count({ where: { tenantId: tenant.id, candidateId } });
      const row = await prisma.video.create({
        data: { tenantId: tenant.id, candidateId, title: title || fileName, lang: lang || null, position, originalKey: promoted.key, status: "uploaded" },
      });
      await enqueue(JOB.mediaTranscode, { tenantId: tenant.id, videoId: row.id }, `transcode-${row.id}`);
      return Response.json(row);
    }
    case "doc": {
      const row = await prisma.document.create({
        data: { tenantId: tenant.id, candidateId, type: type ?? "other", name: fileName, key: promoted.key, size: promoted.size, shareable: shareable ?? false },
      });
      return Response.json(row);
    }
  }
}

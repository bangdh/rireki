import { prisma } from "@rireki/db";
import { BUCKET, createMultipartUpload, presignPut, tmpKey } from "@/lib/storage/s3";
import { MULTIPART_FROM, UploadInit } from "@/lib/storage/uploads";
import { getSession, requireMember } from "@/lib/tenant";

/**
 * POST /api/uploads { kind, fileName, contentType, size, candidateId? } → where the browser PUTs the bytes (storage-minio skill).
 * photo/doc/cv and videos under 100 MB: { key, url } (presigned PUT, 10 min). Larger videos: multipart — { key, uploadId, partSize,
 * parts: [{ partNumber, url }] } (1 h). uploadFile() in lib/storage/upload-client.ts takes both shapes.
 * The key is always under the session tenant's tmp prefix of rireki-uploads.
 */
export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { tenant } = await requireMember();
  const body = UploadInit.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid", issues: body.error.issues }, { status: 400 });
  const { kind, fileName, contentType, size, candidateId } = body.data;
  if (candidateId && !(await prisma.candidate.findFirst({ where: { id: candidateId, tenantId: tenant.id }, select: { id: true } }))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const key = tmpKey(tenant.id, fileName);
  if (kind === "video" && size >= MULTIPART_FROM) return Response.json({ key, ...(await createMultipartUpload(key, contentType, size)) });
  return Response.json({ key, url: await presignPut(BUCKET.uploads, key, contentType) });
}

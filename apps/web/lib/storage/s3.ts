// S3 access of the storage lane (storage-minio skill): one client for I/O, one signing URLs for browsers, the bucket
// names from env and the copy-from-tmp step every upload goes through. Other lanes import from here.
import {
  CompleteMultipartUploadCommand,
  S3Client,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { makeS3Client } from "@rireki/shared";
import { env } from "@/lib/env";
import { originalKey, type UploadKind } from "./keys";

export { originalKey, safeFileName, tmpKey, tmpPrefix, type UploadKind } from "./keys";

const base = { region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY };
/** Internal endpoint: every GET/PUT/COPY the server does itself. */
export const s3 = makeS3Client({ ...base, endpoint: env.S3_ENDPOINT });
/**
 * Public endpoint: only for URLs handed to browsers (presigned PUT/GET, HLS segments). Built directly instead of via
 * makeS3Client because presigned URLs must not carry the SDK's default CRC32 of an empty body (S3 would answer BadDigest
 * to the browser's PUT): checksums only WHEN_REQUIRED. TODO(integration): add the option to makeS3Client in @rireki/shared.
 */
export const s3Public = new S3Client({
  endpoint: env.S3_PUBLIC_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const BUCKET = {
  originals: env.S3_BUCKET_ORIGINALS,
  media: env.S3_BUCKET_MEDIA,
  renders: env.S3_BUCKET_RENDERS,
  uploads: env.S3_BUCKET_UPLOADS,
  public: env.S3_BUCKET_PUBLIC,
} as const;

/** Multipart part size for video uploads (S3 minimum is 5 MiB); 500 MB → 63 parts. */
export const PART_SIZE = 8 * 1024 * 1024;

/** Presigned PUT for the browser, signed with the Content-Type it will send (SeaweedFS/S3 check it). */
export const presignPut = (bucket: string, key: string, contentType: string, expiresIn = 600) =>
  getSignedUrl(s3Public, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });

/** Presigned GET; `download` makes the browser save the file under that name instead of displaying it. */
export const presignGet = (key: string, { bucket, download, expiresIn }: { bucket: string; download?: string; expiresIn: number }) =>
  getSignedUrl(
    s3Public,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(download && { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(download)}` }),
    }),
    { expiresIn },
  );

export const headObject = (bucket: string, key: string) => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
/** S3's "no such object" errors: HeadObject → NotFound, GetObject → NoSuchKey. */
const isMissing = (e: unknown) => ["NotFound", "NoSuchKey"].includes((e as { name?: string }).name ?? "");
export const objectExists = (bucket: string, key: string) => headObject(bucket, key).then(() => true, (e) => (isMissing(e) ? false : Promise.reject(e)));

export async function getObject(bucket: string, key: string): Promise<{ body: Buffer; contentType?: string }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return { body: Buffer.from(await res.Body!.transformToByteArray()), contentType: res.ContentType };
}
export const getObjectBuffer = (bucket: string, key: string) => getObject(bucket, key).then((o) => o.body);
/** The object's bytes, or null for a key that does not exist (a render variant not produced yet). */
export const getObjectIfExists = (bucket: string, key: string) => getObjectBuffer(bucket, key).catch((e) => (isMissing(e) ? null : Promise.reject(e)));

/** Starts a multipart upload in rireki-uploads and presigns one UploadPart URL per 8 MiB part (1 h). */
export async function createMultipartUpload(key: string, contentType: string, size: number) {
  const { UploadId } = await s3.send(new CreateMultipartUploadCommand({ Bucket: BUCKET.uploads, Key: key, ContentType: contentType }));
  if (!UploadId) throw new Error("CreateMultipartUpload returned no UploadId");
  const count = Math.max(1, Math.ceil(size / PART_SIZE));
  const parts = await Promise.all(
    Array.from({ length: count }, async (_, i) => ({
      partNumber: i + 1,
      url: await getSignedUrl(s3Public, new UploadPartCommand({ Bucket: BUCKET.uploads, Key: key, UploadId, PartNumber: i + 1 }), { expiresIn: 3600 }),
    })),
  );
  return { uploadId: UploadId, partSize: PART_SIZE, parts };
}

export const completeMultipartUpload = (key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]) =>
  s3.send(new CompleteMultipartUploadCommand({ Bucket: BUCKET.uploads, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));

/**
 * Moves a finished browser upload from rireki-uploads into rireki-originals under the candidate prefix:
 * Head (confirms the object exists) → Copy → Delete tmp. Callers check the key is under the session tenant's tmp prefix first.
 * Returns the originals key plus the size and content type from the Head (Document.size needs them).
 */
export async function promoteUpload({ tenantId, key, candidateId, kind }: { tenantId: string; key: string; candidateId: string; kind: UploadKind }) {
  const head = await headObject(BUCKET.uploads, key);
  const dest = originalKey(tenantId, candidateId, kind, key.slice(key.lastIndexOf("/") + 1));
  await s3.send(
    new CopyObjectCommand({
      Bucket: BUCKET.originals,
      Key: dest,
      CopySource: `${BUCKET.uploads}/${key.split("/").map(encodeURIComponent).join("/")}`,
    }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET.uploads, Key: key }));
  return { key: dest, size: head.ContentLength ?? 0, contentType: head.ContentType };
}

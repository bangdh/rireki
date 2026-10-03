// Read-only S3 access of the candidates lane: presigned GET URLs for photos, posters, originals and documents, plus
// best-effort deletes when a video/document row is removed. Uploads are the media lane's /api/uploads routes.
// TODO(integration): use the media lane's lib/storage once it lands.
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { makeS3Client } from "@rireki/shared";
import { env } from "@/lib/env";

const base = { region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY };
const s3 = makeS3Client({ ...base, endpoint: env.S3_ENDPOINT });
// URLs handed to browsers are signed with the public endpoint (storage-minio skill)
const s3Public = makeS3Client({ ...base, endpoint: env.S3_PUBLIC_ENDPOINT });

export const BUCKET = { originals: env.S3_BUCKET_ORIGINALS, media: env.S3_BUCKET_MEDIA, renders: env.S3_BUCKET_RENDERS } as const;

/** 5-minute presigned GET; `filename` makes the browser download instead of displaying. */
export function presignedGet(bucket: string, key: string, filename?: string): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(filename && { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }),
  });
  return getSignedUrl(s3Public, cmd, { expiresIn: 300 });
}

/** Presigned GET or null when the row has no key yet (no photo, no poster). */
export const urlOf = (bucket: string, key?: string | null) => (key ? presignedGet(bucket, key) : Promise.resolve(null));

/** Best effort: a missing object or an S3 hiccup never blocks deleting the DB row. HLS segments are left to the bucket lifecycle. */
export async function deleteObjects(bucket: string, keys: ReadonlyArray<string | null | undefined>): Promise<void> {
  await Promise.allSettled(keys.filter((k): k is string => !!k).map((Key) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }))));
}

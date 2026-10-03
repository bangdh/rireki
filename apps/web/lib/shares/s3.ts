// Read-only S3 access of the share-viewer lane: presigned GET URLs (photos on the viewer pages, document downloads).
// Signed with the public endpoint because browsers follow them (storage-minio skill).
// TODO(integration): dedupe with lib/storage (media lane) and lib/candidates/files.ts.
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { makeS3Client } from "@rireki/shared";
import { env } from "@/lib/env";

const s3Public = makeS3Client({ endpoint: env.S3_PUBLIC_ENDPOINT, region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY });

export const BUCKET = { originals: env.S3_BUCKET_ORIGINALS } as const;

/** Presigned GET (default 5 min); `filename` adds ResponseContentDisposition: attachment so the browser downloads. */
export function presignGet(bucket: string, key: string, ttl = 300, filename?: string): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(filename && { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }),
  });
  return getSignedUrl(s3Public, cmd, { expiresIn: ttl });
}

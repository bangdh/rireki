import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { BUCKETS, makeS3Client } from "@rireki/shared";
import { cache } from "react";
import { env } from "./env";

// One S3 client for this lane (logo upload, storage usage); the I/O endpoint, not the public one.
export const s3 = makeS3Client({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY });

async function bucketBytes(Bucket: string, Prefix: string) {
  let total = 0;
  let ContinuationToken: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }));
    for (const object of page.Contents ?? []) total += object.Size ?? 0;
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return total;
}

/** Video storage of a tenant in GB (1 decimal): every object under tenants/{tenantId}/ in the originals and media buckets. 0 if S3 is unreachable. */
// TODO(phase2): keep a running total in the DB instead of listing buckets on every shell render.
export const storageGb = cache(async (tenantId: string) => {
  try {
    const sizes = await Promise.all([BUCKETS.originals, BUCKETS.media].map((bucket) => bucketBytes(bucket, `tenants/${tenantId}/`)));
    return Math.round(sizes.reduce((a, b) => a + b, 0) / 1e8) / 10;
  } catch {
    return 0;
  }
});

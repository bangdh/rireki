import { S3Client } from "@aws-sdk/client-s3";

export type S3ClientOptions = {
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
  accessKey: string;
  secretKey: string;
};

// Web and worker each build two clients from their env: S3_ENDPOINT for I/O, S3_PUBLIC_ENDPOINT for presigned URLs.
export function makeS3Client({ endpoint, region, forcePathStyle, accessKey, secretKey }: S3ClientOptions) {
  return new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

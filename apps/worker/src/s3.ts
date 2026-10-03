// S3 I/O of the worker (storage-minio skill): download originals, upload HLS/render outputs. Internal endpoint for I/O,
// public endpoint only for URLs that would reach a browser (none of the jobs hand out URLs today).
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { makeS3Client } from "@rireki/shared";
import { createWriteStream } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "./env";

const base = { region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY };
export const s3 = makeS3Client({ ...base, endpoint: env.S3_ENDPOINT });
export const s3Public = makeS3Client({ ...base, endpoint: env.S3_PUBLIC_ENDPOINT });

export const BUCKET = { originals: env.S3_BUCKET_ORIGINALS, media: env.S3_BUCKET_MEDIA, renders: env.S3_BUCKET_RENDERS } as const;

const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};
export const contentTypeOf = (file: string) => CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";

/** Streams an object to disk (originals can be 500 MB). */
export async function downloadToFile(bucket: string, key: string, path: string): Promise<void> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await pipeline(res.Body as Readable, createWriteStream(path));
}

export async function uploadFile(bucket: string, key: string, path: string, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: await readFile(path), ContentType: contentType }));
}

/** Whether the key exists (HeadObject; a missing object is NotFound): render jobs skip variants already on S3. */
export const objectExists = (bucket: string, key: string) =>
  s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).then(() => true, (e: { name?: string }) => (e.name === "NotFound" ? false : Promise.reject(e)));

/** Uploads every file of a flat directory under `prefix/` with the content type of its extension. */
export async function uploadDir(bucket: string, prefix: string, dir: string): Promise<string[]> {
  const files = (await readdir(dir)).sort();
  for (const file of files) await uploadFile(bucket, `${prefix}/${file}`, join(dir, file), contentTypeOf(file));
  return files;
}

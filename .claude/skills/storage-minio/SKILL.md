---
name: storage-minio
description: S3 access (SeaweedFS self-hosted, AWS S3 later) from web and worker — client config, bucket and key layout, presigned PUT/GET helpers, multipart uploads for video, TTL rules, CORS, and the migration path to AWS S3. Load before any file upload, download or media code.
---
# Storage (SeaweedFS now, AWS S3 later)

## Client (packages/shared/src/s3.ts, used by web and worker)

```ts
import { S3Client } from "@aws-sdk/client-s3";
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,               // http://seaweedfs:8333 inside docker; https://s3.rireki.app for browsers
  forcePathStyle: env.S3_FORCE_PATH_STYLE,  // true for SeaweedFS, false for AWS
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});
```
Presigned URLs handed to browsers must be signed with the **public** endpoint: build a second client with
`endpoint: env.S3_PUBLIC_ENDPOINT` for `getSignedUrl`.

## Buckets and keys

| Bucket | Key pattern | Access |
|---|---|---|
| `rireki-uploads` | `tenants/{tenantId}/tmp/{uuid}/{filename}` | presigned PUT, 1-day lifecycle |
| `rireki-originals` | `tenants/{tenantId}/candidates/{candidateId}/{photo|video|doc|cv}/{uuid}-{filename}` | private, versioned |
| `rireki-media` | `tenants/{tenantId}/candidates/{candidateId}/video/{videoId}/{index.m3u8|seg_000.ts|poster.jpg}` | private |
| `rireki-renders` | `tenants/{tenantId}/candidates/{candidateId}/render/v{version}/page-{n}.png` | private, 90-day lifecycle |
| `rireki-public` | `tenants/{tenantId}/logo.png` | public read |

Never put a tenant's file under another tenant's prefix; always derive the prefix from the session tenant.

## Upload flow (photo, documents, video)

1. `POST /api/uploads` `{ kind, fileName, contentType, size }` → validates (size caps: photo 10 MB, doc 20 MB, video
   500 MB; content types allowlist) → returns `{ key, url }` from `getSignedUrl(PutObjectCommand, { expiresIn: 600 })`
   (video ≥ 100 MB: `CreateMultipartUpload` + presigned `UploadPart` URLs; finish with `CompleteMultipartUpload`).
2. Browser `PUT`s directly to the S3 endpoint.
3. `POST /api/uploads/complete` `{ key, candidateId, kind }` → `HeadObject` to confirm → `CopyObject` from
   `rireki-uploads` into `rireki-originals` under the candidate prefix → DB row → enqueue job (`media.transcode`,
   `render.pages`, `extract.cv`).

## Download / view

- Allowed download (link with `downloadAllowed`): `getSignedUrl(GetObjectCommand, { expiresIn: 300 })` with
  `ResponseContentDisposition: attachment` and a `ViewEvent(download)`.
- View-only: never hand out a URL to the original; the API streams a watermarked PNG (`media-pipeline` skill) or a
  signed HLS manifest.

## SeaweedFS specifics

- CORS for presigned PUT from browsers: SeaweedFS answers with permissive CORS (GET/PUT/POST/DELETE/HEAD, ETag exposed)
  without configuration; sign with the same `Content-Type` the browser sends.
- Buckets, versioning and lifecycle are created by `deploy/seaweedfs/init.sh` (service `s3-init`); the single app identity
  lives in `deploy/seaweedfs/s3.json.tpl`. Do not create buckets from app code. No anonymous bucket: serve logos from
  `rireki-public` through presigned GET URLs (long TTL) rather than public reads.
- Local dev without Caddy: `S3_PUBLIC_ENDPOINT=http://localhost:9000`, expose port 9000 in the dev compose override.

## Moving to AWS S3

Change `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_FORCE_PATH_STYLE=false`, credentials; copy data with
`mc mirror`. No code change.

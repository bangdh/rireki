---
name: media-pipeline
description: Worker jobs for video (ffmpeg → HLS 720p + poster with a static watermark), 履歴書 page rendering (Playwright screenshots of the print route) and per-viewer watermark compositing with sharp; BullMQ job names and payloads. Load before touching apps/worker, uploads or protected viewing.
---
# Media pipeline (apps/worker)

## Queue (BullMQ)

One queue `rireki` with named jobs; worker concurrency from `WORKER_CONCURRENCY` (default 2).

| Job | Payload | Effect |
|---|---|---|
| `media.transcode` | `{ tenantId, videoId }` | original → HLS + poster in `rireki-media`; `Video.status`, `durationSec` |
| `render.pages` | `{ tenantId, candidateId, version }` | print route → PNG per page in `rireki-renders`; `Render` rows |
| `extract.cv` | `{ tenantId, importJobId }` | extractor → template mapping → optional Claude → `ImportJob.extracted` |
| `mail.send` | `{ to, template, data }` | nodemailer |

Enqueue from web with `new Queue("rireki", { connection })`. Jobs are idempotent: check current status first,
write outputs under deterministic keys, overwrite.

## Video → HLS (720p, one rendition, static watermark)

```bash
ffmpeg -y -i in.mp4 \
  -vf "scale=-2:720,drawtext=fontfile=/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc:text='${CODE}  Confidential':fontsize=28:fontcolor=white@0.55:x=w-tw-24:y=h-th-24" \
  -c:v libx264 -preset veryfast -crf 23 -profile:v main -g 48 -keyint_min 48 -sc_threshold 0 \
  -c:a aac -b:a 128k -ac 2 \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "out/seg_%03d.ts" out/index.m3u8
ffmpeg -y -ss 00:00:01 -i in.mp4 -frames:v 1 -vf scale=-2:480 out/poster.jpg
ffprobe -v error -show_entries format=duration -of csv=p=0 in.mp4
```
Download the original to `/tmp/{videoId}/`, run, upload `out/*` to `rireki-media`, delete the temp dir.
Phase 2 might add 480p and per-viewer forensic watermarks; not now.

## Serving HLS to a viewer (apps/web/app/api/s/[token]/stream/[videoId]/…)

- `index.m3u8`: read the manifest from MinIO and rewrite each segment line to a presigned GET URL (60 s TTL)
  on `S3_PUBLIC_ENDPOINT`; check the viewer cookie/link validity first; log `play_video` once per play.
- Player: `hls.js` in a client component with `controlsList="nodownload"`, `disablePictureInPicture`, and the
  dynamic `Watermark` overlay (viewer name · email · time).

## 履歴書 pages → PNG (worker job `render.pages`)

- Print route `GET /print/candidates/{id}?v={version}&key={RENDER_SECRET}`: server component rendering the same
  `<Rirekisho>` React component as the detail page, A4 CSS (`@page { size: A4; margin: 12mm }`), one `<section
  class="page">` per page, no shell.
- Worker: `chromium.launch()` → `page.goto(url)` → for each `section.page` → `locator.screenshot({ type: "png" })`
  at `deviceScaleFactor: 2` → upload `page-{n}.png`. Re-render when `Candidate.updatedAt` changes (version =
  updatedAt epoch seconds).

## Per-viewer watermark (apps/web/app/api/s/[token]/cv/[candidateId]/[page]/route.ts)

```ts
const base = await getObjectBuffer(renderKey);
const text = `${viewer.name} · ${viewer.email} · ${format(new Date(), "yyyy-MM-dd HH:mm")}`;
const svg = Buffer.from(watermarkSvg(text, width, height)); // repeated rotated text, 10% opacity
const png = await sharp(base).composite([{ input: svg }]).png().toBuffer();
return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
```
Log `open_cv` on page 1 with the viewer and candidate. Downloads of the PDF only when `downloadAllowed`
(see storage-minio).

## Dockerfile notes

The worker image installs `ffmpeg`, `fonts-noto-cjk`, `fonts-noto-core` and Playwright's Chromium
(`npx playwright install --with-deps chromium`). Keep LibreOffice out unless DOCX preview is requested.

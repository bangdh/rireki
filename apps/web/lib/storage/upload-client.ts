// Browser-only upload helper (no runtime node imports; the type import is erased): POST /api/uploads → PUT the bytes straight to S3 (one XHR, or the
// multipart parts of a video, 3 at a time) → POST /api/uploads/complete. Called from the dropzones of the candidates and
// import lanes (candidate-form step 7, candidate-detail Videos/Documents, candidate-new). A `cv` upload skips the
// complete step and returns the tmp key for the import job.
import type { UploadKind } from "./keys";

export type UploadOptions = {
  kind: UploadKind;
  /** owner of the file; required for photo/video/doc */
  candidateId?: string;
  /** 0..1 */
  onProgress?: (fraction: number) => void;
  /** row fields of POST /api/uploads/complete */
  title?: string;
  lang?: string;
  type?: string;
  shareable?: boolean;
};
export type UploadResult = { key: string } & Record<string, unknown>;

export class UploadError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(`${status} ${code}`);
  }
}

type Init = { key: string; url?: string; uploadId?: string; partSize?: number; parts?: { partNumber: number; url: string }[] };
type Part = { PartNumber: number; ETag: string };
const PARALLEL = 3;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new UploadError(res.status, error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/** PUT with upload progress (fetch has none); resolves with the ETag header (multipart parts need it). */
function put(url: string, body: Blob, contentType: string | null, onProgress: (loaded: number) => void): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag")) : reject(new UploadError(xhr.status, "s3_put_failed")));
    xhr.onerror = () => reject(new UploadError(0, "network"));
    xhr.send(body);
  });
}

export async function uploadFile(file: File, { kind, candidateId, onProgress, ...extra }: UploadOptions): Promise<UploadResult> {
  const contentType = file.type || "application/octet-stream";
  const init = await post<Init>("/api/uploads", { kind, fileName: file.name, contentType, size: file.size, candidateId });
  const progress = (loaded: number) => onProgress?.(file.size ? Math.min(1, loaded / file.size) : 1);
  let multipart: { uploadId: string; parts: Part[] } | undefined;

  if (init.uploadId && init.parts && init.partSize) {
    const { partSize, parts: pending } = init;
    const loaded = new Array<number>(pending.length).fill(0);
    const done: Part[] = [];
    const queue = [...pending];
    const next = async (): Promise<void> => {
      const part = queue.shift();
      if (!part) return;
      const i = part.partNumber - 1;
      const etag = await put(part.url, file.slice(i * partSize, (i + 1) * partSize), null, (n) => {
        loaded[i] = n;
        progress(loaded.reduce((a, b) => a + b, 0));
      });
      if (!etag) throw new UploadError(0, "etag_missing"); // S3 must expose the ETag header through CORS
      done.push({ PartNumber: part.partNumber, ETag: etag });
      await next();
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, next));
    multipart = { uploadId: init.uploadId, parts: done.sort((a, b) => a.PartNumber - b.PartNumber) };
  } else if (init.url) {
    await put(init.url, file, contentType, progress);
  } else {
    throw new UploadError(500, "bad_init");
  }

  if (kind === "cv") return { key: init.key };
  return post<UploadResult>("/api/uploads/complete", { key: init.key, candidateId, kind, ...extra, multipart });
}

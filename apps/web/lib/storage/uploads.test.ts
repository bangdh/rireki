import { describe, expect, test } from "vitest";
import { UPLOAD_LIMITS, UploadComplete, UploadInit } from "./uploads";

const MB = 1024 * 1024;
const init = (patch: Record<string, unknown>) => UploadInit.safeParse({ kind: "photo", fileName: "me.jpg", contentType: "image/jpeg", size: 1234, ...patch });

describe("UploadInit", () => {
  test.each([
    ["photo", "image/webp", 10 * MB],
    ["doc", "application/pdf", 20 * MB],
    ["doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1],
    ["cv", "image/png", 20 * MB],
    ["video", "video/quicktime", 500 * MB],
    ["video", "video/webm", 100],
  ])("accepts %s %s of %d bytes", (kind, contentType, size) => {
    expect(init({ kind, contentType, size }).success).toBe(true);
  });

  test.each([
    ["photo over 10 MB", { size: 10 * MB + 1 }],
    ["doc over 20 MB", { kind: "doc", contentType: "application/pdf", size: 20 * MB + 1 }],
    ["video over 500 MB", { kind: "video", contentType: "video/mp4", size: 500 * MB + 1 }],
    ["gif photo", { contentType: "image/gif" }],
    ["video as photo", { contentType: "video/mp4" }],
    ["exe document", { kind: "doc", contentType: "application/x-msdownload" }],
    ["docx as video", { kind: "video", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
    ["unknown kind", { kind: "avatar" }],
    ["zero size", { size: 0 }],
    ["blank file name", { fileName: "  " }],
  ])("rejects %s with a zod issue", (_name, patch) => {
    const r = init(patch);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.length).toBeGreaterThan(0);
  });

  test("names the offending field", () => {
    const r = init({ size: 11 * MB, contentType: "image/gif" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(["contentType", "size"]);
  });

  test("caps match the storage skill", () => {
    expect(UPLOAD_LIMITS.photo.maxBytes).toBe(10 * MB);
    expect(UPLOAD_LIMITS.doc.maxBytes).toBe(20 * MB);
    expect(UPLOAD_LIMITS.video.maxBytes).toBe(500 * MB);
  });
});

describe("UploadComplete", () => {
  const base = { key: "tenants/t/tmp/u/a.mp4", candidateId: "c1", kind: "video" };
  test("accepts the multipart receipt and optional row fields", () => {
    const r = UploadComplete.parse({ ...base, title: "自己紹介", lang: "ja", multipart: { uploadId: "u1", parts: [{ PartNumber: 1, ETag: '"abc"' }] } });
    expect(r.multipart?.parts[0].ETag).toBe('"abc"');
    expect(UploadComplete.parse({ key: "k", candidateId: "c", kind: "doc", type: "passport", shareable: true }).type).toBe("passport");
  });
  test("rejects cv (no row to create), unknown document types and empty part lists", () => {
    expect(UploadComplete.safeParse({ ...base, kind: "cv" }).success).toBe(false);
    expect(UploadComplete.safeParse({ ...base, kind: "doc", type: "diploma" }).success).toBe(false);
    expect(UploadComplete.safeParse({ ...base, multipart: { uploadId: "u1", parts: [] } }).success).toBe(false);
  });
});

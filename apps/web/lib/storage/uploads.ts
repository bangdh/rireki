// zod schemas of the two upload routes (pure; see uploads.test.ts). Caps and allowlists from the storage-minio skill.
import { DOCUMENT_TYPES } from "@rireki/shared";
import { z } from "zod";

const MB = 1024 * 1024;
/** Videos from this size up go multipart (storage-minio skill); smaller files take one presigned PUT. */
export const MULTIPART_FROM = 100 * MB;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCUMENT = { maxBytes: 20 * MB, types: ["application/pdf", DOCX, "image/jpeg", "image/png"] };

export const UPLOAD_LIMITS = {
  photo: { maxBytes: 10 * MB, types: ["image/jpeg", "image/png", "image/webp"] },
  doc: DOCUMENT,
  cv: DOCUMENT, // a CV file for import: stays in rireki-uploads until the import lane saves the candidate
  video: { maxBytes: 500 * MB, types: ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm"] },
} as const satisfies Record<string, { maxBytes: number; types: readonly string[] }>;

/** POST /api/uploads body. `candidateId` is optional here (a new candidate may not exist yet) and tenant-checked by the route. */
export const UploadInit = z
  .object({
    kind: z.enum(["photo", "video", "doc", "cv"]),
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().min(1),
    size: z.number().int().positive(),
    candidateId: z.string().min(1).optional(),
  })
  .superRefine((v, ctx) => {
    const limit = UPLOAD_LIMITS[v.kind];
    if (v.size > limit.maxBytes) ctx.addIssue({ code: "custom", path: ["size"], message: `max ${limit.maxBytes / MB} MB for ${v.kind}` });
    if (!(limit.types as readonly string[]).includes(v.contentType)) ctx.addIssue({ code: "custom", path: ["contentType"], message: `unsupported type for ${v.kind}` });
  });
export type UploadInit = z.infer<typeof UploadInit>;

/** POST /api/uploads/complete body: the tmp key, the owning candidate and the row fields of the kind. */
export const UploadComplete = z.object({
  key: z.string().min(1),
  candidateId: z.string().min(1),
  kind: z.enum(["photo", "video", "doc"]),
  title: z.string().trim().max(120).optional(), // video; defaults to the file name
  lang: z.string().trim().max(8).optional(), // video language code
  type: z.enum(DOCUMENT_TYPES).optional(), // document; defaults to "other"
  shareable: z.boolean().optional(), // document; defaults to false
  multipart: z
    .object({
      uploadId: z.string().min(1),
      parts: z.array(z.object({ PartNumber: z.number().int().positive(), ETag: z.string().min(1) })).min(1),
    })
    .optional(),
});
export type UploadComplete = z.infer<typeof UploadComplete>;

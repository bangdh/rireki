// Pure key and version helpers of the storage lane (no env, no I/O) so routes, jobs and Vitest share one definition.
// The worker keeps a copy of the render helpers in apps/worker/src/keys.ts. TODO(integration): move both to @rireki/shared.
import type { ShareSections } from "@rireki/shared";
import { randomUUID } from "node:crypto";

export type UploadKind = "photo" | "video" | "doc" | "cv";

/** 履歴書 blocks a share link can switch off (ShareSections); a render variant is the list of the hidden ones. */
export const HIDEABLE = ["contact", "family", "health", "photo"] as const satisfies readonly (keyof ShareSections)[];
export type Hideable = (typeof HIDEABLE)[number];
/** File suffix of a variant: "" for the full pages, ".contact-family" (HIDEABLE order, unknown names ignored) with those blocks hidden. */
export const variantOf = (hide: readonly string[]) => {
  const hidden = HIDEABLE.filter((s) => hide.includes(s));
  return hidden.length ? `.${hidden.join("-")}` : "";
};

/** File name as stored in an S3 key: NFC, no path separators or control characters, no leading dots, at most 120 chars (extension kept). */
export function safeFileName(name: string): string {
  const clean = name.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "").replace(/^\.+/, "").trim() || "file";
  if (clean.length <= 120) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot, dot + 16) : "";
  return clean.slice(0, 120 - ext.length) + ext;
}

/** Every browser upload of a tenant lands under this prefix of rireki-uploads; the complete route refuses other keys. */
export const tmpPrefix = (tenantId: string) => `tenants/${tenantId}/tmp/`;
export const tmpKey = (tenantId: string, fileName: string) => `${tmpPrefix(tenantId)}${randomUUID()}/${safeFileName(fileName)}`;
export const originalKey = (tenantId: string, candidateId: string, kind: UploadKind, fileName: string) =>
  `tenants/${tenantId}/candidates/${candidateId}/${kind}/${randomUUID()}-${safeFileName(fileName)}`;

/** Render version of a candidate = updatedAt in epoch seconds (render.pages re-runs when it changes). */
export const renderVersion = (updatedAt: Date) => Math.floor(updatedAt.getTime() / 1000);
const renderDir = (tenantId: string, candidateId: string, version: number) => `tenants/${tenantId}/candidates/${candidateId}/render/v${version}`;
/** page-{n}.png (full) or page-{n}{variant}.png (blocks hidden, see variantOf) in rireki-renders. */
export const renderKey = (tenantId: string, candidateId: string, version: number, page: number, variant = "") =>
  `${renderDir(tenantId, candidateId, version)}/page-${page}${variant}.png`;
export const pdfKey = (tenantId: string, candidateId: string, version: number, variant = "") =>
  `${renderDir(tenantId, candidateId, version)}/rirekisho${variant}.pdf`;

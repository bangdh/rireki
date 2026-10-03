// Copy of the render/media key helpers in apps/web/lib/storage/keys.ts: lanes cannot edit packages/shared.
// TODO(integration): move both copies to @rireki/shared.
import type { ShareSections } from "@rireki/shared";

/** 履歴書 blocks a share link can switch off (ShareSections); a render variant is the list of the hidden ones. */
export const HIDEABLE = ["contact", "family", "health", "photo"] as const satisfies readonly (keyof ShareSections)[];
export type Hideable = (typeof HIDEABLE)[number];
/** File suffix of a variant: "" for the full pages, ".contact-family" (HIDEABLE order, unknown names ignored) with those blocks hidden. */
export const variantOf = (hide: readonly string[]) => {
  const hidden = HIDEABLE.filter((s) => hide.includes(s));
  return hidden.length ? `.${hidden.join("-")}` : "";
};

/** Render version of a candidate = updatedAt in epoch seconds. */
export const renderVersion = (updatedAt: Date) => Math.floor(updatedAt.getTime() / 1000);
const renderDir = (tenantId: string, candidateId: string, version: number) => `tenants/${tenantId}/candidates/${candidateId}/render/v${version}`;
export const renderKey = (tenantId: string, candidateId: string, version: number, page: number, variant = "") =>
  `${renderDir(tenantId, candidateId, version)}/page-${page}${variant}.png`;
export const pdfKey = (tenantId: string, candidateId: string, version: number, variant = "") =>
  `${renderDir(tenantId, candidateId, version)}/rirekisho${variant}.pdf`;
/** Folder of a video's HLS outputs in rireki-media (index.m3u8, seg_*.ts, poster.jpg). */
export const mediaPrefix = (tenantId: string, candidateId: string, videoId: string) => `tenants/${tenantId}/candidates/${candidateId}/video/${videoId}`;

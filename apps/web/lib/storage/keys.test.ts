import { describe, expect, test } from "vitest";
import { HIDEABLE, originalKey, pdfKey, renderKey, renderVersion, safeFileName, tmpKey, tmpPrefix, variantOf } from "./keys";

describe("safeFileName", () => {
  test("normalises to NFC and strips path characters", () => {
    expect(safeFileName("履歴書゙.pdf")).toBe("履歴書゙.pdf".normalize("NFC"));
    expect(safeFileName("../..\\etc/passwd")).toBe("etc" + "passwd"); // separators removed, leading dots removed
    expect(safeFileName("  ")).toBe("file");
  });
  test("caps the length at 120 and keeps the extension", () => {
    const long = `${"a".repeat(200)}.docx`;
    expect(safeFileName(long)).toHaveLength(120);
    expect(safeFileName(long).endsWith(".docx")).toBe(true);
  });
});

test("tmp and original keys follow the storage-minio layout", () => {
  const tmp = tmpKey("org_1", "photo.jpg");
  expect(tmp.startsWith(tmpPrefix("org_1"))).toBe(true);
  expect(tmp).toMatch(/^tenants\/org_1\/tmp\/[0-9a-f-]{36}\/photo\.jpg$/);
  expect(originalKey("org_1", "cand_1", "video", "intro.mp4")).toMatch(/^tenants\/org_1\/candidates\/cand_1\/video\/[0-9a-f-]{36}-intro\.mp4$/);
});

test("renderVersion is updatedAt in whole epoch seconds", () => {
  expect(renderVersion(new Date("2026-09-29T05:10:00.900Z"))).toBe(1790658600);
  expect(renderVersion(new Date(0))).toBe(0);
});

test("render keys: page PNGs per variant and the PDFs beside them", () => {
  expect(renderKey("t", "c", 7, 2)).toBe("tenants/t/candidates/c/render/v7/page-2.png");
  expect(renderKey("t", "c", 7, 2, ".contact")).toBe("tenants/t/candidates/c/render/v7/page-2.contact.png");
  expect(pdfKey("t", "c", 7)).toBe("tenants/t/candidates/c/render/v7/rirekisho.pdf");
  expect(pdfKey("t", "c", 7, ".contact")).toBe("tenants/t/candidates/c/render/v7/rirekisho.contact.pdf");
});

test("variantOf lists the hidden blocks in a fixed order and ignores unknown names", () => {
  expect(variantOf([])).toBe("");
  expect(variantOf(["photo", "contact"])).toBe(".contact-photo");
  expect(variantOf(["videos", "family"])).toBe(".family");
  expect(variantOf(HIDEABLE)).toBe(".contact-family-health-photo");
});

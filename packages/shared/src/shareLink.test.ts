import { describe, expect, test } from "vitest";
import { FeedbackInput, LinkDefaults, ShareLinkInput, ShareSections } from "./shareLink";

const minimal = { candidateIds: ["c1", "c2"], name: "ヤマト建設様 溶接候補者" };

describe("ShareLinkInput", () => {
  test("applies the wizard defaults", () => {
    const link = ShareLinkInput.parse(minimal);
    expect(link).toMatchObject({
      viewerLang: "ja",
      requireIdentity: true,
      downloadAllowed: false,
      allowedDomains: [],
      notifyFirstView: true,
      notifyInterest: true,
      sections: { photo: true, contact: false, family: true, health: true, videos: true, documents: false, feedback: true },
    });
    expect(link.password).toBeUndefined();
    expect(link.expiresAt).toBeUndefined();
  });

  test("treats blank form values as not provided and coerces numbers/dates", () => {
    const link = ShareLinkInput.parse({
      ...minimal,
      clientEmail: "",
      password: "",
      message: null,
      maxViews: "25",
      expiresAt: "2026-10-03",
      sections: { contact: true },
    });
    expect(link.clientEmail).toBeUndefined();
    expect(link.password).toBeUndefined();
    expect(link.maxViews).toBe(25);
    expect(link.expiresAt).toEqual(new Date("2026-10-03"));
    expect(link.sections.contact).toBe(true);
    expect(link.sections.documents).toBe(false);
  });

  test("normalises email domains", () => {
    expect(ShareLinkInput.parse({ ...minimal, allowedDomains: ["@Yamato-K.co.jp", " tokai-kyodo.or.jp "] }).allowedDomains).toEqual([
      "yamato-k.co.jp",
      "tokai-kyodo.or.jp",
    ]);
    expect(ShareLinkInput.safeParse({ ...minimal, allowedDomains: ["not a domain"] }).success).toBe(false);
  });

  test.each([
    ["no candidates", { candidateIds: [] }],
    ["too many candidates", { candidateIds: Array.from({ length: 201 }, (_, i) => `c${i}`) }],
    ["blank name", { name: "  " }],
    ["short password", { password: "abc" }],
    ["bad client email", { clientEmail: "tanaka@" }],
    ["unknown viewer language", { viewerLang: "fr" }],
    ["zero max views", { maxViews: 0 }],
  ])("rejects %s", (_name, patch) => {
    expect(ShareLinkInput.safeParse({ ...minimal, ...patch }).success).toBe(false);
  });
});

test("ShareSections and LinkDefaults have complete defaults", () => {
  expect(Object.keys(ShareSections.parse({}))).toHaveLength(7);
  expect(LinkDefaults.parse({})).toMatchObject({ password: true, viewOnly: true, viewOnlyLocked: true, expiryDays: 14, protection: "strict" });
  expect(LinkDefaults.parse({ expiryDays: null }).expiryDays).toBeNull();
});

test("FeedbackInput accepts the three verdicts only", () => {
  expect(FeedbackInput.parse({ candidateId: "c1", verdict: "interested", comment: "" }).comment).toBeUndefined();
  expect(FeedbackInput.safeParse({ candidateId: "c1", verdict: "hire" }).success).toBe(false);
});

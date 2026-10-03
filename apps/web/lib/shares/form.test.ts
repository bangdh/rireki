import { LinkDefaults, ShareLinkInput, ShareSections } from "@rireki/shared";
import { expect, test } from "vitest";
import { firstErrors, initialLinkValues, linkInputFromForm } from "./form";

function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

test("initialLinkValues follows the tenant defaults for a new link", () => {
  const v = initialLinkValues(LinkDefaults.parse({ expiryDays: 14, showContact: true, password: false }), undefined, new Date("2026-09-30T12:00:00"));
  expect(v.expiresAt).toBe("2026-10-14");
  expect(v.passwordEnabled).toBe(false);
  expect(v.password).toMatch(/^.{3}-.{4}-.{3}$/);
  expect(v.downloadAllowed).toBe(false);
  expect(v.requireIdentity).toBe(true);
  expect(v.sections.contact).toBe(true);
  expect(v.sections.documents).toBe(false);
  expect(initialLinkValues(LinkDefaults.parse({ expiryDays: null })).expiresAt).toBe("");
});

test("initialLinkValues mirrors a stored link, with a blank password meaning 'keep'", () => {
  const v = initialLinkValues(LinkDefaults.parse({}), {
    name: "ヤマト建設様 溶接候補者", clientCompany: "株式会社ヤマト建設", clientName: "田中 健一", clientEmail: "tanaka@yamato-k.co.jp", message: null, viewerLang: "ja",
    passwordHash: "$argon2", requireIdentity: true, allowedDomains: ["yamato-k.co.jp"], downloadAllowed: false,
    expiresAt: new Date("2026-10-03T23:59:00+09:00"), maxViews: 50, sections: ShareSections.parse({ contact: false }), notifyFirstView: true, notifyInterest: false,
  });
  expect(v).toMatchObject({ name: "ヤマト建設様 溶接候補者", message: "", passwordEnabled: true, password: "", expiresAt: "2026-10-03", maxViews: "50", notify: true, allowedDomains: ["yamato-k.co.jp"] });
});

test("linkInputFromForm converts the posted form into a valid ShareLinkInput", () => {
  const fd = form([
    ["candidateIds", "c1"], ["candidateIds", "c2"], ["name", " ヤマト建設様 "], ["clientCompany", "株式会社ヤマト建設"], ["clientName", ""], ["clientEmail", "tanaka@yamato-k.co.jp"],
    ["message", ""], ["viewerLang", "ja"], ["passwordEnabled", "on"], ["password", "Yk7-mQ2p-4Wv"], ["requireIdentity", "on"], ["allowedDomains", "@Yamato-K.co.jp"],
    ["downloadAllowed", "false"], ["expiresAt", "2026-10-03"], ["maxViews", ""], ["sections.photo", "on"], ["sections.family", "on"], ["sections.health", "on"], ["sections.videos", "on"], ["sections.feedback", "on"], ["notify", "on"],
  ]);
  const parsed = ShareLinkInput.parse(linkInputFromForm(fd));
  expect(parsed.candidateIds).toEqual(["c1", "c2"]);
  expect(parsed.name).toBe("ヤマト建設様");
  expect(parsed.clientName).toBeUndefined();
  expect(parsed.password).toBe("Yk7-mQ2p-4Wv");
  expect(parsed.allowedDomains).toEqual(["yamato-k.co.jp"]);
  expect(parsed.downloadAllowed).toBe(false);
  expect(parsed.expiresAt?.toISOString()).toBe("2026-10-03T14:59:00.000Z");
  expect(parsed.maxViews).toBeUndefined();
  expect(parsed.sections).toEqual({ photo: true, contact: false, family: true, health: true, videos: true, documents: false, feedback: true });
  expect(parsed.notifyFirstView).toBe(true);
});

test("a disabled or blank password is 'not provided'; the switch off turns notifications off", () => {
  expect(linkInputFromForm(form([["password", "Yk7-mQ2p-4Wv"]])).password).toBeUndefined();
  expect(linkInputFromForm(form([["passwordEnabled", "on"], ["password", ""]])).password).toBeUndefined();
  expect(linkInputFromForm(form([["passwordEnabled", "on"], ["password", "abc"]])).password).toBe("abc");
  expect(linkInputFromForm(form([])).notifyInterest).toBe(false);
  expect(linkInputFromForm(form([])).expiresAt).toBeUndefined();
});

test("zod errors land on the right fields (name missing, password < 8, bad domain)", () => {
  const r = ShareLinkInput.safeParse(linkInputFromForm(form([["candidateIds", "c1"], ["passwordEnabled", "on"], ["password", "short"], ["allowedDomains", "not a domain"]])));
  expect(r.success).toBe(false);
  if (!r.success) {
    const errors = firstErrors(r.error.issues);
    expect(Object.keys(errors).sort()).toEqual(["allowedDomains", "name", "password"]);
  }
});

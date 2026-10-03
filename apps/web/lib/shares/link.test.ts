import { LinkDefaults } from "@rireki/shared";
import { expect, test } from "vitest";
import { applyLinkDefaults, canManage, expiringInDays, generateLinkPassword, identityOk, linkState, lockedFor, passwordRequired, shareUrl, viewerLinkState } from "./link";

const now = new Date("2026-10-01T09:00:00+09:00");
const link = (over: Partial<Parameters<typeof linkState>[0]> = {}) => ({ status: "active", expiresAt: new Date("2026-10-03T23:59:00+09:00"), maxViews: null, ...over });

test("linkState: revoked wins, then stored status, expiry date and view cap", () => {
  expect(linkState(link(), 0, now)).toBe("active");
  expect(linkState(link({ status: "revoked", expiresAt: null }), 0, now)).toBe("revoked");
  expect(linkState(link({ status: "revoked", expiresAt: new Date("2020-01-01") }), 99, now)).toBe("revoked");
  expect(linkState(link({ status: "expired" }), 0, now)).toBe("expired");
  expect(linkState(link({ expiresAt: new Date("2026-09-30T23:59:00+09:00") }), 0, now)).toBe("expired");
  expect(linkState(link({ expiresAt: null }), 0, now)).toBe("active");
  expect(linkState(link({ maxViews: 3 }), 2, now)).toBe("active");
  expect(linkState(link({ maxViews: 3 }), 3, now)).toBe("expired");
});

test("viewerLinkState: the N-th opener keeps access, the cap only refuses new openings", () => {
  const capped = link({ maxViews: 2 });
  expect(viewerLinkState(capped, 1, false, now)).toBe("active"); // the gate accepts the 2nd opening
  expect(viewerLinkState(capped, 2, true, now)).toBe("active"); // …whose redirect lands on the list, as does the 1st viewer's next click
  expect(viewerLinkState(capped, 2, false, now)).toBe("expired"); // no 3rd opening
  expect(viewerLinkState(link({ maxViews: 1 }), 1, true, now)).toBe("active"); // maxViews = 1 can be viewed
  expect(viewerLinkState(link({ status: "revoked" }), 0, true, now)).toBe("revoked"); // revoke and expiry still end a session
  expect(viewerLinkState(link({ expiresAt: new Date("2026-09-30T23:59:00+09:00") }), 0, true, now)).toBe("expired");
});

test("identityOk: name + email of an allowed domain when the link asks for identity or restricts domains", () => {
  const anonymous = { name: null, email: null };
  expect(identityOk({ requireIdentity: false, allowedDomains: [] }, anonymous)).toBe(true);
  const identity = { requireIdentity: true, allowedDomains: [] };
  expect(identityOk(identity, anonymous)).toBe(false); // an anonymous session after the sender turned identity on
  expect(identityOk(identity, { name: "山本 恵", email: "yamamoto@gmail.com" })).toBe(true);
  expect(identityOk(identity, { name: null, email: "yamamoto@gmail.com" })).toBe(false);
  const domains = { requireIdentity: false, allowedDomains: ["client.co.jp"] };
  expect(identityOk(domains, { name: "山本 恵", email: "yamamoto@client.co.jp" })).toBe(true);
  expect(identityOk(domains, { name: "山本 恵", email: "yamamoto@gmail.com" })).toBe(false); // a leaked link restricted later
  expect(identityOk(domains, anonymous)).toBe(false);
});

test("expiringInDays counts calendar days (the mockup: 3 Oct is '3 days' on 30 Sep)", () => {
  expect(expiringInDays(link(), new Date("2026-09-30T09:00:00+09:00"))).toBe(3);
  expect(expiringInDays(link(), new Date("2026-10-03T09:00:00+09:00"))).toBe(0);
  expect(expiringInDays(link(), new Date("2026-10-05T09:00:00+09:00"))).toBe(-2);
  expect(expiringInDays({ expiresAt: null }, now)).toBeNull();
});

test("shareUrl builds the tenant subdomain URL", () => {
  expect(shareUrl("https:", "saoviet", "rireki.app", "8fK2mQx")).toBe("https://saoviet.rireki.app/s/8fK2mQx");
  expect(shareUrl("http:", "saoviet", "localhost:3000", "8fK2mQx")).toBe("http://saoviet.localhost:3000/s/8fK2mQx");
});

test("generateLinkPassword is Xxx-Xxxx-Xxx without ambiguous characters", () => {
  for (let i = 0; i < 50; i++) {
    const pw = generateLinkPassword();
    expect(pw).toMatch(/^[A-Za-z2-9]{3}-[A-Za-z2-9]{4}-[A-Za-z2-9]{3}$/);
    expect(pw).not.toMatch(/[0O1lI]/);
  }
  expect(generateLinkPassword()).not.toBe(generateLinkPassword());
});

test("applyLinkDefaults enforces the locked tenant defaults only", () => {
  const values = { downloadAllowed: true, requireIdentity: false, name: "x" };
  const strict = LinkDefaults.parse({ viewOnly: true, viewOnlyLocked: true, identity: true, identityLocked: true });
  expect(applyLinkDefaults(values, strict)).toEqual({ downloadAllowed: false, requireIdentity: true, name: "x" });
  const loose = LinkDefaults.parse({ viewOnlyLocked: false, identityLocked: false });
  expect(applyLinkDefaults(values, loose)).toEqual(values);
  expect(passwordRequired(LinkDefaults.parse({ password: true, passwordLocked: true }))).toBe(true);
  expect(passwordRequired(LinkDefaults.parse({ password: true, passwordLocked: false }))).toBe(false);
  expect(passwordRequired(LinkDefaults.parse({ password: false, passwordLocked: true }))).toBe(false);
});

test("lockedFor: the locks bind the User role; admins keep the defaults but may change them", () => {
  const values = { downloadAllowed: true, requireIdentity: false };
  const strict = LinkDefaults.parse({ password: true, passwordLocked: true, viewOnly: true, viewOnlyLocked: true, identity: true, identityLocked: true });
  expect(applyLinkDefaults(values, lockedFor(strict, "user"))).toEqual({ downloadAllowed: false, requireIdentity: true });
  expect(passwordRequired(lockedFor(strict, "user"))).toBe(true);
  expect(applyLinkDefaults(values, lockedFor(strict, "admin"))).toEqual(values); // an admin may create a download-allowed link
  expect(passwordRequired(lockedFor(strict, "admin"))).toBe(false);
  expect(lockedFor(strict, "admin")).toMatchObject({ password: true, viewOnly: true, identity: true }); // still pre-filled
  expect(applyLinkDefaults(values, lockedFor(LinkDefaults.parse({}), "admin"))).toEqual(values); // out of the box (viewOnlyLocked: true)
});

test("canManage: admins everything, members their own links", () => {
  const l = { createdById: "user_trang" };
  expect(canManage(l, "user_huong", "admin")).toBe(true);
  expect(canManage(l, "user_trang", "user")).toBe(true);
  expect(canManage(l, "user_other", "user")).toBe(false);
});

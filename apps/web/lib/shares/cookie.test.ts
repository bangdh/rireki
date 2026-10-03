import { expect, test } from "vitest";
import { signViewer, verifyViewer, VIEWER_COOKIE_MAX_AGE, viewerCookieName, viewerCookieOptions } from "./cookie";

const secret = "dev-session-secret-change-me-0123456789abcdef";
const hash = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaA"; // a stored ShareLink.passwordHash

test("a signed value verifies back to the viewer id, with and without a link password", () => {
  const value = signViewer("cmg1viewer0001", secret, hash);
  expect(value.startsWith("cmg1viewer0001.")).toBe(true);
  expect(verifyViewer(value, secret, hash)).toBe("cmg1viewer0001");
  expect(verifyViewer(signViewer("cmg1viewer0001", secret, null), secret, null)).toBe("cmg1viewer0001");
});

test("tampered, foreign-secret, malformed and missing values are rejected", () => {
  const value = signViewer("cmg1viewer0001", secret, null);
  expect(verifyViewer(value.replace("0001", "0002"), secret, null)).toBeNull();
  expect(verifyViewer(`${value}x`, secret, null)).toBeNull();
  expect(verifyViewer(value, "another-secret", null)).toBeNull();
  expect(verifyViewer("no-dot", secret, null)).toBeNull();
  expect(verifyViewer("id.sig", secret, null)).toBeNull();
  expect(verifyViewer("id.notanumber.sig", secret, null)).toBeNull();
  expect(verifyViewer(".123.sig", secret, null)).toBeNull();
  expect(verifyViewer("", secret, null)).toBeNull();
  expect(verifyViewer(undefined, secret, null)).toBeNull();
});

test("expired iat: a value older than 12 h is rejected even with a valid MAC, and the iat cannot be forged", () => {
  const issued = Date.now() - (VIEWER_COOKIE_MAX_AGE + 60) * 1000;
  const value = signViewer("cmg1viewer0001", secret, null, issued);
  expect(verifyViewer(value, secret, null, issued + 1000)).toBe("cmg1viewer0001");
  expect(verifyViewer(value, secret, null, issued + VIEWER_COOKIE_MAX_AGE * 1000)).toBe("cmg1viewer0001"); // last valid ms
  expect(verifyViewer(value, secret, null)).toBeNull();
  expect(verifyViewer(value.replace(String(issued), String(Date.now())), secret, null)).toBeNull();
});

test("password rotated: cookies issued under the old hash (or without one) no longer verify", () => {
  const value = signViewer("cmg1viewer0001", secret, hash);
  expect(verifyViewer(value, secret, "$argon2id$v=19$m=65536,t=3,p=4$cm90YXRlZA$bmV3")).toBeNull();
  expect(verifyViewer(value, secret, null)).toBeNull();
  expect(verifyViewer(signViewer("cmg1viewer0001", secret, null), secret, hash)).toBeNull();
});

test("cookie name and options", () => {
  expect(viewerCookieName("8fK2mQx")).toBe("rv_8fK2mQx");
  expect(viewerCookieOptions(true)).toEqual({ httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 43200 });
  expect(viewerCookieOptions(false).secure).toBe(false);
});

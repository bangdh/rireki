// The viewer cookie: rv_{token} = "{viewerId}.{iat}.{base64url(hmac-sha256("{viewerId}.{iat}.{passwordHash}"))}" signed with
// SESSION_SECRET. The issued-at makes the 12 h lifetime server-side (maxAge alone is browser-advisory) and the link's password
// hash in the MAC logs every viewer out when the sender rotates or removes the password.
// Path "/" (not /s/{token}) so the /api/s/{token}/… routes receive it; the name already carries the token.
import { createHmac, timingSafeEqual } from "node:crypto";

export const viewerCookieName = (token: string) => `rv_${token}`;
export const VIEWER_COOKIE_MAX_AGE = 12 * 60 * 60; // seconds

const mac = (payload: string, secret: string, passwordHash: string | null) =>
  createHmac("sha256", secret).update(`${payload}.${passwordHash ?? ""}`).digest("base64url");

/** `{viewerId}.{iat}.{mac}` bound to the link's current password hash (null for a link without a password). */
export function signViewer(viewerId: string, secret: string, passwordHash: string | null, now = Date.now()): string {
  const payload = `${viewerId}.${now}`;
  return `${payload}.${mac(payload, secret, passwordHash)}`;
}

/**
 * The viewer id of a well-signed cookie value issued under this password hash less than 12 h ago; null for a missing,
 * malformed, tampered, expired or pre-rotation one.
 */
export function verifyViewer(value: string | undefined, secret: string, passwordHash: string | null, now = Date.now()): string | null {
  const parts = value?.split(".") ?? [];
  if (parts.length !== 3 || !parts[0] || !/^\d+$/.test(parts[1])) return null;
  const [id, iat, given] = parts;
  const g = Buffer.from(given);
  const expected = Buffer.from(mac(`${id}.${iat}`, secret, passwordHash));
  if (g.length !== expected.length || !timingSafeEqual(g, expected)) return null;
  return Number(iat) + VIEWER_COOKIE_MAX_AGE * 1000 >= now ? id : null;
}

/** Options for cookies().set(): HttpOnly, Lax, 12 h; Secure in production (the viewer is on https there). */
export const viewerCookieOptions = (secure: boolean) => ({ httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: VIEWER_COOKIE_MAX_AGE });

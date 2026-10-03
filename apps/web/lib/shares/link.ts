// Pure share-link rules (tested in link.test.ts). Client-safe: no Prisma, no env, type-only imports from @rireki/shared,
// because the wizard re-rolls passwords in the browser.
import type { LinkDefaults } from "@rireki/shared";
import { differenceInCalendarDays } from "date-fns";
import { customAlphabet } from "nanoid";

export type LinkState = "active" | "expired" | "revoked";
export type LinkLike = { status: string; expiresAt: Date | null; maxViews: number | null };

/** revoked beats everything; then the stored status, the expiry date and the view cap (counted per unlock) decide. */
export function linkState(link: LinkLike, unlockCount: number, now = new Date()): LinkState {
  if (link.status === "revoked") return "revoked";
  if (link.status === "expired") return "expired";
  if (link.expiresAt && link.expiresAt.getTime() < now.getTime()) return "expired";
  if (link.maxViews !== null && link.maxViews <= unlockCount) return "expired";
  return "active";
}

/** Calendar days until the expiry date (0 = today, negative = past), null without one; ≤ 7 shows the warning badge. */
export const expiringInDays = (link: Pick<LinkLike, "expiresAt">, now = new Date()): number | null =>
  link.expiresAt ? differenceInCalendarDays(link.expiresAt, now) : null;

export const EXPIRY_WARNING_DAYS = 7;

/** `https://saoviet.rireki.app/s/8fK2mQx` from the APP_URL protocol ("https:"), the tenant slug and APP_DOMAIN. */
export const shareUrl = (protocol: string, slug: string, domain: string, token: string) => `${protocol}//${slug}.${domain}/s/${token}`;

// No 0/O, 1/l/I: the password is read out on the phone or typed from a printed proposal.
const block = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789");
/** "Yk7-mQ2p-4Wv": three groups of unambiguous characters, as in the mockup. */
export const generateLinkPassword = () => `${block(3)}-${block(4)}-${block(3)}`;

/** Tenant defaults with a *Locked flag win over what the form posted (the form also renders those inputs disabled). */
export function applyLinkDefaults<T extends { downloadAllowed: boolean; requireIdentity: boolean }>(values: T, d: LinkDefaults): T {
  return {
    ...values,
    downloadAllowed: d.viewOnlyLocked && d.viewOnly ? false : values.downloadAllowed,
    requireIdentity: d.identityLocked && d.identity ? true : values.requireIdentity,
  };
}

/** A locked "password on" default means a link cannot be created or kept without a password. */
export const passwordRequired = (d: LinkDefaults) => d.password && d.passwordLocked;

/** Admins manage every link of the tenant; members only the ones they created. */
export const canManage = (link: { createdById: string }, userId: string, role: "admin" | "user") => role === "admin" || link.createdById === userId;

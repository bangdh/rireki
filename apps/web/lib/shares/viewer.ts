// The client viewer session: link by token (no tenant session), link state on every request, viewer from the signed
// cookie. The media lane's /api/s/[token]/{cv,stream} routes import loadViewer / requireViewer / requireViewerApi /
// requestMeta / inLink from here — keep these names.
import { prisma, type Prisma } from "@rireki/db";
import { ShareSections } from "@rireki/shared";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { parseOrgMeta } from "@/lib/auth-schemas";
import { env } from "@/lib/env";
import { verifyViewer, viewerCookieName } from "./cookie";
import { linkState } from "./link";

// What the list and detail pages need per candidate; cv is the Json body (experience label, 履歴書 render).
const candidateSelect = {
  id: true, code: true, nameKana: true, nameLatin: true, nameNative: true, dob: true, gender: true, nationality: true, jlpt: true, tags: true, photoKey: true, cv: true, updatedAt: true,
  _count: { select: { videos: { where: { status: "ready" } } } },
} satisfies Prisma.CandidateSelect;

/**
 * Everything the viewer pages know about a request: the link with its candidates in sender order, the tenant's
 * branding, the creator, the computed state and the viewer behind the rv_{token} cookie (null before the gate).
 * Cached per request; null for an unknown token.
 */
export const loadViewer = cache(async (token: string) => {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { candidates: { orderBy: { position: "asc" }, include: { candidate: { select: candidateSelect } } } },
  });
  if (!link) return null;
  const [org, settings, creator, unlockCount, cookieValue] = await Promise.all([
    prisma.organization.findUnique({ where: { id: link.tenantId }, select: { name: true, slug: true, metadata: true } }),
    prisma.tenantSettings.findUnique({ where: { tenantId: link.tenantId } }),
    prisma.user.findUnique({ where: { id: link.createdById }, select: { name: true, email: true } }),
    prisma.viewEvent.count({ where: { shareLinkId: link.id, type: "unlock" } }),
    cookies().then((jar) => jar.get(viewerCookieName(token))?.value),
  ]);
  const viewerId = verifyViewer(cookieValue, env.SESSION_SECRET, link.passwordHash);
  const viewer = viewerId ? await prisma.viewer.findFirst({ where: { id: viewerId, shareLinkId: link.id } }) : null;
  return {
    link,
    sections: ShareSections.parse(link.sections),
    state: linkState(link, unlockCount),
    unlockCount,
    viewer,
    tenant: { name: org?.name ?? "", slug: org?.slug ?? "", settings, meta: parseOrgMeta(org?.metadata) },
    creator,
  };
});

export type ViewerContext = NonNullable<Awaited<ReturnType<typeof loadViewer>>>;
/** A context whose gate has been passed. */
export type UnlockedViewer = ViewerContext & { viewer: NonNullable<ViewerContext["viewer"]> };

/** Pages below /s/{token}: unknown token → 404; expired/revoked or no viewer cookie → back to /s/{token} (Expired or Gate). */
export async function requireViewer(token: string): Promise<UnlockedViewer> {
  const ctx = await loadViewer(token);
  if (!ctx) notFound();
  if (ctx.state !== "active" || !ctx.viewer) redirect(`/s/${token}`);
  return ctx as UnlockedViewer;
}

/** Route Handlers under /api/s/{token}: 404 unknown token, 410 expired/revoked, 401 without a valid viewer cookie. */
export async function requireViewerApi(token: string): Promise<UnlockedViewer | Response> {
  const ctx = await loadViewer(token);
  if (!ctx) return new Response("Not found", { status: 404 });
  if (ctx.state !== "active") return new Response("Gone", { status: 410 });
  if (!ctx.viewer) return new Response("Unauthorized", { status: 401 });
  return ctx as UnlockedViewer;
}

/** Whether a candidate belongs to the loaded link (ids from the URL are never trusted on their own). */
export const inLink = (ctx: ViewerContext, candidateId: string) => ctx.link.candidates.some((c) => c.candidateId === candidateId);

/** ip (first x-forwarded-for hop), user agent and country (CF-IPCountry / x-geo; no GeoIP library in phase 1). */
export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    ua: h.get("user-agent"),
    geo: h.get("cf-ipcountry") ?? h.get("x-geo"),
  };
}

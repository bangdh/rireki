// Prisma reads of the tenant pages (/shares, /shares/new, /shares/[id]). Every query is scoped by tenantId; ids from
// the URL are re-checked with it.
import { prisma, type Prisma } from "@rireki/db";
import { SHARE_LINK_STATUSES } from "@rireki/shared";
import { subDays } from "date-fns";
import { z } from "zod";
import { env } from "@/lib/env";
import { EXPIRY_WARNING_DAYS, expiringInDays, linkState, shareUrl } from "./link";
import { linkTotals } from "./stats";

export const PER_PAGE = 20;

/** `https://{slug}.{APP_DOMAIN}/s/{token}` with the APP_URL protocol. */
export const linkUrl = (slug: string, token: string) => shareUrl(new URL(env.APP_URL).protocol, slug, env.APP_DOMAIN, token);

// Every field falls back to its default on garbage so a hand-edited URL never 500s.
export const ListQuery = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(SHARE_LINK_STATUSES).optional().catch(undefined),
  client: z.string().trim().min(1).max(120).optional().catch(undefined),
  createdBy: z.string().min(1).max(60).optional().catch(undefined),
  password: z.enum(["1"]).optional().catch(undefined),
  viewOnly: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type ListQuery = z.infer<typeof ListQuery>;
export type SearchParams = Record<string, string | string[] | undefined>;

/** A repeated key keeps its last value: the GET form has hidden inputs for the chips and submit buttons that come later. */
export function parseListQuery(sp: SearchParams): ListQuery {
  const entries = Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v] as const).filter(([, v]) => v !== undefined && v !== "");
  return ListQuery.parse(Object.fromEntries(entries));
}

const contains = (value: string): Prisma.StringFilter => ({ contains: value, mode: "insensitive" });

/** The list page rows with their creator, first three candidates, counts and tracking totals. */
export async function listShareLinks(tenantId: string, q: ListQuery, now = new Date()) {
  const and: Prisma.ShareLinkWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { name: contains(q.q) },
        { clientCompany: contains(q.q) },
        { clientName: contains(q.q) },
        { candidates: { some: { candidate: { OR: [{ nameLatin: contains(q.q) }, { nameNative: contains(q.q) }, { nameKana: contains(q.q) }, { code: contains(q.q) }] } } } },
      ],
    });
  }
  // Status is derived (linkState): the date part is filtered here, the view cap only colours the badge. TODO(phase2): maxViews in the filter.
  if (q.status === "revoked") and.push({ status: "revoked" });
  if (q.status === "expired") and.push({ OR: [{ status: "expired" }, { status: "active", expiresAt: { lt: now } }] });
  if (q.status === "active") and.push({ status: "active", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] });
  if (q.client) and.push({ clientCompany: q.client });
  if (q.createdBy) and.push({ createdById: q.createdBy });
  if (q.password) and.push({ passwordHash: { not: null } });
  if (q.viewOnly) and.push({ downloadAllowed: false });
  const where: Prisma.ShareLinkWhereInput = { tenantId, AND: and };

  const [rows, total] = await Promise.all([
    prisma.shareLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        candidates: { orderBy: { position: "asc" }, take: 3, select: { candidate: { select: { nameLatin: true } } } },
        _count: { select: { candidates: true } },
      },
    }),
    prisma.shareLink.count({ where }),
  ]);
  const [totals, creators] = await Promise.all([linkTotals(tenantId, rows.map((r) => r.id)), userNames(rows.map((r) => r.createdById))]);
  return { rows, total, totals, creators };
}

/** Display names by user id (creators of the listed links). */
export async function userNames(ids: ReadonlyArray<string>): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

/** Header line of the list: active · expiring soon (≤ 7 days) · revoked, from linkState over every link, and views in 30 days. */
export async function linkCounts(tenantId: string, now = new Date()) {
  const [links, unlocks, views30] = await Promise.all([
    prisma.shareLink.findMany({ where: { tenantId }, select: { id: true, status: true, expiresAt: true, maxViews: true } }),
    prisma.viewEvent.groupBy({ by: ["shareLinkId"], where: { tenantId, type: "unlock" }, _count: { _all: true } }),
    prisma.viewEvent.count({ where: { tenantId, type: "open_cv", createdAt: { gte: subDays(now, 30) } } }),
  ]);
  const unlockOf = new Map(unlocks.map((u) => [u.shareLinkId, u._count._all]));
  const counts = { active: 0, expiring: 0, revoked: 0, views30 };
  for (const l of links) {
    const state = linkState(l, unlockOf.get(l.id) ?? 0, now);
    if (state === "revoked") counts.revoked++;
    else if (state === "active") {
      counts.active++;
      const days = expiringInDays(l, now);
      if (days !== null && days <= EXPIRY_WARNING_DAYS) counts.expiring++;
    }
  }
  return counts;
}

/** Options of the client and "created by" filters. */
export async function listFilters(tenantId: string) {
  const [clients, creatorRows] = await Promise.all([
    prisma.shareLink.findMany({ where: { tenantId, clientCompany: { not: null } }, distinct: ["clientCompany"], select: { clientCompany: true }, orderBy: { clientCompany: "asc" } }),
    prisma.shareLink.findMany({ where: { tenantId }, distinct: ["createdById"], select: { createdById: true } }),
  ]);
  const names = await userNames(creatorRows.map((r) => r.createdById));
  return {
    clients: clients.flatMap((c) => (c.clientCompany ? [c.clientCompany] : [])),
    creators: [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** One link of the tenant with its candidates in order, creator and unlock count (for linkState); null if not ours. */
export async function getShareLink(tenantId: string, id: string) {
  const link = await prisma.shareLink.findFirst({
    where: { id, tenantId },
    include: { candidates: { orderBy: { position: "asc" }, include: { candidate: { select: { id: true, code: true, nameLatin: true, nameNative: true, nameKana: true } } } } },
  });
  if (!link) return null;
  const [creator, unlockCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: link.createdById }, select: { id: true, name: true, email: true } }),
    prisma.viewEvent.count({ where: { shareLinkId: link.id, type: "unlock" } }),
  ]);
  return { ...link, creator, unlockCount, state: linkState(link, unlockCount) };
}
export type ShareLinkDetail = NonNullable<Awaited<ReturnType<typeof getShareLink>>>;

/** Candidates offered by the wizard's picker: every non-archived candidate of the tenant (filtering is client-side). */
export function pickerCandidates(tenantId: string) {
  return prisma.candidate.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, code: true, nameLatin: true, nameNative: true, nameKana: true, gender: true, dob: true, nationality: true, jlpt: true, status: true, tags: true, _count: { select: { videos: true } } },
  });
}

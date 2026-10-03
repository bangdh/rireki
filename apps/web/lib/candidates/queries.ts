// Prisma reads of the candidates lane. Every query is scoped by tenantId; ids from the URL are re-checked with it.
import { prisma, type Prisma } from "@rireki/db";
import { subDays } from "date-fns";
import { linkState } from "@/lib/shares/link";
import { linkTotals } from "@/lib/shares/stats";
import type { ListQuery } from "./schemas";

export function listWhere(tenantId: string, q: ListQuery): Prisma.CandidateWhereInput {
  const fields = ["code", "nameKana", "nameLatin", "nameNative"] as const;
  return {
    tenantId,
    ...(q.status ? { status: q.status } : { archivedAt: null }), // archived rows show only with ?status=archived
    ...(q.q ? { OR: fields.map((f) => ({ [f]: { contains: q.q, mode: "insensitive" as const } })) } : {}), // TODO(phase2): pg_trgm, phone numbers inside cv
    ...(q.nationality ? { nationality: q.nationality } : {}),
    ...(q.job ? { tags: { has: q.job } } : {}),
    ...(q.jlpt ? { jlpt: q.jlpt } : {}),
    ...(q.video === "1" ? { videos: { some: {} } } : q.video === "0" ? { videos: { none: {} } } : {}),
  };
}

export async function listCandidates(tenantId: string, q: ListQuery) {
  const where = listWhere(tenantId, q);
  const [rows, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (q.page - 1) * q.per,
      take: q.per,
      select: {
        id: true, code: true, nameKana: true, nameLatin: true, nameNative: true, dob: true, gender: true, nationality: true, status: true, jlpt: true, tags: true,
        photoKey: true, updatedAt: true, _count: { select: { videos: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);
  return { rows, total };
}

/** Header counts of the list page: total · with video · updated this week (archived excluded). */
export async function candidateCounts(tenantId: string) {
  const live = { tenantId, archivedAt: null };
  const [total, withVideo, updatedWeek] = await Promise.all([
    prisma.candidate.count({ where: live }),
    prisma.candidate.count({ where: { ...live, videos: { some: {} } } }),
    prisma.candidate.count({ where: { ...live, updatedAt: { gte: subDays(new Date(), 7) } } }),
  ]);
  return { total, withVideo, updatedWeek };
}

/** Distinct internal tags of the tenant (job filter options). TODO(phase2): unnest() in SQL once tenants have thousands of rows. */
export async function listTags(tenantId: string): Promise<string[]> {
  const rows = await prisma.candidate.findMany({ where: { tenantId, archivedAt: null }, select: { tags: true } });
  return [...new Set(rows.flatMap((r) => r.tags))].sort();
}

/** Display names of users by id in one findMany (added by / updated by / notes / activity). */
export async function userNames(ids: ReadonlyArray<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

export const getCandidate = (tenantId: string, id: string) => prisma.candidate.findFirst({ where: { id, tenantId } });

/** Everything the detail page shows besides the activity merge: candidate, media, links and this CV's view numbers. */
export async function getCandidateDetail(tenantId: string, id: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { id, tenantId },
    include: {
      videos: { orderBy: { position: "asc" } },
      documents: { orderBy: [{ createdAt: "asc" }, { name: "asc" }] },
      shareLinks: { include: { shareLink: true }, orderBy: { shareLink: { createdAt: "desc" } } },
    },
  });
  if (!candidate) return null;
  const openCv = { tenantId, candidateId: id, type: "open_cv" } as const;
  const [views, uniqueViewers, viewsByLink, uniqueByLinkRows, lastView, plays, totals] = await Promise.all([
    prisma.viewEvent.count({ where: openCv }),
    prisma.viewEvent.findMany({ where: { ...openCv, viewerId: { not: null } }, distinct: ["viewerId"], select: { viewerId: true } }),
    prisma.viewEvent.groupBy({ by: ["shareLinkId"], where: openCv, _count: { _all: true } }),
    prisma.viewEvent.findMany({ where: { ...openCv, viewerId: { not: null } }, distinct: ["shareLinkId", "viewerId"], select: { shareLinkId: true } }),
    prisma.viewEvent.findFirst({ where: openCv, orderBy: { createdAt: "desc" }, include: { viewer: { select: { name: true } }, shareLink: { select: { clientCompany: true } } } }),
    prisma.viewEvent.findMany({ where: { tenantId, candidateId: id, type: "play_video" }, select: { meta: true } }),
    linkTotals(tenantId, candidate.shareLinks.map((s) => s.shareLinkId)),
  ]);
  // plays per video: the viewer API logs { videoId } (media/client lanes); the seed only has { title }
  const playsOf = (v: { id: string; title: string }) =>
    plays.filter((p) => p.meta && typeof p.meta === "object" && !Array.isArray(p.meta) && (p.meta.videoId === v.id || p.meta.title === v.title)).length;
  const uniqueByLink = new Map<string, number>();
  for (const r of uniqueByLinkRows) uniqueByLink.set(r.shareLinkId, (uniqueByLink.get(r.shareLinkId) ?? 0) + 1);
  const links = candidate.shareLinks.map(({ shareLink }) => ({
    ...shareLink,
    state: linkState(shareLink, totals.get(shareLink.id)?.unlocks ?? 0), // expiry and view cap are derived, as on /shares
    views: viewsByLink.find((v) => v.shareLinkId === shareLink.id)?._count._all ?? 0,
    unique: uniqueByLink.get(shareLink.id) ?? 0,
  }));
  return { candidate, links, playsOf, stats: { views, unique: uniqueViewers.length, activeLinks: links.filter((l) => l.state === "active").length, lastView } };
}

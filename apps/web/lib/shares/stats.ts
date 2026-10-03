// Tracking aggregates for app/shares.html, app/share-detail.html and (at integration) the dashboard: one $queryRaw per
// aggregate, ::int casts (no BigInt), days grouped in Asia/Tokyo because the clients who view are in Japan.
import { prisma, Prisma } from "@rireki/db";

export type LinkTotals = { shareLinkId: string; views: number; viewers: number; unlocks: number; lastAt: Date | null };

/** Per link: views = open_cv, distinct viewers, unlocks (for linkState's view cap) and the last activity. */
export async function linkTotals(tenantId: string, shareLinkIds: string[]): Promise<Map<string, LinkTotals>> {
  if (shareLinkIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<LinkTotals[]>`
    SELECT "shareLinkId",
      count(*) FILTER (WHERE type = 'open_cv')::int AS views,
      count(DISTINCT "viewerId") FILTER (WHERE type = 'open_cv')::int AS viewers,
      count(*) FILTER (WHERE type = 'unlock')::int AS unlocks,
      max("createdAt") FILTER (WHERE type <> 'failed_password') AS "lastAt"
    FROM "ViewEvent"
    WHERE "tenantId" = ${tenantId} AND "shareLinkId" IN (${Prisma.join(shareLinkIds)})
    GROUP BY "shareLinkId"`;
  return new Map(rows.map((r) => [r.shareLinkId, r]));
}

export type LinkKpis = {
  total: number;
  today: number;
  uniqueViewers: number;
  avgSec: number | null;
  plays: number;
  avgProgress: number | null;
  interested: number;
  longest: { durationSec: number | null; candidate: { nameNative: string | null; nameLatin: string } | null } | null;
};

/** The four KPI cards of the tracking page. "today" is the JST calendar day. */
export async function linkKpis(tenantId: string, shareLinkId: string): Promise<LinkKpis> {
  const [[row], longest] = await Promise.all([
    prisma.$queryRaw<Omit<LinkKpis, "longest">[]>`
      SELECT
        count(*) FILTER (WHERE type = 'open_cv')::int AS total,
        count(*) FILTER (WHERE type = 'open_cv' AND "createdAt" >= date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo')::int AS today,
        count(DISTINCT "viewerId") FILTER (WHERE type = 'open_cv')::int AS "uniqueViewers",
        avg("durationSec") FILTER (WHERE type = 'open_cv')::int AS "avgSec",
        count(*) FILTER (WHERE type = 'play_video')::int AS plays,
        avg((meta->>'progress')::numeric) FILTER (WHERE type = 'play_video' AND meta->>'progress' ~ '^[0-9.]+$')::int AS "avgProgress",
        count(*) FILTER (WHERE type = 'interest')::int AS interested
      FROM "ViewEvent" WHERE "tenantId" = ${tenantId} AND "shareLinkId" = ${shareLinkId}`,
    prisma.viewEvent.findFirst({
      where: { tenantId, shareLinkId, type: "open_cv", durationSec: { not: null } },
      orderBy: { durationSec: "desc" },
      select: { durationSec: true, candidate: { select: { nameNative: true, nameLatin: true } } },
    }),
  ]);
  return { ...row, longest };
}

/** open_cv per JST day since `from`, for one link or the whole tenant (dashboard). Days without views are absent. */
export function viewsPerDay(tenantId: string, { shareLinkId, from }: { shareLinkId?: string; from: Date }) {
  return prisma.$queryRaw<{ day: string; views: number }[]>`
    SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Tokyo'), 'YYYY-MM-DD') AS day, count(*)::int AS views
    FROM "ViewEvent"
    WHERE "tenantId" = ${tenantId} AND type = 'open_cv' AND "createdAt" >= ${from} ${shareLinkId ? Prisma.sql`AND "shareLinkId" = ${shareLinkId}` : Prisma.empty}
    GROUP BY 1 ORDER BY 1`;
}

/** open_cv count per candidate of a link, most viewed first. */
export async function viewsByCandidate(tenantId: string, shareLinkId: string): Promise<Map<string, number>> {
  const rows = await prisma.viewEvent.groupBy({
    by: ["candidateId"],
    where: { tenantId, shareLinkId, type: "open_cv", candidateId: { not: null } },
    _count: { _all: true },
  });
  return new Map(rows.flatMap((r) => (r.candidateId ? [[r.candidateId, r._count._all]] : [])));
}

export type ViewerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  userAgent: string | null;
  geo: string | null;
  ip: string | null;
  firstSeenAt: Date;
  views: number;
  interested: number;
  blocked: number;
};

/** The "Viewers" card: every viewer of the link with their view, interest and blocked-action counts. */
export function viewersSummary(shareLinkId: string) {
  return prisma.$queryRaw<ViewerSummary[]>`
    SELECT v.id, v.name, v.email, v."userAgent", v.geo, v.ip, v."firstSeenAt",
      count(e.id) FILTER (WHERE e.type = 'open_cv')::int AS views,
      count(e.id) FILTER (WHERE e.type = 'interest')::int AS interested,
      count(e.id) FILTER (WHERE e.type = 'blocked_action')::int AS blocked
    FROM "Viewer" v LEFT JOIN "ViewEvent" e ON e."viewerId" = v.id
    WHERE v."shareLinkId" = ${shareLinkId}
    GROUP BY v.id ORDER BY views DESC, v."firstSeenAt" ASC`;
}

/** The viewer log, newest first, optionally one viewer, 10 per page. */
export async function eventsPage(tenantId: string, shareLinkId: string, { viewerId, page, per = 10 }: { viewerId?: string; page: number; per?: number }) {
  const where = { tenantId, shareLinkId, ...(viewerId ? { viewerId } : {}) };
  const [rows, total] = await Promise.all([
    prisma.viewEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      include: { viewer: true, candidate: { select: { id: true, nameNative: true, nameLatin: true } } },
    }),
    prisma.viewEvent.count({ where }),
  ]);
  return { rows, total };
}

/** Every event of a link with viewer and candidate, oldest first (CSV export). */
export function allEvents(tenantId: string, shareLinkId: string) {
  return prisma.viewEvent.findMany({
    where: { tenantId, shareLinkId },
    orderBy: { createdAt: "asc" },
    include: { viewer: true, candidate: { select: { code: true } } },
  });
}

/** The dashboard's "Recent views": last N meaningful events across the tenant's links. */
export function recentEvents(tenantId: string, take = 20) {
  return prisma.viewEvent.findMany({
    where: { tenantId, type: { in: ["open_cv", "play_video", "interest", "download"] } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      viewer: { select: { name: true, email: true, userAgent: true, geo: true } },
      shareLink: { select: { id: true, name: true, clientCompany: true } },
      candidate: { select: { id: true, nameNative: true, nameLatin: true, nameKana: true } },
    },
  });
}

// app/dashboard.html numbers: KPIs, 14-day chart, recent views, expiring links, attention counts and team activity,
// all scoped by tenantId and fetched in one Promise.all (plus one round of name lookups for the activity rows).
import { prisma } from "@rireki/db";
import { startOfMonth, subDays } from "date-fns";
import { isShownAction, type AuditRow } from "./activity";
import { AUDIT_LABEL, bucketByDay } from "./format";
import { userNames } from "./queries";

export async function getDashboard(tenantId: string) {
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const since14 = subDays(now, 13);
  since14.setHours(0, 0, 0, 0);
  const live = { tenantId, archivedAt: null };
  const openCv = { tenantId, type: "open_cv" } as const;
  const [candidates, newThisMonth, withVideo, noVideo, noKana, activeLinks, expiring, viewsWeek, viewsPrevWeek, views14, unique14, recent, importsWaiting, audit] =
    await Promise.all([
      prisma.candidate.count({ where: live }),
      prisma.candidate.count({ where: { ...live, createdAt: { gte: startOfMonth(now) } } }),
      prisma.candidate.count({ where: { ...live, videos: { some: {} } } }),
      prisma.candidate.count({ where: { ...live, videos: { none: {} } } }),
      prisma.candidate.count({ where: { ...live, nameKana: "" } }),
      prisma.shareLink.count({ where: { tenantId, status: "active" } }),
      prisma.shareLink.findMany({
        where: { tenantId, status: "active", expiresAt: { gte: now, lte: subDays(now, -14) } },
        orderBy: { expiresAt: "asc" },
        take: 3,
        select: { id: true, name: true, expiresAt: true, _count: { select: { candidates: true } } },
      }),
      prisma.viewEvent.count({ where: { ...openCv, createdAt: { gte: weekAgo } } }),
      prisma.viewEvent.count({ where: { ...openCv, createdAt: { gte: subDays(now, 14), lt: weekAgo } } }),
      prisma.viewEvent.findMany({ where: { ...openCv, createdAt: { gte: since14 } }, select: { createdAt: true } }),
      prisma.viewEvent.findMany({ where: { ...openCv, createdAt: { gte: since14 }, viewerId: { not: null } }, distinct: ["viewerId"], select: { viewerId: true } }),
      prisma.viewEvent.findMany({
        where: openCv,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          viewer: { select: { name: true, email: true, userAgent: true, geo: true } },
          shareLink: { select: { id: true, name: true } },
          candidate: { select: { id: true, nameNative: true, nameLatin: true, nameKana: true } },
        },
      }),
      prisma.importJob.count({ where: { tenantId, candidateId: null } }),
      prisma.auditLog.findMany({ where: { tenantId, action: { in: Object.keys(AUDIT_LABEL) } }, orderBy: { createdAt: "desc" }, take: 4 }),
    ]);

  // Names for the activity rows: actors, the candidates and the share links they touched.
  const rows: AuditRow[] = audit.flatMap((a) =>
    isShownAction(a.action) ? [{ id: a.id, userId: a.userId, action: a.action, meta: a.meta && typeof a.meta === "object" && !Array.isArray(a.meta) ? a.meta : {}, createdAt: a.createdAt }] : [],
  );
  const targets = (prefix: string) => audit.filter((a) => a.action.startsWith(prefix) && a.target).map((a) => a.target as string);
  const [names, targetCandidates, targetLinks] = await Promise.all([
    userNames(audit.map((a) => a.userId)),
    prisma.candidate.findMany({ where: { tenantId, id: { in: [...targets("candidate."), ...targets("video."), ...targets("document.")] } }, select: { id: true, nameNative: true, nameLatin: true } }),
    prisma.shareLink.findMany({ where: { tenantId, id: { in: targets("share_link.") } }, select: { id: true, name: true } }),
  ]);
  const activity = rows.map((row, i) => {
    const target = audit[i].target;
    const c = targetCandidates.find((x) => x.id === target);
    const l = targetLinks.find((x) => x.id === target);
    return { row, who: names.get(row.userId ?? "") ?? null, target: c ? { name: c.nameNative || c.nameLatin, href: `/candidates/${c.id}` } : l ? { name: l.name, href: `/shares/${l.id}` } : null };
  });

  return {
    kpis: {
      candidates,
      newThisMonth,
      withVideo,
      videoPct: candidates ? Math.round((withVideo / candidates) * 100) : 0,
      noVideo,
      noKana,
      activeLinks,
      expiringCount: expiring.length,
      viewsWeek,
      viewsDelta: viewsPrevWeek ? Math.round(((viewsWeek - viewsPrevWeek) / viewsPrevWeek) * 100) : null,
      importsWaiting,
    },
    chart: { ...bucketByDay(views14.map((v) => v.createdAt), 14, now), total: views14.length, unique: unique14.length },
    recent,
    expiring,
    activity,
  };
}

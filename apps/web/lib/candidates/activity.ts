// Audit events of the candidates lane (AuditLog rows with a Json meta) and the candidate Activity tab merge.
import { prisma, type Prisma } from "@rireki/db";
import { AUDIT_LABEL, type AuditAction } from "./format";

export type EventMeta = Record<string, string | number | boolean | null | undefined>;

/** candidate.create {code,fileName?} · candidate.status {from,to} · candidate.note {body} · video.rename {title} · document.download {name} … */
export async function logEvent(e: { tenantId: string; userId?: string | null; action: string; target?: string | null; meta?: EventMeta }): Promise<void> {
  await prisma.auditLog.create({
    data: { tenantId: e.tenantId, userId: e.userId ?? null, action: e.action, target: e.target ?? null, meta: e.meta as Prisma.InputJsonValue | undefined },
  });
}

export type AuditRow = { id: string; userId: string | null; action: AuditAction; target: string | null; meta: Record<string, unknown>; createdAt: Date };

export const isShownAction = (action: string): action is AuditAction => action in AUDIT_LABEL;
const metaOf = (meta: Prisma.JsonValue | null): Record<string, unknown> => (meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {});

export type Activity =
  | { kind: "view"; at: Date; who: string | null; company: string | null; played: { title: string; progress: number | null } | null }
  | { kind: "interest"; at: Date; who: string | null }
  | { kind: "audit"; at: Date; row: AuditRow }
  | { kind: "link"; at: Date; userId: string; name: string; linkId: string };

/**
 * Activity tab = audit rows about the candidate (video uploads included: video.upload) ∪ view events (viewer + client
 * company; a play_video is attached to the viewer's preceding open_cv, as in the mockup) ∪ share links the candidate was
 * added to; newest first.
 */
export async function candidateActivity(tenantId: string, candidateId: string, max = 50): Promise<Activity[]> {
  const [audit, events, links] = await Promise.all([
    prisma.auditLog.findMany({ where: { tenantId, target: candidateId, action: { in: Object.keys(AUDIT_LABEL) } }, orderBy: { createdAt: "desc" }, take: max }),
    prisma.viewEvent.findMany({
      where: { tenantId, candidateId, type: { in: ["open_cv", "play_video", "interest"] } },
      orderBy: { createdAt: "asc" },
      include: { viewer: { select: { name: true } }, shareLink: { select: { clientCompany: true } } },
    }),
    prisma.shareLinkCandidate.findMany({
      where: { candidateId, shareLink: { tenantId } },
      select: { shareLink: { select: { id: true, name: true, createdById: true, createdAt: true } } },
    }),
  ]);

  const items: Activity[] = [];
  const openByViewer = new Map<string, Extract<Activity, { kind: "view" }>>();
  for (const e of events) {
    const who = e.viewer?.name ?? null;
    if (e.type === "open_cv") {
      const item: Activity = { kind: "view", at: e.createdAt, who, company: e.shareLink.clientCompany, played: null };
      items.push(item);
      if (e.viewerId) openByViewer.set(e.viewerId, item);
    } else if (e.type === "play_video") {
      const meta = metaOf(e.meta);
      const played = { title: typeof meta.title === "string" ? meta.title : "", progress: typeof meta.progress === "number" ? meta.progress : null };
      const open = e.viewerId ? openByViewer.get(e.viewerId) : undefined;
      if (open && !open.played) open.played = played;
      else items.push({ kind: "view", at: e.createdAt, who, company: e.shareLink.clientCompany, played });
    } else items.push({ kind: "interest", at: e.createdAt, who });
  }
  for (const a of audit) if (isShownAction(a.action)) items.push({ kind: "audit", at: a.createdAt, row: { id: a.id, userId: a.userId, action: a.action, target: a.target, meta: metaOf(a.meta), createdAt: a.createdAt } });
  for (const { shareLink: l } of links) items.push({ kind: "link", at: l.createdAt, userId: l.createdById, name: l.name, linkId: l.id });
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, max);
}

/** Internal notes = candidate.note audit rows, newest first. TODO(phase2): edit/delete. */
export async function candidateNotes(tenantId: string, candidateId: string) {
  const rows = await prisma.auditLog.findMany({ where: { tenantId, target: candidateId, action: "candidate.note" }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, userId: r.userId, body: String(metaOf(r.meta).body ?? ""), createdAt: r.createdAt }));
}

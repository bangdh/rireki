import { prisma } from "@rireki/db";
import { endOfDay, parseISO } from "date-fns";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Newest AuditLog rows of a tenant up to the end of ?date (YYYY-MM-DD), with the actor's name. */
export async function auditRows(tenantId: string, date: string | undefined, take: number) {
  const until = date && DATE_RE.test(date) ? endOfDay(parseISO(date)) : undefined;
  const rows = await prisma.auditLog.findMany({ where: { tenantId, ...(until && { createdAt: { lte: until } }) }, orderBy: { createdAt: "desc" }, take });
  const userIds = [...new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({ ...r, actor: (r.userId && names.get(r.userId)) || "—" }));
}

/** Badge class of an action: destructive → danger, members/settings → warning, links → info, the rest plain (mockup colours). */
export function auditBadge(action: string) {
  if (/\.(revoke|remove|suspend|cancel_invite|delete)$/.test(action)) return "badge badge-danger";
  if (/^(member|settings)\./.test(action)) return "badge badge-warning";
  if (/^(link|candidate|video)\./.test(action)) return "badge badge-info";
  return "badge";
}

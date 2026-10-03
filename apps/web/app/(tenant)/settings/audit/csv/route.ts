import { requireRole } from "@/lib/tenant";
import { auditRows } from "../query";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** CSV export of the audit log (Admin only → 403 for the User role): time,actor,action,target,ip. */
export async function GET(req: Request) {
  const { tenant } = await requireRole("admin");
  const date = new URL(req.url).searchParams.get("date") ?? undefined;
  const rows = await auditRows(tenant.id, date, 10_000);
  const csv = ["time,actor,action,target,ip", ...rows.map((r) => [r.createdAt.toISOString(), r.actor, r.action, r.target, r.ip].map(cell).join(","))].join("\n");
  return new Response(`${csv}\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="audit-${tenant.slug}${date ? `-${date}` : ""}.csv"` },
  });
}

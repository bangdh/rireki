import { prisma } from "@rireki/db";
import { metaOf } from "@/lib/shares/events";
import { csvRow, describeUserAgent } from "@/lib/shares/format";
import { allEvents } from "@/lib/shares/stats";
import { audit, requireRole } from "@/lib/tenant";

/** CSV of every tracking event of a link (Admin only → 403 for the User role): time, viewer, email, type, candidate code, durationSec, device, ip, geo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireRole("admin");
  const link = await prisma.shareLink.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true } });
  if (!link) return new Response("Not found", { status: 404 });
  const events = await allEvents(tenant.id, link.id);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const lines = events.map((e) => {
    const m = metaOf(e.meta); // failed_password rows carry ip/ua/geo of the anonymous attempt
    return csvRow([
      e.createdAt.toISOString(),
      e.viewer?.name ?? "",
      e.viewer?.email ?? "",
      e.type,
      e.candidate?.code ?? "",
      e.durationSec ?? "",
      describeUserAgent(e.viewer?.userAgent ?? str(m.ua ?? m.userAgent)),
      e.viewer?.ip ?? str(m.ip),
      e.viewer?.geo ?? str(m.geo),
    ]);
  });
  await audit("share_link.export", link.id);
  return new Response(`${["time,viewer,email,type,candidate,durationSec,device,ip,geo", ...lines].join("\n")}\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="tracking-${link.id}.csv"` },
  });
}

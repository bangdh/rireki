import { prisma } from "@rireki/db";
import { subDays } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/tenant";
import { storageGb } from "@/lib/usage";

// app/settings-company.html — Usage tab (phase 1 is free: no plans). Real counts of this tenant.
export default async function UsageSettingsPage() {
  const { tenant } = await requireRole("admin");
  const t = await getTranslations();
  const tenantId = tenant.id;
  const [candidates, withVideo, videos, gb, roles, invited, links, views30d] = await Promise.all([
    prisma.candidate.count({ where: { tenantId, archivedAt: null } }),
    prisma.candidate.count({ where: { tenantId, archivedAt: null, videos: { some: {} } } }),
    prisma.video.count({ where: { tenantId } }),
    storageGb(tenantId),
    prisma.member.groupBy({ by: ["role"], where: { organizationId: tenantId }, _count: true }),
    prisma.invitation.count({ where: { organizationId: tenantId, status: "pending", expiresAt: { gt: new Date() } } }),
    prisma.shareLink.count({ where: { tenantId, status: "active" } }),
    prisma.viewEvent.count({ where: { tenantId, type: "open_cv", createdAt: { gte: subDays(new Date(), 30) } } }),
  ]);
  const count = (...names: string[]) => roles.filter((r) => names.includes(r.role)).reduce((n, r) => n + r._count, 0);
  const admins = count("owner", "admin");
  const users = count("member");
  return (
    <div className="stack-lg">
      <div className="callout callout-success">
        <Icon name="check-circle" />
        <div><b>{t("settings.free_t")}</b><br /><span>{t("settings.free_d")}</span></div>
      </div>
      <section className="card">
        <div className="card-header">
          <h2>{t("settings.usage")}</h2>
          <span className="small muted">{t("settings.usage_d")}</span>
        </div>
        <div className="card-body grid grid-4">
          <div className="kpi"><span className="label">{t("cand.title")}</span><span className="value">{candidates}</span><span className="delta"><span>{withVideo} <span>{t("cand.with_video")}</span></span></span></div>
          <div className="kpi"><span className="label">{t("settings.video_storage")}</span><span className="value">{gb.toFixed(1)} GB</span><span className="delta"><span>{videos} <span>{t("viewer.videos")}</span></span></span></div>
          <div className="kpi">
            <span className="label">{t("nav.members")}</span><span className="value">{admins + users}</span>
            <span className="delta"><span>{admins} <span>{t("role.admins")}</span> · {users} <span>{t("role.users")}</span> · {invited} <span>{t("common.invited_lc")}</span></span></span>
          </div>
          <div className="kpi"><span className="label">{t("dash.kpi_links")}</span><span className="value">{links}</span><span className="delta"><span>{views30d} <span>{t("shares.views_30d")}</span></span></span></div>
        </div>
      </section>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";

// app/settings-company.html — Usage tab (phase 1 is free: no plans). TODO(auth-tenant): counts from Prisma + S3 storage size.
export default async function UsageSettingsPage() {
  const t = await getTranslations();
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
          <div className="kpi"><span className="label">{t("cand.title")}</span><span className="value">182</span><span className="delta"><span>141 <span>{t("cand.with_video")}</span></span></span></div>
          <div className="kpi"><span className="label">{t("settings.video_storage")}</span><span className="value">12.4 GB</span><span className="delta"><span>263 <span>{t("viewer.videos")}</span></span></span></div>
          <div className="kpi">
            <span className="label">{t("nav.members")}</span><span className="value">8</span>
            <span className="delta"><span>2 <span>{t("role.admins")}</span> · 5 <span>{t("role.users")}</span> · 1 <span>{t("common.invited_lc")}</span></span></span>
          </div>
          <div className="kpi"><span className="label">{t("dash.kpi_links")}</span><span className="value">14</span><span className="delta"><span>226 <span>{t("shares.views_30d")}</span></span></span></div>
        </div>
      </section>
    </div>
  );
}

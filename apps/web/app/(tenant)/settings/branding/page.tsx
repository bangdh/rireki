import { getTranslations } from "next-intl/server";
import { StaticForm } from "@/components/StaticForm";
import { LINK, TENANT } from "@/lib/sample";

// app/settings-company.html — Branding tab. TODO(auth-tenant): logo upload (presigned PUT), brandColor/footer in TenantSettings.
export default async function BrandingSettingsPage() {
  const t = await getTranslations();
  return (
    <div className="stack-lg">
      <StaticForm className="card">
        <div className="card-header">
          <h2>{t("settings.branding")}</h2>
          <span className="small muted">{t("settings.branding_d")}</span>
        </div>
        <div className="card-body grid grid-2">
          <div className="stack">
            <div className="field">
              <span className="label">{t("settings.brand_logo")}</span>
              <div className="row">
                <span className="avatar" style={{ width: "56px", height: "56px", borderRadius: "12px", background: "var(--primary-soft)", color: "var(--primary-ink)", fontSize: "18px" }}>{TENANT.initials}</span>
                <button className="btn btn-sm" type="button">{t("common.upload")}</button>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="brandColor">{t("settings.brand_color")}</label>
              <div className="row">
                <input id="brandColor" name="brandColor" type="color" style={{ width: "44px", height: "38px", border: "1px solid var(--border-strong)", borderRadius: "8px", background: "var(--surface)" }} defaultValue="#2455a4" />
                <input className="input mono" style={{ width: "120px" }} defaultValue="#2455A4" aria-label={t("settings.brand_color")} />
              </div>
            </div>
            <div className="field"><label className="label" htmlFor="displayName">{t("settings.brand_name_display")}</label><input id="displayName" name="displayName" className="input" defaultValue={TENANT.name} /></div>
            <div className="field"><label className="label" htmlFor="footer">{t("settings.brand_footer")}</label><input id="footer" name="footer" className="input" defaultValue={TENANT.footer} /></div>
            <label className="switch"><input type="checkbox" name="poweredBy" defaultChecked /><span className="track"></span><span>{t("settings.powered")}</span></label>
          </div>
          <div className="field">
            <span className="label">{t("common.preview")}</span>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="viewer-header" style={{ position: "static" }}>
                <div className="container" style={{ paddingInline: "14px" }}>
                  <div className="viewer-brand">
                    <span className="logo">{TENANT.initials}</span>
                    <div><div className="n">{TENANT.name}</div><div className="s">{LINK.name}</div></div>
                  </div>
                </div>
              </div>
              <div className="card-body small muted" style={{ padding: "14px" }}>
                <div className="cand-card" style={{ pointerEvents: "none" }}>
                  <span className="avatar-photo">NA</span>
                  <div><div className="n">グエン・バン・アン</div><div className="k">Nguyễn Văn An · SV000182</div></div>
                </div>
              </div>
              <div className="xs faint" style={{ padding: "8px 14px", borderTop: "1px solid var(--border)" }}>{TENANT.legalName} · Hà Nội · Powered by Rireki</div>
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </StaticForm>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/tenant";
import { saveBranding } from "../company/actions";
import { LogoForm, LogoUpload } from "../company/LogoUpload";
import { Feedback } from "../Feedback";
import { Logo } from "../Logo";
import { ColorField } from "./ColorField";

// app/settings-company.html — Branding tab: brandColor/footer/logoKey in TenantSettings, displayName/poweredBy in Organization.metadata.
// The preview mirrors the client viewer header with the saved values; link and candidate are illustrative, as in the mockup.
const PREVIEW = { link: "ヤマト建設様 溶接候補者", candidate: { initials: "NA", kana: "グエン・バン・アン", line: "Nguyễn Văn An · SV000182" } };

export default async function BrandingSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { tenant } = await requireRole("admin");
  const t = await getTranslations();
  const { settings, meta } = tenant;
  const displayName = meta.displayName ?? tenant.name;
  const footer = [settings.footer, meta.poweredBy && "Powered by Rireki"].filter(Boolean).join(" · ");
  return (
    <div className="stack-lg">
      <Feedback saved={saved === "1"} />
      <form className="card" action={saveBranding}>
        <div className="card-header">
          <h2>{t("settings.branding")}</h2>
          <span className="small muted">{t("settings.branding_d")}</span>
        </div>
        <div className="card-body grid grid-2">
          <div className="stack">
            <div className="field">
              <span className="label">{t("settings.brand_logo")}</span>
              <LogoUpload label={t("common.upload")} className="row">
                <Logo tenant={tenant} size={56} />
              </LogoUpload>
            </div>
            <div className="field">
              <label className="label" htmlFor="brandColor">{t("settings.brand_color")}</label>
              <ColorField name="brandColor" defaultValue={settings.brandColor ?? "#2455A4"} label={t("settings.brand_color")} />
            </div>
            <div className="field"><label className="label" htmlFor="displayName">{t("settings.brand_name_display")}</label><input id="displayName" name="displayName" className="input" defaultValue={displayName} required /></div>
            <div className="field"><label className="label" htmlFor="footer">{t("settings.brand_footer")}</label><input id="footer" name="footer" className="input" defaultValue={settings.footer ?? ""} /></div>
            <label className="switch"><input type="checkbox" name="poweredBy" defaultChecked={meta.poweredBy} /><span className="track"></span><span>{t("settings.powered")}</span></label>
          </div>
          <div className="field">
            <span className="label">{t("common.preview")}</span>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="viewer-header" style={{ position: "static" }}>
                <div className="container" style={{ paddingInline: "14px" }}>
                  <div className="viewer-brand">
                    <Logo tenant={tenant} size={32} radius={8} fontSize={13} className="logo" style={{ background: settings.brandColor ?? undefined, color: settings.brandColor ? "#fff" : undefined }} />
                    <div><div className="n">{displayName}</div><div className="s">{PREVIEW.link}</div></div>
                  </div>
                </div>
              </div>
              <div className="card-body small muted" style={{ padding: "14px" }}>
                <div className="cand-card" style={{ pointerEvents: "none" }}>
                  <span className="avatar-photo">{PREVIEW.candidate.initials}</span>
                  <div><div className="n">{PREVIEW.candidate.kana}</div><div className="k">{PREVIEW.candidate.line}</div></div>
                </div>
              </div>
              {footer && <div className="xs faint" style={{ padding: "8px 14px", borderTop: "1px solid var(--border)" }}>{footer}</div>}
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </form>
      <LogoForm back="branding" />
    </div>
  );
}

import { formatCandidateCode } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { LANGS } from "@/i18n/config";
import { COUNTRIES, TIMEZONES } from "@/lib/auth-schemas";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/tenant";
import { Feedback } from "../Feedback";
import { Logo } from "../Logo";
import { saveCodeFormat, saveCompany } from "./actions";
import { LogoForm, LogoUpload } from "./LogoUpload";

// app/settings-company.html — Company tab: Organization.name + TenantSettings + Organization.metadata (phone, address, timezone).
const COUNTRY_LABEL: Record<(typeof COUNTRIES)[number], string> = { VN: "🇻🇳 Vietnam", MM: "🇲🇲 Myanmar", BD: "🇧🇩 Bangladesh", ID: "🇮🇩 Indonesia", other: "" };
const TZ_LABEL: Record<(typeof TIMEZONES)[number], string> = {
  "Asia/Ho_Chi_Minh": "Asia/Ho_Chi_Minh (UTC+7)",
  "Asia/Yangon": "Asia/Yangon (UTC+6:30)",
  "Asia/Dhaka": "Asia/Dhaka (UTC+6)",
  "Asia/Jakarta": "Asia/Jakarta (UTC+7)",
  "Asia/Tokyo": "Asia/Tokyo (UTC+9)",
};

export default async function CompanySettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const { tenant } = await requireRole("admin");
  const t = await getTranslations();
  const { settings, meta } = tenant;
  const nextCode = formatCandidateCode(settings.codePrefix, settings.nextCode);
  return (
    <div className="stack-lg">
      <Feedback saved={saved === "1"} />
      <form className="card" action={saveCompany}>
        <div className="card-header"><h2>{t("settings.company_profile")}</h2></div>
        <div className="card-body grid-side-main">
          <LogoUpload label={t("settings.change_logo")} className="stack" style={{ gap: "8px", alignItems: "center" }}>
            <Logo tenant={tenant} size={88} radius={16} fontSize={26} className="avatar avatar-lg" />
          </LogoUpload>
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="nameLocal">{t("settings.name_local")}</label><input id="nameLocal" name="nameLocal" className="input" defaultValue={tenant.name} required /></div>
            <div className="field"><label className="label" htmlFor="nameJa">{t("settings.name_ja")}</label><input id="nameJa" name="nameJa" className="input" defaultValue={settings.nameJa ?? ""} /></div>
            <div className="field"><label className="label" htmlFor="nameEn">{t("settings.name_en")}</label><input id="nameEn" name="nameEn" className="input" defaultValue={settings.nameEn ?? ""} /></div>
            <div className="field">
              <label className="label" htmlFor="country">{t("signup.country")}</label>
              <select id="country" name="country" className="select" defaultValue={settings.country ?? "VN"}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c === "other" ? t("common.other") : COUNTRY_LABEL[c]}</option>)}
              </select>
            </div>
            <div className="field"><label className="label" htmlFor="licenseNo">{t("settings.license")}</label><input id="licenseNo" name="licenseNo" className="input" defaultValue={settings.licenseNo ?? ""} /></div>
            <div className="field"><label className="label" htmlFor="phone">{t("form.phone")}</label><input id="phone" name="phone" className="input" defaultValue={meta.phone ?? ""} /></div>
            <div className="field span-2"><label className="label" htmlFor="address">{t("form.address")}</label><input id="address" name="address" className="input" defaultValue={meta.address ?? ""} /></div>
            <div className="field">
              <label className="label" htmlFor="defaultLang">{t("settings.default_lang")}</label>
              <select id="defaultLang" name="defaultLang" className="select" defaultValue={settings.defaultLang}>
                {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="timezone">{t("settings.timezone")}</label>
              <select id="timezone" name="timezone" className="select" defaultValue={meta.timezone}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{TZ_LABEL[tz]}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </form>
      <LogoForm back="company" />
      <section className="card">
        <div className="card-header"><h2>{t("settings.subdomain_t")}</h2></div>
        <div className="card-body stack">
          <div className="field" style={{ maxWidth: "420px" }}>
            <label className="label" htmlFor="slug">{t("signup.subdomain")}</label>
            {/* TODO(phase2): changing the subdomain */}
            <div className="input-group"><input id="slug" className="input mono" defaultValue={tenant.slug} readOnly /><span className="addon">.{env.APP_DOMAIN}</span></div>
          </div>
          <div className="callout callout-warning"><Icon name="alert" /><div>{t("settings.subdomain_warn")}</div></div>
        </div>
      </section>
      <form className="card" action={saveCodeFormat}>
        <div className="card-header"><h2>{t("settings.code_t")}</h2></div>
        <div className="card-body form-grid">
          <div className="field">
            <label className="label" htmlFor="codePrefix">{t("settings.code_prefix")}</label>
            <input id="codePrefix" name="prefix" className="input mono" maxLength={2} pattern="[A-Za-z]{2}" style={{ textTransform: "uppercase" }} defaultValue={settings.codePrefix} required />
            <span className="hint">{t("settings.code_prefix_hint")}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="nextCode">{t("settings.code_next")}</label>
            <input id="nextCode" name="nextCode" className="input mono" maxLength={6} pattern="[0-9]{1,6}" inputMode="numeric" defaultValue={String(settings.nextCode).padStart(6, "0")} required />
            <span className="hint">{t("settings.code_next_hint")}</span>
            {error === "code_next" && <span className="error-text">{t("settings.err_code_next")}</span>}
          </div>
          <div className="span-2 small muted"><span>{t("settings.code_preview")}</span> <code>{nextCode}</code>. <span>{t("settings.code_rule")}</span></div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </form>
    </div>
  );
}

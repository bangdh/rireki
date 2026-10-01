import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { StaticForm } from "@/components/StaticForm";
import { TENANT } from "@/lib/sample";

// app/settings-company.html — Company tab. TODO(auth-tenant): values from Organization + TenantSettings, Server Actions with zod.
export default async function CompanySettingsPage() {
  const t = await getTranslations();
  return (
    <div className="stack-lg">
      <StaticForm className="card">
        <div className="card-header"><h2>{t("settings.company_profile")}</h2></div>
        <div className="card-body grid-side-main">
          <div className="stack" style={{ gap: "8px", alignItems: "center" }}>
            <span className="avatar avatar-lg" style={{ width: "88px", height: "88px", fontSize: "26px", borderRadius: "16px", background: "var(--primary-soft)", color: "var(--primary-ink)" }}>{TENANT.initials}</span>
            <button className="btn btn-sm" type="button">{t("settings.change_logo")}</button>
          </div>
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="nameLocal">{t("settings.name_local")}</label><input id="nameLocal" name="nameLocal" className="input" defaultValue="Công ty CP Nhân lực Sao Việt" /></div>
            <div className="field"><label className="label" htmlFor="nameJa">{t("settings.name_ja")}</label><input id="nameJa" name="nameJa" className="input" defaultValue={TENANT.nameJa} /></div>
            <div className="field"><label className="label" htmlFor="nameEn">{t("settings.name_en")}</label><input id="nameEn" name="nameEn" className="input" defaultValue={TENANT.legalName} /></div>
            <div className="field">
              <label className="label" htmlFor="country">{t("signup.country")}</label>
              <select id="country" name="country" className="select" defaultValue="VN"><option value="VN">🇻🇳 Vietnam</option><option value="MM">🇲🇲 Myanmar</option><option value="BD">🇧🇩 Bangladesh</option><option value="ID">🇮🇩 Indonesia</option></select>
            </div>
            <div className="field"><label className="label" htmlFor="licenseNo">{t("settings.license")}</label><input id="licenseNo" name="licenseNo" className="input" defaultValue="1234/LĐTBXH-GP" /></div>
            <div className="field"><label className="label" htmlFor="phone">{t("form.phone")}</label><input id="phone" name="phone" className="input" defaultValue={TENANT.contact.phone} /></div>
            <div className="field span-2"><label className="label" htmlFor="address">{t("form.address")}</label><input id="address" name="address" className="input" defaultValue="Tầng 5, 25 Lê Đại Hành, Hai Bà Trưng, Hà Nội" /></div>
            <div className="field">
              <label className="label" htmlFor="defaultLang">{t("settings.default_lang")}</label>
              <select id="defaultLang" name="defaultLang" className="select" defaultValue="vi"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="ja">日本語</option><option value="my">မြန်မာ</option><option value="id">Bahasa Indonesia</option></select>
            </div>
            <div className="field">
              <label className="label" htmlFor="timezone">{t("settings.timezone")}</label>
              <select id="timezone" name="timezone" className="select"><option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option><option value="Asia/Yangon">Asia/Yangon (UTC+6:30)</option><option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option><option value="Asia/Jakarta">Asia/Jakarta (UTC+7)</option><option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option></select>
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </StaticForm>
      <section className="card">
        <div className="card-header"><h2>{t("settings.subdomain_t")}</h2></div>
        <div className="card-body stack">
          <div className="field" style={{ maxWidth: "420px" }}>
            <label className="label" htmlFor="slug">{t("signup.subdomain")}</label>
            <div className="input-group"><input id="slug" className="input mono" defaultValue={TENANT.slug} readOnly /><span className="addon">.rireki.app</span></div>
          </div>
          <div className="callout callout-warning"><Icon name="alert" /><div>{t("settings.subdomain_warn")}</div></div>
        </div>
      </section>
      <section className="card">
        <div className="card-header"><h2>{t("settings.code_t")}</h2></div>
        <div className="card-body form-grid">
          <div className="field">
            <label className="label" htmlFor="codePrefix">{t("settings.code_prefix")}</label>
            <input id="codePrefix" className="input mono" maxLength={2} pattern="[A-Z]{2}" style={{ textTransform: "uppercase" }} defaultValue={TENANT.nextCode.slice(0, 2)} />
            <span className="hint">{t("settings.code_prefix_hint")}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="nextCode">{t("settings.code_next")}</label>
            <input id="nextCode" className="input mono" maxLength={6} pattern="[0-9]{6}" inputMode="numeric" defaultValue={TENANT.nextCode.slice(2)} />
            <span className="hint">{t("settings.code_next_hint")}</span>
          </div>
          <div className="span-2 small muted"><span>{t("settings.code_preview")}</span> <code>{TENANT.nextCode}</code>. <span>{t("settings.code_rule")}</span></div>
        </div>
      </section>
    </div>
  );
}

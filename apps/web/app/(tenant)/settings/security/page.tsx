import { getTranslations } from "next-intl/server";
import { StaticForm } from "@/components/StaticForm";

// app/settings-company.html — Security & defaults tab. TODO(auth-tenant): TenantSettings.linkDefaults {password, viewOnly, identity, contact, expiryDays, level, locked[]}.
export default async function SecuritySettingsPage() {
  const t = await getTranslations();
  const lock = (checked = false) => (
    <label className="check small"><input type="checkbox" defaultChecked={checked} /><span>{t("settings.lock")}</span></label>
  );
  return (
    <div className="stack-lg">
      <section className="card">
        <div className="card-header"><h2>{t("settings.signin_security")}</h2></div>
        <div className="card-body stack">
          <div className="form-grid" style={{ maxWidth: "640px" }}>
            <div className="field">
              <label className="label" htmlFor="pwMin">{t("settings.pw_min")}</label>
              <select id="pwMin" className="select"><option>10</option><option>12</option><option>14</option></select>
            </div>
            <div className="field">
              <label className="label" htmlFor="session">{t("settings.session")}</label>
              <select id="session" className="select"><option>8 hours</option><option>1 hour</option><option>24 hours</option></select>
            </div>
          </div>
        </div>
      </section>
      <StaticForm className="card">
        <div className="card-header">
          <h2>{t("settings.link_defaults")}</h2>
          <span className="small muted">{t("settings.link_defaults_d")}</span>
        </div>
        <div className="card-body stack">
          <div className="row between">
            <label className="switch"><input type="checkbox" name="password" defaultChecked /><span className="track"></span><span>{t("settings.def_pw")}</span></label>{lock()}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="viewOnly" defaultChecked /><span className="track"></span><span>{t("settings.def_viewonly")}</span></label>{lock(true)}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="identity" defaultChecked /><span className="track"></span><span>{t("settings.def_identity")}</span></label>{lock()}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="contact" /><span className="track"></span><span>{t("settings.def_contact")}</span></label><span></span>
          </div>
          <div className="form-grid" style={{ maxWidth: "640px" }}>
            <div className="field">
              <label className="label" htmlFor="expiryDays">{t("settings.def_expiry")}</label>
              <select id="expiryDays" name="expiryDays" className="select" defaultValue="14"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="">{t("sharenew.no_expiry")}</option></select>
            </div>
            <div className="field">
              <label className="label" htmlFor="level">{t("settings.capture_level")}</label>
              <select id="level" name="level" className="select"><option value="strict">{t("settings.capture_strict")}</option><option value="standard">{t("settings.capture_standard")}</option></select>
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </StaticForm>
    </div>
  );
}

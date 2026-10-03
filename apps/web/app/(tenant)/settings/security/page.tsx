import { LinkDefaults } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/tenant";
import { Feedback } from "../Feedback";
import { saveLinkDefaults } from "./actions";

// app/settings-company.html — Security & defaults tab. The sign-in policy is global in phase 1 (shown disabled);
// TODO(phase2): per-tenant password length and session timeout.
const PASSWORD_MIN = 10;
const SESSION_DAYS = 7;

export default async function SecuritySettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { tenant } = await requireRole("admin");
  const t = await getTranslations();
  const parsed = LinkDefaults.safeParse(tenant.settings.linkDefaults);
  const d = parsed.success ? parsed.data : LinkDefaults.parse({});
  const lock = (name: string, checked: boolean) => (
    <label className="check small"><input type="checkbox" name={name} defaultChecked={checked} /><span>{t("settings.lock")}</span></label>
  );
  return (
    <div className="stack-lg">
      <Feedback saved={saved === "1"} />
      <section className="card">
        <div className="card-header"><h2>{t("settings.signin_security")}</h2></div>
        <div className="card-body stack">
          <div className="form-grid" style={{ maxWidth: "640px" }}>
            <div className="field">
              <label className="label" htmlFor="pwMin">{t("settings.pw_min")}</label>
              <select id="pwMin" className="select" disabled defaultValue={PASSWORD_MIN}><option value={PASSWORD_MIN}>{PASSWORD_MIN}</option></select>
            </div>
            <div className="field">
              <label className="label" htmlFor="session">{t("settings.session")}</label>
              <select id="session" className="select" disabled defaultValue={SESSION_DAYS}><option value={SESSION_DAYS}>{SESSION_DAYS} {t("common.days")}</option></select>
            </div>
          </div>
        </div>
      </section>
      <form className="card" action={saveLinkDefaults}>
        <div className="card-header">
          <h2>{t("settings.link_defaults")}</h2>
          <span className="small muted">{t("settings.link_defaults_d")}</span>
        </div>
        <div className="card-body stack">
          <div className="row between">
            <label className="switch"><input type="checkbox" name="password" defaultChecked={d.password} /><span className="track"></span><span>{t("settings.def_pw")}</span></label>{lock("passwordLocked", d.passwordLocked)}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="viewOnly" defaultChecked={d.viewOnly} /><span className="track"></span><span>{t("settings.def_viewonly")}</span></label>{lock("viewOnlyLocked", d.viewOnlyLocked)}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="identity" defaultChecked={d.identity} /><span className="track"></span><span>{t("settings.def_identity")}</span></label>{lock("identityLocked", d.identityLocked)}
          </div>
          <div className="row between">
            <label className="switch"><input type="checkbox" name="showContact" defaultChecked={d.showContact} /><span className="track"></span><span>{t("settings.def_contact")}</span></label><span></span>
          </div>
          <div className="form-grid" style={{ maxWidth: "640px" }}>
            <div className="field">
              <label className="label" htmlFor="expiryDays">{t("settings.def_expiry")}</label>
              <select id="expiryDays" name="expiryDays" className="select" defaultValue={d.expiryDays ?? ""}>
                {[7, 14, 30].map((n) => <option key={n} value={n}>{n} {t("common.days")}</option>)}
                <option value="">{t("sharenew.no_expiry")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="protection">{t("settings.capture_level")}</label>
              <select id="protection" name="protection" className="select" defaultValue={d.protection}><option value="strict">{t("settings.capture_strict")}</option><option value="standard">{t("settings.capture_standard")}</option></select>
            </div>
          </div>
        </div>
        <div className="card-footer"><button className="btn btn-primary" type="submit">{t("common.save")}</button></div>
      </form>
    </div>
  );
}

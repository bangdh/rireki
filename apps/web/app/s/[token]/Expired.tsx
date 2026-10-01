import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { TENANT } from "@/lib/sample";
import { ViewerTop } from "./ViewerChrome";

// viewer/expired.html — expired, revoked or over the view limit.
export async function Expired() {
  const t = await getTranslations();
  return (
    <div className="auth" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <main className="auth-main">
        <ViewerTop />
        <div className="auth-card center" style={{ alignItems: "center" }}>
          <span className="avatar" style={{ width: "64px", height: "64px", background: "var(--warning-soft)", color: "var(--warning)" }}><Icon name="clock" className="ic-xl" /></span>
          <h1>{t("viewer.expired_t")}</h1>
          <p className="muted">{t("viewer.expired_d")}</p>
          <div className="card w-full" style={{ textAlign: "left" }}>
            <div className="card-body">
              <dl className="kv">
                <dt>{t("viewer.sender")}</dt><dd>{TENANT.legalName}</dd>
                <dt>{t("viewer.contact")}</dt><dd>{TENANT.contact.name}<br />{TENANT.contact.email} · {TENANT.contact.phone}</dd>
              </dl>
            </div>
          </div>
          <CopyButton className="btn btn-block" text={TENANT.contact.email}><Icon name="copy" /><span>{t("viewer.copy_contact")}</span></CopyButton>
        </div>
        <div className="center xs faint"><span>{t("viewer.powered")}</span> Rireki</div>
      </main>
    </div>
  );
}

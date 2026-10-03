import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import type { ViewerContext } from "@/lib/shares/viewer";
import { ViewerTop } from "./ViewerChrome";

/** viewer/expired.html — expired, revoked or over the view limit: the sender's contact so the client can ask for a new link. */
export async function Expired({ ctx }: { ctx: ViewerContext }) {
  const t = await getTranslations();
  const { tenant, creator } = ctx;
  const sender = tenant.settings?.nameEn ?? tenant.name;
  const contact = [creator?.email, tenant.meta.phone].filter(Boolean).join(" · ");
  return (
    <div className="auth" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <main className="auth-main">
        <ViewerTop ctx={ctx} />
        <div className="auth-card center" style={{ alignItems: "center" }}>
          <span className="avatar" style={{ width: "64px", height: "64px", background: "var(--warning-soft)", color: "var(--warning)" }}><Icon name="clock" className="ic-xl" /></span>
          <h1>{t("viewer.expired_t")}</h1>
          <p className="muted">{t("viewer.expired_d", { tenant: sender })}</p>
          <div className="card w-full" style={{ textAlign: "left" }}>
            <div className="card-body">
              <dl className="kv">
                <dt>{t("viewer.sender")}</dt><dd>{sender}</dd>
                <dt>{t("viewer.contact")}</dt><dd>{creator?.name}{contact && <><br />{contact}</>}</dd>
              </dl>
            </div>
          </div>
          {creator?.email && <CopyButton className="btn btn-block" text={creator.email}><Icon name="copy" /><span>{t("viewer.copy_contact")}</span></CopyButton>}
        </div>
        {tenant.meta.poweredBy && <div className="center xs faint"><span>{t("viewer.powered")}</span> Rireki</div>}
      </main>
    </div>
  );
}

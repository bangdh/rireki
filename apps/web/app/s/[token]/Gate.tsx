import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import type { ViewerContext } from "@/lib/shares/viewer";
import { GateForm } from "./GateForm";
import { footerLine, ViewerTop } from "./ViewerChrome";

/** viewer/gate.html — password + identity gate, always shown before the list (even for links without either). */
export async function Gate({ ctx, token }: { ctx: ViewerContext; token: string }) {
  const [t, f] = await Promise.all([getTranslations(), getFormatter()]);
  const { link, tenant, creator } = ctx;
  return (
    <div className="auth" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <main className="auth-main">
        <ViewerTop ctx={ctx} />
        <GateForm
          token={token}
          needsPassword={link.passwordHash !== null}
          needsIdentity={link.requireIdentity || link.allowedDomains.length > 0}
          domains={link.allowedDomains}
          header={
            <>
              <div className="stack" style={{ gap: "6px" }}>
                <span className="eyebrow">{t("viewer.invited")}</span>
                <h1>{link.name}</h1>
                <p className="muted">
                  {link.candidates.length} <span>{t("common.candidates_lc")}</span> · <span>{t("viewer.from")}</span> {tenant.name}
                  {link.expiresAt && <> · <span>{t("viewer.valid_until")}</span> {f.dateTime(link.expiresAt, { dateStyle: "long", timeZone: "Asia/Tokyo" })}</>}
                </p>
              </div>
              {link.message && (
                <div className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
                  <div className="card-body" style={{ padding: "14px", fontSize: "13.5px", lineHeight: "1.7" }}>
                    {link.message}
                    {creator && <div className="small muted mt-8">— {creator.name}, {tenant.name}</div>}
                  </div>
                </div>
              )}
            </>
          }
          footer={
            <>
              {!link.downloadAllowed && (
                <div className="callout small">
                  <Icon name="eye" />
                  <div><b>{t("viewer.viewonly_t")}</b><br /><span>{t("viewer.viewonly_d")}</span></div>
                </div>
              )}
              <p className="xs faint center"><span>{t("viewer.terms")}</span></p>
            </>
          }
        />
        <div className="center xs faint">{footerLine(ctx)}{tenant.meta.poweredBy && <> · <span>{t("viewer.powered")}</span> Rireki</>}</div>
      </main>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { SHARES, TENANT } from "@/lib/sample";
import { LINK_STATUS_BADGE } from "@/lib/ui";

// app/shares.html. TODO(share-viewer): ShareLink rows + aggregates from Prisma (tenantId), filters from searchParams,
// revoke/extend/resend Server Actions (requireRole("admin") or creator).
export default async function SharesPage() {
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1>{t("shares.title")}</h1>
          <p className="sub">
            14 <span>{t("common.active_lc")}</span> · 3 <span>{t("dash.expiring")}</span> · 2 <span>{t("common.revoked_lc")}</span> · 226 <span>{t("shares.views_30d")}</span>
          </p>
        </div>
        <div className="actions"><Link className="btn btn-primary" href="/shares/new"><Icon name="plus" /><span>{t("shares.new")}</span></Link></div>
      </div>
      <section className="card">
        <div className="table-toolbar">
          <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" placeholder={t("shares.search_ph")} /></div>
          <select className="select select-sm" style={{ width: "auto" }} name="status" aria-label={t("common.status")}>
            <option value="">{t("common.status")}</option><option value="active">{t("common.active")}</option><option value="expired">{t("common.expired")}</option><option value="revoked">{t("common.revoked")}</option>
          </select>
          <select className="select select-sm" style={{ width: "auto" }} name="client" aria-label={t("shares.client")}>
            <option value="">{t("shares.client")}</option><option>株式会社ヤマト建設</option><option>東海協同組合</option><option>さくら介護グループ</option>
          </select>
          <select className="select select-sm" style={{ width: "auto" }} name="createdBy" aria-label={t("common.created_by")}>
            <option value="">{t("common.created_by")}</option><option>Nguyễn Thị Hương</option><option>Phạm Thu Trang</option><option>Aung Myat</option>
          </select>
          <button className="filter-chip" type="button"><Icon name="lock" className="ic-sm" /><span>{t("shares.password")}</span></button>
          <button className="filter-chip" type="button"><Icon name="eye" className="ic-sm" /><span>{t("shares.view_only")}</span></button>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr>
                <th>{t("shares.link")}</th><th>{t("shares.client")}</th><th>{t("cand.title")}</th><th>{t("shares.protection")}</th><th>{t("common.expires")}</th><th className="num">{t("common.views")}</th><th>{t("shares.last_viewed")}</th><th>{t("common.status")}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {SHARES.map((s) => (
                <tr key={s.id} style={s.status === "active" ? undefined : { opacity: ".65" }}>
                  <td>
                    {s.status === "active" ? <Link href={`/shares/${s.id}`} className="cell-primary">{s.name}</Link> : <span className="cell-primary">{s.name}</span>}
                    <div className="cell-sub">{s.createdBy} · {s.created}{s.single && <> · <span>{t("shares.single")}</span></>}</div>
                  </td>
                  <td>
                    {s.client}
                    {s.clientEmail && <div className="cell-sub">{s.clientEmail}</div>}
                  </td>
                  <td>
                    {s.candidates.length ? (
                      <div className="row-nowrap" style={{ gap: "2px" }}>
                        {s.candidates.map((ini) => <span key={ini} className="avatar avatar-sm">{ini}</span>)}
                        <span className="small muted" style={{ marginLeft: "6px" }}>{s.candidateCount}</span>
                      </div>
                    ) : (
                      <span className="small muted">{s.candidateCount}</span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: "4px" }}>
                      {s.password ? <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span> : <span className="badge badge-outline"><Icon name="unlock" /><span>{t("shares.no_password")}</span></span>}
                      {s.download ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}
                    </div>
                  </td>
                  <td className="nowrap">
                    {s.expiringDays ? <span className="badge badge-warning">{s.expires} · {s.expiringDays} <span>{t("common.days")}</span></span> : s.expires}
                  </td>
                  <td className="num">{s.views} <span className="faint">· {s.uniqueViewers}</span></td>
                  <td className="small muted nowrap">{s.lastViewed.time}{s.lastViewed.day && <> <span>{t(`common.${s.lastViewed.day}`)}</span></>}</td>
                  <td><span className={LINK_STATUS_BADGE[s.status]}>{t(`common.${s.status}`)}</span></td>
                  <td>
                    {s.status === "active" && (
                      <div className="row-actions">
                        <CopyButton className="btn btn-ghost btn-icon btn-sm" title="Copy link" text={`https://${TENANT.domain}/s/${s.token}`}><Icon name="copy" /></CopyButton>
                        <Link className="btn btn-ghost btn-icon btn-sm" href={`/s/${s.token}`} title="Open as client"><Icon name="external" /></Link>
                        <Menu>
                          <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                          <div className="menu-list">
                            <Link href={`/shares/${s.id}`}><Icon name="activity" /><span>{t("shares.tracking")}</span></Link>
                            <Link href={`/shares/${s.id}`}><Icon name="edit" /><span>{t("shares.edit_settings")}</span></Link>
                            <button type="button"><Icon name="calendar" /><span>{t("shares.extend")}</span></button>
                            <button type="button"><Icon name="send" /><span>{t("shares.resend")}</span></button>
                            <hr />
                            <button type="button" className="danger"><Icon name="ban" /><span>{t("common.revoke")}</span></button>
                          </div>
                        </Menu>
                      </div>
                    )}
                    {s.status === "expired" && <div className="row-actions"><button className="btn btn-sm" type="button">{t("shares.reactivate")}</button></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="pagination">
          <span><span>{t("common.showing")}</span> 1–{SHARES.length} <span>{t("common.of")}</span> 16</span>
          <div className="pages"><button type="button" className="active">1</button><button type="button">2</button></div>
          <span></span>
        </div>
      </section>
    </main>
  );
}

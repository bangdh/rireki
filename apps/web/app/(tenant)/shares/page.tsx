import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { pageWindow } from "@/lib/candidates/format";
import { When } from "@/lib/candidates/When";
import { ListQuery, parseQuery, type SearchParams } from "@/lib/shares/form";
import { initials } from "@/lib/shares/format";
import { canManage, EXPIRY_WARNING_DAYS, expiringInDays, linkState } from "@/lib/shares/link";
import { linkCounts, linkUrl, listFilters, listShareLinks, PER_PAGE } from "@/lib/shares/queries";
import { requireMember } from "@/lib/tenant";
import { LINK_STATUS_BADGE } from "@/lib/ui";
import { extendShareLink, resendShareLink, revokeShareLink } from "./actions";
import { FilterForm } from "./FilterForm";

// app/shares.html — filters are a GET form (selects auto-submit; the chips are submit buttons whose value wins over the hidden
// input of the same name). The table sits outside it (nested forms are invalid HTML): the row actions are Server Action forms
// and the page buttons point back at the filter form with form="filters". No client state.
export default async function SharesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const q = parseQuery(ListQuery, await searchParams);
  const { tenant, user, role } = await requireMember();
  const now = new Date();
  const [t, f, { rows, total, totals, creators }, counts, filters] = await Promise.all([
    getTranslations(),
    getFormatter(),
    listShareLinks(tenant.id, q, now),
    linkCounts(tenant.id, now),
    listFilters(tenant.id),
  ]);
  const last = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (q.page - 1) * PER_PAGE + 1;
  const to = Math.min(total, q.page * PER_PAGE);
  const selectStyle = { width: "auto" } as const;
  const date = (d: Date) => f.dateTime(d, { dateStyle: "medium" });

  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1>{t("shares.title")}</h1>
          <p className="sub">
            {counts.active} <span>{t("common.active_lc")}</span> · {counts.expiring} <span>{t("dash.expiring")}</span> · {counts.revoked} <span>{t("common.revoked_lc")}</span> · {counts.views30} <span>{t("shares.views_30d")}</span>
          </p>
        </div>
        <div className="actions"><Link className="btn btn-primary" href="/shares/new"><Icon name="plus" /><span>{t("shares.new")}</span></Link></div>
      </div>
      <section className="card">
        <FilterForm id="filters" action="/shares">
          <input type="hidden" name="password" value={q.password ?? ""} />
          <input type="hidden" name="viewOnly" value={q.viewOnly ?? ""} />
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
          <div className="table-toolbar">
            <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" defaultValue={q.q} placeholder={t("shares.search_ph")} /></div>
            <select className="select select-sm" style={selectStyle} name="status" defaultValue={q.status ?? ""} aria-label={t("common.status")}>
              <option value="">{t("common.status")}</option><option value="active">{t("common.active")}</option><option value="expired">{t("common.expired")}</option><option value="revoked">{t("common.revoked")}</option>
            </select>
            <select className="select select-sm" style={selectStyle} name="client" defaultValue={q.client ?? ""} aria-label={t("shares.client")}>
              <option value="">{t("shares.client")}</option>
              {filters.clients.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select select-sm" style={selectStyle} name="createdBy" defaultValue={q.createdBy ?? ""} aria-label={t("common.created_by")}>
              <option value="">{t("common.created_by")}</option>
              {filters.creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className={q.password ? "filter-chip active" : "filter-chip"} type="submit" name="password" value={q.password ? "" : "1"}><Icon name="lock" className="ic-sm" /><span>{t("shares.password")}</span></button>
            <button className={q.viewOnly ? "filter-chip active" : "filter-chip"} type="submit" name="viewOnly" value={q.viewOnly ? "" : "1"}><Icon name="eye" className="ic-sm" /><span>{t("shares.view_only")}</span></button>
          </div>
        </FilterForm>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr>
                <th>{t("shares.link")}</th><th>{t("shares.client")}</th><th>{t("cand.title")}</th><th>{t("shares.protection")}</th><th>{t("common.expires")}</th><th className="num">{t("common.views")}</th><th>{t("shares.last_viewed")}</th><th>{t("common.status")}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const tot = totals.get(s.id);
                const state = linkState(s, tot?.unlocks ?? 0, now);
                const days = expiringInDays(s, now);
                const url = linkUrl(tenant.slug, s.token);
                const count = s._count.candidates;
                const avatars = count > 3 ? s.candidates.slice(0, 2) : s.candidates;
                const manage = canManage(s, user.id, role);
                return (
                  <tr key={s.id} style={state === "active" ? undefined : { opacity: ".65" }}>
                    <td>
                      <Link href={`/shares/${s.id}`} className="cell-primary">{s.name}</Link>
                      <div className="cell-sub">{creators.get(s.createdById)} · {date(s.createdAt)}{count === 1 && <> · <span>{t("shares.single")}</span></>}</div>
                    </td>
                    <td>
                      {s.clientCompany ?? "—"}
                      {s.clientEmail && <div className="cell-sub">{s.clientEmail}</div>}
                    </td>
                    <td>
                      <div className="row-nowrap" style={{ gap: "2px" }}>
                        {avatars.map((c, i) => <span key={i} className="avatar avatar-sm">{initials(c.candidate.nameLatin)}</span>)}
                        {count > 3 && <span className="avatar avatar-sm">+{count - 2}</span>}
                        <span className="small muted" style={{ marginLeft: "6px" }}>{count}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: "4px" }}>
                        {s.passwordHash ? <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span> : <span className="badge badge-outline"><Icon name="unlock" /><span>{t("shares.no_password")}</span></span>}
                        {s.downloadAllowed ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}
                      </div>
                    </td>
                    <td className="nowrap">
                      {!s.expiresAt ? "—" : state === "active" && days !== null && days <= EXPIRY_WARNING_DAYS ? <span className="badge badge-warning">{date(s.expiresAt)} · {days} <span>{t("common.days")}</span></span> : date(s.expiresAt)}
                    </td>
                    <td className="num">{tot?.views ?? 0} <span className="faint">· {tot?.viewers ?? 0}</span></td>
                    <td className="small muted nowrap">{tot?.lastAt ? <When date={tot.lastAt} /> : "—"}</td>
                    <td><span className={LINK_STATUS_BADGE[state]}>{t(`common.${state}`)}</span></td>
                    <td>
                      {state === "active" && (
                        <div className="row-actions">
                          <CopyButton className="btn btn-ghost btn-icon btn-sm" title={t("common.copy_link")} text={url}><Icon name="copy" /></CopyButton>
                          <a className="btn btn-ghost btn-icon btn-sm" href={`/s/${s.token}`} target="_blank" rel="noreferrer" title={t("sharenew.preview")}><Icon name="external" /></a>
                          <Menu>
                            <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                            <div className="menu-list">
                              <Link href={`/shares/${s.id}`}><Icon name="activity" /><span>{t("shares.tracking")}</span></Link>
                              {manage && (
                                <>
                                  <Link href={`/shares/${s.id}/edit`}><Icon name="edit" /><span>{t("shares.edit_settings")}</span></Link>
                                  <form action={extendShareLink.bind(null, s.id)}><button type="submit"><Icon name="calendar" /><span>{t("shares.extend")}</span></button></form>
                                  {s.clientEmail && <form action={resendShareLink.bind(null, s.id)}><button type="submit"><Icon name="send" /><span>{t("shares.resend")}</span></button></form>}
                                  <hr />
                                  <form action={revokeShareLink.bind(null, s.id)}><button type="submit" className="danger"><Icon name="ban" /><span>{t("common.revoke")}</span></button></form>
                                </>
                              )}
                            </div>
                          </Menu>
                        </div>
                      )}
                      {state === "expired" && manage && (
                        <div className="row-actions"><form action={extendShareLink.bind(null, s.id)}><button className="btn btn-sm" type="submit">{t("shares.reactivate")}</button></form></div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        {total === 0 && <div className="empty"><Icon name="search" /><span>{t("common.none")}</span></div>}
        <div className="pagination">
          <span><span>{t("common.showing")}</span> {from}–{to} <span>{t("common.of")}</span> {total}</span>
          <div className="pages">
            <button form="filters" type="submit" name="page" value={q.page - 1} disabled={q.page <= 1} aria-label="Previous"><Icon name="chev-left" className="ic-sm" /></button>
            {pageWindow(q.page, last).map((p, i) =>
              p === null ? <span key={`gap${i}`} style={{ padding: "0 4px" }}>…</span> : <button key={p} form="filters" type="submit" name="page" value={p} className={p === q.page ? "active" : undefined}>{p}</button>,
            )}
            <button form="filters" type="submit" name="page" value={q.page + 1} disabled={q.page >= last} aria-label="Next"><Icon name="chev-right" className="ic-sm" /></button>
          </div>
          <span></span>
        </div>
      </section>
    </main>
  );
}

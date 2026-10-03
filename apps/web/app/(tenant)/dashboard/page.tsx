import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { AuditLine, auditIcon } from "@/lib/candidates/AuditLine";
import { getDashboard } from "@/lib/candidates/dashboard";
import { deviceIcon, deviceOf, givenName } from "@/lib/candidates/format";
import { When } from "@/lib/candidates/When";
import { requireMember } from "@/lib/tenant";

// app/dashboard.html — every number comes from lib/candidates/dashboard.ts (Prisma aggregates scoped by tenantId).
export default async function DashboardPage() {
  const { tenant, user } = await requireMember();
  const [t, f, d] = await Promise.all([getTranslations(), getFormatter(), getDashboard(tenant.id, tenant.meta.timezone)]);
  const { kpis } = d;
  const now = new Date();
  const days = (date: Date) => Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));
  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1><span>{t("dash.greeting")}</span>, {givenName(user.name)}</h1>
          <p className="sub">{tenant.name} · <span>{f.dateTime(now, { dateStyle: "full" })}</span></p>
        </div>
        <div className="actions">
          <Link className="btn" href="/shares/new"><Icon name="link" /><span>{t("shares.new")}</span></Link>
          <Link className="btn btn-primary" href="/candidates/new"><Icon name="plus" /><span>{t("cand.add")}</span></Link>
        </div>
      </div>
      <div className="grid grid-4 mb-16">
        <div className="card kpi">
          <span className="label">{t("dash.kpi_candidates")}</span><span className="value">{kpis.candidates}</span>
          <span className={kpis.newThisMonth ? "delta up" : "delta"}><Icon name="arrow-right" className="ic-sm" />+{kpis.newThisMonth} <span>{t("dash.this_month")}</span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_video")}</span><span className="value">{kpis.withVideo}</span>
          <span className="delta">{kpis.videoPct}% · {kpis.noVideo} <span>{t("dash.missing_video")}</span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_links")}</span><span className="value">{kpis.activeLinks}</span>
          <span className="delta"><span className={kpis.expiringCount ? "badge badge-warning badge-dot" : "badge badge-dot"}>{kpis.expiringCount} <span>{t("dash.expiring")}</span></span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_views")}</span><span className="value">{kpis.viewsWeek}</span>
          {kpis.viewsDelta !== null && <span className={kpis.viewsDelta >= 0 ? "delta up" : "delta"}>{kpis.viewsDelta >= 0 ? "+" : ""}{kpis.viewsDelta}% <span>{t("dash.vs_last_week")}</span></span>}
        </div>
      </div>
      <div className="grid grid-main-aside">
        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>{t("dash.views_14")}</h2>
                <p className="small muted">{d.chart.total} <span>{t("common.views")}</span> · {d.chart.unique} <span>{t("common.unique_viewers")}</span> · <span>{t("dash.all_links")}</span></p>
              </div>
              <Link className="btn btn-sm" href="/shares">{t("dash.see_links")}</Link>
            </div>
            <div className="card-body">
              <BarChart values={d.chart.values} labels={d.chart.labels} highlightFrom={7} unit={t("common.views")} aria-label={t("dash.views_14")} />
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h2>{t("dash.recent_views")}</h2>
              <Link className="btn btn-sm btn-ghost" href="/shares">{t("common.view_all")}</Link>
            </div>
            {d.recent.length === 0 ? (
              <div className="empty"><Icon name="eye" /><span>{t("common.none")}</span></div>
            ) : (
              <div className="table-wrap">
                <Table className="table">
                  <thead>
                    <tr>
                      <th>{t("common.time")}</th>
                      <th>{t("track.viewer")}</th>
                      <th>{t("shares.link")}</th>
                      <th>{t("track.candidate_opened")}</th>
                      <th>{t("track.device")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recent.map((v) => {
                      const device = deviceOf(v.viewer?.userAgent);
                      return (
                        <tr key={v.id}>
                          <td className="nowrap nums"><When date={v.createdAt} /></td>
                          <td>
                            <div className="person">
                              <span className="avatar avatar-sm">{v.viewer?.name ? v.viewer.name.slice(0, 1) : "?"}</span>
                              <div>
                                {v.viewer?.name ? (
                                  <><div className="n">{v.viewer.name}</div><div className="k">{v.viewer.email}</div></>
                                ) : (
                                  <><div className="n muted">{t("track.anonymous")}</div><div className="k">{t("track.no_identity")}</div></>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><Link href={`/shares/${v.shareLink.id}`}>{v.shareLink.name}</Link></td>
                          <td>{v.candidate && <Link href={`/candidates/${v.candidate.id}`}>{v.candidate.nameNative || v.candidate.nameLatin} <span className="kana">{v.candidate.nameKana}</span></Link>}</td>
                          <td className="small muted"><Icon name={deviceIcon(device)} className="ic-sm" style={{ display: "inline", verticalAlign: "-2px" }} /> {[device, v.viewer?.geo].filter(Boolean).join(" · ")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="card-header"><h3>{t("dash.expiring_links")}</h3></div>
            <div className="card-body flush">
              {d.expiring.length === 0 && <div className="empty"><Icon name="clock" /><span>{t("common.none")}</span></div>}
              {d.expiring.map((s, i) => {
                const left = s.expiresAt ? days(s.expiresAt) : 0;
                return (
                  <div key={s.id} className="doc-row" style={{ border: 0, borderBottom: i === d.expiring.length - 1 ? undefined : "1px solid var(--border)", borderRadius: 0 }}>
                    <Icon name="clock" />
                    <div className="grow">
                      <div className="n"><Link href={`/shares/${s.id}`}>{s.name}</Link></div>
                      <div className="m">{s._count.candidates} <span>{t("common.candidates_lc")}</span> · <span>{t("common.expires")}</span> {s.expiresAt && f.dateTime(s.expiresAt, { day: "numeric", month: "short" })}</div>
                    </div>
                    <span className={left <= 5 ? "badge badge-warning" : "badge"}>{left} <span>{t("common.days")}</span></span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("dash.attention")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              <Link className="row between" href="/candidates?video=0">
                <span className="row-nowrap"><Icon name="video" style={{ color: "var(--warning)" }} /><span>{kpis.noVideo} <span>{t("dash.no_video")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
              <Link className="row between" href="/candidates?q=">
                <span className="row-nowrap"><Icon name="file" style={{ color: "var(--warning)" }} /><span>{kpis.noKana} <span>{t("dash.incomplete")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
              <Link className="row between" href="/candidates/import">
                <span className="row-nowrap"><Icon name="sparkles" style={{ color: "var(--info)" }} /><span>{kpis.importsWaiting} <span>{t("dash.imports_waiting")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("dash.activity")}</h3></div>
            <div className="card-body">
              {d.activity.length === 0 ? (
                <div className="empty"><Icon name="activity" /><span>{t("common.none")}</span></div>
              ) : (
                <ul className="timeline">
                  {d.activity.map(({ row, who, target }) => (
                    <li key={row.id}>
                      <span className="dot"><Icon name={auditIcon(row)} /></span>
                      <div>
                        <AuditLine row={row} who={who} target={target} />
                        <div className="when"><When date={row.createdAt} /></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

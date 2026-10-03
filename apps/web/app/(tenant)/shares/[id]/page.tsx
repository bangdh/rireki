import { prisma } from "@rireki/db";
import { ShareSections } from "@rireki/shared";
import { subDays } from "date-fns";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart } from "@/components/BarChart";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { pageWindow } from "@/lib/candidates/format";
import { When } from "@/lib/candidates/When";
import { metaOf } from "@/lib/shares/events";
import { dayRange, describeUserAgent, fmtDuration, initials, jstDay, maskIp } from "@/lib/shares/format";
import { canManage, EXPIRY_WARNING_DAYS, expiringInDays } from "@/lib/shares/link";
import { getShareLink, linkUrl } from "@/lib/shares/queries";
import { eventsPage, linkKpis, viewersSummary, viewsByCandidate, viewsPerDay } from "@/lib/shares/stats";
import { requireMember } from "@/lib/tenant";
import { LANGS } from "@/i18n/config";
import { LINK_STATUS_BADGE } from "@/lib/ui";
import { extendShareLink, resendShareLink, revokeShareLink } from "../actions";
import { FilterForm } from "../FilterForm";

// app/share-detail.html — tracking of one link: ?range=7|30|all (chart), ?viewer= and ?page= (log, 10 per page).
const PER = 10;
const SECTION_LABEL = { photo: "form.photo", contact: "sharenew.sec_contact", family: "form.family", health: "form.health", videos: "form.videos", documents: "sharenew.sec_docs", feedback: "sharenew.sec_interested" } as const;
const name = (c: { nameNative: string | null; nameLatin: string } | null | undefined) => c?.nameNative || c?.nameLatin || "";
const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function ShareDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string; viewer?: string; page?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { tenant, user, role } = await requireMember();
  const link = await getShareLink(tenant.id, id);
  if (!link) notFound();
  const now = new Date();
  const range = sp.range === "30" ? 30 : sp.range === "all" ? null : 7;
  const fromDay = range ? jstDay(subDays(now, range - 1)) : jstDay(link.createdAt);
  const from = new Date(`${fromDay}T00:00:00+09:00`);
  const page = Math.max(1, Number(sp.page) || 1);
  const viewerId = sp.viewer || undefined;
  const [t, f, kpis, perDay, byCandidate, viewers, events, interested] = await Promise.all([
    getTranslations(),
    getFormatter(),
    linkKpis(tenant.id, link.id),
    viewsPerDay(tenant.id, { shareLinkId: link.id, from }),
    viewsByCandidate(tenant.id, link.id),
    viewersSummary(link.id),
    eventsPage(tenant.id, link.id, { viewerId, page, per: PER }),
    prisma.feedback.findMany({ where: { shareLinkId: link.id, verdict: "interested" }, select: { candidateId: true } }),
  ]);
  const sections = ShareSections.parse(link.sections);
  const url = linkUrl(tenant.slug, link.token);
  const manage = canManage(link, user.id, role);
  const days = expiringInDays(link, now);
  const date = (d: Date) => f.dateTime(d, { dateStyle: "medium" });
  const perDayMap = new Map(perDay.map((r) => [r.day, r.views]));
  const chartDays = dayRange(fromDay, jstDay(now));
  const starred = new Set(interested.map((x) => x.candidateId));
  const ranked = link.candidates.map((c) => ({ ...c.candidate, views: byCandidate.get(c.candidateId) ?? 0 })).sort((a, b) => b.views - a.views);
  const maxViews = ranked[0]?.views || 1;
  const last = Math.max(1, Math.ceil(events.total / PER));
  const hidden = (Object.keys(SECTION_LABEL) as (keyof typeof SECTION_LABEL)[]).filter((s) => !sections[s]);

  const action = (e: (typeof events.rows)[number]): ReactNode => {
    const m = metaOf(e.meta);
    const who = name(e.candidate);
    switch (e.type) {
      case "interest":
        return <><span className="row-nowrap"><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} /><span>{t("track.a_interested")}</span>: {who}</span>{m.comment ? <div className="cell-sub">「{str(m.comment)}」</div> : null}</>;
      case "play_video":
        return <><span>{t("track.a_played")}</span> {str(m.title)}{who && ` · ${who}`}{typeof m.progress === "number" && <div className="cell-sub">{m.progress}% <span>{t("track.watched")}</span></div>}</>;
      case "open_cv":
        return <><span>{t("track.a_opened_cv")}</span> · {who}</>;
      case "open_list":
        return <span>{t("track.a_opened_list")}</span>;
      case "blocked_action":
        return <><span className="row-nowrap"><Icon name="ban" className="ic-sm" style={{ color: "var(--danger)" }} /><span>{m.action === "print" ? t("track.a_blocked") : t("ui.blocked")}</span></span>{m.action !== "print" && ` · ${str(m.action)}`}{who && ` · ${who}`}</>;
      case "unlock":
        return <span>{t("track.a_unlocked")}</span>;
      case "failed_password":
        return <span className="row-nowrap"><Icon name="alert" className="ic-sm" style={{ color: "var(--danger)" }} /><span>{t("track.a_failed")}</span></span>;
      case "download":
        return <span className="row-nowrap"><Icon name="download" className="ic-sm" /><span>{t("common.file")}</span>: {str(m.file)}{who && ` · ${who}`}</span>;
      default:
        return <span>{e.type}</span>;
    }
  };

  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/shares">{t("shares.title")}</Link><span>/</span><span>{link.name}</span></div>
      <div className="page-header">
        <div>
          <div className="row">
            <h1>{link.name}</h1>
            <span className={LINK_STATUS_BADGE[link.state]}>{t(`common.${link.state}`)}</span>
          </div>
          <p className="sub">{[link.clientCompany, link.clientName].filter(Boolean).join(" · ")}{(link.clientCompany || link.clientName) && " · "}<span>{t("common.created_by")}</span> {link.creator?.name}, {date(link.createdAt)}</p>
        </div>
        <div className="actions">
          <CopyButton className="btn" text={url}><Icon name="copy" /><span>{t("common.copy_link")}</span></CopyButton>
          <a className="btn" href={`/s/${link.token}`} target="_blank" rel="noreferrer"><Icon name="external" /><span>{t("sharenew.preview")}</span></a>
          {manage && <Link className="btn btn-primary" href={`/shares/${link.id}/edit`}><Icon name="edit" /><span>{t("shares.edit_settings")}</span></Link>}
          {(manage || role === "admin") && (
            <Menu>
              <summary className="btn btn-icon" aria-label="More"><Icon name="more" /></summary>
              <div className="menu-list">
                {manage && link.state !== "revoked" && <form action={extendShareLink.bind(null, link.id)}><button type="submit"><Icon name="calendar" /><span>{t(link.state === "expired" ? "shares.reactivate" : "shares.extend")}</span></button></form>}
                {manage && link.clientEmail && <form action={resendShareLink.bind(null, link.id)}><button type="submit"><Icon name="send" /><span>{t("shares.resend")}</span></button></form>}
                {role === "admin" && <a href={`/api/shares/${link.id}/export`}><Icon name="download" /><span>{t("track.export")}</span></a>}
                {manage && link.state !== "revoked" && (
                  <>
                    <hr />
                    <form action={revokeShareLink.bind(null, link.id)}><button type="submit" className="danger"><Icon name="ban" /><span>{t("common.revoke")}</span></button></form>
                  </>
                )}
              </div>
            </Menu>
          )}
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-body row" style={{ gap: "16px" }}>
          <div className="link-box grow" style={{ minWidth: "260px" }}>
            <Icon name="link" className="muted" /><span className="url">{url}</span>
            <CopyButton className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.copy_link")} text={url}><Icon name="copy" /></CopyButton>
          </div>
          {link.passwordHash && (
            // only the hash is stored: the password was shown once, on step 3 of the wizard. TODO(phase2): keep an encrypted copy to reveal here.
            <div className="link-box" style={{ minWidth: "200px" }}>
              <Icon name="key" className="muted" /><span className="url">••••-••••-•••</span>
            </div>
          )}
          <div className="row" style={{ gap: "6px" }}>
            {link.passwordHash ? <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span> : <span className="badge badge-outline"><Icon name="unlock" /><span>{t("shares.no_password")}</span></span>}
            {link.downloadAllowed ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}
            {link.requireIdentity && <span className="badge"><Icon name="user-check" /><span>{t("sharenew.identity_short")}</span></span>}
            {link.expiresAt && (
              <span className={link.state === "active" && days !== null && days <= EXPIRY_WARNING_DAYS ? "badge badge-warning" : "badge"}>
                <Icon name="clock" /><span>{t("common.expires")}</span> {date(link.expiresAt)}{link.state === "active" && days !== null && days <= EXPIRY_WARNING_DAYS && <> · {days} <span>{t("common.days")}</span></>}
              </span>
            )}
            <span className="badge"><Icon name="users" />{link.candidates.length} <span>{t("common.candidates_lc")}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-4 mb-16">
        <div className="card kpi"><span className="label">{t("track.total_views")}</span><span className="value">{kpis.total}</span><span className="delta">{kpis.today} <span>{t("track.today_lc")}</span></span></div>
        <div className="card kpi"><span className="label">{t("common.unique_viewers")}</span><span className="value">{kpis.uniqueViewers}</span><span className="delta truncate">{viewers.filter((v) => v.views > 0).slice(0, 3).map((v) => v.name ?? t("track.anonymous")).join(", ")}</span></div>
        <div className="card kpi">
          <span className="label">{t("track.avg_time")}</span><span className="value">{kpis.avgSec === null ? "—" : fmtDuration(kpis.avgSec)}</span>
          <span className="delta truncate">{kpis.longest && <><span>{t("track.longest")}</span>: {name(kpis.longest.candidate)} · {fmtDuration(kpis.longest.durationSec)}</>}</span>
        </div>
        <div className="card kpi">
          <span className="label">{t("track.video_plays")}</span><span className="value">{kpis.plays}</span>
          <span className="delta">{kpis.avgProgress !== null && <>{kpis.avgProgress}% <span>{t("track.avg_watched")}</span> · </>}<span className="row-nowrap" style={{ display: "inline-flex" }}><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} />{kpis.interested} <span>{t("track.interested")}</span></span></span>
        </div>
      </div>

      <div className="grid grid-main-aside">
        <FilterForm action={`/shares/${link.id}`} className="stack">
          <input type="hidden" name="range" value={sp.range ?? "7"} />
          <input type="hidden" name="viewer" value={viewerId ?? ""} />
          <section className="card">
            <div className="card-header">
              <div><h2>{t("track.views_by_day")}</h2><p className="small muted">{t("track.since_created")}</p></div>
              <div className="segmented">
                <button type="submit" name="range" value="7" className={range === 7 ? "active" : undefined}>7d</button>
                <button type="submit" name="range" value="30" className={range === 30 ? "active" : undefined}>30d</button>
                <button type="submit" name="range" value="all" className={range === null ? "active" : undefined}>{t("common.all")}</button>
              </div>
            </div>
            <div className="card-body">
              <BarChart values={chartDays.map((d) => perDayMap.get(d) ?? 0)} labels={chartDays.map((d) => f.dateTime(new Date(`${d}T00:00:00+09:00`), { day: "numeric", month: "short", timeZone: "Asia/Tokyo" }))} unit={t("common.views")} aria-label={t("track.views_by_day")} />
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h2>{t("track.viewer_log")}</h2>
              <div className="row">
                <select className="select select-sm" style={{ width: "auto" }} name="viewer" defaultValue={viewerId ?? ""} aria-label={t("track.viewers")}>
                  <option value="">{t("track.all_viewers")}</option>
                  {viewers.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.email ?? t("track.anonymous")}</option>)}
                </select>
                {role === "admin" && <a className="btn btn-sm" href={`/api/shares/${link.id}/export`}><Icon name="download" />CSV</a>}
              </div>
            </div>
            <div className="table-wrap">
              <Table className="table">
                <thead>
                  <tr><th>{t("common.time")}</th><th>{t("track.viewer")}</th><th>{t("track.action")}</th><th>{t("track.duration")}</th><th>{t("track.device")}</th></tr>
                </thead>
                <tbody>
                  {events.rows.map((e) => {
                    const m = metaOf(e.meta);
                    const v = e.viewer;
                    const duration = ["open_cv", "open_list", "play_video"].includes(e.type) && e.durationSec != null ? fmtDuration(e.durationSec) : null;
                    const device = [describeUserAgent(v?.userAgent ?? str(m.ua ?? m.userAgent)), v?.geo ?? str(m.geo), maskIp(v?.ip ?? str(m.ip))].filter((x) => x && x !== "—").join(" · ");
                    return (
                      <tr key={e.id}>
                        <td className="nowrap nums"><When date={e.createdAt} time /></td>
                        <td>
                          <div className="person">
                            <span className="avatar avatar-sm">{v ? initials(v.name ?? v.email) : "?"}</span>
                            <div>
                              {v ? (
                                <><div className="n">{v.name ?? t("track.anonymous")}</div><div className="k">{v.email ?? t("track.no_identity")}</div></>
                              ) : (
                                <><div className="n muted">{t("track.a_failed")}</div><div className="k">{maskIp(str(m.ip)) || "—"}</div></>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{action(e)}</td>
                        <td className={duration ? "nums" : undefined}>{duration ?? "—"}</td>
                        <td className="small muted">{device || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            {events.total === 0 && <div className="empty"><Icon name="activity" /><span>{t("common.none")}</span></div>}
            <div className="pagination">
              <span><span>{t("common.showing")}</span> {events.total === 0 ? 0 : (page - 1) * PER + 1}–{Math.min(events.total, page * PER)} <span>{t("common.of")}</span> {events.total} <span>{t("track.events")}</span></span>
              <div className="pages">
                {pageWindow(page, last).map((p, i) =>
                  p === null ? <span key={`gap${i}`} style={{ padding: "0 4px" }}>…</span> : <button key={p} type="submit" name="page" value={p} className={p === page ? "active" : undefined}>{p}</button>,
                )}
              </div>
              <span></span>
            </div>
          </section>
        </FilterForm>

        <aside className="stack">
          <section className="card">
            <div className="card-header"><h3>{t("track.views_by_candidate")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              {ranked.map((c) => (
                <div className="hbar" key={c.id}>
                  <span className="truncate">{name(c)}{starred.has(c.id) && <> <Icon name="star" className="ic-sm" style={{ display: "inline", verticalAlign: "-2px", color: "var(--warning)" }} /></>}</span>
                  <span className="track"><i style={{ width: `${Math.round((c.views / maxViews) * 100)}%` }}></i></span>
                  <span className="v">{c.views}</span>
                </div>
              ))}
              <p className="hint">{t("track.by_candidate_hint")}</p>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("track.viewers")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              {viewers.length === 0 && <span className="small muted">{t("common.none")}</span>}
              {viewers.map((v) => (
                <div className="row between" key={v.id}>
                  <div className="person">
                    <span className="avatar avatar-sm">{initials(v.name ?? v.email)}</span>
                    <div>
                      <div className="n small">{v.name ?? t("track.anonymous")}</div>
                      <div className="k">{v.views} <span>{t("common.views")}</span> · <span>{t("track.first")}</span> {date(v.firstSeenAt)}</div>
                    </div>
                  </div>
                  {v.interested > 0 ? <span className="badge badge-warning"><Icon name="star" />{v.interested}</span> : v.blocked > 0 ? <span className="badge badge-danger"><Icon name="ban" />{v.blocked}</span> : <span></span>}
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("shares.settings")}</h3>{manage && <Link className="btn btn-sm btn-ghost" href={`/shares/${link.id}/edit`}>{t("common.edit")}</Link>}</div>
            <div className="card-body">
              <dl className="kv">
                <dt>{t("shares.client")}</dt><dd>{link.clientCompany ?? "—"}{(link.clientName || link.clientEmail) && <><br /><span className="small muted">{[link.clientName, link.clientEmail].filter(Boolean).join(" · ")}</span></>}</dd>
                <dt>{t("sharenew.access")}</dt><dd>{[t(link.passwordHash ? "shares.password" : "shares.no_password"), link.requireIdentity && t("sharenew.identity_short"), ...link.allowedDomains.map((d) => `@${d}`)].filter(Boolean).join(" · ")}</dd>
                <dt>{t("shares.protection")}</dt><dd>{t(link.downloadAllowed ? "shares.download_allowed" : "shares.view_only")}</dd>
                <dt>{t("common.expires")}</dt><dd>{link.expiresAt ? `${date(link.expiresAt)} 23:59 JST` : t("sharenew.no_expiry")}</dd>
                <dt>{t("sharenew.max_views_short")}</dt><dd>{link.maxViews === null ? t("common.unlimited") : `${link.unlockCount} / ${link.maxViews}`}</dd>
                <dt>{t("sharenew.hidden")}</dt><dd>{hidden.length ? hidden.map((s) => t(SECTION_LABEL[s])).join(", ") : t("common.none")}</dd>
                <dt>{t("sharenew.viewer_lang")}</dt><dd>{LANGS.find(([code]) => code === link.viewerLang)?.[1] ?? link.viewerLang}</dd>
              </dl>
            </div>
          </section>
          {manage && link.state !== "revoked" && (
            <section className="card" style={{ borderColor: "var(--danger)" }}>
              <div className="card-body stack" style={{ gap: "8px" }}>
                <b>{t("shares.danger")}</b>
                <p className="small muted">{t("shares.danger_d")}</p>
                <form action={revokeShareLink.bind(null, link.id)}><button className="btn btn-danger-soft" type="submit"><Icon name="ban" /><span>{t("common.revoke")}</span></button></form>
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

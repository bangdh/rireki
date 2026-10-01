import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart } from "@/components/BarChart";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { SecretText } from "@/components/SecretText";
import { Table } from "@/components/Table";
import { LINK, shareById, TENANT } from "@/lib/sample";
import { LINK_STATUS_BADGE } from "@/lib/ui";

// app/share-detail.html — tracking page of one link. TODO(share-viewer): link by tenantId/id, aggregates via $queryRaw
// (total views, unique viewers, avg time, plays, per day, per candidate), paginated ViewEvent log, revoke/extend/resend.
const VIEWERS = {
  tanaka: { name: "田中 健一", email: "tanaka@yamato-k.co.jp", initials: "田" },
  sato: { name: "佐藤 亮", email: "sato@yamato-k.co.jp", initials: "佐" },
  yamamoto: { name: "山本 恵", email: "yamamoto@yamato-k.co.jp", initials: "山" },
};
type Event = { time: string; day?: "today" | "yesterday"; viewer: keyof typeof VIEWERS | null; kind: "interest" | "play_video" | "open_cv" | "open_list" | "blocked_action" | "unlock" | "failed_password"; target?: string; sub?: ReactNode; duration?: string; device: string };
const EVENTS: Event[] = [
  { time: "09:47", day: "today", viewer: "tanaka", kind: "interest", target: "Nguyễn Văn An", sub: "「10月8日に面接希望」", device: "Chrome · Windows · Nagoya, JP · 210.140.x.x" },
  { time: "09:42", day: "today", viewer: "tanaka", kind: "play_video", target: "自己紹介（日本語） · Nguyễn Văn An", duration: "1:32", device: "Chrome · Windows · Nagoya, JP" },
  { time: "09:36", day: "today", viewer: "tanaka", kind: "open_cv", target: "Nguyễn Văn An", duration: "6:12", device: "Chrome · Windows · Nagoya, JP" },
  { time: "09:35", day: "today", viewer: "tanaka", kind: "open_list", duration: "0:40", device: "Chrome · Windows · Nagoya, JP" },
  { time: "17:58", day: "yesterday", viewer: "sato", kind: "blocked_action", target: "Phạm Minh Đức", device: "Edge · Windows · Nagoya, JP" },
  { time: "17:50", day: "yesterday", viewer: "sato", kind: "open_cv", target: "Phạm Minh Đức", duration: "3:05", device: "Edge · Windows · Nagoya, JP" },
  { time: "17:45", day: "yesterday", viewer: "sato", kind: "open_cv", target: "Lê Hoàng Long", duration: "1:48", device: "Edge · Windows · Nagoya, JP" },
  { time: "12:10 · 28 Sep", viewer: "yamamoto", kind: "open_cv", target: "Nguyễn Văn An", duration: "2:20", device: "Safari · iPhone · Tokyo, JP" },
  { time: "12:08 · 28 Sep", viewer: "yamamoto", kind: "unlock", duration: "0:25", device: "Safari · iPhone · Tokyo, JP" },
  { time: "08:31 · 27 Sep", viewer: null, kind: "failed_password", device: "Chrome · Android · Hanoi, VN · 14.162.x.x" },
];
const BY_CANDIDATE = [
  { name: "Nguyễn Văn An", views: 9, interested: true },
  { name: "Phạm Minh Đức", views: 6 },
  { name: "Lê Hoàng Long", views: 4 },
  { name: "Trần Văn Hùng", views: 3 },
  { name: "Vũ Đức Anh", views: 2 },
];

export default async function ShareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const s = shareById(id);
  const url = `https://${TENANT.domain}/s/${s.token}`;
  const action = (e: Event) => {
    switch (e.kind) {
      case "interest":
        return <><span className="row-nowrap"><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} /><span>{t("track.a_interested")}</span>: {e.target}</span>{e.sub && <div className="cell-sub">{e.sub}</div>}</>;
      case "play_video":
        return <><span>{t("track.a_played")}</span> {e.target}<div className="cell-sub">100% <span>{t("track.watched")}</span></div></>;
      case "open_cv":
        return <><span>{t("track.a_opened_cv")}</span> · {e.target}</>;
      case "open_list":
        return <span>{t("track.a_opened_list")}</span>;
      case "blocked_action":
        return <><span className="row-nowrap"><Icon name="ban" className="ic-sm" style={{ color: "var(--danger)" }} /><span>{t("track.a_blocked")}</span></span> · {e.target}</>;
      case "unlock":
        return <span>{t("track.a_unlocked")}</span>;
      case "failed_password":
        return <span className="row-nowrap"><Icon name="alert" className="ic-sm" style={{ color: "var(--danger)" }} /><span>{t("track.a_failed")}</span></span>;
    }
  };
  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/shares">{t("shares.title")}</Link><span>/</span><span>{s.name}</span></div>
      <div className="page-header">
        <div>
          <div className="row">
            <h1>{s.name}</h1>
            <span className={LINK_STATUS_BADGE[s.status]}>{t(`common.${s.status}`)}</span>
          </div>
          <p className="sub">{s.client} · {LINK.contact} · <span>{t("common.created_by")}</span> {s.createdBy}, {s.created} 2026</p>
        </div>
        <div className="actions">
          <CopyButton className="btn" text={url}><Icon name="copy" /><span>{t("common.copy_link")}</span></CopyButton>
          <Link className="btn" href={`/s/${s.token}`}><Icon name="external" /><span>{t("sharenew.preview")}</span></Link>
          <button className="btn btn-primary" type="button"><Icon name="edit" /><span>{t("shares.edit_settings")}</span></button>
          <Menu>
            <summary className="btn btn-icon" aria-label="More"><Icon name="more" /></summary>
            <div className="menu-list">
              <button type="button"><Icon name="calendar" /><span>{t("shares.extend")}</span></button>
              <button type="button"><Icon name="send" /><span>{t("shares.resend")}</span></button>
              <button type="button"><Icon name="download" /><span>{t("track.export")}</span></button>
              <hr />
              <button type="button" className="danger"><Icon name="ban" /><span>{t("common.revoke")}</span></button>
            </div>
          </Menu>
        </div>
      </div>
      <div className="card mb-16">
        <div className="card-body row" style={{ gap: "16px" }}>
          <div className="link-box grow" style={{ minWidth: "260px" }}>
            <Icon name="link" className="muted" /><span className="url">{url}</span>
            <CopyButton className="btn btn-ghost btn-icon btn-sm" aria-label="Copy" text={url}><Icon name="copy" /></CopyButton>
          </div>
          <div className="link-box" style={{ minWidth: "200px" }}>
            <Icon name="key" className="muted" /><SecretText value={LINK.password} />
            <CopyButton className="btn btn-ghost btn-icon btn-sm" aria-label="Copy" text={LINK.password}><Icon name="copy" /></CopyButton>
          </div>
          <div className="row" style={{ gap: "6px" }}>
            <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span>
            <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>
            <span className="badge"><Icon name="user-check" /><span>{t("sharenew.identity_short")}</span></span>
            <span className="badge badge-warning"><Icon name="clock" /><span>{t("common.expires")}</span> {s.expires} · {s.expiringDays} <span>{t("common.days")}</span></span>
            <span className="badge"><Icon name="users" />{s.candidateCount} <span>{t("common.candidates_lc")}</span></span>
          </div>
        </div>
      </div>
      <div className="grid grid-4 mb-16">
        <div className="card kpi"><span className="label">{t("track.total_views")}</span><span className="value">{s.views}</span><span className="delta">5 <span>{t("track.today_lc")}</span></span></div>
        <div className="card kpi"><span className="label">{t("common.unique_viewers")}</span><span className="value">{s.uniqueViewers}</span><span className="delta">田中, 佐藤, 山本</span></div>
        <div className="card kpi"><span className="label">{t("track.avg_time")}</span><span className="value">2:40</span><span className="delta"><span>{t("track.longest")}</span>: Nguyễn Văn An · 6:12</span></div>
        <div className="card kpi">
          <span className="label">{t("track.video_plays")}</span><span className="value">11</span>
          <span className="delta">71% <span>{t("track.avg_watched")}</span> · <span className="row-nowrap" style={{ display: "inline-flex" }}><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} />1 <span>{t("track.interested")}</span></span></span>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div><h2>{t("track.views_by_day")}</h2><p className="small muted">{t("track.since_created")}</p></div>
              <div className="segmented"><button type="button" className="active">7d</button><button type="button">30d</button><button type="button">{t("common.all")}</button></div>
            </div>
            <div className="card-body">
              <BarChart values={[3, 6, 4, 6, 5]} labels={["26 Sep", "27 Sep", "28 Sep", "29 Sep", "30 Sep"]} unit={t("common.views")} aria-label={t("track.views_by_day")} />
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h2>{t("track.viewer_log")}</h2>
              <div className="row">
                <select className="select select-sm" style={{ width: "auto" }} aria-label={t("track.viewers")}><option value="">{t("track.all_viewers")}</option>{Object.values(VIEWERS).map((v) => <option key={v.email}>{v.name}</option>)}</select>
                <button className="btn btn-sm" type="button"><Icon name="download" />CSV</button>
              </div>
            </div>
            <div className="table-wrap">
              <Table className="table">
                <thead>
                  <tr><th>{t("common.time")}</th><th>{t("track.viewer")}</th><th>{t("track.action")}</th><th>{t("track.duration")}</th><th>{t("track.device")}</th></tr>
                </thead>
                <tbody>
                  {EVENTS.map((e, i) => {
                    const v = e.viewer ? VIEWERS[e.viewer] : null;
                    return (
                      <tr key={i}>
                        <td className="nowrap nums">{e.time}{e.day && <> <span className="faint">{t(`common.${e.day}`)}</span></>}</td>
                        <td>
                          <div className="person">
                            <span className="avatar avatar-sm">{v?.initials ?? "?"}</span>
                            <div>
                              {v ? <><div className="n">{v.name}</div><div className="k">{v.email}</div></> : <><div className="n muted">{t("track.failed_pw")}</div><div className="k">—</div></>}
                            </div>
                          </div>
                        </td>
                        <td>{action(e)}</td>
                        <td className={e.duration ? "nums" : undefined}>{e.duration ?? "—"}</td>
                        <td className="small muted">{e.device}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            <div className="pagination">
              <span><span>{t("common.showing")}</span> 1–{EVENTS.length} <span>{t("common.of")}</span> 27 <span>{t("track.events")}</span></span>
              <div className="pages"><button type="button" className="active">1</button><button type="button">2</button><button type="button">3</button></div>
              <span></span>
            </div>
          </section>
        </div>
        <aside className="stack">
          <section className="card">
            <div className="card-header"><h3>{t("track.views_by_candidate")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              {BY_CANDIDATE.map((c) => (
                <div className="hbar" key={c.name}>
                  <span className="truncate">{c.name}{c.interested && <> <Icon name="star" className="ic-sm" style={{ display: "inline", verticalAlign: "-2px", color: "var(--warning)" }} /></>}</span>
                  <span className="track"><i style={{ width: `${Math.round((c.views / BY_CANDIDATE[0].views) * 100)}%` }}></i></span>
                  <span className="v">{c.views}</span>
                </div>
              ))}
              <p className="hint">{t("track.by_candidate_hint")}</p>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("track.viewers")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              {[
                { v: VIEWERS.tanaka, views: 14, first: "26 Sep", badge: <span className="badge badge-warning"><Icon name="star" />1</span> },
                { v: VIEWERS.sato, views: 7, first: "29 Sep", badge: <span className="badge badge-danger"><Icon name="ban" />1</span> },
                { v: VIEWERS.yamamoto, views: 3, first: "28 Sep", badge: <span></span> },
              ].map(({ v, views, first, badge }) => (
                <div className="row between" key={v.email}>
                  <div className="person"><span className="avatar avatar-sm">{v.initials}</span><div><div className="n small">{v.name}</div><div className="k">{views} <span>{t("common.views")}</span> · <span>{t("track.first")}</span> {first}</div></div></div>
                  {badge}
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("shares.settings")}</h3><button className="btn btn-sm btn-ghost" type="button">{t("common.edit")}</button></div>
            <div className="card-body">
              <dl className="kv">
                <dt>{t("shares.client")}</dt><dd>{s.client}<br /><span className="small muted">{LINK.contact} · {s.clientEmail}</span></dd>
                <dt>{t("sharenew.access")}</dt><dd><span>{t("shares.password")}</span> · <span>{t("sharenew.identity_short")}</span> · {LINK.domains.join(", ")}</dd>
                <dt>{t("shares.protection")}</dt><dd>{t("shares.view_only")}</dd>
                <dt>{t("common.expires")}</dt><dd>{LINK.expiresFull} 23:59 JST</dd>
                <dt>{t("sharenew.max_views_short")}</dt><dd>{t("common.unlimited")}</dd>
                <dt>{t("sharenew.hidden")}</dt><dd>{t("sharenew.hidden_v")}</dd>
                <dt>{t("sharenew.viewer_lang")}</dt><dd>日本語</dd>
              </dl>
            </div>
          </section>
          <section className="card" style={{ borderColor: "var(--danger)" }}>
            <div className="card-body stack" style={{ gap: "8px" }}>
              <b>{t("shares.danger")}</b>
              <p className="small muted">{t("shares.danger_d")}</p>
              <button className="btn btn-danger-soft" type="button" style={{ alignSelf: "flex-start" }}><Icon name="ban" /><span>{t("common.revoke")}</span></button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

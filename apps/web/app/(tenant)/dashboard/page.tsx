import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { ME, SHARES, TENANT } from "@/lib/sample";

// app/dashboard.html. TODO(candidates): KPIs, chart and lists from Prisma aggregates scoped by tenantId (see share-links-protection skill).
const KPIS = { candidates: 182, newThisMonth: 6, withVideo: 141, videoPct: 77, withoutVideo: 41, activeLinks: 14, expiring: 3, viewsWeek: 96, viewsDelta: "+22%" };
const VIEWS_14D = { values: [5, 7, 4, 8, 6, 9, 7, 10, 12, 9, 15, 13, 18, 19], labels: ["17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"], total: 142, unique: 41 };
const RECENT_VIEWS = [
  { time: "09:42", day: "today", viewer: { name: "田中 健一", email: "tanaka@yamato-k.co.jp", initials: "田" }, link: SHARES[0], candidate: "Nguyễn Văn An", kana: "グエン・バン・アン", device: "monitor", where: "Desktop · Nagoya, JP" },
  { time: "09:15", day: "today", viewer: { name: "鈴木 美咲", email: "suzuki@tokai-kyodo.or.jp", initials: "鈴" }, link: SHARES[1], candidate: "Su Su Hlaing", kana: "スー・スー・ライン", device: "phone", where: "Mobile · Tokyo, JP" },
  { time: "18:20", day: "yesterday", viewer: null, link: SHARES[2], candidate: "Su Su Hlaing", kana: "スー・スー・ライン", device: "monitor", where: "Desktop · Osaka, JP" },
  { time: "16:05", day: "yesterday", viewer: { name: "小林 直子", email: "kobayashi@sakura-care.jp", initials: "小" }, link: SHARES[3], candidate: "Dewi Lestari", kana: "デウィ・レスタリ", device: "monitor", where: "Tablet · Fukuoka, JP" },
  { time: "11:48", day: "yesterday", viewer: { name: "田中 健一", email: "tanaka@yamato-k.co.jp", initials: "田" }, link: SHARES[0], candidate: "Phạm Minh Đức", kana: "ファム・ミン・ドゥック", device: "monitor", where: "Desktop · Nagoya, JP" },
] as const;
const EXPIRING = SHARES.filter((s) => s.expiringDays).concat(SHARES[1]).map((s, i) => ({ ...s, days: s.expiringDays ?? 8, last: i === 2 }));
const ACTIVITY = [
  { icon: "link", who: "Phạm Thu Trang", action: "act.created_link", target: SHARES[3].name, href: `/shares/${SHARES[3].id}`, when: "10:05", day: "today" },
  { icon: "upload", who: "Aung Myat", action: "act.uploaded_video", target: "Su Su Hlaing", href: "/candidates/SV000219", when: "09:31", day: "today" },
  { icon: "plus", who: "Lê Văn Tùng", action: "act.imported", when: "17:50", day: "yesterday" },
  { icon: "user-check", who: "Nguyễn Thị Hương", action: "act.invited", target: "minh.tran@saoviet.vn", when: "15:12", day: "yesterday" },
] as const;

export default async function DashboardPage() {
  const t = await getTranslations();
  return (
    <main className="main" id="main">
      <div className="page-header">
        <div>
          <h1><span>{t("dash.greeting")}</span>, {ME.firstName}</h1>
          <p className="sub">{TENANT.name} · <span>{t("dash.date")}</span></p>
        </div>
        <div className="actions">
          <Link className="btn" href="/shares/new"><Icon name="link" /><span>{t("shares.new")}</span></Link>
          <Link className="btn btn-primary" href="/candidates/new"><Icon name="plus" /><span>{t("cand.add")}</span></Link>
        </div>
      </div>
      <div className="grid grid-4 mb-16">
        <div className="card kpi">
          <span className="label">{t("dash.kpi_candidates")}</span><span className="value">{KPIS.candidates}</span>
          <span className="delta up"><Icon name="arrow-right" className="ic-sm" />+{KPIS.newThisMonth} <span>{t("dash.this_month")}</span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_video")}</span><span className="value">{KPIS.withVideo}</span>
          <span className="delta">{KPIS.videoPct}% · {KPIS.withoutVideo} <span>{t("dash.missing_video")}</span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_links")}</span><span className="value">{KPIS.activeLinks}</span>
          <span className="delta"><span className="badge badge-warning badge-dot">{KPIS.expiring} <span>{t("dash.expiring")}</span></span></span>
        </div>
        <div className="card kpi">
          <span className="label">{t("dash.kpi_views")}</span><span className="value">{KPIS.viewsWeek}</span>
          <span className="delta up">{KPIS.viewsDelta} <span>{t("dash.vs_last_week")}</span></span>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>{t("dash.views_14")}</h2>
                <p className="small muted">{VIEWS_14D.total} <span>{t("common.views")}</span> · {VIEWS_14D.unique} <span>{t("common.unique_viewers")}</span> · <span>{t("dash.all_links")}</span></p>
              </div>
              <Link className="btn btn-sm" href="/shares">{t("dash.see_links")}</Link>
            </div>
            <div className="card-body">
              <BarChart values={[...VIEWS_14D.values]} labels={[...VIEWS_14D.labels]} highlightFrom={7} unit={t("common.views")} aria-label={t("dash.views_14")} />
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h2>{t("dash.recent_views")}</h2>
              <Link className="btn btn-sm btn-ghost" href={`/shares/${SHARES[0].id}`}>{t("common.view_all")}</Link>
            </div>
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
                  {RECENT_VIEWS.map((v, i) => (
                    <tr key={i}>
                      <td className="nowrap nums">{v.time} <span className="faint">{t(`common.${v.day}`)}</span></td>
                      <td>
                        <div className="person">
                          <span className="avatar avatar-sm">{v.viewer?.initials ?? "?"}</span>
                          <div>
                            {v.viewer ? (
                              <><div className="n">{v.viewer.name}</div><div className="k">{v.viewer.email}</div></>
                            ) : (
                              <><div className="n muted">{t("track.anonymous")}</div><div className="k">{t("track.no_identity")}</div></>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><Link href={`/shares/${v.link.id}`}>{v.link.name}</Link></td>
                      <td>{v.candidate} <span className="kana">{v.kana}</span></td>
                      <td className="small muted"><Icon name={v.device} className="ic-sm" style={{ display: "inline", verticalAlign: "-2px" }} /> {v.where}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="card-header"><h3>{t("dash.expiring_links")}</h3></div>
            <div className="card-body flush">
              {EXPIRING.map((s) => (
                <div key={s.id} className="doc-row" style={{ border: 0, borderBottom: s.last ? undefined : "1px solid var(--border)", borderRadius: 0 }}>
                  <Icon name="clock" />
                  <div className="grow">
                    <div className="n">{s.name}</div>
                    <div className="m">{s.candidateCount} <span>{t("common.candidates_lc")}</span> · <span>{t("common.expires")}</span> {s.expires.replace(" 2026", "")}</div>
                  </div>
                  <span className={s.days <= 5 ? "badge badge-warning" : "badge"}>{s.days} <span>{t("common.days")}</span></span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("dash.attention")}</h3></div>
            <div className="card-body stack" style={{ gap: "10px" }}>
              <Link className="row between" href="/candidates?video=0">
                <span className="row-nowrap"><Icon name="video" style={{ color: "var(--warning)" }} /><span>{KPIS.withoutVideo} <span>{t("dash.no_video")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
              <Link className="row between" href="/candidates?incomplete=1">
                <span className="row-nowrap"><Icon name="file" style={{ color: "var(--warning)" }} /><span>5 <span>{t("dash.incomplete")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
              <Link className="row between" href="/candidates/import/demo">
                <span className="row-nowrap"><Icon name="sparkles" style={{ color: "var(--info)" }} /><span>3 <span>{t("dash.imports_waiting")}</span></span></span>
                <Icon name="chev-right" className="ic-sm faint" />
              </Link>
            </div>
          </section>
          <section className="card">
            <div className="card-header"><h3>{t("dash.activity")}</h3></div>
            <div className="card-body">
              <ul className="timeline">
                {ACTIVITY.map((a, i) => (
                  <li key={i}>
                    <span className="dot"><Icon name={a.icon} /></span>
                    <div>
                      <div>
                        <b>{a.who}</b> <span>{t(a.action)}</span>{" "}
                        {"target" in a && ("href" in a ? <Link href={a.href}>{a.target}</Link> : a.target)}
                      </div>
                      <div className="when">{a.when} <span>{t(`common.${a.day}`)}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

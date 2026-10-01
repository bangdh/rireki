import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Rirekisho } from "@/components/rirekisho/Rirekisho";
import { Table } from "@/components/Table";
import { byCode, SAMPLE_CV, SAMPLE_CV_UPDATED_AT, shareById } from "@/lib/sample";
import { FLAGS, LINK_STATUS_BADGE, STATUS_BADGE } from "@/lib/ui";

// app/candidate-detail.html — tabs are the searchParam `tab`. TODO(candidates): candidate + cv body (zod) by tenantId/id,
// videos, documents, share-link aggregates, activity and notes from Prisma; actions as Server Actions.
const TABS = [
  ["cv", "file", "detail.tab_cv", null],
  ["videos", "video", "detail.tab_videos", 3],
  ["docs", "layers", "detail.tab_docs", 4],
  ["links", "link", "detail.tab_links", 2],
  ["activity", "activity", "detail.tab_activity", null],
  ["notes", "edit", "detail.tab_notes", 1],
] as const;
type Tab = (typeof TABS)[number][0];

const LINKS = [
  { share: shareById("8fK2mQx"), views: 24, unique: 3 },
  { share: shareById("p3Ldk9a"), views: 7, unique: 3 },
  { share: shareById("Ke017h"), views: 12, unique: 2 },
];

export default async function CandidateDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: requested } = await searchParams;
  const tab: Tab = TABS.some(([key]) => key === requested) ? (requested as Tab) : "cv";
  const t = await getTranslations();
  const c = byCode(id);
  const cv = SAMPLE_CV;
  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/candidates">{t("cand.title")}</Link><span>/</span><span className="mono">{c.code}</span></div>
      <div className="page-header" style={{ alignItems: "center" }}>
        <div className="row-nowrap" style={{ gap: "16px", alignItems: "flex-start" }}>
          <span className="avatar-photo lg">{c.initials}</span>
          <div className="col" style={{ gap: "6px" }}>
            <div>
              <h1 style={{ display: "inline" }}>{c.name}</h1> <span className="kana" style={{ fontSize: "13px" }}>{c.kana}</span>
            </div>
            <div className="row" style={{ gap: "6px" }}>
              <span className="badge badge-outline mono">{c.code}</span>
              <span className="badge"><span className="flag">{FLAGS[c.nationality]}</span> Vietnam</span>
              <span className="badge"><span>{t(`gender.${c.gender}`)}</span> · {c.age}</span>
              <span className="badge badge-primary">JLPT {c.jlpt}</span>
              <span className="badge">溶接 · 機械加工</span>
              <span className={STATUS_BADGE[c.status]}>{t(`status.${c.status}`)}</span>
            </div>
            <p className="small muted">
              <span>{t("detail.added")}</span> 12 May 2026 <span>{t("common.by")}</span> Lê Văn Tùng · <span>{t("common.updated")}</span> {c.updated} <span>{t("common.by")}</span> Phạm Thu Trang
            </p>
          </div>
        </div>
        <div className="actions">
          <Link className="btn" href={`/candidates/${c.id}/edit`}><Icon name="edit" /><span>{t("common.edit")}</span></Link>
          <Link className="btn btn-primary" href={`/shares/new?candidate=${c.id}`}><Icon name="link" /><span>{t("detail.share_single")}</span></Link>
          <Menu>
            <summary className="btn btn-icon" aria-label="More"><Icon name="more" /></summary>
            <div className="menu-list">
              <a href="#"><Icon name="download" /><span>{t("cand.export_pdf")}</span></a>
              <a href="#"><Icon name="printer" /><span>{t("common.print")}</span></a>
              <a href="#"><Icon name="copy" /><span>{t("common.duplicate")}</span></a>
              <a href="#"><Icon name="refresh" /><span>{t("detail.change_status")}</span></a>
              <hr />
              <a href="#" className="danger"><Icon name="archive" /><span>{t("common.archive")}</span></a>
            </div>
          </Menu>
        </div>
      </div>
      <div className="callout mb-16">
        <Icon name="eye" />
        <div>
          <span>{t("detail.in_links")}</span> <b>2 <span>{t("detail.active_links")}</span></b> · <b>31</b> <span>{t("common.views")}</span> <span>{t("common.by")}</span> 6 <span>{t("common.unique_viewers")}</span> · <span>{t("detail.last_viewed")}</span> 09:42 <span>{t("common.today")}</span> (田中 健一, ヤマト建設). <Link href="?tab=links">{t("detail.see_links")}</Link>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([key, icon, label, count]) => (
          <Link key={key} className={key === tab ? "tab active" : "tab"} href={key === "cv" ? `/candidates/${c.id}` : `?tab=${key}`}>
            <Icon name={icon} /><span>{t(label)}</span>{count !== null && <span className="count">{count}</span>}
          </Link>
        ))}
      </div>

      {tab === "cv" && (
        <div className="tab-panel">
          <div className="row between mb-16">
            <div className="row">
              <span className="small muted">{t("detail.cv_lang")}</span>
              <div className="segmented"><button className="active" type="button">日本語</button><button type="button">Tiếng Việt</button><button type="button">English</button></div>
            </div>
            <div className="row">
              <span className="badge badge-success"><Icon name="check" /><span>{t("detail.cv_complete")}</span></span>
              <button className="btn btn-sm" type="button"><Icon name="download" />PDF</button>
              <Link className="btn btn-sm" href={`/candidates/${c.id}/edit`}><Icon name="edit" /><span>{t("common.edit")}</span></Link>
            </div>
          </div>
          <Rirekisho cv={cv} asOf={SAMPLE_CV_UPDATED_AT} />
        </div>
      )}

      {tab === "videos" && (
        <div className="tab-panel">
          <div className="row between mb-16">
            <p className="muted">{t("detail.videos_hint")}</p>
            <button className="btn btn-primary" type="button"><Icon name="upload" /><span>{t("detail.upload_video")}</span></button>
          </div>
          <div className="grid grid-3">
            {[
              { title: "自己紹介（日本語）", lang: "日本語", size: "84 MB", date: "12 May 2026", dur: "1:32", plays: 18, watched: true, main: true },
              { title: "溶接実技デモ", lang: "—", size: "210 MB", date: "14 May 2026", dur: "2:45", plays: 11, watched: true, main: false },
              { title: "面接練習 Q&A", lang: "日本語", size: "156 MB", date: "20 Sep 2026", dur: "3:10", plays: 2, watched: false, main: false },
            ].map((v) => (
              <div className="video-card" key={v.title}>
                <div className="video-thumb">
                  {v.main && <span className="lbl badge badge-primary">{t("detail.main_video")}</span>}
                  <span className="play"><Icon name="play" /></span><span className="dur">{v.dur}</span>
                </div>
                <div className="video-meta">
                  <b>{v.title}</b>
                  <span className="small muted">{v.lang} · {v.size} · {v.date}</span>
                  <div className="row between mt-8">
                    <span className="small muted">{v.plays} <span>{t("detail.plays")}</span>{v.watched && <> · <span>{t("detail.avg_watch")}</span></>}</span>
                    <Menu>
                      <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                      <div className="menu-list">
                        <button type="button"><Icon name="edit" /><span>{t("common.rename")}</span></button>
                        <button type="button"><Icon name="refresh" /><span>{t("detail.replace")}</span></button>
                        <hr />
                        <button type="button" className="danger"><Icon name="trash" /><span>{t("common.delete")}</span></button>
                      </div>
                    </Menu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "docs" && (
        <div className="tab-panel">
          <div className="callout callout-warning mb-16"><Icon name="lock" /><div>{t("detail.docs_hint")}</div></div>
          <div className="stack" style={{ gap: "8px", maxWidth: "760px" }}>
            <div className="doc-row">
              <Icon name="file" />
              <div className="grow"><div className="n">CV_NguyenVanAn_original.docx</div><div className="m"><span>{t("detail.doc_original")}</span> · 412 KB · 12 May 2026 · Lê Văn Tùng</div></div>
              <span className="badge">{t("detail.doc_internal")}</span>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Download"><Icon name="download" /></button>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More"><Icon name="more" /></button>
            </div>
            <div className="doc-row">
              <Icon name="file" />
              <div className="grow"><div className="n">passport_scan.pdf</div><div className="m"><span>{t("form.doc_passport")}</span> · 1.1 MB · <span>{t("form.passport_exp")}</span> 2031-02-10</div></div>
              <span className="badge">{t("detail.doc_internal")}</span>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Download"><Icon name="download" /></button>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More"><Icon name="more" /></button>
            </div>
            <div className="doc-row">
              <Icon name="image" />
              <div className="grow"><div className="n">JLPT_N4_certificate.jpg</div><div className="m"><span>{t("form.doc_cert")}</span> · 640 KB</div></div>
              <span className="badge badge-success">{t("detail.doc_shareable")}</span>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Download"><Icon name="download" /></button>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More"><Icon name="more" /></button>
            </div>
            <div className="doc-row">
              <Icon name="file" />
              <div className="grow"><div className="n">health_check_2026-08.pdf</div><div className="m"><span>{t("detail.doc_health")}</span> · 2.3 MB</div></div>
              <span className="badge badge-success">{t("detail.doc_shareable")}</span>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Download"><Icon name="download" /></button>
              <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More"><Icon name="more" /></button>
            </div>
            <button className="btn" type="button" style={{ alignSelf: "flex-start" }}><Icon name="plus" /><span>{t("form.add_document")}</span></button>
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="tab-panel">
          <div className="card">
            <div className="table-wrap">
              <Table className="table">
                <thead>
                  <tr>
                    <th>{t("shares.link")}</th><th>{t("shares.client")}</th><th>{t("shares.protection")}</th><th className="num">{t("detail.views_this")}</th><th>{t("common.expires")}</th><th>{t("common.status")}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {LINKS.map(({ share: s, views, unique }) => (
                    <tr key={s.id} style={s.status === "active" ? undefined : { opacity: ".6" }}>
                      <td>
                        {s.status === "active" ? <Link href={`/shares/${s.id}`} className="cell-primary">{s.name}</Link> : <span className="cell-primary">{s.name}</span>}
                        <div className="cell-sub mono">rireki.app/s/{s.token.slice(0, 4)}…{s.token.slice(-2)}</div>
                      </td>
                      <td>{s.client}</td>
                      <td className="row">
                        {s.password ? <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span> : <span className="badge badge-outline"><Icon name="unlock" /><span>{t("shares.no_password")}</span></span>}
                        {s.download ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}
                      </td>
                      <td className="num">{views} · {unique} <span className="faint">{t("common.unique_short")}</span></td>
                      <td className="nowrap">{s.expires.includes("20") ? s.expires : `${s.expires} 2026`}</td>
                      <td><span className={LINK_STATUS_BADGE[s.status]}>{t(`common.${s.status}`)}</span></td>
                      <td>
                        {s.status === "active" && (
                          <div className="row-actions">
                            <CopyButton className="btn btn-ghost btn-icon btn-sm" title="Copy link" text={`https://saoviet.rireki.app/s/${s.token}`}><Icon name="copy" /></CopyButton>
                            <Link className="btn btn-ghost btn-icon btn-sm" href={`/shares/${s.id}`}><Icon name="chev-right" /></Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="tab-panel">
          <div className="card" style={{ maxWidth: "760px" }}>
            <div className="card-body">
              <ul className="timeline">
                <li><span className="dot"><Icon name="eye" /></span><div><div><b>田中 健一</b> (ヤマト建設) <span>{t("act.viewed_cv")}</span> 自己紹介（日本語） (100%)</div><div className="when">09:42 <span>{t("common.today")}</span> · Desktop · Nagoya</div></div></li>
                <li><span className="dot"><Icon name="star" /></span><div><div><b>田中 健一</b> <span>{t("act.marked_interested")}</span></div><div className="when">09:47 <span>{t("common.today")}</span></div></div></li>
                <li><span className="dot"><Icon name="refresh" /></span><div><div><b>Phạm Thu Trang</b> <span>{t("act.status_changed")}</span> <span className="badge badge-info">{t("status.available")}</span> → <span className="badge badge-success">{t("status.proposed")}</span></div><div className="when">28 Sep 2026</div></div></li>
                <li><span className="dot"><Icon name="link" /></span><div><div><b>Phạm Thu Trang</b> <span>{t("act.added_to_link")}</span> ヤマト建設様 溶接候補者</div><div className="when">26 Sep 2026</div></div></li>
                <li><span className="dot"><Icon name="video" /></span><div><div><b>Lê Văn Tùng</b> <span>{t("act.uploaded_video_solo")}</span> 面接練習 Q&A</div><div className="when">20 Sep 2026</div></div></li>
                <li><span className="dot"><Icon name="sparkles" /></span><div><div><b>Lê Văn Tùng</b> <span>{t("act.created_from_import")}</span> CV_NguyenVanAn_original.docx</div><div className="when">12 May 2026</div></div></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="tab-panel">
          <div className="stack" style={{ maxWidth: "760px" }}>
            <div className="callout"><Icon name="lock" /><span>{t("detail.notes_hint")}</span></div>
            <div className="card">
              <div className="card-body stack">
                <textarea className="textarea" placeholder={t("detail.note_ph")} aria-label={t("detail.add_note")} />
                <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn btn-primary" type="button">{t("detail.add_note")}</button></div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="row between">
                  <div className="person"><span className="avatar avatar-sm">TT</span><div><div className="n">Phạm Thu Trang</div><div className="k">28 Sep 2026 · 14:10</div></div></div>
                  <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More"><Icon name="more" /></button>
                </div>
                <p className="mt-12">Yamato asked for a welding test video with 3G position; already uploaded. Interview tentatively 8 Oct 10:00 JST via Zoom.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

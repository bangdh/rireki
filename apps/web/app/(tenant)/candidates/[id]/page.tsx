import { CvDraft, CvSchema } from "@rireki/shared";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { ageAt, Rirekisho } from "@/components/rirekisho/Rirekisho";
import { Table } from "@/components/Table";
import { candidateActivity, candidateNotes } from "@/lib/candidates/activity";
import { AuditLine, auditIcon } from "@/lib/candidates/AuditLine";
import { BUCKET, urlOf } from "@/lib/candidates/files";
import { countryName, DOC_TYPE_LABEL, fmtBytes, initials, shareHref, statusKey } from "@/lib/candidates/format";
import { getCandidateDetail, userNames } from "@/lib/candidates/queries";
import { When } from "@/lib/candidates/When";
import { requireMember, tenantUrl } from "@/lib/tenant";
import { FLAGS, LINK_STATUS_BADGE, STATUS_BADGE } from "@/lib/ui";
import { Photo } from "../CandidateTable";
import { AddDocument, DocActions, HeaderMenu, NoteForm, UploadVideo, VideoGrid, type VideoCard } from "./DetailActions";

// app/candidate-detail.html — tabs are the searchParam `tab`; the 履歴書 is always Japanese (same <Rirekisho/> as print/viewer).
const TABS = [
  ["cv", "file", "detail.tab_cv"],
  ["videos", "video", "detail.tab_videos"],
  ["docs", "layers", "detail.tab_docs"],
  ["links", "link", "detail.tab_links"],
  ["activity", "activity", "detail.tab_activity"],
  ["notes", "edit", "detail.tab_notes"],
] as const;
type Tab = (typeof TABS)[number][0];
const LINK_STATUS_KEY = { active: "common.active", expired: "common.expired", revoked: "common.revoked" } as const;
const linkStatus = (s: string): keyof typeof LINK_STATUS_KEY => (s in LINK_STATUS_KEY ? (s as keyof typeof LINK_STATUS_KEY) : "expired");

export default async function CandidateDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: requested } = await searchParams;
  const tab: Tab = TABS.some(([key]) => key === requested) ? (requested as Tab) : "cv";
  const { tenant } = await requireMember();
  const detail = await getCandidateDetail(tenant.id, id);
  if (!detail) notFound();
  const { candidate: c, links, stats, playsOf } = detail;
  const [t, f, locale, activity, notes, photoUrl] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getLocale(),
    candidateActivity(tenant.id, c.id),
    candidateNotes(tenant.id, c.id),
    urlOf(BUCKET.originals, c.photoKey),
  ]);
  const names = await userNames([
    c.createdById,
    c.updatedById,
    ...notes.map((n) => n.userId),
    ...activity.map((a) => (a.kind === "audit" ? a.row.userId : a.kind === "link" ? a.userId : null)),
  ]);
  const name = c.nameNative || c.nameLatin;
  const age = c.dob ? ageAt(c.dob.toISOString().slice(0, 10), new Date()) : null;
  const parsed = CvSchema.safeParse(c.cv);
  const cv = parsed.success ? parsed.data : (CvDraft.safeParse(c.cv).data ?? {});
  const statusClass = c.status in STATUS_BADGE ? STATUS_BADGE[c.status as keyof typeof STATUS_BADGE] : "badge";
  const date = (d: Date) => f.dateTime(d, { dateStyle: "medium" });
  const videoStatus = (s: string) => (s === "ready" ? t("common.ready") : s === "failed" ? t("common.failed") : t("common.processing")); // TODO(phase2): real progress
  const langName = (code: string | null) => {
    if (!code) return null;
    try {
      return new Intl.DisplayNames(locale, { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  const videos: VideoCard[] = await Promise.all(
    c.videos.map(async (v) => ({
      id: v.id,
      title: v.title,
      lang: langName(v.lang),
      statusText: videoStatus(v.status),
      durationSec: v.durationSec,
      created: date(v.createdAt),
      posterUrl: await urlOf(BUCKET.media, v.posterKey),
      srcUrl: await urlOf(BUCKET.originals, v.originalKey),
      plays: playsOf(v),
    })),
  );
  const counts: Partial<Record<Tab, number>> = { videos: c.videos.length, docs: c.documents.length, links: links.length, notes: notes.length };
  const docLabel = (type: string) => t(type in DOC_TYPE_LABEL ? DOC_TYPE_LABEL[type as keyof typeof DOC_TYPE_LABEL] : "common.other");

  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/candidates">{t("cand.title")}</Link><span>/</span><span className="mono">{c.code}</span></div>
      <div className="page-header" style={{ alignItems: "center" }}>
        <div className="row-nowrap" style={{ gap: "16px", alignItems: "flex-start" }}>
          <Photo url={photoUrl} initials={initials(c.nameLatin)} className="avatar-photo lg" />
          <div className="col" style={{ gap: "6px" }}>
            <div>
              <h1 style={{ display: "inline" }}>{name}</h1> <span className="kana" style={{ fontSize: "13px" }}>{c.nameKana}</span>
            </div>
            <div className="row" style={{ gap: "6px" }}>
              <span className="badge badge-outline mono">{c.code}</span>
              {c.nationality && <span className="badge"><span className="flag">{c.nationality in FLAGS ? FLAGS[c.nationality as keyof typeof FLAGS] : ""}</span> {countryName(locale, c.nationality)}</span>}
              {(c.gender || age !== null) && (
                <span className="badge">{c.gender && <span>{t(c.gender === "male" ? "gender.m" : "gender.f")}</span>}{c.gender && age !== null && " · "}{age}</span>
              )}
              {c.jlpt !== "none" && <span className="badge badge-primary">JLPT {c.jlpt}</span>}
              {c.tags.length > 0 && <span className="badge">{c.tags.join(" · ")}</span>}
              <span className={statusClass}>{t(statusKey(c.status))}</span>
            </div>
            <p className="small muted">
              <span>{t("detail.added")}</span> {date(c.createdAt)} {c.createdById && <><span>{t("common.by")}</span> {names.get(c.createdById)}</>} · <span>{t("common.updated")}</span> {date(c.updatedAt)}{" "}
              {c.updatedById && <><span>{t("common.by")}</span> {names.get(c.updatedById)}</>}
            </p>
          </div>
        </div>
        <div className="actions">
          <Link className="btn" href={`/candidates/${c.id}/edit`}><Icon name="edit" /><span>{t("common.edit")}</span></Link>
          <Link className="btn btn-primary" href={shareHref([c.id])}><Icon name="link" /><span>{t("detail.share_single")}</span></Link>
          <HeaderMenu id={c.id} status={c.status} />
        </div>
      </div>
      <div className="callout mb-16">
        <Icon name="eye" />
        <div>
          <span>{t("detail.in_links")}</span> <b>{stats.activeLinks} <span>{t("detail.active_links")}</span></b> · <b>{stats.views}</b> <span>{t("common.views")}</span> <span>{t("common.by")}</span> {stats.unique}{" "}
          <span>{t("common.unique_viewers")}</span>
          {stats.lastView && (
            <>
              {" "}· <span>{t("detail.last_viewed")}</span> <When date={stats.lastView.createdAt} />
              {(stats.lastView.viewer?.name || stats.lastView.shareLink.clientCompany) && ` (${[stats.lastView.viewer?.name, stats.lastView.shareLink.clientCompany].filter(Boolean).join(", ")})`}
            </>
          )}
          . <Link href="?tab=links">{t("detail.see_links")}</Link>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([key, icon, label]) => (
          <Link key={key} className={key === tab ? "tab active" : "tab"} href={key === "cv" ? `/candidates/${c.id}` : `?tab=${key}`}>
            <Icon name={icon} /><span>{t(label)}</span>{counts[key] !== undefined && <span className="count">{counts[key]}</span>}
          </Link>
        ))}
      </div>

      {tab === "cv" && (
        <div className="tab-panel">
          <div className="row between mb-16">
            <div className="row">
              <span className="small muted">{t("detail.cv_lang")}</span>
              {/* TODO(phase2): Vietnamese / English versions of the CV */}
              <div className="segmented"><button className="active" type="button">日本語</button><button type="button" disabled>Tiếng Việt</button><button type="button" disabled>English</button></div>
            </div>
            <div className="row">
              <span className={c.completeness >= 80 ? "badge badge-success" : "badge badge-warning"}><Icon name="check" /><span>{t("form.completeness")} · {c.completeness}%</span></span>
              <a className="btn btn-sm" href={`/api/candidates/${c.id}/pdf`} target="_blank" rel="noreferrer"><Icon name="download" />PDF</a>
              <Link className="btn btn-sm" href={`/candidates/${c.id}/edit`}><Icon name="edit" /><span>{t("common.edit")}</span></Link>
            </div>
          </div>
          <Rirekisho cv={cv} asOf={c.updatedAt} photoUrl={photoUrl ?? undefined} />
        </div>
      )}

      {tab === "videos" && (
        <div className="tab-panel">
          <div className="row between mb-16">
            <p className="muted">{t("detail.videos_hint")}</p>
            <UploadVideo candidateId={c.id} />
          </div>
          {videos.length === 0 ? <div className="empty"><Icon name="video" /><span>{t("common.none")}</span></div> : <VideoGrid candidateId={c.id} videos={videos} />}
        </div>
      )}

      {tab === "docs" && (
        <div className="tab-panel">
          <div className="callout callout-warning mb-16"><Icon name="lock" /><div>{t("detail.docs_hint")}</div></div>
          <div className="stack" style={{ gap: "8px", maxWidth: "760px" }}>
            {c.documents.map((d) => (
              <div className="doc-row" key={d.id}>
                <Icon name={/\.(jpe?g|png|webp|heic)$/i.test(d.name) ? "image" : "file"} />
                <div className="grow">
                  <div className="n">{d.name}</div>
                  <div className="m"><span>{docLabel(d.type)}</span> · {fmtBytes(d.size)} · {date(d.createdAt)}</div>
                </div>
                <span className={d.shareable ? "badge badge-success" : "badge"}>{t(d.shareable ? "detail.doc_shareable" : "detail.doc_internal")}</span>
                <a className="btn btn-ghost btn-icon btn-sm" href={`/api/candidates/${c.id}/documents/${d.id}`} aria-label="Download"><Icon name="download" /></a>
                <DocActions doc={{ id: d.id, shareable: d.shareable }} />
              </div>
            ))}
            <AddDocument candidateId={c.id} />
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="tab-panel">
          <div className="card">
            {links.length === 0 ? (
              <div className="empty"><Icon name="link" /><span>{t("common.none")}</span></div>
            ) : (
              <div className="table-wrap">
                <Table className="table">
                  <thead>
                    <tr>
                      <th>{t("shares.link")}</th><th>{t("shares.client")}</th><th>{t("shares.protection")}</th><th className="num">{t("detail.views_this")}</th><th>{t("common.expires")}</th><th>{t("common.status")}</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => {
                      const url = `${tenantUrl(tenant.slug)}/s/${l.token}`;
                      const active = l.status === "active";
                      return (
                        <tr key={l.id} style={active ? undefined : { opacity: ".6" }}>
                          <td>
                            {active ? <Link href={`/shares/${l.id}`} className="cell-primary">{l.name}</Link> : <span className="cell-primary">{l.name}</span>}
                            <div className="cell-sub mono">{url.replace(/^https?:\/\//, "").replace(l.token, `${l.token.slice(0, 4)}…${l.token.slice(-2)}`)}</div>
                          </td>
                          <td>{l.clientCompany}</td>
                          <td className="row">
                            {l.passwordHash ? <span className="badge"><Icon name="lock" /><span>{t("shares.password")}</span></span> : <span className="badge badge-outline"><Icon name="unlock" /><span>{t("shares.no_password")}</span></span>}
                            {l.downloadAllowed ? <span className="badge badge-info"><Icon name="download" /><span>{t("shares.download_allowed")}</span></span> : <span className="badge badge-warning"><Icon name="eye" /><span>{t("shares.view_only")}</span></span>}
                          </td>
                          <td className="num">{l.views} · {l.unique} <span className="faint">{t("common.unique_short")}</span></td>
                          <td className="nowrap">{l.expiresAt ? date(l.expiresAt) : "—"}</td>
                          <td><span className={LINK_STATUS_BADGE[linkStatus(l.status)]}>{t(LINK_STATUS_KEY[linkStatus(l.status)])}</span></td>
                          <td>
                            {active && (
                              <div className="row-actions">
                                <CopyButton className="btn btn-ghost btn-icon btn-sm" title={t("common.copy_link")} text={url}><Icon name="copy" /></CopyButton>
                                <Link className="btn btn-ghost btn-icon btn-sm" href={`/shares/${l.id}`}><Icon name="chev-right" /></Link>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="tab-panel">
          <div className="card" style={{ maxWidth: "760px" }}>
            <div className="card-body">
              {activity.length === 0 ? (
                <div className="empty"><Icon name="activity" /><span>{t("common.none")}</span></div>
              ) : (
                <ul className="timeline">
                  {activity.map((a, i) => (
                    <li key={i}>
                      <span className="dot"><Icon name={a.kind === "view" ? "eye" : a.kind === "interest" ? "star" : a.kind === "video" ? "video" : a.kind === "link" ? "link" : auditIcon(a.row)} /></span>
                      <div>
                        {a.kind === "view" && (
                          <div>
                            <b>{a.who ?? t("track.anonymous")}</b> {a.company && `(${a.company})`}{" "}
                            {a.played ? <><span>{t("act.viewed_cv")}</span> {a.played.title}{a.played.progress !== null && ` (${a.played.progress}%)`}</> : <span>{t("track.a_opened_cv")}</span>}
                          </div>
                        )}
                        {a.kind === "interest" && <div><b>{a.who ?? t("track.anonymous")}</b> <span>{t("act.marked_interested")}</span></div>}
                        {a.kind === "audit" && <AuditLine row={a.row} who={names.get(a.row.userId ?? "") ?? null} />}
                        {a.kind === "video" && <div><span>{t("act.uploaded_video_solo")}</span> {a.title}</div>}
                        {a.kind === "link" && <div><b>{names.get(a.userId)}</b> <span>{t("act.added_to_link")}</span> <Link href={`/shares/${a.linkId}`}>{a.name}</Link></div>}
                        <div className="when"><When date={a.at} /></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="tab-panel">
          <div className="stack" style={{ maxWidth: "760px" }}>
            <div className="callout"><Icon name="lock" /><span>{t("detail.notes_hint")}</span></div>
            <NoteForm id={c.id} />
            {notes.map((n) => {
              const author = names.get(n.userId ?? "") ?? "";
              return (
                <div className="card" key={n.id}>
                  <div className="card-body">
                    <div className="row between">
                      <div className="person"><span className="avatar avatar-sm">{initials(author)}</span><div><div className="n">{author}</div><div className="k"><When date={n.createdAt} time /></div></div></div>
                      {/* TODO(phase2): edit / delete notes */}
                      <button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="More" disabled><Icon name="more" /></button>
                    </div>
                    <p className="mt-12" style={{ whiteSpace: "pre-wrap" }}>{n.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

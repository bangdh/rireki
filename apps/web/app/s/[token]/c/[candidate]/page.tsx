import { prisma } from "@rireki/db";
import { CvDraft, JOB, type DocumentType } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProtectedPage } from "@/components/ProtectedPage";
import { ageAt, Rirekisho } from "@/components/rirekisho/Rirekisho";
import { Watermark } from "@/components/Watermark";
import { DOC_TYPE_LABEL } from "@/lib/candidates/format";
import { logEvent } from "@/lib/shares/events";
import { experienceLabel, initials, SITUATION_JA, stripSections } from "@/lib/shares/format";
import { queue } from "@/lib/shares/mail";
import { BUCKET, presignGet } from "@/lib/shares/s3";
import { loadViewer, requireViewer } from "@/lib/shares/viewer";
import { COUNTRY_JA, FLAGS } from "@/lib/ui";
import { ViewerFooter, ViewerHeader } from "../../ViewerChrome";
import { FeedbackForm, InterestButton } from "./FeedbackForm";
import { Player } from "./Player";
import { PrintButton, Tracking } from "./Tracking";

// viewer/detail.html — one candidate of the link: the 履歴書 (watermarked PNG pages from the media lane's /api/s/{token}/cv
// route on view-only links, the React render otherwise), videos over signed HLS, shareable documents, feedback.
type Params = { params: Promise<{ token: string; candidate: string }> };
const docLabel = (type: string) => (type in DOC_TYPE_LABEL ? DOC_TYPE_LABEL[type as DocumentType] : "common.other");
const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

export async function generateMetadata({ params }: Params) {
  const { token, candidate } = await params;
  const ctx = await loadViewer(token);
  const c = ctx?.link.candidates.find((x) => x.candidateId === candidate)?.candidate;
  return { title: ctx ? [ctx.tenant.name, c?.nameKana].filter(Boolean).join(" · ") : "Rireki" };
}

export default async function ViewerCandidatePage({ params }: Params) {
  const { token, candidate: candidateId } = await params;
  const ctx = await requireViewer(token);
  const { link, viewer, sections } = ctx;
  const index = link.candidates.findIndex((x) => x.candidateId === candidateId);
  if (index < 0) notFound();
  const viewOnly = !link.downloadAllowed;
  const [t, c, renders, feedback, eventId] = await Promise.all([
    getTranslations(),
    prisma.candidate.findFirst({
      where: { id: candidateId, tenantId: link.tenantId },
      include: { videos: { where: { status: "ready" }, orderBy: { position: "asc" } }, documents: { where: { shareable: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.render.findMany({ where: { tenantId: link.tenantId, candidateId }, orderBy: [{ version: "desc" }, { page: "asc" }] }),
    prisma.feedback.findFirst({ where: { shareLinkId: link.id, viewerId: viewer.id, candidateId } }),
    // the one open_cv of this visit; <Tracking> adds 30 s to its durationSec per heartbeat
    logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, candidateId, type: "open_cv", durationSec: 0 }),
  ]);
  if (!c) notFound();
  const pages = renders.filter((r) => r.version === renders[0]?.version); // latest rendered version only
  if (viewOnly && pages.length === 0) {
    // TODO(phase2): until the worker has rendered the PNGs the React 履歴書 shows under the watermark; ask for them.
    // Same jobId as the media lane (render:{candidateId}:{version}) so the request dedupes; BullMQ only allows ':' in 3-part ids.
    const version = Math.floor(c.updatedAt.getTime() / 1000);
    void queue()
      .add(JOB.renderPages, { tenantId: link.tenantId, candidateId: c.id, version }, { jobId: `render:${c.id}:${version}`, removeOnComplete: true, removeOnFail: true })
      .catch((e) => console.error("[render] enqueue failed", e));
  }
  const cv = stripSections(CvDraft.safeParse(c.cv).data ?? {}, sections);
  const photoUrl = sections.photo && c.photoKey ? await presignGet(BUCKET.originals, c.photoKey) : null;
  const watermark = [viewer.name ?? t("track.anonymous"), viewer.email].filter(Boolean).join(" · ");
  const nat = c.nationality && c.nationality in FLAGS ? (c.nationality as keyof typeof FLAGS) : null;
  const age = c.dob ? ageAt(c.dob.toISOString().slice(0, 10), new Date()) : null;
  const experience = experienceLabel(cv);
  const prev = link.candidates[index - 1];
  const next = link.candidates[index + 1];
  const videos = sections.videos ? c.videos : [];
  const docs = sections.documents ? c.documents : [];

  return (
    <>
      <ViewerHeader ctx={ctx} token={token} back />
      <main className={viewOnly ? "viewer-main protected-content" : "viewer-main"}>
        <div className="container">
          <div className="row between mb-16" style={{ alignItems: "flex-start" }}>
            <div className="row-nowrap" style={{ gap: "14px", alignItems: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL */}
              {photoUrl ? <img className="avatar-photo lg" src={photoUrl} alt="" style={{ objectFit: "cover" }} draggable={false} /> : <span className="avatar-photo lg">{initials(c.nameLatin)}</span>}
              <div className="col" style={{ gap: "4px" }}>
                <h1 style={{ fontSize: "24px" }}>{c.nameKana}</h1>
                <div className="muted">{c.nameNative || c.nameLatin} · <span className="mono">{c.code}</span></div>
                <div className="row" style={{ gap: "6px" }}>
                  {(c.gender || age !== null) && <span className="badge">{[c.gender === "male" ? "男" : c.gender === "female" ? "女" : "", age !== null && `${age}歳`].filter(Boolean).join(" · ")}</span>}
                  {nat && <span className="badge">{FLAGS[nat]} {COUNTRY_JA[nat]}</span>}
                  {c.jlpt !== "none" && <span className="badge badge-primary">JLPT {c.jlpt}</span>}
                  <span className="badge">{[c.tags[0], experience].filter(Boolean).join(" · ")}</span>
                </div>
              </div>
            </div>
            <div className="row">
              {prev ? <Link className="btn btn-icon hide-mobile" href={`/s/${token}/c/${prev.candidateId}`} prefetch={false} aria-label="Previous"><Icon name="chev-left" /></Link> : <button className="btn btn-icon hide-mobile" type="button" disabled aria-label="Previous"><Icon name="chev-left" /></button>}
              <span className="small muted hide-mobile nums">{index + 1} / {link.candidates.length}</span>
              {next ? <Link className="btn btn-icon hide-mobile" href={`/s/${token}/c/${next.candidateId}`} prefetch={false} aria-label="Next"><Icon name="chev-right" /></Link> : <button className="btn btn-icon hide-mobile" type="button" disabled aria-label="Next"><Icon name="chev-right" /></button>}
              {sections.feedback && <InterestButton token={token} candidateId={c.id} interested={feedback?.verdict === "interested"} />}
            </div>
          </div>

          <div className="grid grid-main-aside">
            <div className="stack">
              <div className="row between">
                <div className="row">
                  <span className="small muted">{t("detail.cv_lang")}</span>
                  {/* TODO(phase2): English rendition of the 履歴書 */}
                  <div className="segmented"><button className="active" type="button">日本語</button><button type="button" disabled>English</button></div>
                </div>
                {viewOnly ? <span className="protected-notice"><Icon name="lock" className="ic-sm" /><span>{t("viewer.rendered")}</span></span> : <PrintButton token={token} candidateId={c.id} />}
              </div>
              <div className="wm-host">
                {viewOnly && <Watermark text={watermark} />}
                {viewOnly && pages.length > 0 ? (
                  pages.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element -- watermarked PNG streamed by /api/s/[token]/cv (media lane)
                    <img key={p.page} src={`/api/s/${token}/cv/${c.id}/${p.page}`} alt="" draggable={false} style={{ width: "100%", display: "block" }} />
                  ))
                ) : (
                  <Rirekisho cv={cv} asOf={c.updatedAt} photoUrl={photoUrl ?? undefined} hideContact={!sections.contact} hideFamily={!sections.family} hideHealth={!sections.health} hidePhoto={!sections.photo} />
                )}
              </div>
            </div>

            <aside className="stack sticky-aside">
              {sections.videos && (
                <section className="card">
                  <div className="card-header">
                    <h3>{t("viewer.videos_t")}</h3>
                    <span className="badge">{videos.length}</span>
                  </div>
                  <div className="card-body stack">
                    {videos.length > 0 ? (
                      <Player token={token} videos={videos.map((v) => ({ id: v.id, title: v.title, lang: v.lang, durationSec: v.durationSec }))} watermark={watermark} viewOnly={viewOnly} />
                    ) : (
                      <span className="small muted">{t("common.none")}</span>
                    )}
                  </div>
                </section>
              )}
              <section className="card">
                <div className="card-header"><h3>{t("viewer.summary")}</h3></div>
                <div className="card-body">
                  <dl className="kv">
                    <dt>{t("form.status")}</dt><dd>{SITUATION_JA[cv.situation ?? "job_hunting"]}</dd>
                    <dt>{t("form.work")}</dt><dd>{[c.tags[0], experience].filter(Boolean).join(" · ")}</dd>
                    <dt>{t("form.licenses")}</dt><dd>{(cv.licenses ?? []).map((l) => l.name).join(" · ") || "—"}</dd>
                    <dt>{t("form.ja_level")}</dt><dd>{cv.jaLevel ?? "—"} / 10（当社評価）</dd>
                    <dt>{t("form.en_level")}</dt><dd>{cv.enLevel ?? "—"} / 10（当社評価）</dd>
                    <dt>{t("form.wishes")}</dt><dd>{[cv.wishLocation && `勤務地：${cv.wishLocation}`, cv.wishHours && `勤務時間：${cv.wishHours}`].filter(Boolean).join(" · ") || "—"}</dd>
                    {sections.health && (
                      <>
                        <dt>{t("form.health")}</dt>
                        <dd>{[cv.heightCm && `${cv.heightCm} cm`, cv.weightKg && `${cv.weightKg} kg`, cv.clothingSize && `服 ${cv.clothingSize}`, cv.shoeCm && `靴 ${cv.shoeCm} cm`].filter(Boolean).join(" · ") || "—"}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </section>
              {docs.length > 0 && (
                <section className="card">
                  <div className="card-header"><h3>{t("detail.tab_docs")}</h3><span className="badge">{docs.length}</span></div>
                  <div className="card-body stack" style={{ gap: "6px" }}>
                    {docs.map((d) => (
                      <div key={d.id} className="doc-row">
                        <Icon name="file" />
                        <div className="grow"><div className="n">{d.name}</div><div className="m">{t(docLabel(d.type))} · {mb(d.size)}</div></div>
                        {link.downloadAllowed && <a className="btn btn-ghost btn-icon btn-sm" href={`/api/s/${token}/download/${d.id}`} aria-label={t("shares.download_allowed")}><Icon name="download" /></a>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {sections.feedback && <FeedbackForm token={token} candidateId={c.id} current={feedback?.verdict ?? null} comment={feedback?.comment ?? null} tenant={ctx.tenant.name} />}
              {viewOnly && <div className="callout small"><Icon name="lock" /><div>{t("viewer.protection_note")}</div></div>}
            </aside>
          </div>
        </div>
      </main>
      <ViewerFooter ctx={ctx} />
      <Tracking token={token} eventId={eventId} candidateId={c.id} protect={viewOnly} />
      {viewOnly && <ProtectedPage printMessage={`${ctx.tenant.name}: ${t("ui.blocked")}`} />}
    </>
  );
}

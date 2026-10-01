import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Rirekisho } from "@/components/rirekisho/Rirekisho";
import { Watermark } from "@/components/Watermark";
import { byCode, LINK, SAMPLE_CV, SAMPLE_CV_UPDATED_AT, TENANT, VIEWER } from "@/lib/sample";
import { COUNTRY_JA, FLAGS } from "@/lib/ui";
import { ViewerFooter, ViewerHeader } from "../../ViewerChrome";

// viewer/detail.html — view-only 履歴書 + videos for one candidate of the link.
// TODO(share-viewer): candidate must belong to the link; view-only links serve the CV as watermarked PNG pages from
// /api/s/{token}/cv/… (this React render is for download-allowed links and the print route); HLS player (hls.js) with signed
// manifest; feedback Server Action (`interest` event + email); log `open_cv` + heartbeat duration; prev/next within the link.
export default async function ViewerCandidatePage({ params }: { params: Promise<{ token: string; candidate: string }> }) {
  const { token, candidate } = await params;
  const t = await getTranslations();
  const c = byCode(candidate);
  const wm = `${VIEWER.name} · ${VIEWER.email}`;
  return (
    <>
      <ViewerHeader token={token} back />
      <main className="viewer-main protected-content">
        <div className="container">
          <div className="row between mb-16" style={{ alignItems: "flex-start" }}>
            <div className="row-nowrap" style={{ gap: "14px", alignItems: "flex-start" }}>
              <span className="avatar-photo lg">{c.initials}</span>
              <div className="col" style={{ gap: "4px" }}>
                <h1 style={{ fontSize: "24px" }}>{c.kana}</h1>
                <div className="muted">{c.name} · <span className="mono">{c.code}</span></div>
                <div className="row" style={{ gap: "6px" }}>
                  <span className="badge">{c.gender === "m" ? "男" : "女"} · {c.age}歳</span>
                  <span className="badge">{FLAGS[c.nationality]} {COUNTRY_JA[c.nationality]}</span>
                  <span className="badge badge-primary">JLPT {c.jlpt}</span>
                  <span className="badge">{c.job} · 実務2年</span>
                  <span className="badge">渡航可能 2027年1月</span>
                </div>
              </div>
            </div>
            <div className="row">
              <button className="btn btn-icon hide-mobile" type="button" aria-label="Previous"><Icon name="chev-left" /></button>
              <span className="small muted hide-mobile nums">1 / {LINK.candidateCount}</span>
              <button className="btn btn-icon hide-mobile" type="button" aria-label="Next"><Icon name="chev-right" /></button>
              <button className="btn btn-primary" type="button" id="interestBtn"><Icon name="star" /><span>{t("viewer.interested")}</span></button>
            </div>
          </div>
          <div className="grid grid-main-aside">
            <div className="stack">
              <div className="row between">
                <div className="row">
                  <span className="small muted">{t("detail.cv_lang")}</span>
                  <div className="segmented"><button className="active" type="button">日本語</button><button type="button">English</button></div>
                </div>
                <span className="protected-notice"><Icon name="lock" className="ic-sm" /><span>{t("viewer.rendered")}</span></span>
              </div>
              <div className="wm-host">
                <Watermark text={wm} />
                <Rirekisho cv={SAMPLE_CV} asOf={SAMPLE_CV_UPDATED_AT} hideContact />
              </div>
            </div>
            <aside className="stack sticky-aside">
              <section className="card">
                <div className="card-header">
                  <h3>{t("viewer.videos_t")}</h3>
                  <span className="badge">{c.videos}</span>
                </div>
                <div className="card-body stack">
                  <div className="player wm-host">
                    <Watermark text={wm} light />
                    <span className="video-thumb" style={{ position: "absolute", inset: "0", background: "transparent" }}><span className="play"><Icon name="play" /></span></span>
                    <div className="controls">
                      <Icon name="play" className="ic-sm" /><span>0:35</span><span className="prog"><i></i></span><span>1:32</span><Icon name="globe" className="ic-sm" />
                    </div>
                  </div>
                  <div className="stack" style={{ gap: "6px" }}>
                    {[
                      { title: "自己紹介（日本語）", meta: "1:32 · 日本語", active: true },
                      { title: "溶接実技デモ", meta: "2:45" },
                      { title: "面接練習 Q&A", meta: "3:10 · 日本語" },
                    ].map((v) => (
                      <button key={v.title} className="doc-row" type="button" style={v.active ? { textAlign: "left", background: "var(--primary-soft)", borderColor: "var(--primary)" } : { textAlign: "left", background: "var(--surface)" }}>
                        <Icon name="play" />
                        <div className="grow"><div className="n">{v.title}</div><div className="m">{v.meta}</div></div>
                      </button>
                    ))}
                  </div>
                  <p className="hint">{t("viewer.video_hint")}</p>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("viewer.summary")}</h3></div>
                <div className="card-body">
                  <dl className="kv">
                    <dt>{t("form.status")}</dt><dd>就職活動中</dd>
                    <dt>{t("form.work")}</dt><dd>溶接工 1年10ヶ月（MIG/TIG）</dd>
                    <dt>{t("form.licenses")}</dt><dd>溶接技能証明書 3G · JLPT N4（2025年12月）</dd>
                    <dt>{t("form.ja_level")}</dt><dd>{SAMPLE_CV.jaLevel} / 10（当社評価）</dd>
                    <dt>{t("form.en_level")}</dt><dd>{SAMPLE_CV.enLevel} / 10（当社評価）</dd>
                    <dt>{t("form.wishes")}</dt><dd>勤務地：全国どこでも · 勤務時間：会社スケジュール</dd>
                    <dt>{t("form.health")}</dt><dd>{SAMPLE_CV.heightCm} cm · {SAMPLE_CV.weightKg} kg · 服 {SAMPLE_CV.clothingSize} · 靴 {SAMPLE_CV.shoeCm} cm · アレルギー無</dd>
                  </dl>
                </div>
              </section>
              <section className="card">
                <div className="card-header"><h3>{t("viewer.feedback")}</h3></div>
                <div className="card-body stack">
                  <div className="row" style={{ gap: "6px" }}>
                    <button className="filter-chip active" type="button"><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} /><span>{t("viewer.interested")}</span></button>
                    <button className="filter-chip" type="button">{t("viewer.maybe")}</button>
                    <button className="filter-chip" type="button">{t("viewer.pass")}</button>
                  </div>
                  <textarea className="textarea" style={{ minHeight: "70px" }} defaultValue="10月8日 10:00に面接希望です。" aria-label={t("viewer.feedback")} />
                  <button className="btn btn-primary" type="button">{t("viewer.send_feedback")}</button>
                  <p className="hint">{t("viewer.feedback_hint")}</p>
                </div>
              </section>
              <div className="callout small"><Icon name="lock" /><div>{t("viewer.protection_note")}</div></div>
            </aside>
          </div>
        </div>
      </main>
      <ViewerFooter />
      <ProtectedPage printMessage={`${TENANT.name}: printing is disabled for this link.`} />
    </>
  );
}

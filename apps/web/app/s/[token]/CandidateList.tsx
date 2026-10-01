import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Watermark } from "@/components/Watermark";
import { byCode, LINK, TENANT, VIEWER } from "@/lib/sample";
import { COUNTRY_JA, FLAGS } from "@/lib/ui";
import { ViewerFooter, ViewerHeader } from "./ViewerChrome";

// viewer/list.html — the candidates of a link, in the sender's order. Card facts are Japanese content from the CV.
// TODO(share-viewer): candidates of the link with the sections it allows, log `open_list`, feedback marks of this viewer.
const CARDS = [
  { code: "SV000182", exp: "実務2年", interested: true },
  { code: "SV000215", exp: "実務1年" },
  { code: "SV000224", exp: "実務4年" },
  { code: "SV000188", exp: "実務3年" },
  { code: "SV000201", exp: "新卒" },
];

export async function CandidateList({ token }: { token: string }) {
  const t = await getTranslations();
  return (
    <>
      <ViewerHeader token={token} />
      <main className="viewer-main protected-content">
        <div className="container stack-lg">
          <div className="row between" style={{ alignItems: "flex-end" }}>
            <div>
              <span className="eyebrow">{t("viewer.candidates_for")}</span>
              <h1 style={{ fontSize: "24px" }}>{LINK.client} · 溶接</h1>
              <p className="muted small">
                {LINK.candidateCount} <span>{t("common.candidates_lc")}</span> · <span>{t("viewer.valid_until")}</span> {LINK.expiresJa} · <span>{t("viewer.sent_by")}</span> {TENANT.contact.name}
              </p>
            </div>
            <div className="row">
              <select className="select select-sm" style={{ width: "auto" }} aria-label={t("viewer.sort_sender")}>
                <option value="sender">{t("viewer.sort_sender")}</option><option value="age">{t("viewer.sort_age")}</option><option value="jlpt">{t("viewer.sort_jlpt")}</option>
              </select>
            </div>
          </div>
          <div className="row" style={{ gap: "6px" }}>
            <button className="filter-chip active" type="button">{t("common.all")}</button>
            <button className="filter-chip" type="button">N3+</button>
            <button className="filter-chip" type="button">{t("viewer.with_video")}</button>
            <button className="filter-chip" type="button">{t("viewer.experienced")}</button>
            <button className="filter-chip" type="button"><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} /><span>{t("viewer.my_interested")}</span> (1)</button>
          </div>
          <div className="cand-grid wm-host">
            <Watermark text={`${VIEWER.name} · ${VIEWER.email}`} />
            {CARDS.map(({ code, exp, interested }) => {
              const c = byCode(code);
              return (
                <Link className="cand-card" href={`/s/${token}/c/${c.id}`} key={c.id}>
                  <span className="avatar-photo lg">{c.initials}</span>
                  <div className="grow">
                    <div className="row between">
                      <div className="n">{c.kana}</div>
                      {interested && <Icon name="star" style={{ color: "var(--warning)" }} />}
                    </div>
                    <div className="k">{c.name} · {c.code}</div>
                    <div className="facts">
                      <span>{c.gender === "m" ? "男" : "女"} · {c.age}歳 · {FLAGS[c.nationality]} {COUNTRY_JA[c.nationality]}</span>
                      <span>{c.job} · {exp} · JLPT {c.jlpt}</span>
                      <span className="row-nowrap"><Icon name="video" className="ic-sm" />{c.videos} <span>{t("viewer.videos")}</span></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="callout">
            <Icon name="mail" />
            <div>
              <b>{t("viewer.contact_sender_t")}</b><br /><span>{t("viewer.contact_sender_d")}</span> {TENANT.contact.name} · {TENANT.contact.email} · {TENANT.contact.phone}
            </div>
          </div>
        </div>
      </main>
      <ViewerFooter />
      <ProtectedPage printMessage="Printing is disabled for this link." />
    </>
  );
}

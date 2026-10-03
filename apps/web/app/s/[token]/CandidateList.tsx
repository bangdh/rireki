"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Watermark } from "@/components/Watermark";

/** One card of viewer/list.html, pre-shaped by the server page (Japanese content from the CV). */
export type Card = {
  id: string;
  code: string;
  kana: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  gender: string;
  age: number | null;
  flag: string;
  country: string;
  job: string;
  experience: string;
  jlpt: string;
  jlptRank: number;
  videos: number;
  interested: boolean;
};

type Filter = "all" | "n3" | "video" | "exp" | "mine";
type Sort = "sender" | "age" | "jlpt";

/** The candidates of a link in the sender's order; chips and sort are client-side only (no URL state). */
export function CandidateList({ token, cards, watermark, title, subtitle }: { token: string; cards: Card[]; watermark: string; title: string; subtitle: string }) {
  const t = useTranslations();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("sender");
  const mine = cards.filter((c) => c.interested).length;
  const shown = cards
    .filter((c) => (filter === "n3" ? c.jlptRank <= 3 : filter === "video" ? c.videos > 0 : filter === "exp" ? c.experience !== "新卒" : filter === "mine" ? c.interested : true))
    .sort((a, b) => (sort === "age" ? (a.age ?? 999) - (b.age ?? 999) : sort === "jlpt" ? a.jlptRank - b.jlptRank : 0));
  const chip = (key: Filter, label: React.ReactNode) => (
    <button key={key} className={filter === key ? "filter-chip active" : "filter-chip"} type="button" onClick={() => setFilter(key)}>
      {label}
    </button>
  );
  return (
    <>
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div>
          <span className="eyebrow">{t("viewer.candidates_for")}</span>
          <h1 style={{ fontSize: "24px" }}>{title}</h1>
          <p className="muted small">{subtitle}</p>
        </div>
        <div className="row">
          <select className="select select-sm" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("viewer.sort_sender")}>
            <option value="sender">{t("viewer.sort_sender")}</option><option value="age">{t("viewer.sort_age")}</option><option value="jlpt">{t("viewer.sort_jlpt")}</option>
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: "6px" }}>
        {chip("all", t("common.all"))}
        {chip("n3", "N3+")}
        {chip("video", t("viewer.with_video"))}
        {chip("exp", t("viewer.experienced"))}
        {chip("mine", <><Icon name="star" className="ic-sm" style={{ color: "var(--warning)" }} /><span>{t("viewer.my_interested")}</span> ({mine})</>)}
      </div>
      <div className="cand-grid wm-host">
        <Watermark text={watermark} />
        {shown.map((c) => (
          <Link className="cand-card" href={`/s/${token}/c/${c.id}`} key={c.id} prefetch={false}>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL */}
            {c.photoUrl ? <img className="avatar-photo lg" src={c.photoUrl} alt="" style={{ objectFit: "cover" }} draggable={false} /> : <span className="avatar-photo lg">{c.initials}</span>}
            <div className="grow">
              <div className="row between">
                <div className="n">{c.kana}</div>
                {c.interested && <Icon name="star" style={{ color: "var(--warning)" }} />}
              </div>
              <div className="k">{c.name} · {c.code}</div>
              <div className="facts">
                <span>{[c.gender, c.age !== null && `${c.age}歳`, c.country && `${c.flag} ${c.country}`].filter(Boolean).join(" · ")}</span>
                <span>{[c.job, c.experience, c.jlpt !== "none" && `JLPT ${c.jlpt}`].filter(Boolean).join(" · ")}</span>
                <span className="row-nowrap"><Icon name="video" className="ic-sm" />{c.videos} <span>{t("viewer.videos")}</span></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <div className="empty"><Icon name="search" /><span>{t("common.none")}</span></div>}
    </>
  );
}

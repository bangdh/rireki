"use client";

import Hls from "hls.js";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Watermark } from "@/components/Watermark";
import { LANGS } from "@/i18n/config";
import { fmtDuration } from "@/lib/shares/format";
import { postEvent } from "./Tracking";

export type PlayerVideo = { id: string; title: string; lang: string | null; durationSec: number | null };
const MARKS = [25, 50, 75, 100] as const;

/**
 * viewer/detail.html player: hls.js on the signed manifest of /api/s/{token}/stream/{videoId}/index.m3u8 (media lane),
 * no picture-in-picture, the per-viewer watermark over the video. View-only links also hide the download control;
 * download-allowed links get a download icon per video (the original file via /api/s/{token}/download/video/{videoId}).
 * Logs play_video on the first play of a video and video_progress at 25/50/75/100 %.
 */
export function Player({ token, videos, watermark, viewOnly }: { token: string; videos: PlayerVideo[]; watermark: string; viewOnly: boolean }) {
  const t = useTranslations();
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const playEvent = useRef<string | "pending" | null>(null);
  const reached = useRef(new Set<number>());
  const video = videos[current];
  const src = `/api/s/${token}/stream/${video.id}/index.m3u8`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    playEvent.current = null;
    reached.current = new Set();
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(el);
      return () => hls.destroy();
    }
    el.src = src; // Safari plays HLS natively
  }, [src]);

  const onPlay = async () => {
    if (playEvent.current) return;
    playEvent.current = "pending";
    const r = await postEvent(token, { type: "play_video", videoId: video.id });
    playEvent.current = r?.id ?? null;
  };
  const progress = (pct: number) => {
    const id = playEvent.current;
    const el = ref.current;
    if (!id || id === "pending" || !el) return;
    for (const m of MARKS) {
      if (pct >= m && !reached.current.has(m)) {
        reached.current.add(m);
        void postEvent(token, { type: "video_progress", eventId: id, progress: m, positionSec: Math.floor(el.currentTime) });
      }
    }
  };
  const onTime = () => {
    const el = ref.current;
    if (el?.duration) progress((el.currentTime / el.duration) * 100);
  };
  const langLabel = (code: string | null) => LANGS.find(([c]) => c === code)?.[1] ?? code;

  return (
    <>
      <div className="player wm-host">
        <video ref={ref} controls controlsList={viewOnly ? "nodownload noremoteplayback" : "noremoteplayback"} disablePictureInPicture playsInline onPlay={onPlay} onTimeUpdate={onTime} onEnded={() => progress(100)} onContextMenu={(e) => e.preventDefault()} style={{ width: "100%", height: "100%", display: "block", background: "#000" }} />
        <Watermark text={watermark} light />
      </div>
      <div className="stack" style={{ gap: "6px" }}>
        {videos.map((v, i) => (
          <div key={v.id} className="row-nowrap" style={{ gap: "6px" }}>
            <button className="doc-row grow" type="button" onClick={() => setCurrent(i)} style={i === current ? { textAlign: "left", background: "var(--primary-soft)", borderColor: "var(--primary)" } : { textAlign: "left", background: "var(--surface)" }}>
              <Icon name="play" />
              <div className="grow"><div className="n">{v.title}</div><div className="m">{[fmtDuration(v.durationSec), langLabel(v.lang)].filter(Boolean).join(" · ")}</div></div>
            </button>
            {!viewOnly && <a className="btn btn-ghost btn-icon btn-sm" href={`/api/s/${token}/download/video/${v.id}`} aria-label={t("shares.download_allowed")}><Icon name="download" /></a>}
          </div>
        ))}
      </div>
      {viewOnly && <p className="hint">{t("viewer.video_hint")}</p>}
    </>
  );
}

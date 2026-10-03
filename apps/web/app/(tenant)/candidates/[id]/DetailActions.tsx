"use client";

import { CANDIDATE_STATUSES, DOCUMENT_TYPES } from "@rireki/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { toast } from "@/components/Toast";
import { DOC_TYPE_LABEL, fmtDuration, statusKey } from "@/lib/candidates/format";
import { STATUS_BADGE } from "@/lib/ui";
import { addNote, archiveCandidates, deleteDocument, deleteVideo, duplicateCandidate, renameVideo, reorderVideos, setDocumentShareable, setStatus } from "../actions";
import { Uploader } from "../Uploader";

// Client bits of app/candidate-detail.html: header menu (status submenu, duplicate/archive confirms), video cards
// (menu, inline player, HTML5 drag reorder), document menus, uploads and the note form. Data comes from the server page.

const closeMenu = (e: MouseEvent<HTMLElement>) => {
  const d = e.currentTarget.closest("details");
  if (d) d.open = false;
};

/** Runs a Server Action in a transition; a failure toasts ui.error (Next's production message is English and says nothing). */
function useRun() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      try {
        await fn();
        (after ?? (() => router.refresh()))();
      } catch {
        toast(t("ui.error"), "warn");
      }
    });
  return { run, pending, router };
}

export function HeaderMenu({ id, status }: { id: string; status: string }) {
  const t = useTranslations();
  const { run, pending, router } = useRun();
  const [mode, setMode] = useState<"main" | "status">("main");
  return (
    <Menu>
      <summary className="btn btn-icon" aria-label="More"><Icon name="more" /></summary>
      <div className="menu-list">
        {mode === "main" ? (
          <>
            <a href={`/api/candidates/${id}/pdf`} target="_blank" rel="noreferrer"><Icon name="download" /><span>{t("cand.export_pdf")}</span></a>
            <a href={`/api/candidates/${id}/pdf`} target="_blank" rel="noreferrer"><Icon name="printer" /><span>{t("common.print")}</span></a>
            <button type="button" disabled={pending} onClick={() => window.confirm(`${t("common.duplicate")}?`) && run(() => duplicateCandidate(id))}><Icon name="copy" /><span>{t("common.duplicate")}</span></button>
            <button type="button" onClick={() => setMode("status")}><Icon name="refresh" /><span>{t("detail.change_status")}</span><Icon name="chev-right" className="ic-sm" /></button>
            <hr />
            <button type="button" className="danger" disabled={pending} onClick={() => window.confirm(`${t("common.archive")}?`) && run(() => archiveCandidates([id]), () => router.push("/candidates"))}>
              <Icon name="archive" /><span>{t("common.archive")}</span>
            </button>
          </>
        ) : (
          <>
            <div className="menu-head">{t("detail.change_status")}</div>
            {CANDIDATE_STATUSES.filter((s) => s !== "archived").map((s) => (
              <button key={s} type="button" disabled={s === status || pending} onClick={(e) => { closeMenu(e); setMode("main"); run(() => setStatus({ id, status: s })); }}>
                <span className={STATUS_BADGE[s]}>{t(statusKey(s))}</span>
              </button>
            ))}
            <hr />
            <button type="button" onClick={() => setMode("main")}><Icon name="arrow-left" /><span>{t("common.back")}</span></button>
          </>
        )}
      </div>
    </Menu>
  );
}

export type VideoCard = { id: string; title: string; lang: string | null; statusText: string; durationSec: number | null; created: string; posterUrl: string | null; srcUrl: string | null; plays: number };

/** Video cards: first = main video; drag a card onto another to reorder (native DnD, no touch support); click the thumb to play inline. */
export function VideoGrid({ candidateId, videos }: { candidateId: string; videos: VideoCard[] }) {
  const t = useTranslations();
  const { run, pending } = useRun();
  const [list, setList] = useState(videos);
  const [playing, setPlaying] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  useEffect(() => setList(videos), [videos]);

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = list.map((v) => v.id);
    ids.splice(ids.indexOf(targetId), 0, ...ids.splice(ids.indexOf(dragId), 1));
    setList(ids.map((id) => list.find((v) => v.id === id)!));
    setDragId(null);
    run(() => reorderVideos({ candidateId, ids }));
  };
  const rename = (v: VideoCard) => {
    const title = window.prompt(t("common.rename"), v.title)?.trim();
    if (title && title !== v.title) run(() => renameVideo({ id: v.id, title }));
  };
  return (
    <div className="grid grid-3">
      {list.map((v, i) => (
        <div key={v.id} className="video-card" draggable onDragStart={() => setDragId(v.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(v.id)} style={dragId === v.id ? { opacity: 0.5 } : undefined}>
          {playing === v.id && v.srcUrl ? (
            <video controls autoPlay src={v.srcUrl} poster={v.posterUrl ?? undefined} style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", display: "block" }} />
          ) : (
            <div
              className="video-thumb"
              role="button"
              tabIndex={0}
              aria-label={v.title}
              onClick={() => v.srcUrl && setPlaying(v.id)}
              onKeyDown={(e) => e.key === "Enter" && v.srcUrl && setPlaying(v.id)}
              style={v.posterUrl ? { backgroundImage: `url(${v.posterUrl})`, backgroundSize: "cover" } : undefined}
            >
              {i === 0 && <span className="lbl badge badge-primary">{t("detail.main_video")}</span>}
              <span className="play"><Icon name="play" /></span>
              {v.durationSec !== null && <span className="dur">{fmtDuration(v.durationSec)}</span>}
            </div>
          )}
          <div className="video-meta">
            <b>{v.title}</b>
            <span className="small muted">{v.lang ?? "—"} · {v.statusText} · {v.created}</span>
            <div className="row between mt-8">
              {/* TODO(phase2): avg % watched */}
              <span className="small muted">{v.plays} <span>{t("detail.plays")}</span></span>
              <Menu>
                <summary className="btn btn-ghost btn-icon btn-sm" aria-label="More"><Icon name="more" /></summary>
                <div className="menu-list">
                  <button type="button" disabled={pending} onClick={(e) => { closeMenu(e); rename(v); }}><Icon name="edit" /><span>{t("common.rename")}</span></button>
                  {/* TODO(phase2): replace file */}
                  <button type="button" disabled><Icon name="refresh" /><span>{t("detail.replace")}</span></button>
                  <hr />
                  <button type="button" className="danger" disabled={pending} onClick={(e) => { closeMenu(e); if (window.confirm(`${t("common.delete")}?`)) run(() => deleteVideo(v.id)); }}>
                    <Icon name="trash" /><span>{t("common.delete")}</span>
                  </button>
                </div>
              </Menu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UploadVideo({ candidateId }: { candidateId: string }) {
  const t = useTranslations();
  const router = useRouter();
  return (
    <Uploader kind="video" candidateId={candidateId} multiple onDone={() => router.refresh()} className="btn btn-primary">
      <Icon name="upload" /><span>{t("detail.upload_video")}</span>
    </Uploader>
  );
}

export function DocActions({ doc }: { doc: { id: string; shareable: boolean } }) {
  const t = useTranslations();
  const { run, pending } = useRun();
  return (
    <Menu>
      <summary className="btn btn-ghost btn-icon btn-sm" aria-label="More"><Icon name="more" /></summary>
      <div className="menu-list">
        <button type="button" disabled={pending} onClick={(e) => { closeMenu(e); run(() => setDocumentShareable({ id: doc.id, shareable: !doc.shareable })); }}>
          <Icon name={doc.shareable ? "lock" : "unlock"} /><span>{t(doc.shareable ? "detail.doc_internal" : "detail.doc_shareable")}</span>
        </button>
        <hr />
        <button type="button" className="danger" disabled={pending} onClick={(e) => { closeMenu(e); if (window.confirm(`${t("common.delete")}?`)) run(() => deleteDocument(doc.id)); }}>
          <Icon name="trash" /><span>{t("common.delete")}</span>
        </button>
      </div>
    </Menu>
  );
}

export function AddDocument({ candidateId }: { candidateId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [type, setType] = useState<string>("other");
  return (
    <div className="row">
      <select className="select select-sm" style={{ width: "auto" }} aria-label={t("form.documents")} value={type} onChange={(e) => setType(e.target.value)}>
        {DOCUMENT_TYPES.map((k) => <option key={k} value={k}>{t(DOC_TYPE_LABEL[k])}</option>)}
      </select>
      <Uploader kind="doc" candidateId={candidateId} extra={{ type }} onDone={() => router.refresh()} className="btn">
        <Icon name="plus" /><span>{t("form.add_document")}</span>
      </Uploader>
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await addNote({ id, body });
      if (!r.ok) return setError(Object.values(r.fieldErrors).flat()[0] ?? null);
      setBody("");
      setError(null);
      router.refresh();
    });
  return (
    <div className="card">
      <div className="card-body stack">
        <textarea className={error ? "textarea is-error" : "textarea"} placeholder={t("detail.note_ph")} aria-label={t("detail.add_note")} value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <span className="error-text">{error}</span>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={pending || !body.trim()}>{t("detail.add_note")}</button>
        </div>
      </div>
    </div>
  );
}

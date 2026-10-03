"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "@/components/Toast";
import { uploadFile } from "@/lib/storage/upload-client";

type Kind = "photo" | "video" | "doc";
type Props = {
  kind: Kind;
  /** the candidate the file belongs to; for a new draft pass `ensureId` instead (autosave first) */
  candidateId?: string;
  ensureId?: () => Promise<string | undefined>;
  accept?: string;
  multiple?: boolean;
  /** extra fields of POST /api/uploads/complete: video `title`, document `type` */
  extra?: Record<string, string | undefined>;
  onDone: (row: Record<string, unknown>, file: File) => void;
  /** "div" renders a dropzone (click or drop), "button" a .btn */
  as?: "button" | "div";
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Dropzone / button around the media lane's uploadFile() (POST /api/uploads → presigned PUT, or the multipart parts of a
 * video → POST /api/uploads/complete). A failing step toasts its UploadError ("status code") and stops; the caller appends the returned row.
 */
export function Uploader({ kind, candidateId, ensureId, accept, multiple, extra, onDone, as = "button", className, disabled, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    try {
      const id = candidateId ?? (await ensureId?.());
      if (!id) throw new Error("404 candidate");
      for (const file of files) onDone(await uploadFile(file, { kind, candidateId: id, ...extra }), file);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "warn");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const pick = () => !busy && !disabled && input.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!busy && !disabled && e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  };
  const file = <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => e.target.files?.length && void upload(e.target.files)} />;
  if (as === "div") {
    return (
      <div className={className} role="button" tabIndex={0} aria-busy={busy} onClick={pick} onKeyDown={(e) => e.key === "Enter" && pick()} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        {file}
        {children}
      </div>
    );
  }
  return (
    <button className={className} type="button" onClick={pick} disabled={busy || disabled} aria-busy={busy}>
      {file}
      {children}
    </button>
  );
}

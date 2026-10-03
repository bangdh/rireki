"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "@/components/Toast";
import { UploadError, uploadFile } from "@/lib/storage/upload-client";
import { UPLOAD_LIMITS } from "@/lib/storage/uploads";

type Kind = "photo" | "video" | "doc";
const MB = 1024 * 1024;
type Props = {
  kind: Kind;
  /** the candidate the file belongs to; for a new draft pass `ensureId` instead (autosave first) */
  candidateId?: string;
  ensureId?: () => Promise<string | undefined>;
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
 * video → POST /api/uploads/complete). The picker offers only the types POST /api/uploads accepts (UPLOAD_LIMITS); a refused
 * file toasts upload.too_large / upload.bad_type, any other failure ui.error, and stops; the caller appends the returned row.
 */
export function Uploader({ kind, candidateId, ensureId, multiple, extra, onDone, as = "button", className, disabled, children }: Props) {
  const t = useTranslations();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    try {
      const id = candidateId ?? (await ensureId?.());
      if (!id) throw new Error("404 candidate");
      for (const file of files) onDone(await uploadFile(file, { kind, candidateId: id, ...extra }), file);
    } catch (e) {
      const code = e instanceof UploadError ? e.code : "";
      toast(code === "too_large" || code === "bad_type" ? t(`upload.${code}`, { max: UPLOAD_LIMITS[kind].maxBytes / MB }) : t("ui.error"), "warn");
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
  const file = <input ref={input} type="file" hidden accept={UPLOAD_LIMITS[kind].types.join(",")} multiple={multiple} onChange={(e) => e.target.files?.length && void upload(e.target.files)} />;
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

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_BADGE } from "@/lib/ui";
import type { AuditRow } from "./activity";
import { AUDIT_LABEL, statusKey } from "./format";

const badge = (s: unknown) => (typeof s === "string" && s in STATUS_BADGE ? STATUS_BADGE[s as keyof typeof STATUS_BADGE] : "badge");
const text = (v: unknown, max = 80) => (typeof v === "string" ? (v.length > max ? `${v.slice(0, max)}…` : v) : typeof v === "number" ? String(v) : "");

/** One audit event as the mockups' timeline text: actor ("—" when unknown: an act.* verb never starts the line), verb, then the detail (status badges, title, file…). */
export async function AuditLine({ row, who, target }: { row: AuditRow; who: string | null; target?: { name: string; href: string } | null }) {
  const t = await getTranslations();
  const { meta } = row;
  let verb: ReactNode = t(AUDIT_LABEL[row.action].key);
  let detail: ReactNode = text(meta.title ?? meta.name ?? meta.fromCode ?? meta.body ?? meta.code);
  if (row.action === "candidate.status") {
    detail = (
      <>
        <span className={badge(meta.from)}>{t(statusKey(text(meta.from)))}</span> → <span className={badge(meta.to)}>{t(statusKey(text(meta.to)))}</span>
      </>
    );
  } else if (row.action === "candidate.create" && typeof meta.fileName === "string") {
    verb = t("act.created_from_import");
    detail = meta.fileName;
  } else if (row.action === "video.upload" && !target) {
    verb = t("act.uploaded_video_solo"); // the candidate's own Activity tab: "uploaded video <title>"
  } else if (row.action === "member.invite") {
    detail = row.target?.split(" ")[0]; // "minh.tran@saoviet.vn (user)" → the email
  }
  return (
    <div>
      <b>{who ?? "—"}</b> <span>{verb}</span> {target ? <Link href={target.href}>{target.name}</Link> : null} {detail}
    </div>
  );
}

export const auditIcon = (row: AuditRow) => (row.action === "candidate.create" && typeof row.meta.fileName === "string" ? "sparkles" : AUDIT_LABEL[row.action].icon);

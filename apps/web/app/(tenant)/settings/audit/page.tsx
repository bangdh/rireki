import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";

// app/settings-company.html — Audit log tab. TODO(auth-tenant): AuditLog rows by tenantId with date filter and CSV export.
const AUDIT = [
  { time: "10:05", day: "today", who: "Phạm Thu Trang", action: "link.create", badge: "badge badge-info", target: "さくら介護 9月候補 (3 candidates, password, view-only)", ip: "113.190.x.x" },
  { time: "09:31", day: "today", who: "Aung Myat", action: "video.upload", badge: "badge badge-info", target: "SV000219 · 自己紹介.mp4", ip: "103.90.x.x" },
  { time: "08:58", day: "today", who: "Nguyễn Thị Hương", action: "auth.login", badge: "badge", target: "Chrome · Windows", ip: "113.190.x.x" },
  { time: "17:50", day: "yesterday", who: "Lê Văn Tùng", action: "candidate.import", badge: "badge badge-info", target: "3 files → SV000215, 2 pending review", ip: "113.190.x.x" },
  { time: "15:12", day: "yesterday", who: "Nguyễn Thị Hương", action: "member.invite", badge: "badge badge-warning", target: "minh.tran@saoviet.vn (User)", ip: "113.190.x.x" },
  { time: "11:20 · 28 Sep", who: "Nguyễn Thị Hương", action: "settings.security", badge: "badge badge-warning", target: "View-only default: locked", ip: "113.190.x.x" },
  { time: "16:44 · 26 Sep", who: "Phạm Thu Trang", action: "link.create", badge: "badge badge-info", target: "ヤマト建設様 溶接候補者 (5 candidates)", ip: "113.190.x.x" },
  { time: "09:02 · 1 Sep", who: "Nguyễn Thị Hương", action: "link.revoke", badge: "badge badge-danger", target: "テスト送付", ip: "113.190.x.x" },
] as const;

export default async function AuditSettingsPage() {
  const t = await getTranslations();
  return (
    <div className="stack-lg">
      <section className="card">
        <div className="card-header">
          <div><h2>{t("nav.audit")}</h2><p className="small muted">{t("settings.audit_d")}</p></div>
          <div className="row">
            <input className="input input-sm" type="date" defaultValue="2026-09-30" aria-label={t("common.time")} />
            <button className="btn btn-sm" type="button"><Icon name="download" />CSV</button>
          </div>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr><th>{t("common.time")}</th><th>{t("settings.actor")}</th><th>{t("track.action")}</th><th>{t("settings.target")}</th><th>IP</th></tr>
            </thead>
            <tbody>
              {AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="nowrap nums">{a.time}{"day" in a && <> <span className="faint">{t(`common.${a.day}`)}</span></>}</td>
                  <td>{a.who}</td>
                  <td><span className={a.badge}>{a.action}</span></td>
                  <td>{a.target}</td>
                  <td className="mono">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
    </div>
  );
}

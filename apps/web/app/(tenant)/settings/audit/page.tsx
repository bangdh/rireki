import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Table } from "@/components/Table";
import { When } from "@/lib/candidates/When";
import { requireRole } from "@/lib/tenant";
import { DateFilter } from "./DateFilter";
import { auditBadge, auditRows } from "./query";

// app/settings-company.html — Audit log tab: the tenant's newest 100 AuditLog rows, filtered by day, CSV at ./csv.
export default async function AuditSettingsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const { tenant } = await requireRole("admin");
  const t = await getTranslations();
  const rows = await auditRows(tenant.id, date, 100);
  return (
    <div className="stack-lg">
      <section className="card">
        <div className="card-header">
          <div><h2>{t("nav.audit")}</h2><p className="small muted">{t("settings.audit_d")}</p></div>
          <div className="row">
            <DateFilter value={date ?? format(new Date(), "yyyy-MM-dd")} label={t("common.time")} />
            <a className="btn btn-sm" href={`/settings/audit/csv${date ? `?date=${date}` : ""}`} download><Icon name="download" />CSV</a>
          </div>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr><th>{t("common.time")}</th><th>{t("settings.actor")}</th><th>{t("track.action")}</th><th>{t("settings.target")}</th><th>IP</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap nums"><When date={r.createdAt} time /></td>
                  <td>{r.actor}</td>
                  <td><span className={auditBadge(r.action)}>{r.action}</span></td>
                  <td>{r.target}</td>
                  <td className="mono">{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
    </div>
  );
}

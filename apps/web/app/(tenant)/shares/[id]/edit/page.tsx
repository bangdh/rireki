import { LinkDefaults, ShareSections } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { initialLinkValues } from "@/lib/shares/form";
import { initials } from "@/lib/shares/format";
import { canManage } from "@/lib/shares/link";
import { getShareLink, listFilters } from "@/lib/shares/queries";
import { requireMember } from "@/lib/tenant";
import { EditForm } from "./EditForm";

// Step 2 of app/share-new.html for an existing link (admin or creator). Candidates are not editable. TODO(phase2): add/remove/reorder candidates.
export default async function EditSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, user, role } = await requireMember();
  const link = await getShareLink(tenant.id, id);
  if (!link) notFound();
  if (!canManage(link, user.id, role)) forbidden();
  const [t, filters] = await Promise.all([getTranslations(), listFilters(tenant.id)]);
  const defaults = LinkDefaults.parse(tenant.settings.linkDefaults);
  const values = initialLinkValues(defaults, { ...link, sections: ShareSections.parse(link.sections) });
  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/shares">{t("shares.title")}</Link><span>/</span><Link href={`/shares/${link.id}`}>{link.name}</Link><span>/</span><span>{t("shares.edit_settings")}</span></div>
      <div className="page-header">
        <div>
          <h1>{t("shares.edit_settings")}</h1>
          <p className="sub">{link.name} · {link.candidates.length} <span>{t("common.candidates_lc")}</span></p>
        </div>
      </div>
      <div className="card mb-16">
        <div className="card-body row" style={{ gap: "6px" }}>
          {link.candidates.map(({ candidate: c }) => (
            <span key={c.id} className="chip"><span className="avatar avatar-sm">{initials(c.nameLatin)}</span>{c.nameNative || c.nameLatin} · <span className="mono">{c.code}</span></span>
          ))}
        </div>
      </div>
      <EditForm id={link.id} initial={values} defaults={defaults} clients={filters.clients} candidateCount={link.candidates.length} />
    </main>
  );
}

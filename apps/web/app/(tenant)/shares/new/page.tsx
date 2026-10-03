import { LinkDefaults } from "@rireki/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ageAt } from "@/components/rirekisho/Rirekisho";
import { initialLinkValues } from "@/lib/shares/form";
import { initials } from "@/lib/shares/format";
import { listFilters, pickerCandidates } from "@/lib/shares/queries";
import { requireMember } from "@/lib/tenant";
import { ShareWizard } from "./ShareWizard";
import type { PickerRow } from "./CandidatePicker";

// app/share-new.html — the server page loads the tenant's candidates, link defaults and the ?candidate= preselection;
// the 3-step wizard is one client component (selection order = the order the client sees).
export default async function ShareNewPage({ searchParams }: { searchParams: Promise<{ candidate?: string | string[] }> }) {
  const { candidate } = await searchParams;
  const { tenant, user } = await requireMember();
  const [t, locale, candidates, filters] = await Promise.all([getTranslations(), getLocale(), pickerCandidates(tenant.id), listFilters(tenant.id)]);
  const defaults = LinkDefaults.parse(tenant.settings.linkDefaults);
  const now = new Date();
  const rows: PickerRow[] = candidates.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.nameNative || c.nameLatin,
    kana: c.nameKana,
    initials: initials(c.nameLatin),
    gender: c.gender === "male" ? "m" : c.gender === "female" ? "f" : null,
    age: c.dob ? ageAt(c.dob.toISOString().slice(0, 10), now) : null,
    nationality: c.nationality,
    jlpt: c.jlpt,
    status: c.status,
    tags: c.tags,
    videos: c._count.videos,
  }));
  const preselected = ([] as string[]).concat(candidate ?? []).filter((id) => rows.some((r) => r.id === id));

  return (
    <main className="main" id="main">
      <div className="crumbs"><Link href="/shares">{t("shares.title")}</Link><span>/</span><span>{t("shares.new")}</span></div>
      <div className="page-header">
        <div>
          <h1>{t("shares.new")}</h1>
          <p className="sub">{t("sharenew.sub")}</p>
        </div>
      </div>
      <ShareWizard rows={rows} preselected={preselected} defaults={defaults} initial={initialLinkValues(defaults)} clients={filters.clients} locale={locale} sender={user.name} />
    </main>
  );
}

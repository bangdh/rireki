import { prisma } from "@rireki/db";
import { CvDraft } from "@rireki/shared";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUCKET, urlOf } from "@/lib/candidates/files";
import { requireMember } from "@/lib/tenant";
import { CandidateForm } from "../../CandidateForm";

// Edit = the same 7-step form pre-filled from the Json body (drafts included); autosave keeps saving into this row.
export default async function CandidateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireMember();
  const c = await prisma.candidate.findFirst({
    where: { id, tenantId: tenant.id },
    include: { videos: { orderBy: { position: "asc" } }, documents: { orderBy: [{ createdAt: "asc" }, { name: "asc" }] } },
  });
  if (!c) notFound();
  const t = await getTranslations();
  const parsed = CvDraft.safeParse(c.cv);
  const name = c.nameNative || c.nameLatin || c.code;
  return (
    <main className="main" id="main">
      <div className="crumbs">
        <Link href="/candidates">{t("cand.title")}</Link><span>/</span><Link href={`/candidates/${c.id}`}>{name}</Link><span>/</span><span>{t("common.edit")}</span>
      </div>
      <CandidateForm
        id={c.id}
        code={c.code}
        status={c.status}
        initial={{ cv: parsed.success ? parsed.data : {}, tags: c.tags }}
        videos={c.videos.map((v) => ({ id: v.id, title: v.title, status: v.status, durationSec: v.durationSec }))}
        documents={c.documents.map((d) => ({ id: d.id, name: d.name, type: d.type, size: d.size }))}
        photoUrl={await urlOf(BUCKET.originals, c.photoKey)}
        updatedAt={c.updatedAt.toISOString()}
        cancelHref={`/candidates/${c.id}`}
      />
    </main>
  );
}

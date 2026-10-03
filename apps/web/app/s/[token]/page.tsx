import { prisma } from "@rireki/db";
import { CvDraft } from "@rireki/shared";
import { getFormatter, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProtectedPage } from "@/components/ProtectedPage";
import { ageAt } from "@/components/rirekisho/Rirekisho";
import { LOCALE_COOKIE } from "@/i18n/config";
import { logEvent } from "@/lib/shares/events";
import { experienceLabel, initials } from "@/lib/shares/format";
import { BUCKET, presignGet } from "@/lib/shares/s3";
import { loadViewer, type UnlockedViewer } from "@/lib/shares/viewer";
import { COUNTRY_JA, FLAGS } from "@/lib/ui";
import { CandidateList, type Card } from "./CandidateList";
import { Expired } from "./Expired";
import { Gate } from "./Gate";
import { ViewerFooter, ViewerHeader } from "./ViewerChrome";

// /s/{token}: the client viewer entry. No tenant session; the link token + the rv_{token} cookie decide what to show:
// expired/revoked → Expired; no viewer cookie → Gate; one candidate → its detail; else the list (logs open_list).
const JLPT_RANK: Record<string, number> = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5, none: 9 };
type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params) {
  const ctx = await loadViewer((await params).token);
  return { title: ctx?.tenant.name ?? "Rireki" };
}

export default async function ViewerPage({ params }: Params) {
  const { token } = await params;
  const ctx = await loadViewer(token);
  if (!ctx) notFound();
  // The UI language of every viewer page is the link's viewerLang until the visitor switches: set by the lang route
  // as the same cookie <LangSwitch/> writes, so <html lang>, the provider and client components all agree.
  if (!(await cookies()).get(LOCALE_COOKIE)) redirect(`/api/s/${token}/lang`);
  if (ctx.state !== "active") return <Expired ctx={ctx} />;
  if (!ctx.viewer) return <Gate ctx={ctx} token={token} />;
  const unlocked: UnlockedViewer = { ...ctx, viewer: ctx.viewer };
  const { link, viewer, sections } = unlocked;
  if (link.candidates.length === 1) redirect(`/s/${token}/c/${link.candidates[0].candidateId}`);

  const [t, f, mine] = await Promise.all([
    getTranslations(),
    getFormatter(),
    prisma.feedback.findMany({ where: { shareLinkId: link.id, viewerId: viewer.id, verdict: "interested" }, select: { candidateId: true } }),
  ]);
  await logEvent({ tenantId: link.tenantId, shareLinkId: link.id, viewerId: viewer.id, type: "open_list" });
  const now = new Date();
  const interested = new Set(mine.map((m) => m.candidateId));
  const cards: Card[] = await Promise.all(
    link.candidates.map(async ({ candidate: c }) => {
      const nat = c.nationality && c.nationality in FLAGS ? (c.nationality as keyof typeof FLAGS) : null;
      return {
        id: c.id,
        code: c.code,
        kana: c.nameKana,
        name: c.nameNative || c.nameLatin,
        initials: initials(c.nameLatin),
        photoUrl: sections.photo && c.photoKey ? await presignGet(BUCKET.originals, c.photoKey) : null,
        gender: c.gender === "male" ? "男" : c.gender === "female" ? "女" : "",
        age: c.dob ? ageAt(c.dob.toISOString().slice(0, 10), now) : null,
        flag: nat ? FLAGS[nat] : "",
        country: nat ? COUNTRY_JA[nat] : "",
        job: c.tags[0] ?? "",
        experience: experienceLabel(CvDraft.safeParse(c.cv).data ?? {}, now),
        jlpt: c.jlpt,
        jlptRank: JLPT_RANK[c.jlpt] ?? 9,
        videos: c._count.videos,
        interested: interested.has(c.id),
      };
    }),
  );
  const job = cards[0]?.job;
  const subtitle = [
    `${cards.length} ${t("common.candidates_lc")}`,
    link.expiresAt && `${t("viewer.valid_until")} ${f.dateTime(link.expiresAt, { dateStyle: "long", timeZone: "Asia/Tokyo" })}`,
    ctx.creator && `${t("viewer.sent_by")} ${ctx.creator.name}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const contact = [ctx.creator?.name, ctx.creator?.email, ctx.tenant.meta.phone].filter(Boolean).join(" · ");

  return (
    <>
      <ViewerHeader ctx={unlocked} token={token} />
      <main className={link.downloadAllowed ? "viewer-main" : "viewer-main protected-content"}>
        <div className="container stack-lg">
          <CandidateList token={token} cards={cards} watermark={[viewer.name ?? t("track.anonymous"), viewer.email].filter(Boolean).join(" · ")} title={`${link.clientCompany ?? link.name}${job ? ` · ${job}` : ""}`} subtitle={subtitle} />
          <div className="callout">
            <Icon name="mail" />
            <div>
              <b>{t("viewer.contact_sender_t")}</b><br /><span>{t("viewer.contact_sender_d")}</span> {contact}
            </div>
          </div>
        </div>
      </main>
      <ViewerFooter ctx={ctx} />
      {!link.downloadAllowed && <ProtectedPage printMessage={`${ctx.tenant.name}: ${t("ui.blocked")}`} />}
    </>
  );
}

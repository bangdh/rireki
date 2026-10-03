"use server";

import { nextCandidateCode, prisma, type Prisma } from "@rireki/db";
import { cvCompleteness, JOB, type CvDraft } from "@rireki/shared";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { logEvent } from "@/lib/candidates/activity";
import { ReviewForm, ReviewFormFull } from "@/lib/extraction/form";
import { getImportJob, objectSize, queue } from "@/lib/extraction/jobs";
import { requireImportSession } from "@/lib/extraction/session";

/** Field errors keyed by cv field, plus the submitted values so the form keeps the user's edits after a failed save. */
export type SaveState = { errors?: Record<string, string>; values?: Record<string, string> };

/** zod's own messages in the UI language (zod ships en/ja/vi/id; my falls back to English). */
async function errorMap() {
  const locale = await getLocale();
  return (z.locales as Record<string, (() => { localeError: z.core.$ZodErrorMap }) | undefined>)[locale]?.().localeError;
}

/**
 * "Save candidate" (intent=save → CvSchema → status available) / "Save as draft" (intent=draft → CvDraft → status draft):
 * Candidate with the next code + the original file as Document(original_cv) + ImportJob saved, in one transaction; then
 * render.pages for non-drafts and on to the candidate's page. The job must be `ready` and belong to the session's tenant.
 */
export async function saveCandidate(jobId: string, _prev: SaveState, formData: FormData): Promise<SaveState> {
  const { tenantId, userId } = await requireImportSession();
  const job = await getImportJob(tenantId, jobId);
  if (!job) notFound();
  if (job.status === "saved" && job.candidateId) redirect(`/candidates/${job.candidateId}`);
  if (job.status !== "ready") redirect(`/candidates/import/${job.id}`);

  const draft = formData.get("intent") === "draft";
  const error = await errorMap();
  const parsed = draft ? ReviewForm.safeParse(formData, { error }) : ReviewFormFull.safeParse(formData, { error });
  if (!parsed.success) {
    const errors = Object.fromEntries(Object.entries(z.flattenError(parsed.error).fieldErrors).map(([key, messages]) => [key, (messages as string[])[0]]));
    const values = Object.fromEntries([...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
    return { errors, values };
  }
  const cv: CvDraft = parsed.data;
  const size = await objectSize(job.fileKey);

  let candidate: { id: string; code: string; updatedAt: Date };
  try {
    candidate = await prisma.$transaction(async (tx) => {
      const code = await nextCandidateCode(tx, tenantId);
      const row = await tx.candidate.create({
        data: {
          tenantId,
          code,
          status: draft ? "draft" : "available",
          nameKana: cv.nameKana ?? "",
          nameLatin: cv.nameLatin ?? "",
          nameNative: cv.nameNative ?? null,
          dob: cv.dob ? new Date(cv.dob) : null,
          gender: cv.gender ?? null,
          nationality: cv.nationality ?? null,
          jlpt: cv.jlpt ?? "none",
          photoKey: job.photoKey,
          cv: cv as Prisma.InputJsonValue,
          completeness: cvCompleteness(cv),
          createdById: userId,
          updatedById: userId,
        },
        select: { id: true, code: true, updatedAt: true },
      });
      await tx.document.create({ data: { tenantId, candidateId: row.id, type: "original_cv", name: job.fileName, key: job.fileKey, size, shareable: false } });
      // One candidate per job: a second click or tab finds the job no longer `ready` and the whole transaction rolls back.
      const { count } = await tx.importJob.updateMany({ where: { id: job.id, tenantId, status: "ready" }, data: { status: "saved", candidateId: row.id } });
      if (count === 0) throw new AlreadySaved();
      return row;
    });
  } catch (e) {
    if (e instanceof AlreadySaved) redirect(`/candidates/import/${job.id}`);
    throw e;
  }

  await logEvent({ tenantId, userId, action: "candidate.create", target: candidate.id, meta: { code: candidate.code, fileName: job.fileName } });
  if (!draft) {
    const version = Math.floor(candidate.updatedAt.getTime() / 1000);
    // Same jobId as the media lane's enqueueRender (lib/storage/renders.ts), so one version is never rendered twice.
    await queue.add(JOB.renderPages, { tenantId, candidateId: candidate.id, version }, { jobId: `render-${candidate.id}-${version}`, removeOnComplete: 100, removeOnFail: 1000 });
  }
  revalidatePath("/candidates", "layout");
  revalidatePath("/dashboard");
  redirect(`/candidates/${candidate.id}`);
}

class AlreadySaved extends Error {}

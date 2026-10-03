"use server";

// Server Actions of the candidates lane. Every Prisma call carries tenantId; ids from the client are re-checked with it.
// Inputs are plain objects validated with zod; forms get { ok: false, fieldErrors } (messages in the UI language).
import { nextCandidateCode, prisma, type Prisma } from "@rireki/db";
import { CvDraft, CvSchema, cvCompleteness } from "@rireki/shared";
import { revalidatePath } from "next/cache";
import { forbidden, notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { logEvent } from "@/lib/candidates/activity";
import { BUCKET, deleteObjects } from "@/lib/candidates/files";
import { IdsInput, NoteInput, StatusInput, TagInput, Tags } from "@/lib/candidates/schemas";
import { requireMember } from "@/lib/tenant";

export type FieldErrors = Record<string, string[]>;
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };
type CvInput = { id?: string; cv: unknown; tags?: unknown };

const bust = () => {
  revalidatePath("/candidates", "layout");
  revalidatePath("/dashboard");
};

/** zod's own messages in the UI language (zod ships en/ja/vi/id; others fall back to English). */
async function errorMap() {
  const locale = await getLocale();
  return (z.locales as Record<string, (() => { localeError: z.core.$ZodErrorMap }) | undefined>)[locale]?.().localeError;
}

/** Validates { cv, tags } with per-field errors for the CV (flattenError is shallow, so the CV is parsed on its own). */
async function validate<S extends typeof CvSchema | typeof CvDraft>(schema: S, input: CvInput) {
  const error = await errorMap();
  const cv = schema.safeParse(input.cv ?? {}, { error });
  const tags = Tags.safeParse(input.tags ?? [], { error });
  if (cv.success && tags.success) return { data: { cv: cv.data as z.output<S>, tags: tags.data }, fieldErrors: null };
  const fieldErrors: FieldErrors = cv.success ? {} : (z.flattenError(cv.error).fieldErrors as FieldErrors);
  if (!tags.success) fieldErrors.tags = tags.error.issues.map((i) => i.message);
  return { data: null, fieldErrors };
}

/** Searchable columns kept in sync with the Json body on every save (rirekisho-schema skill). */
function columns(cv: CvDraft, tags: string[], userId: string) {
  return {
    nameKana: cv.nameKana ?? "",
    nameLatin: cv.nameLatin ?? "",
    nameNative: cv.nameNative ?? null,
    dob: cv.dob ? new Date(cv.dob) : null,
    gender: cv.gender ?? null,
    nationality: cv.nationality ?? null,
    jlpt: cv.jlpt ?? "none",
    tags,
    completeness: cvCompleteness(cv),
    cv: cv as Prisma.InputJsonValue,
    updatedById: userId,
  };
}

async function owned(tenantId: string, id: string) {
  const c = await prisma.candidate.findFirst({ where: { id, tenantId } });
  if (!c) notFound();
  return c;
}

/** Inserts a candidate with the next AZ123456 code; the counter and the row move in one transaction (codes are never reused). */
function insert(tenantId: string, data: Omit<Prisma.CandidateUncheckedCreateInput, "tenantId" | "code">) {
  return prisma.$transaction(async (tx) => {
    const code = await nextCandidateCode(tx, tenantId);
    return tx.candidate.create({ data: { ...data, tenantId, code }, select: { id: true, code: true, updatedAt: true } });
  });
}

/** Autosave (1.5 s after a change). The first save of a new candidate creates the draft row and assigns its code. */
export async function saveDraft(input: CvInput): Promise<ActionResult<{ id: string; code: string; updatedAt: string }>> {
  const { tenant, user } = await requireMember();
  const v = await validate(CvDraft, input);
  if (v.fieldErrors) return { ok: false, fieldErrors: v.fieldErrors };
  const data = columns(v.data.cv, v.data.tags, user.id);
  let row: { id: string; code: string; updatedAt: Date };
  if (input.id) {
    await owned(tenant.id, input.id);
    row = await prisma.candidate.update({ where: { id: input.id, tenantId: tenant.id }, data, select: { id: true, code: true, updatedAt: true } });
  } else {
    row = await insert(tenant.id, { ...data, status: "draft", createdById: user.id });
    await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.create", target: row.id, meta: { code: row.code } });
  }
  return { ok: true, id: row.id, code: row.code, updatedAt: row.updatedAt.toISOString() };
}

/** "Create candidate" / "Save changes": the full CvSchema must pass; a draft becomes available. */
export async function createCandidate(input: CvInput): Promise<ActionResult<{ id: string }>> {
  const { tenant, user } = await requireMember();
  const v = await validate(CvSchema, input);
  if (v.fieldErrors) return { ok: false, fieldErrors: v.fieldErrors };
  const data = columns(v.data.cv, v.data.tags, user.id);
  let id: string;
  if (input.id) {
    const existing = await owned(tenant.id, input.id);
    await prisma.candidate.update({ where: { id: existing.id, tenantId: tenant.id }, data: { ...data, status: existing.status === "draft" ? "available" : existing.status } });
    id = existing.id;
    await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.update", target: id });
  } else {
    const row = await insert(tenant.id, { ...data, status: "available", createdById: user.id });
    id = row.id;
    await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.create", target: id, meta: { code: row.code } });
  }
  // TODO(integration): enqueue render.pages { tenantId, candidateId, version } here (media lane) so share pages get fresh PNGs.
  bust();
  return { ok: true, id };
}

/** Status submenu. StatusInput excludes "archived" (that is archiveCandidates); un-archiving follows its rule: members only their own candidates, admins any. */
export async function setStatus(input: { id: string; status: string }): Promise<void> {
  const { tenant, user, role } = await requireMember();
  const status = StatusInput.parse(input.status);
  const c = await owned(tenant.id, input.id);
  if (c.archivedAt !== null && role !== "admin" && c.createdById !== user.id) forbidden();
  await prisma.candidate.update({ where: { id: c.id, tenantId: tenant.id }, data: { status, archivedAt: null, updatedById: user.id } });
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.status", target: c.id, meta: { from: c.status, to: status } });
  bust();
}

/** Archive (soft): status archived + archivedAt. Members may archive only their own candidates; admins any. */
export async function archiveCandidates(input: string[]): Promise<void> {
  const { tenant, user, role } = await requireMember();
  const ids = IdsInput.parse(input);
  const rows = await prisma.candidate.findMany({ where: { tenantId: tenant.id, id: { in: ids } }, select: { id: true, createdById: true } });
  if (role !== "admin" && rows.some((r) => r.createdById !== user.id)) forbidden();
  await prisma.candidate.updateMany({ where: { tenantId: tenant.id, id: { in: rows.map((r) => r.id) } }, data: { status: "archived", archivedAt: new Date(), updatedById: user.id } });
  await Promise.all(rows.map((r) => logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.archive", target: r.id })));
  bust();
}

/** Copies cv + tags into a new draft with a new code, then opens its edit form. */
export async function duplicateCandidate(id: string): Promise<never> {
  const { tenant, user } = await requireMember();
  const c = await owned(tenant.id, id);
  const copy = await insert(tenant.id, {
    ...columns(CvDraft.parse(c.cv), c.tags, user.id),
    status: "draft",
    createdById: user.id,
  });
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.duplicate", target: copy.id, meta: { fromCode: c.code } });
  bust();
  redirect(`/candidates/${copy.id}/edit`);
}

/** Bulk "Add tag": appends the tag to every selected candidate that does not have it yet. */
export async function addTag(input: { ids: string[]; tag: string }): Promise<ActionResult> {
  const { tenant, user } = await requireMember();
  const tag = TagInput.safeParse(input.tag, { error: await errorMap() });
  if (!tag.success) return { ok: false, fieldErrors: { tag: tag.error.issues.map((i) => i.message) } };
  await prisma.candidate.updateMany({
    where: { tenantId: tenant.id, id: { in: IdsInput.parse(input.ids) }, NOT: { tags: { has: tag.data } } },
    data: { tags: { push: tag.data }, updatedById: user.id },
  });
  bust();
  return { ok: true };
}

/** Internal note = candidate.note audit row (team only, never shown to clients). */
export async function addNote(input: { id: string; body: string }): Promise<ActionResult> {
  const { tenant, user } = await requireMember();
  const body = NoteInput.safeParse(input.body, { error: await errorMap() });
  if (!body.success) return { ok: false, fieldErrors: { body: body.error.issues.map((i) => i.message) } };
  const c = await owned(tenant.id, input.id);
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "candidate.note", target: c.id, meta: { body: body.data } });
  bust();
  return { ok: true };
}

async function ownedVideo(tenantId: string, id: string) {
  const v = await prisma.video.findFirst({ where: { id, tenantId } });
  if (!v) notFound();
  return v;
}

export async function renameVideo(input: { id: string; title: string }): Promise<void> {
  const { tenant, user } = await requireMember();
  const title = z.string().trim().min(1).max(120).parse(input.title);
  const v = await ownedVideo(tenant.id, input.id);
  await prisma.video.update({ where: { id: v.id, tenantId: tenant.id }, data: { title } });
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "video.rename", target: v.candidateId, meta: { title } });
  bust();
}

export async function deleteVideo(id: string): Promise<void> {
  const { tenant, user } = await requireMember();
  const v = await ownedVideo(tenant.id, id);
  await prisma.video.delete({ where: { id: v.id, tenantId: tenant.id } });
  await Promise.all([deleteObjects(BUCKET.originals, [v.originalKey]), deleteObjects(BUCKET.media, [v.posterKey, v.hlsKey])]);
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "video.delete", target: v.candidateId, meta: { title: v.title } });
  bust();
}

/** New order of a candidate's videos (position 0 = main video on share pages). */
export async function reorderVideos(input: { candidateId: string; ids: string[] }): Promise<void> {
  const { tenant } = await requireMember();
  const c = await owned(tenant.id, input.candidateId);
  const ids = IdsInput.parse(input.ids);
  await prisma.$transaction(ids.map((id, position) => prisma.video.updateMany({ where: { id, tenantId: tenant.id, candidateId: c.id }, data: { position } })));
  bust();
}

async function ownedDocument(tenantId: string, id: string) {
  const d = await prisma.document.findFirst({ where: { id, tenantId } });
  if (!d) notFound();
  return d;
}

export async function setDocumentShareable(input: { id: string; shareable: boolean }): Promise<void> {
  const { tenant, user } = await requireMember();
  const d = await ownedDocument(tenant.id, input.id);
  await prisma.document.update({ where: { id: d.id, tenantId: tenant.id }, data: { shareable: input.shareable } });
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "document.update", target: d.candidateId, meta: { name: d.name, shareable: input.shareable } });
  bust();
}

export async function deleteDocument(id: string): Promise<void> {
  const { tenant, user } = await requireMember();
  const d = await ownedDocument(tenant.id, id);
  await prisma.document.delete({ where: { id: d.id, tenantId: tenant.id } });
  await deleteObjects(BUCKET.originals, [d.key]);
  await logEvent({ tenantId: tenant.id, userId: user.id, action: "document.delete", target: d.candidateId, meta: { name: d.name } });
  bust();
}

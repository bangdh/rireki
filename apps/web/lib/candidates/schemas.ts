// zod schemas of the candidates lane: Server Action inputs and the list page's searchParams.
import { CANDIDATE_STATUSES, CvDraft, CvSchema, JLPT_LEVELS, NATIONALITIES } from "@rireki/shared";
import { z } from "zod";

export const TagInput = z.string().trim().min(1).max(40);
export const Tags = z.array(TagInput).max(20);
export const DraftInput = z.object({ cv: CvDraft, tags: Tags.default([]) });
export const CreateInput = z.object({ cv: CvSchema, tags: Tags.default([]) });
export const NoteInput = z.string().trim().min(1).max(2000);
/** setStatus input: never "archived" — archiving (and its ownership rule) happens only in archiveCandidates. */
export const StatusInput = z.enum(CANDIDATE_STATUSES).exclude(["archived"]);
export const IdsInput = z.array(z.string().min(1)).min(1).max(200);

// Every field falls back to its default on garbage so a hand-edited URL never 500s.
export const ListQuery = z.object({
  q: z.string().trim().max(100).catch(""),
  nationality: z.enum(NATIONALITIES).optional().catch(undefined),
  job: z.string().trim().min(1).max(40).optional().catch(undefined),
  jlpt: z.enum(JLPT_LEVELS).optional().catch(undefined),
  status: z.enum(CANDIDATE_STATUSES).optional().catch(undefined),
  video: z.enum(["1", "0"]).optional().catch(undefined),
  view: z.enum(["table", "cards"]).catch("table"),
  page: z.coerce.number().int().min(1).catch(1),
  per: z.coerce.number().pipe(z.literal([8, 25, 50])).catch(8),
});
export type ListQuery = z.infer<typeof ListQuery>;

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Parses the list page's searchParams. A repeated key keeps its last value: the GET form has hidden inputs for the
 * current filters and submit buttons (view toggle, "Has video", page numbers) that come later in the form.
 */
export function parseListQuery(sp: SearchParams): ListQuery {
  const entries = Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v] as const).filter(([, v]) => v !== undefined && v !== "");
  return ListQuery.parse(Object.fromEntries(entries));
}

/** Fields of a list query as `?k=v` pairs (page omitted when 1, defaults omitted), for links that keep the filters. */
export function listHref(q: ListQuery, patch: Partial<ListQuery> = {}): string {
  const merged = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "page" && v === 1) || (k === "per" && v === 8) || (k === "view" && v === "table")) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return `/candidates${s ? `?${s}` : ""}`;
}

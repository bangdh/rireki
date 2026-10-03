// ViewEvent rows of the client viewer: the zod input of POST /api/s/{token}/events and the one insert helper.
import { prisma, type Prisma } from "@rireki/db";
import type { ViewEventType } from "@rireki/shared";
import { z } from "zod";

// HTML forms post "" for empty inputs; treat blank as "not provided".
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

/** What the browser may post after the gate. heartbeat/video_progress address a row the same viewer created. */
export const ViewerEventInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play_video"), videoId: z.string().min(1) }),
  z.object({ type: z.literal("video_progress"), eventId: z.string().min(1), progress: z.literal([25, 50, 75, 100]), positionSec: z.number().int().nonnegative() }),
  z.object({ type: z.literal("heartbeat"), eventId: z.string().min(1) }),
  z.object({ type: z.literal("blocked_action"), action: z.string().min(1).max(40), keys: z.string().max(40).optional(), candidateId: z.string().min(1).optional() }),
  z.object({ type: z.literal("download"), candidateId: z.string().min(1) }),
]);
export type ViewerEventInput = z.infer<typeof ViewerEventInput>;

/** The gate form (viewer/gate.html): every field optional here, the link decides what it needs. */
export const GateInput = z.object({
  password: optional(z.string().max(72)),
  name: optional(z.string().trim().min(1).max(120)),
  email: optional(z.string().trim().toLowerCase().pipe(z.email())),
});
export type GateInput = z.infer<typeof GateInput>;

export const HEARTBEAT_SEC = 30;

/** Inserts one ViewEvent and returns its id (the detail page hands it to <Tracking> for heartbeats). */
export async function logEvent(e: {
  tenantId: string;
  shareLinkId: string;
  viewerId?: string | null;
  candidateId?: string | null;
  type: ViewEventType;
  durationSec?: number | null;
  meta?: Prisma.InputJsonObject;
}): Promise<string> {
  const row = await prisma.viewEvent.create({
    data: { tenantId: e.tenantId, shareLinkId: e.shareLinkId, viewerId: e.viewerId ?? null, candidateId: e.candidateId ?? null, type: e.type, durationSec: e.durationSec ?? null, meta: e.meta },
    select: { id: true },
  });
  return row.id;
}

/** Json meta of a row as a plain object ({} for null/arrays). */
export const metaOf = (meta: Prisma.JsonValue | null | undefined): Record<string, unknown> => (meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {});

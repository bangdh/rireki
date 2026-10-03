// BullMQ producer side of the web app (media-pipeline skill): one Queue on the `rireki` queue, kept on globalThis so
// Next dev's module reloads do not open a Redis connection per reload. The worker (apps/worker) consumes it.
import { QUEUE_NAME } from "@rireki/shared";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";

const g = globalThis as unknown as { rirekiQueue?: Queue };

export const queue =
  g.rirekiQueue ?? new Queue(QUEUE_NAME, { connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) });

if (env.NODE_ENV !== "production") g.rirekiQueue = queue;

/** Adds a named job; the deterministic jobId (transcode-{videoId}, render-{candidateId}-{version}) dedupes re-enqueues. BullMQ 6 rejects ":" in custom ids. */
export const enqueue = (name: string, data: Record<string, unknown>, jobId: string) =>
  queue.add(name, data, { jobId, attempts: 2, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: 100, removeOnFail: 1000 });

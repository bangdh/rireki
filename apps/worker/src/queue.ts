// Producer side inside the worker: the boot-time render sweep enqueues render.pages for candidates without current pages.
// Its own connection: the Worker's connection is blocked by BRPOPLPUSH and must not be shared.
import { JOB, QUEUE_NAME } from "@rireki/shared";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

export const queue = new Queue(QUEUE_NAME, { connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) });

/** Same jobId and options as enqueueRender in apps/web/lib/storage/renders.ts, so web and worker never queue a version twice. */
export const enqueueRender = (tenantId: string, candidateId: string, version: number) =>
  queue.add(JOB.renderPages, { tenantId, candidateId, version }, { jobId: `render-${candidateId}-${version}`, attempts: 2, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: 100, removeOnFail: 1000 });

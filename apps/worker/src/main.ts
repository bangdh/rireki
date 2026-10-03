// env first: it loads the root .env before @rireki/db reads DATABASE_URL at import.
import { env } from "./env";
import { prisma } from "@rireki/db";
import { QUEUE_NAME } from "@rireki/shared";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { processors } from "./jobs/index";
import { sweepRenders } from "./jobs/render";
import { queue } from "./queue";

const unknownJob = async (job: Job) => {
  throw new Error(`unknown job ${job.name}`);
};

const worker = new Worker(QUEUE_NAME, (job) => (processors[job.name] ?? unknownJob)(job), {
  connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }),
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => console.log(`worker ready on queue ${QUEUE_NAME} (concurrency ${env.WORKER_CONCURRENCY})`));
worker.on("completed", (job, result) => console.log(`job ${job.name} ${job.id} done`, result));
worker.on("failed", (job, err) => console.error(`job ${job?.name} ${job?.id} failed:`, err));

// Candidates without pages for their current version (seeded, or edited while the worker was down) get a render job.
worker
  .waitUntilReady()
  .then(() => sweepRenders())
  .then((n) => console.log(`render sweep queued ${n} candidate(s)`))
  .catch((err) => console.error("render sweep failed:", err));

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    console.log(`${signal} received, closing worker`);
    await worker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

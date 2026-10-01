import { prisma } from "@rireki/db";
import { QUEUE_NAME } from "@rireki/shared";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import { processors } from "./jobs/index";

const unknownJob = async (job: Job) => {
  throw new Error(`unknown job ${job.name}`);
};

const worker = new Worker(QUEUE_NAME, (job) => (processors[job.name] ?? unknownJob)(job), {
  connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }),
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => console.log(`worker ready on queue ${QUEUE_NAME} (concurrency ${env.WORKER_CONCURRENCY})`));
worker.on("failed", (job, err) => console.error(`job ${job?.name} ${job?.id} failed:`, err));

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    console.log(`${signal} received, closing worker`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

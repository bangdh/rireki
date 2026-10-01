import type { Job } from "bullmq";

export async function extractCv(job: Job): Promise<unknown> {
  throw new Error(`${job.name}: not implemented`);
}

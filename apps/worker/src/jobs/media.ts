import type { Job } from "bullmq";

export async function mediaTranscode(job: Job): Promise<unknown> {
  throw new Error(`${job.name}: not implemented`);
}

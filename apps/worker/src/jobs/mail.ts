import type { Job } from "bullmq";

export async function mailSend(job: Job): Promise<unknown> {
  throw new Error(`${job.name}: not implemented`);
}

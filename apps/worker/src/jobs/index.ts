import { JOB } from "@rireki/shared";
import type { Job } from "bullmq";
import { extractCv } from "./extract";
import { mailSend } from "./mail";
import { mediaTranscode } from "./media";
import { renderPages } from "./render";

// Lanes replace the job files (media.ts, render.ts, extract.ts, mail.ts); nobody edits this map.
export const processors: Record<string, (job: Job) => Promise<unknown>> = {
  [JOB.mediaTranscode]: mediaTranscode,
  [JOB.renderPages]: renderPages,
  [JOB.extractCv]: extractCv,
  [JOB.mailSend]: mailSend,
};

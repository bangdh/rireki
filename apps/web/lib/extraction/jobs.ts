import "server-only";

// All import I/O of the web app (cv-extraction skill): the original in rireki-originals, the ImportJob row, the extract.cv
// job, presigned GETs for the review page and the shape of ImportJob.extracted the worker writes. Server-only: S3 and Redis.
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@rireki/db";
import { CvDraft, JOB, makeS3Client, QUEUE_NAME } from "@rireki/shared";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

// Module singletons on globalThis: Next dev reloads modules, and each reload would otherwise open another Redis connection.
const g = globalThis as unknown as { importQueue?: Queue };
export const queue = g.importQueue ?? new Queue(QUEUE_NAME, { connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) });
if (env.NODE_ENV !== "production") g.importQueue = queue;

const base = { region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY };
/** Internal endpoint: every PUT/HEAD the server does itself. */
const s3 = makeS3Client({ ...base, endpoint: env.S3_ENDPOINT });
/** Public endpoint: only for URLs handed to the browser (storage-minio skill). */
const s3Public = makeS3Client({ ...base, endpoint: env.S3_PUBLIC_ENDPOINT });
const BUCKET = env.S3_BUCKET_ORIGINALS;

/** File name as stored in the key: characters outside [\w.-] become "_", at most 100 characters (the tail keeps the extension). */
export const safeName = (name: string) => name.replace(/[^\w.-]/g, "_").slice(-100) || "file";
/** tenants/{tenantId}/imports/{jobId}/{safeName}; the extractor writes photo.jpg next to it. Both stay there after the save: Document.key and Candidate.photoKey point at them. */
export const importKey = (tenantId: string, jobId: string, fileName: string) => `tenants/${tenantId}/imports/${jobId}/${safeName(fileName)}`;
// TODO(phase2): purge unsaved imports after 30 days.

/** Upload step: the file goes to S3 under the session tenant's prefix, then the ImportJob (queued) and the extract.cv job. */
export async function createImportJob({ tenantId, userId, file }: { tenantId: string; userId: string; file: File }): Promise<string> {
  const id = randomUUID();
  const fileKey = importKey(tenantId, id, file.name);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: fileKey, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type || "application/octet-stream" }));
  await prisma.importJob.create({ data: { id, tenantId, fileKey, fileName: file.name, status: "queued", createdById: userId } });
  await queue.add(JOB.extractCv, { tenantId, importJobId: id }, { removeOnComplete: true, removeOnFail: 1000 });
  return id;
}

export const getImportJob = (tenantId: string, id: string) => prisma.importJob.findFirst({ where: { id, tenantId } });

/** The tenant's last 10 imports with the uploader's name and, once saved, the candidate's code ("Recent imports"). */
export async function listImportJobs(tenantId: string) {
  const jobs = await prisma.importJob.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 });
  const candidateIds = jobs.flatMap((j) => (j.candidateId ? [j.candidateId] : []));
  const [users, candidates] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...new Set(jobs.map((j) => j.createdById))] } }, select: { id: true, name: true } }),
    candidateIds.length ? prisma.candidate.findMany({ where: { tenantId, id: { in: candidateIds } }, select: { id: true, code: true } }) : [],
  ]);
  return jobs.map((j) => ({
    ...j,
    uploadedBy: users.find((u) => u.id === j.createdById)?.name ?? "",
    code: candidates.find((c) => c.id === j.candidateId)?.code ?? null,
  }));
}

/** Display name of the member who uploaded a job. */
export const uploaderName = async (userId: string) => (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? "";

/** 10-minute presigned GET; callers only pass the fileKey/photoKey of a job already loaded with the session's tenantId. */
export const presignGet = (key: string, expiresIn = 600) => getSignedUrl(s3Public, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });

export const objectSize = async (key: string) => (await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))).ContentLength ?? 0;

/** ImportJob.extracted as apps/worker/src/jobs/extract.ts writes it. TODO(integration): move to packages/shared next to CvDraft. */
export const Extracted = z.object({ cv: CvDraft, pages: z.number().int(), ocrUsed: z.boolean(), templateMatch: z.boolean(), llm: z.boolean() });
export type Extracted = z.infer<typeof Extracted>;
/** ImportJob.confidence: 0–1 per extracted key. */
export const Confidence = z.record(z.string(), z.number());

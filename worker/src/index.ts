import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { processAnalyze } from "./jobs/analyze";
import { processGenerateShorts } from "./jobs/generate-shorts";
import { processGenerateLong } from "./jobs/generate-long";
import { processGenerateSeo } from "./jobs/generate-seo";
import { processGenerateThumbnail } from "./jobs/generate-thumbnail";
import { processUpload } from "./jobs/upload";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

console.log("[worker] YT AI Agent workers starting...");

async function updateJobStatus(
  dbJobId: string | undefined,
  status: "ACTIVE" | "COMPLETED" | "FAILED",
  result?: any,
  error?: string
) {
  if (!dbJobId) return;
  await prisma.job.update({
    where: { id: dbJobId },
    data: {
      status,
      result: result || undefined,
      error: error || undefined,
      startedAt: status === "ACTIVE" ? new Date() : undefined,
      finishedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
      attempts: { increment: status === "FAILED" ? 1 : 0 },
    },
  });
}

async function maybeCompleteProject(projectId: string) {
  const jobs = await prisma.job.findMany({ where: { projectId } });
  const allDone = jobs.every((j) => j.status === "COMPLETED" || j.status === "FAILED");
  if (!allDone) return;
  const anyFailed = jobs.some((j) => j.status === "FAILED");
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: anyFailed ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
    },
  });
}

const mediaWorker = new Worker(
  "media",
  async (job) => {
    const dbJobId = job.data.dbJobId as string | undefined;
    const projectId = job.data.projectId as string;

    await updateJobStatus(dbJobId, "ACTIVE");
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "PROCESSING" },
    }).catch(() => {});

    try {
      let result: any;
      switch (job.name) {
        case "analyze":
          result = await processAnalyze(job.data);
          break;
        case "generate_shorts":
          result = await processGenerateShorts(job.data);
          break;
        case "generate_long":
          result = await processGenerateLong(job.data);
          break;
        case "generate_seo":
          result = await processGenerateSeo(job.data);
          break;
        case "generate_thumbnail":
          result = await processGenerateThumbnail(job.data);
          break;
        default:
          throw new Error(`Unknown media job: ${job.name}`);
      }

      await updateJobStatus(dbJobId, "COMPLETED", result);
      await maybeCompleteProject(projectId);
      return result;
    } catch (err: any) {
      console.error(`[media] job ${job.id} failed`, err);
      await updateJobStatus(dbJobId, "FAILED", undefined, err.message);
      await maybeCompleteProject(projectId);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

const uploadWorker = new Worker(
  "upload",
  async (job) => {
    const dbJobId = job.data.dbJobId as string | undefined;
    await updateJobStatus(dbJobId, "ACTIVE");
    try {
      const result = await processUpload(job.data);
      await updateJobStatus(dbJobId, "COMPLETED", result);
      return result;
    } catch (err: any) {
      await updateJobStatus(dbJobId, "FAILED", undefined, err.message);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

mediaWorker.on("completed", (job) => console.log(`[media] ✓ ${job.name} ${job.id}`));
mediaWorker.on("failed", (job, err) => console.error(`[media] ✗ ${job?.name} ${job?.id}`, err.message));
uploadWorker.on("completed", (job) => console.log(`[upload] ✓ ${job.id}`));
uploadWorker.on("failed", (job, err) => console.error(`[upload] ✗ ${job?.id}`, err.message));

console.log("[worker] Ready – listening on media + upload queues");

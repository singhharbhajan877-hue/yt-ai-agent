import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { processDownload } from "./jobs/download";
import { processAnalyze } from "./jobs/analyze";
import { processGenerateShorts } from "./jobs/generate-shorts";
import { processGenerateLong } from "./jobs/generate-long";
import { processGenerateSeo } from "./jobs/generate-seo";
import { processGenerateThumbnail } from "./jobs/generate-thumbnail";
import { processUpload } from "./jobs/upload";
import { Queue } from "bullmq";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const mediaQueue = new Queue("media", { connection });

console.log("[worker] YT AI Agent workers starting...");

async function updateJob(
  dbJobId: string | undefined,
  status: "ACTIVE" | "COMPLETED" | "FAILED",
  result?: any,
  error?: string,
  progress?: number
) {
  if (!dbJobId) return;
  await prisma.job.update({
    where: { id: dbJobId },
    data: {
      status,
      result: result ?? undefined,
      error: error ?? undefined,
      progress: progress ?? undefined,
      startedAt: status === "ACTIVE" ? new Date() : undefined,
      finishedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
      attempts: status === "FAILED" ? { increment: 1 } : undefined,
    },
  });
}

async function setProjectProgress(projectId: string, progress: number, status?: any) {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      progress,
      ...(status ? { status } : {}),
    },
  }).catch(() => {});
}

async function maybeCompleteProject(projectId: string) {
  const jobs = await prisma.job.findMany({ where: { projectId } });
  const pending = jobs.filter((j) => j.status === "WAITING" || j.status === "ACTIVE");
  if (pending.length > 0) return;
  const anyFailed = jobs.some((j) => j.status === "FAILED");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  // Keep PREVIEW if shorts were generated successfully
  if (project?.status === "PREVIEW" && !anyFailed) return;
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: anyFailed ? "FAILED" : project?.status === "PREVIEW" ? "PREVIEW" : "COMPLETED",
      progress: anyFailed ? project?.progress || 0 : 100,
      completedAt: new Date(),
    },
  });
}

/** Chain next jobs after download/analyze */
async function chainAfterDownload(projectId: string, userId: string, downloadResult: any) {
  // Enqueue analyze
  const analyzeJob = await prisma.job.create({
    data: {
      projectId,
      type: "ANALYZE",
      status: "WAITING",
      payload: { projectId, sourceUrl: downloadResult.meta?.webpage_url },
    },
  });
  const bull = await mediaQueue.add("analyze", {
    projectId,
    userId,
    dbJobId: analyzeJob.id,
    sourceUrl: downloadResult.meta?.webpage_url,
  });
  await prisma.job.update({ where: { id: analyzeJob.id }, data: { bullJobId: bull.id } });
}

async function chainAfterAnalyze(projectId: string, userId: string, analysis: any) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const parsed = (project?.inputMeta as any) || {};
  const intent = parsed.intent || "generate_shorts";
  const count = parsed.count || analysis.suggestedShortsCount || 5;

  if (intent === "generate_long") {
    const job = await prisma.job.create({
      data: {
        projectId,
        type: "GENERATE_LONG",
        status: "WAITING",
        payload: {
          projectId,
          durationMinutes: parsed.durationMinutes || 10,
          topic: parsed.topic || project?.title,
          style: parsed.style || analysis.tone,
        },
      },
    });
    const bull = await mediaQueue.add("generate_long", {
      ...job.payload as object,
      dbJobId: job.id,
      userId,
    });
    await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
  } else {
    // Default: Shorts
    const job = await prisma.job.create({
      data: {
        projectId,
        type: "GENERATE_SHORTS",
        status: "WAITING",
        payload: { projectId, count, style: parsed.style || analysis.tone },
      },
    });
    const bull = await mediaQueue.add("generate_shorts", {
      projectId,
      count,
      style: parsed.style || analysis.tone,
      dbJobId: job.id,
      userId,
    });
    await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
  }

  // Always queue SEO + thumbnail after content
  for (const [type, name] of [
    ["GENERATE_SEO", "generate_seo"],
    ["GENERATE_THUMBNAIL", "generate_thumbnail"],
  ] as const) {
    const job = await prisma.job.create({
      data: { projectId, type, status: "WAITING", payload: { projectId } },
    });
    const bull = await mediaQueue.add(name, { projectId, dbJobId: job.id, userId });
    await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
  }
}

const mediaWorker = new Worker(
  "media",
  async (job) => {
    const dbJobId = job.data.dbJobId as string | undefined;
    const projectId = job.data.projectId as string;
    const userId = job.data.userId as string;

    await updateJob(dbJobId, "ACTIVE", undefined, undefined, 5);

    try {
      let result: any;

      switch (job.name) {
        case "download":
          await setProjectProgress(projectId, 5, "DOWNLOADING");
          result = await processDownload(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          await chainAfterDownload(projectId, userId, result);
          break;

        case "analyze":
          await setProjectProgress(projectId, 25, "ANALYZING");
          result = await processAnalyze(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          await chainAfterAnalyze(projectId, userId, result);
          break;

        case "generate_shorts":
          await setProjectProgress(projectId, 45, "PROCESSING");
          result = await processGenerateShorts(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          break;

        case "generate_long":
          await setProjectProgress(projectId, 45, "PROCESSING");
          result = await processGenerateLong(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          break;

        case "generate_seo":
          result = await processGenerateSeo(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          break;

        case "generate_thumbnail":
          result = await processGenerateThumbnail(job.data);
          await updateJob(dbJobId, "COMPLETED", result, undefined, 100);
          break;

        default:
          throw new Error(`Unknown media job: ${job.name}`);
      }

      await maybeCompleteProject(projectId);
      return result;
    } catch (err: any) {
      console.error(`[media] ${job.name} failed`, err);
      await updateJob(dbJobId, "FAILED", undefined, err.message);
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "FAILED", error: err.message },
      }).catch(() => {});
      await maybeCompleteProject(projectId);
      throw err;
    }
  },
  { connection, concurrency: 1 } // serial for FFmpeg/CPU safety
);

const uploadWorker = new Worker(
  "upload",
  async (job) => {
    const dbJobId = job.data.dbJobId as string | undefined;
    await updateJob(dbJobId, "ACTIVE");
    try {
      const result = await processUpload(job.data);
      await updateJob(dbJobId, "COMPLETED", result);
      return result;
    } catch (err: any) {
      await updateJob(dbJobId, "FAILED", undefined, err.message);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

mediaWorker.on("completed", (job) => console.log(`[media] ✓ ${job.name} ${job.id}`));
mediaWorker.on("failed", (job, err) => console.error(`[media] ✗ ${job?.name}`, err.message));
uploadWorker.on("completed", (job) => console.log(`[upload] ✓ ${job.id}`));
uploadWorker.on("failed", (job, err) => console.error(`[upload] ✗`, err.message));

console.log("[worker] Ready – download → analyze → shorts/long → seo → thumbnail → upload");

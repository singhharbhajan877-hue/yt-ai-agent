import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const mediaQueue = new Queue("media", { connection });
export const uploadQueue = new Queue("upload", { connection });
export const analyticsQueue = new Queue("analytics", { connection });

export async function enqueueMediaJob(
  name: string,
  data: Record<string, unknown>,
  opts?: { priority?: number; delay?: number }
) {
  return mediaQueue.add(name, data, {
    priority: opts?.priority,
    delay: opts?.delay,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function enqueueUploadJob(data: Record<string, unknown>) {
  return uploadQueue.add("upload_youtube", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  });
}

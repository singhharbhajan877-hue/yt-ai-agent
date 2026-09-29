import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;
let mediaQueue: Queue | null = null;
let uploadQueue: Queue | null = null;
let analyticsQueue: Queue | null = null;

function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return connection;
}

function getMediaQueue() {
  if (!mediaQueue) mediaQueue = new Queue("media", { connection: getConnection() });
  return mediaQueue;
}

function getUploadQueue() {
  if (!uploadQueue) uploadQueue = new Queue("upload", { connection: getConnection() });
  return uploadQueue;
}

export { getMediaQueue as mediaQueue, getUploadQueue as uploadQueue };

export async function enqueueMediaJob(
  name: string,
  data: Record<string, unknown>,
  opts?: { priority?: number; delay?: number }
) {
  return getMediaQueue().add(name, data, {
    priority: opts?.priority,
    delay: opts?.delay,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function enqueueUploadJob(data: Record<string, unknown>) {
  return getUploadQueue().add("upload_youtube", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  });
}

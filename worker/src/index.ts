import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const mediaQueue = new Queue("media", { connection });
export const uploadQueue = new Queue("upload", { connection });
export const analyticsQueue = new Queue("analytics", { connection });

console.log("[worker] Starting YT AI Agent workers...");

// Media processing worker (transcribe, edit, render, shorts, long-form)
const mediaWorker = new Worker(
  "media",
  async (job) => {
    console.log(`[media] Processing job ${job.id} type=${job.name}`, job.data);

    switch (job.name) {
      case "transcribe":
        // TODO: call Whisper API or local whisper
        return { transcript: "placeholder" };
      case "generate_shorts":
        // TODO: FFmpeg pipeline – detect moments, crop 9:16, captions, music
        return { shorts: [] };
      case "generate_long":
        // TODO: script → TTS → assembly → FFmpeg export
        return { videoPath: null };
      case "render":
        // TODO: final FFmpeg render
        return { outputPath: null };
      default:
        throw new Error(`Unknown media job: ${job.name}`);
    }
  },
  { connection, concurrency: 2 }
);

// YouTube upload worker – uses official Data API only
const uploadWorker = new Worker(
  "upload",
  async (job) => {
    console.log(`[upload] Processing job ${job.id}`, job.data);
    // TODO: load tokens from DB, createYouTubeClient, videos.insert (resumable)
    return { youtubeVideoId: null };
  },
  { connection, concurrency: 1 }
);

// Analytics sync
const analyticsWorker = new Worker(
  "analytics",
  async (job) => {
    console.log(`[analytics] Sync for channel ${job.data.channelId}`);
    // TODO: youtube.channels.list + reports if available
    return { synced: true };
  },
  { connection, concurrency: 3 }
);

mediaWorker.on("completed", (job) => console.log(`[media] Done ${job.id}`));
mediaWorker.on("failed", (job, err) => console.error(`[media] Failed ${job?.id}`, err));

uploadWorker.on("completed", (job) => console.log(`[upload] Done ${job.id}`));
uploadWorker.on("failed", (job, err) => console.error(`[upload] Failed ${job?.id}`, err));

console.log("[worker] All workers registered. Waiting for jobs...");

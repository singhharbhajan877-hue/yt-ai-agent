import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { processCopyrightCheck } from "./copyright-check";

const prisma = new PrismaClient();

export async function processUpload(data: {
  videoId: string;
  channelId?: string;
  visibility?: "private" | "unlisted" | "public";
  publishAt?: string;
  skipCopyrightCheck?: boolean;
}) {
  console.log("[upload] video", data.videoId);

  const video = await prisma.video.findUnique({
    where: { id: data.videoId },
    include: { channel: true },
  });
  if (!video) throw new Error("Video not found");

  // Copyright scan
  if (!data.skipCopyrightCheck) {
    const report = await processCopyrightCheck({ videoId: video.id });
    if (report.blockUpload) {
      await prisma.video.update({
        where: { id: video.id },
        data: { uploadStatus: "FAILED" },
      });
      throw new Error(
        `Upload blocked by copyright risk check (${report.risk}): ${(report.reasons || []).join("; ")}`
      );
    }
  }

  let channel = video.channel;
  if (!channel && data.channelId) {
    channel = await prisma.youTubeChannel.findUnique({ where: { id: data.channelId } });
  }
  if (!channel) {
    channel = await prisma.youTubeChannel.findFirst({ where: { userId: video.userId } });
  }
  if (!channel) {
    throw new Error("No YouTube channel connected. Connect one in Settings.");
  }

  if (!video.filePath || !fs.existsSync(video.filePath)) {
    throw new Error(
      "No rendered video file available. Complete the media pipeline or attach a file first."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: channel.accessToken,
    refresh_token: channel.refreshToken || undefined,
  });

  // Refresh token if needed is handled by google client on 401 in many cases;
  // still set credentials from DB.

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const visibility = (data.visibility || video.visibility.toLowerCase() || "private") as
    | "private"
    | "unlisted"
    | "public";

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: video.title.slice(0, 100),
        description: video.description || "",
        tags: video.tags || [],
        categoryId: video.categoryId || "22",
      },
      status: {
        privacyStatus: visibility,
        publishAt: data.publishAt || (video.scheduledAt ? video.scheduledAt.toISOString() : undefined),
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(video.filePath),
    },
  });

  const youtubeVideoId = res.data.id;
  if (!youtubeVideoId) throw new Error("Upload succeeded but no video ID returned");

  await prisma.video.update({
    where: { id: video.id },
    data: {
      youtubeVideoId,
      uploadStatus: data.publishAt || video.scheduledAt ? "SCHEDULED" : "UPLOADED",
      uploadedAt: new Date(),
      visibility: visibility.toUpperCase() as any,
      channelId: channel.id,
      scheduledAt: data.publishAt ? new Date(data.publishAt) : video.scheduledAt,
    },
  });

  if (
    video.thumbnailPath &&
    fs.existsSync(video.thumbnailPath) &&
    /\.(jpg|jpeg|png)$/i.test(video.thumbnailPath)
  ) {
    try {
      await youtube.thumbnails.set({
        videoId: youtubeVideoId,
        media: { body: fs.createReadStream(video.thumbnailPath) },
      });
    } catch (e) {
      console.warn("[upload] thumbnail set failed", e);
    }
  }

  return {
    youtubeVideoId,
    url: `https://youtube.com/watch?v=${youtubeVideoId}`,
    visibility,
  };
}

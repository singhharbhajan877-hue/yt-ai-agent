import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

/**
 * Upload via official YouTube Data API v3 (resumable).
 * Requires a connected channel with valid OAuth tokens.
 */
export async function processUpload(data: {
  videoId: string;
  channelId?: string;
  visibility?: "private" | "unlisted" | "public";
  publishAt?: string;
}) {
  console.log("[upload] video", data.videoId);

  const video = await prisma.video.findUnique({
    where: { id: data.videoId },
    include: { channel: true },
  });
  if (!video) throw new Error("Video not found");

  let channel = video.channel;
  if (!channel && data.channelId) {
    channel = await prisma.youTubeChannel.findUnique({ where: { id: data.channelId } });
  }
  if (!channel) {
    // Fallback: first channel of the user
    channel = await prisma.youTubeChannel.findFirst({
      where: { userId: video.userId },
    });
  }
  if (!channel) {
    throw new Error("No YouTube channel connected. Connect one in Settings.");
  }

  if (!video.filePath || !fs.existsSync(video.filePath)) {
    throw new Error(
      "No rendered video file available for upload. Complete the media pipeline first."
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

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const visibility = data.visibility || video.visibility.toLowerCase() || "private";

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
        privacyStatus: visibility as any,
        publishAt: data.publishAt || undefined,
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
      uploadStatus: data.publishAt ? "SCHEDULED" : "UPLOADED",
      uploadedAt: new Date(),
      visibility: visibility.toUpperCase() as any,
      channelId: channel.id,
    },
  });

  // Optional: set custom thumbnail if file exists and is an image
  if (video.thumbnailPath && fs.existsSync(video.thumbnailPath) && video.thumbnailPath.match(/\.(jpg|jpeg|png)$/i)) {
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

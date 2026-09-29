import { google } from "googleapis";

/**
 * Create an authenticated YouTube Data API v3 client.
 * Uses the user's stored OAuth tokens. Never use browser automation.
 */
export function createYouTubeClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/**
 * Upload a video via the official videos.insert endpoint (resumable).
 * visibility: "private" | "unlisted" | "public"
 */
export async function uploadVideo(
  youtube: ReturnType<typeof createYouTubeClient>,
  options: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    visibility: "private" | "unlisted" | "public";
    filePath: string; // local path or stream
    publishAt?: string; // ISO date for scheduled
  }
) {
  // In production: use resumable upload with fs.createReadStream(options.filePath)
  // See: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || "22",
      },
      status: {
        privacyStatus: options.visibility,
        publishAt: options.publishAt,
        selfDeclaredMadeForKids: false,
      },
    },
    // media: { body: fs.createReadStream(options.filePath) },
  });

  return res.data;
}

export async function setThumbnail(
  youtube: ReturnType<typeof createYouTubeClient>,
  videoId: string,
  thumbnailPath: string
) {
  // Official thumbnails.set endpoint
  // media: { body: fs.createReadStream(thumbnailPath) }
  return youtube.thumbnails.set({
    videoId,
    // media: ...
  });
}

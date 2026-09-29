import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();

/**
 * Auto-reply to recent comments on the user's channel videos
 * using official YouTube Data API + Gemini.
 */
export async function processCommentReply(data: {
  channelDbId: string;
  maxComments?: number;
}) {
  const channel = await prisma.youTubeChannel.findUnique({
    where: { id: data.channelDbId },
  });
  if (!channel) throw new Error("Channel not found");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: channel.accessToken,
    refresh_token: channel.refreshToken || undefined,
  });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // Recent comment threads on channel
  const threads = await youtube.commentThreads.list({
    part: ["snippet"],
    allThreadsRelatedToChannelId: channel.channelId,
    maxResults: data.maxComments || 10,
    order: "time",
    textFormat: "plainText",
  });

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const replies: any[] = [];

  for (const item of threads.data.items || []) {
    const top = item.snippet?.topLevelComment?.snippet;
    const commentId = item.snippet?.topLevelComment?.id;
    if (!top || !commentId) continue;
    if (top.authorChannelId?.value === channel.channelId) continue; // skip own

    const text = top.textDisplay || top.textOriginal || "";
    if (!text.trim()) continue;

    // Skip if already replied (totalReplyCount > 0 and we assume handled)
    if ((item.snippet?.totalReplyCount || 0) > 0) continue;

    const prompt = `Write a short, friendly YouTube comment reply (max 2 sentences).
Be helpful, on-brand, never offensive. Do not promise giveaways.
Viewer comment: "${text.slice(0, 500)}"
Reply:`;

    let replyText = "Thanks for watching! 🙏";
    try {
      const result = await model.generateContent(prompt);
      replyText = result.response.text().trim().slice(0, 500);
    } catch {}

    try {
      await youtube.comments.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            parentId: commentId,
            textOriginal: replyText,
          },
        },
      });
      replies.push({ commentId, replyText });
    } catch (e: any) {
      console.warn("[comment-reply] failed", e.message);
    }
  }

  return { replied: replies.length, replies };
}

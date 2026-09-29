import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();

export async function processAnalyticsRecommend(data: { channelDbId: string }) {
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

  // Refresh channel stats
  const chRes = await youtube.channels.list({
    part: ["snippet", "statistics"],
    id: [channel.channelId],
  });
  const stats = chRes.data.items?.[0]?.statistics;

  if (stats) {
    await prisma.youTubeChannel.update({
      where: { id: channel.id },
      data: {
        subscriberCount: Number(stats.subscriberCount || 0),
        viewCount: BigInt(stats.viewCount || 0),
        videoCount: Number(stats.videoCount || 0),
        lastSyncedAt: new Date(),
      },
    });

    await prisma.channelAnalytics.upsert({
      where: {
        channelId_date: {
          channelId: channel.id,
          date: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
      create: {
        channelId: channel.id,
        date: new Date(new Date().toISOString().slice(0, 10)),
        views: BigInt(stats.viewCount || 0),
        raw: stats as any,
      },
      update: {
        views: BigInt(stats.viewCount || 0),
        raw: stats as any,
      },
    });
  }

  // Recent uploads for context
  const search = await youtube.search.list({
    part: ["snippet"],
    forMine: true,
    type: ["video"],
    order: "date",
    maxResults: 5,
  });

  const recent = (search.data.items || []).map((i) => i.snippet?.title).filter(Boolean);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are a YouTube growth advisor.
Channel: ${channel.title}
Subscribers: ${stats?.subscriberCount || channel.subscriberCount}
Total views: ${stats?.viewCount || channel.viewCount}
Video count: ${stats?.videoCount || channel.videoCount}
Recent titles: ${recent.join(" | ")}

Return JSON:
{
  "summary": "one paragraph health check",
  "recommendations": ["actionable tip 1", "tip 2", "tip 3"],
  "contentIdeas": ["video idea 1", "video idea 2", "video idea 3"],
  "bestPostingTimes": ["weekday evenings", "..."],
  "priority": "high|medium|low"
}`;

  let advice: any;
  try {
    const result = await model.generateContent(prompt);
    advice = JSON.parse(result.response.text().replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    advice = {
      summary: "Could not generate advice. Check API key.",
      recommendations: ["Post consistently", "Improve thumbnails", "Add chapters"],
      contentIdeas: [],
      bestPostingTimes: [],
      priority: "medium",
    };
  }

  return { stats, advice };
}

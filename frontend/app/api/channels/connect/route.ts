import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const accessToken = (session as any).accessToken as string | undefined;
    const refreshToken = (session as any).refreshToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Google access token. Please sign out and sign in again to grant YouTube scopes." },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const res = await youtube.channels.list({
      part: ["snippet", "statistics", "contentDetails"],
      mine: true,
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "No YouTube channel found for this Google account." },
        { status: 404 }
      );
    }

    const connected = [];
    for (const ch of items) {
      if (!ch.id) continue;
      const record = await prisma.youTubeChannel.upsert({
        where: {
          userId_channelId: { userId, channelId: ch.id },
        },
        create: {
          userId,
          channelId: ch.id,
          title: ch.snippet?.title || "Untitled",
          description: ch.snippet?.description,
          thumbnailUrl: ch.snippet?.thumbnails?.default?.url,
          customUrl: ch.snippet?.customUrl,
          subscriberCount: Number(ch.statistics?.subscriberCount || 0),
          viewCount: BigInt(ch.statistics?.viewCount || 0),
          videoCount: Number(ch.statistics?.videoCount || 0),
          accessToken: accessToken,
          refreshToken: refreshToken || null,
          tokenExpiresAt: null,
          scopes: [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/youtube",
          ],
          isPrimary: connected.length === 0,
          lastSyncedAt: new Date(),
        },
        update: {
          title: ch.snippet?.title || "Untitled",
          description: ch.snippet?.description,
          thumbnailUrl: ch.snippet?.thumbnails?.default?.url,
          customUrl: ch.snippet?.customUrl,
          subscriberCount: Number(ch.statistics?.subscriberCount || 0),
          viewCount: BigInt(ch.statistics?.viewCount || 0),
          videoCount: Number(ch.statistics?.videoCount || 0),
          accessToken: accessToken,
          refreshToken: refreshToken || undefined,
          lastSyncedAt: new Date(),
        },
      });
      connected.push(record);
    }

    return NextResponse.json({
      success: true,
      channels: connected.map((c) => ({
        id: c.id,
        channelId: c.channelId,
        title: c.title,
      })),
    });
  } catch (err: any) {
    console.error("[channels/connect]", err);
    return NextResponse.json(
      { error: err.message || "Failed to connect channel" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueMediaJob } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id as string;

  const channel = await prisma.youTubeChannel.findFirst({
    where: { id, userId },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const job = await prisma.job.create({
    data: {
      type: "SYNC_ANALYTICS",
      status: "WAITING",
      payload: { channelDbId: id },
    },
  });

  const bull = await enqueueMediaJob("analytics_recommend", {
    channelDbId: id,
    dbJobId: job.id,
    userId,
  });

  await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: "Analytics sync + recommendations queued",
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id as string;

  const channel = await prisma.youTubeChannel.findFirst({
    where: { id, userId },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const analytics = await prisma.channelAnalytics.findMany({
    where: { channelId: id },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json({
    channel: {
      id: channel.id,
      title: channel.title,
      subscriberCount: channel.subscriberCount,
      viewCount: channel.viewCount?.toString(),
      videoCount: channel.videoCount,
      lastSyncedAt: channel.lastSyncedAt,
    },
    analytics,
  });
}

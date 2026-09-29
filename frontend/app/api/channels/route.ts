import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const channels = await prisma.youTubeChannel.findMany({
    where: { userId },
    select: {
      id: true,
      channelId: true,
      title: true,
      thumbnailUrl: true,
      customUrl: true,
      subscriberCount: true,
      isPrimary: true,
      lastSyncedAt: true,
    },
  });

  return NextResponse.json({ channels });
}

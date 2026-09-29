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

  const body = await req.json().catch(() => ({}));
  const maxComments = body.maxComments || 10;

  const job = await prisma.job.create({
    data: {
      type: "SYNC_ANALYTICS", // reuse enum slot conceptually; worker uses comment_reply name
      status: "WAITING",
      payload: { channelDbId: id, maxComments },
    },
  });

  const bull = await enqueueMediaJob("comment_reply", {
    channelDbId: id,
    maxComments,
    dbJobId: job.id,
    userId,
  });

  await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: "Comment auto-reply job queued",
  });
}

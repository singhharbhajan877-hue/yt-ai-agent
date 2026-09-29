import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueUploadJob } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id as string;

    const video = await prisma.video.findFirst({ where: { id, userId } });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const job = await prisma.job.create({
      data: {
        type: "UPLOAD_YOUTUBE",
        status: "WAITING",
        payload: {
          videoId: id,
          visibility: body.visibility || "private",
          publishAt: body.publishAt,
        },
      },
    });

    const bullJob = await enqueueUploadJob({
      videoId: id,
      visibility: body.visibility || "private",
      publishAt: body.publishAt,
      dbJobId: job.id,
      userId,
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { bullJobId: bullJob.id },
    });

    await prisma.video.update({
      where: { id },
      data: { uploadStatus: "UPLOADING" },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Upload queued. Worker will process via official YouTube Data API.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

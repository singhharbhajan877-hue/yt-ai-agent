import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [videos, jobs] = await Promise.all([
    prisma.video.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
    prisma.job.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({ project, videos, jobs });
}

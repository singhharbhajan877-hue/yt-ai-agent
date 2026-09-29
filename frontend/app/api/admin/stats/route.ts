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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden – ADMIN role required" }, { status: 403 });
  }

  const [users, projects, videos, jobsWaiting] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.video.count(),
    prisma.job.count({ where: { status: "WAITING" } }),
  ]);

  return NextResponse.json({ users, projects, videos, jobsWaiting });
}

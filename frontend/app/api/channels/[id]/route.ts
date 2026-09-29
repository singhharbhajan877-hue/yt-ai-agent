import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.youTubeChannel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

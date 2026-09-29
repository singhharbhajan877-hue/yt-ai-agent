import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseCommand } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { enqueueMediaJob } from "@/lib/queue";

const CREDIT_COST: Record<string, number> = {
  generate_shorts: 10,
  generate_long: 25,
  download: 5,
  seo: 2,
  thumbnail: 3,
  unknown: 5,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const command = (body.command as string)?.trim();
    if (!command || command.length < 3) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const userId = (session.user as any).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let parsed: any;
    try {
      parsed = await parseCommand(command);
    } catch {
      // Extract URL heuristically
      const urlMatch = command.match(/(https?:\/\/[^\s]+youtube[^\s]*|https?:\/\/youtu\.be\/[^\s]+)/i);
      parsed = {
        intent: urlMatch ? "generate_shorts" : "unknown",
        count: 5,
        durationMinutes: null,
        style: null,
        sourceUrl: urlMatch ? urlMatch[0] : null,
        topic: command,
        visibility: "private",
        scheduleAt: null,
      };
    }

    // If URL present, force download-first pipeline
    const hasUrl = !!parsed.sourceUrl;
    const intent = hasUrl ? (parsed.intent === "generate_long" ? "generate_long" : "generate_shorts") : parsed.intent;
    const cost = CREDIT_COST[intent] || CREDIT_COST.unknown;

    if (user.credits < cost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${cost}, have ${user.credits}. Buy more on the Billing page.`,
          credits: user.credits,
          required: cost,
        },
        { status: 402 }
      );
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
    });
    await prisma.creditLog.create({
      data: {
        userId,
        amount: -cost,
        reason: `Command: ${intent}`,
      },
    });

    const project = await prisma.project.create({
      data: {
        userId,
        title: command.slice(0, 120),
        command,
        status: hasUrl ? "QUEUED" : "QUEUED",
        style: parsed.style || null,
        targetDurationSec: parsed.durationMinutes ? Math.round(parsed.durationMinutes * 60) : null,
        inputType: hasUrl ? "youtube_url" : "prompt",
        inputUrl: parsed.sourceUrl || null,
        inputMeta: { ...parsed, intent },
        progress: 0,
        creditsUsed: cost,
      },
    });

    await prisma.creditLog.updateMany({
      where: { userId, reason: `Command: ${intent}`, projectId: null },
      data: { projectId: project.id },
    });

    await prisma.commandLog.create({
      data: { userId, command, parsed, projectId: project.id },
    });

    const createdJobs: string[] = [];

    if (hasUrl) {
      // Pipeline starts with DOWNLOAD – worker chains the rest
      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          type: "DOWNLOAD",
          status: "WAITING",
          payload: { projectId: project.id, sourceUrl: parsed.sourceUrl },
        },
      });
      const bull = await enqueueMediaJob("download", {
        projectId: project.id,
        sourceUrl: parsed.sourceUrl,
        dbJobId: job.id,
        userId,
      });
      await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
      createdJobs.push(job.id);
    } else if (intent === "generate_long") {
      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          type: "GENERATE_LONG",
          status: "WAITING",
          payload: {
            projectId: project.id,
            durationMinutes: parsed.durationMinutes || 10,
            topic: parsed.topic || command,
            style: parsed.style || "educational",
          },
        },
      });
      const bull = await enqueueMediaJob("generate_long", {
        ...job.payload as object,
        dbJobId: job.id,
        userId,
      });
      await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
      createdJobs.push(job.id);
    } else {
      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          type: "ANALYZE",
          status: "WAITING",
          payload: { projectId: project.id, raw: parsed },
        },
      });
      const bull = await enqueueMediaJob("analyze", {
        projectId: project.id,
        dbJobId: job.id,
        userId,
        raw: parsed,
      });
      await prisma.job.update({ where: { id: job.id }, data: { bullJobId: bull.id } });
      createdJobs.push(job.id);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      parsed: { ...parsed, intent },
      jobs: createdJobs,
      creditsUsed: cost,
      creditsRemaining: user.credits - cost,
    });
  } catch (err: any) {
    console.error("[commands] error", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseCommand } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { enqueueMediaJob } from "@/lib/queue";

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

    let parsed: any;
    try {
      parsed = await parseCommand(command);
    } catch (e) {
      console.error("[commands] parse failed", e);
      parsed = {
        intent: "unknown",
        count: null,
        durationMinutes: null,
        style: null,
        sourceUrl: null,
        topic: command,
        visibility: "private",
        scheduleAt: null,
        notes: "Parse fallback",
      };
    }

    const project = await prisma.project.create({
      data: {
        userId,
        title: command.slice(0, 120),
        command,
        status: "QUEUED",
        style: parsed.style || null,
        targetDurationSec: parsed.durationMinutes
          ? Math.round(parsed.durationMinutes * 60)
          : null,
        inputType: parsed.sourceUrl ? "youtube_url" : "prompt",
        inputUrl: parsed.sourceUrl || null,
        inputMeta: parsed,
      },
    });

    await prisma.commandLog.create({
      data: {
        userId,
        command,
        parsed,
        projectId: project.id,
      },
    });

    const jobDefs: { type: any; name: string; payload: any }[] = [];

    switch (parsed.intent) {
      case "generate_shorts":
        jobDefs.push(
          { type: "ANALYZE", name: "analyze", payload: { projectId: project.id, sourceUrl: parsed.sourceUrl } },
          {
            type: "GENERATE_SHORTS",
            name: "generate_shorts",
            payload: { projectId: project.id, count: parsed.count || 5, source: parsed.style },
          },
          { type: "GENERATE_SEO", name: "generate_seo", payload: { projectId: project.id } },
          { type: "GENERATE_THUMBNAIL", name: "generate_thumbnail", payload: { projectId: project.id } }
        );
        break;
      case "generate_long":
        jobDefs.push(
          {
            type: "GENERATE_LONG",
            name: "generate_long",
            payload: {
              projectId: project.id,
              durationMinutes: parsed.durationMinutes || 10,
              topic: parsed.topic || command,
              style: parsed.style || "educational",
            },
          },
          { type: "GENERATE_SEO", name: "generate_seo", payload: { projectId: project.id } },
          { type: "GENERATE_THUMBNAIL", name: "generate_thumbnail", payload: { projectId: project.id } }
        );
        break;
      case "seo":
      case "thumbnail":
        jobDefs.push({
          type: parsed.intent === "seo" ? "GENERATE_SEO" : "GENERATE_THUMBNAIL",
          name: parsed.intent === "seo" ? "generate_seo" : "generate_thumbnail",
          payload: { projectId: project.id },
        });
        break;
      default:
        jobDefs.push({
          type: "ANALYZE",
          name: "analyze",
          payload: { projectId: project.id, raw: parsed },
        });
    }

    const createdJobs = [];
    for (const def of jobDefs) {
      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          type: def.type,
          status: "WAITING",
          payload: def.payload,
        },
      });

      const bullJob = await enqueueMediaJob(def.name, {
        ...def.payload,
        dbJobId: job.id,
        userId,
      });

      await prisma.job.update({
        where: { id: job.id },
        data: { bullJobId: bullJob.id },
      });

      createdJobs.push(job.id);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      parsed,
      jobs: createdJobs,
    });
  } catch (err: any) {
    console.error("[commands] error", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseCommand } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const command = (body.command as string)?.trim();
  if (!command) {
    return NextResponse.json({ error: "Command is required" }, { status: 400 });
  }

  const userId = (session.user as any).id as string;

  // Parse intent with Gemini
  let parsed;
  try {
    parsed = await parseCommand(command);
  } catch (e) {
    console.error("Command parse failed", e);
    parsed = { intent: "unknown", notes: "Failed to parse" };
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      userId,
      title: command.slice(0, 120),
      command,
      status: "QUEUED",
      style: parsed.style || null,
      targetDurationSec: parsed.durationMinutes
        ? parsed.durationMinutes * 60
        : null,
      inputType: parsed.sourceUrl ? "youtube_url" : "prompt",
      inputUrl: parsed.sourceUrl || null,
      inputMeta: parsed,
    },
  });

  // Log command
  await prisma.commandLog.create({
    data: {
      userId,
      command,
      parsed,
      projectId: project.id,
    },
  });

  // Create initial jobs based on intent (worker will pick them up)
  const jobsToCreate: { type: any; payload: any }[] = [];

  if (parsed.intent === "generate_shorts") {
    jobsToCreate.push(
      { type: "ANALYZE", payload: { projectId: project.id } },
      { type: "GENERATE_SHORTS", payload: { projectId: project.id, count: parsed.count || 5 } },
      { type: "GENERATE_SEO", payload: { projectId: project.id } },
      { type: "GENERATE_THUMBNAIL", payload: { projectId: project.id } }
    );
  } else if (parsed.intent === "generate_long") {
    jobsToCreate.push(
      { type: "GENERATE_LONG", payload: { projectId: project.id, durationMinutes: parsed.durationMinutes || 10 } },
      { type: "GENERATE_SEO", payload: { projectId: project.id } },
      { type: "GENERATE_THUMBNAIL", payload: { projectId: project.id } }
    );
  } else {
    jobsToCreate.push({ type: "ANALYZE", payload: { projectId: project.id, raw: parsed } });
  }

  const jobs = await Promise.all(
    jobsToCreate.map((j) =>
      prisma.job.create({
        data: {
          projectId: project.id,
          type: j.type,
          status: "WAITING",
          payload: j.payload,
        },
      })
    )
  );

  // TODO: enqueue to BullMQ (mediaQueue.add(...))

  return NextResponse.json({
    projectId: project.id,
    parsed,
    jobs: jobs.map((j) => j.id),
  });
}

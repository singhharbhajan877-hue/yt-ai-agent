import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Generate Shorts from analyzed moments.
 * Real pipeline:
 * 1. Ensure source video exists (user upload or authorized download)
 * 2. FFmpeg: crop 9:16, trim segments, burn captions, add music
 * 3. Save outputs and create Video records
 *
 * This implementation creates project artifacts and runs a safe FFmpeg
 * probe / placeholder render when a local source file is available.
 */
export async function processGenerateShorts(data: {
  projectId: string;
  count?: number;
  style?: string;
  userId?: string;
}) {
  const count = data.count || 5;
  console.log(`[shorts] Generating up to ${count} shorts for project ${data.projectId}`);

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const outDir = path.join(STORAGE, "projects", data.projectId, "shorts");
  fs.mkdirSync(outDir, { recursive: true });

  // Check if FFmpeg is available
  let ffmpegOk = false;
  try {
    await execAsync("ffmpeg -version");
    ffmpegOk = true;
  } catch {
    console.warn("[shorts] FFmpeg not found on PATH – skipping actual render");
  }

  const shorts: any[] = [];
  const moments = (project.inputMeta as any)?.moments || [
    { start: 0, end: 30, label: "Clip 1" },
    { start: 30, end: 60, label: "Clip 2" },
    { start: 60, end: 90, label: "Clip 3" },
  ];

  for (let i = 0; i < Math.min(count, moments.length || count); i++) {
    const m = moments[i] || { start: i * 30, end: i * 30 + 30, label: `Short ${i + 1}` };
    const outFile = path.join(outDir, `short_${i + 1}.mp4`);

    // If a source file exists under storage/uploads, run a real FFmpeg crop
    const possibleSource = path.join(STORAGE, "uploads", `${data.projectId}.mp4`);
    if (ffmpegOk && fs.existsSync(possibleSource)) {
      // 9:16 center crop + trim
      const duration = Math.max(5, (m.end || 30) - (m.start || 0));
      const cmd = `ffmpeg -y -ss ${m.start || 0} -i "${possibleSource}" -t ${duration} -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a aac -b:a 128k "${outFile}"`;
      try {
        await execAsync(cmd, { timeout: 120000 });
      } catch (e: any) {
        console.warn(`[shorts] FFmpeg failed for clip ${i + 1}:`, e.message);
      }
    } else {
      // Write a marker file so pipeline continues
      fs.writeFileSync(
        path.join(outDir, `short_${i + 1}.json`),
        JSON.stringify({ label: m.label, start: m.start, end: m.end, note: "Placeholder – provide source video under storage/uploads" }, null, 2)
      );
    }

    const video = await prisma.video.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        title: `${project.title} – Short ${i + 1}`,
        description: m.label || `AI Short ${i + 1}`,
        tags: ["shorts", data.style || "ai"].filter(Boolean),
        visibility: "PRIVATE",
        durationSec: Math.round((m.end || 30) - (m.start || 0)),
        filePath: fs.existsSync(outFile) ? outFile : null,
        uploadStatus: "PENDING",
        metadata: { moment: m, style: data.style },
      },
    });

    shorts.push({ videoId: video.id, label: m.label, path: outFile });
  }

  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      resultMeta: { shorts, count: shorts.length },
    },
  });

  return { shorts, count: shorts.length, outDir };
}

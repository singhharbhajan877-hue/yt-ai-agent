import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Download a YouTube video with yt-dlp.
 * ONLY use for content the user owns or has explicit rights to process.
 * Saves video + audio + metadata under storage/projects/{id}/source/
 */
export async function processDownload(data: {
  projectId: string;
  sourceUrl: string;
  userId?: string;
}) {
  const { projectId, sourceUrl } = data;
  console.log(`[download] ${sourceUrl} → project ${projectId}`);

  if (!sourceUrl || !sourceUrl.includes("youtube.com") && !sourceUrl.includes("youtu.be")) {
    throw new Error("Only YouTube URLs are supported");
  }

  const outDir = path.join(STORAGE, "projects", projectId, "source");
  fs.mkdirSync(outDir, { recursive: true });

  const videoPath = path.join(outDir, "video.mp4");
  const metaPath = path.join(outDir, "meta.json");

  // Check yt-dlp
  try {
    await execAsync("yt-dlp --version");
  } catch {
    throw new Error(
      "yt-dlp is not installed. Install it: pip install yt-dlp  OR  apk add yt-dlp"
    );
  }

  // Download best mp4 + write metadata (no playlist)
  const cmd = [
    "yt-dlp",
    "--no-playlist",
    "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
    "--merge-output-format", "mp4",
    "--write-info-json",
    "--write-auto-sub", "--sub-lang", "en", "--convert-subs", "srt",
    "-o", path.join(outDir, "video.%(ext)s"),
    `--max-filesize`, "500M",
    `"${sourceUrl}"`,
  ].join(" ");

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 600000, // 10 min
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log("[download] yt-dlp done", stdout?.slice(0, 200));
    if (stderr) console.warn("[download] stderr", stderr.slice(0, 300));
  } catch (e: any) {
    console.error("[download] failed", e.message);
    throw new Error(`Download failed: ${e.message}`);
  }

  // Locate output
  const files = fs.readdirSync(outDir);
  const mp4 = files.find((f) => f.endsWith(".mp4"));
  const infoJson = files.find((f) => f.endsWith(".info.json"));
  const srt = files.find((f) => f.endsWith(".srt"));

  if (!mp4) {
    throw new Error("Download completed but no MP4 found");
  }

  const finalVideo = path.join(outDir, mp4);
  let meta: any = { url: sourceUrl };
  if (infoJson) {
    try {
      meta = JSON.parse(fs.readFileSync(path.join(outDir, infoJson), "utf8"));
    } catch {}
  }

  // Copy to standard name for downstream jobs
  const standardPath = path.join(outDir, "video.mp4");
  if (finalVideo !== standardPath) {
    fs.copyFileSync(finalVideo, standardPath);
  }

  // Also copy to uploads for Shorts pipeline compatibility
  const uploadsDir = path.join(STORAGE, "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.copyFileSync(standardPath, path.join(uploadsDir, `${projectId}.mp4`));

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "ANALYZING",
      progress: 20,
      inputMeta: {
        ...((await prisma.project.findUnique({ where: { id: projectId } }))?.inputMeta as object || {}),
        download: {
          videoPath: standardPath,
          duration: meta.duration,
          title: meta.title,
          description: meta.description,
          thumbnail: meta.thumbnail,
          width: meta.width,
          height: meta.height,
          srtPath: srt ? path.join(outDir, srt) : null,
        },
      },
    },
  });

  return {
    videoPath: standardPath,
    duration: meta.duration,
    title: meta.title,
    srtPath: srt ? path.join(outDir, srt) : null,
    meta,
  };
}

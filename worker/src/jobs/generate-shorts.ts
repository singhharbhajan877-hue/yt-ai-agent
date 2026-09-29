import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

async function hasFfmpeg() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Production Shorts pipeline with FFmpeg:
 * - Trim to viral moment
 * - Crop/scale to 9:16 (1080x1920)
 * - Mild zoom (Ken Burns-ish via zoompan)
 * - Color enhancement + mild denoise
 * - Burn subtitles if SRT available
 * - Optional background music mix
 */
export async function processGenerateShorts(data: {
  projectId: string;
  count?: number;
  style?: string;
  userId?: string;
}) {
  const count = data.count || 5;
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const inputMeta = (project.inputMeta as any) || {};
  const moments: any[] = inputMeta.moments || inputMeta.analysis?.moments || [];
  const sourcePath =
    inputMeta.download?.videoPath ||
    path.join(STORAGE, "uploads", `${data.projectId}.mp4`) ||
    path.join(STORAGE, "projects", data.projectId, "source", "video.mp4");

  const outDir = path.join(STORAGE, "projects", data.projectId, "shorts");
  fs.mkdirSync(outDir, { recursive: true });

  const ffmpegOk = await hasFfmpeg();
  if (!ffmpegOk) {
    console.warn("[shorts] FFmpeg missing – creating metadata-only shorts");
  }
  if (!fs.existsSync(sourcePath)) {
    console.warn("[shorts] Source video missing:", sourcePath);
  }

  const srtPath = inputMeta.download?.srtPath;
  const musicPath = process.env.DEFAULT_MUSIC_PATH; // optional bg music file

  const selected = (moments.length ? moments : [{ start: 0, end: 30, label: "Clip 1" }])
    .slice(0, count)
    .sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));

  const shorts: any[] = [];

  for (let i = 0; i < selected.length; i++) {
    const m = selected[i];
    const start = Math.max(0, Number(m.start) || 0);
    const end = Math.max(start + 5, Number(m.end) || start + 30);
    const duration = Math.min(60, end - start);
    const outFile = path.join(outDir, `short_${i + 1}.mp4`);
    const previewFile = path.join(outDir, `short_${i + 1}_preview.jpg`);

    if (ffmpegOk && fs.existsSync(sourcePath)) {
      // Build filter chain:
      // 1. crop to 9:16 centered (face-ish center bias slightly up)
      // 2. scale 1080x1920
      // 3. mild zoompan for motion
      // 4. eq for color / unsharp
      // 5. optional subtitles
      const filters: string[] = [
        `crop=ih*9/16:ih:(iw-ih*9/16)/2:ih*0.05`,
        `scale=1080:1920:force_original_aspect_ratio=decrease`,
        `pad=1080:1920:(ow-iw)/2:(oh-ih)/2`,
        `eq=contrast=1.08:brightness=0.03:saturation=1.15`,
        `unsharp=5:5:0.8:5:5:0.0`,
      ];

      // Subtle zoom over duration
      filters.push(
        `zoompan=z='min(zoom+0.0008,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30`
      );

      if (srtPath && fs.existsSync(srtPath)) {
        // Escape path for FFmpeg subtitles filter
        const escaped = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
        filters.push(
          `subtitles='${escaped}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=80,Alignment=2'`
        );
      } else {
        // Fallback title card style text at bottom
        const label = (m.label || `Short ${i + 1}`).replace(/'/g, "").slice(0, 40);
        filters.push(
          `drawtext=text='${label}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-120`
        );
      }

      const vf = filters.join(",");

      let cmd = `ffmpeg -y -ss ${start} -i "${sourcePath}" -t ${duration}`;

      if (musicPath && fs.existsSync(musicPath)) {
        cmd += ` -i "${musicPath}"`;
        cmd += ` -filter_complex "[0:v]${vf}[v];[0:a]volume=1.0[a0];[1:a]volume=0.18[a1];[a0][a1]amix=inputs=2:duration=first[a]"`;
        cmd += ` -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${outFile}"`;
      } else {
        cmd += ` -vf "${vf}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${outFile}"`;
      }

      try {
        await execAsync(cmd, { timeout: 300000, maxBuffer: 5 * 1024 * 1024 });
        // Preview frame
        await execAsync(
          `ffmpeg -y -i "${outFile}" -ss 1 -vframes 1 -q:v 2 "${previewFile}"`,
          { timeout: 30000 }
        ).catch(() => {});
      } catch (e: any) {
        console.error(`[shorts] FFmpeg failed clip ${i + 1}:`, e.message);
        // Write failure marker but continue other clips
        fs.writeFileSync(
          path.join(outDir, `short_${i + 1}_error.txt`),
          e.message
        );
      }
    } else {
      fs.writeFileSync(
        path.join(outDir, `short_${i + 1}.json`),
        JSON.stringify({ label: m.label, start, end, note: "Render skipped – missing FFmpeg or source" }, null, 2)
      );
    }

    const video = await prisma.video.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        title: `${(inputMeta.download?.title || project.title).slice(0, 60)} – Short ${i + 1}`,
        description: m.reason || m.label || `AI Short ${i + 1}`,
        tags: ["shorts", data.style || "viral", ...(inputMeta.analysis?.keywords || []).slice(0, 5)],
        visibility: "PRIVATE",
        durationSec: Math.round(duration),
        filePath: fs.existsSync(outFile) ? outFile : null,
        previewPath: fs.existsSync(previewFile) ? previewFile : null,
        uploadStatus: "AWAITING_APPROVAL",
        metadata: {
          moment: m,
          style: data.style,
          aspect: "9:16",
          viralityScore: m.viralityScore,
        },
      },
    });

    shorts.push({
      videoId: video.id,
      label: m.label,
      path: outFile,
      preview: previewFile,
      exists: fs.existsSync(outFile),
    });

    // Update project progress
    const pct = 40 + Math.round(((i + 1) / selected.length) * 40);
    await prisma.project.update({
      where: { id: data.projectId },
      data: { progress: Math.min(pct, 85) },
    });
  }

  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      status: "PREVIEW",
      progress: 90,
      resultMeta: {
        ...((project.resultMeta as object) || {}),
        shorts,
        count: shorts.length,
      },
    },
  });

  return { shorts, count: shorts.length, outDir };
}

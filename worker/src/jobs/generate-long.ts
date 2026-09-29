import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Full long-form generation from text prompt (no source URL required).
 * Produces:
 * - Complete narrated script with timestamps
 * - Chapter markers
 * - Image/B-roll prompts per section
 * - SEO-ready metadata
 * - Optional slideshow-style MP4 via FFmpeg if images are pre-supplied
 *
 * True generative video (Veo/Sora) can plug into image/video prompt outputs.
 */
export async function processGenerateLong(data: {
  projectId: string;
  durationMinutes?: number;
  topic?: string;
  style?: string;
}) {
  const duration = Math.min(30, Math.max(5, data.durationMinutes || 10));
  const topic = data.topic || "Untitled topic";
  const style = data.style || "educational";

  console.log(`[long] ${duration}min ${style} — ${topic}`);

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `You are a professional YouTube showrunner and scriptwriter.
Create a COMPLETE production package for a ${duration}-minute ${style} YouTube video.

Topic: ${topic}

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "title": "SEO-optimized title under 70 chars",
  "hook": "First 15 seconds spoken word",
  "script": "Full narration script with [MM:SS] markers, ready for TTS",
  "chapters": [
    { "title": "Chapter name", "startSec": 0, "endSec": 60, "narration": "...", "visualPrompt": "detailed image/video prompt for this section", "brollIdeas": ["idea1"] }
  ],
  "description": "Full YouTube description with timestamps and CTA",
  "tags": ["tag1", "tag2"],
  "hashtags": ["#One", "#Two"],
  "thumbnailPrompt": "CTR-optimized thumbnail description",
  "thumbnailText": "3-5 word overlay text",
  "musicMood": "inspiring|dark|upbeat|calm|cinematic",
  "soundEffects": ["whoosh at chapter transitions", "soft click on lists"],
  "callToAction": "Subscribe line",
  "estimatedDurationSec": ${duration * 60}
}

Make chapters cover the full duration. Script must be speakable and engaging.`;

  let pack: any;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    pack = JSON.parse(text);
  } catch (e: any) {
    console.warn("[long] JSON parse failed, building fallback", e.message);
    pack = {
      title: `${topic} | ${style}`.slice(0, 70),
      hook: `Today we explore ${topic}.`,
      script: `Welcome. This is a ${duration}-minute deep dive into ${topic}.\n\n[00:00] Introduction\n[01:00] Main ideas\n[${String(duration - 1).padStart(2, "0")}:00] Conclusion and call to action.`,
      chapters: [
        {
          title: "Introduction",
          startSec: 0,
          endSec: 60,
          narration: `Welcome to this video about ${topic}.`,
          visualPrompt: `Cinematic opening frame about ${topic}, ${style} style`,
          brollIdeas: ["establishing shot"],
        },
        {
          title: "Deep dive",
          startSec: 60,
          endSec: duration * 60 - 60,
          narration: `Let's explore the key points of ${topic}.`,
          visualPrompt: `Detailed visuals illustrating ${topic}`,
          brollIdeas: ["diagram", "stock footage"],
        },
        {
          title: "Conclusion",
          startSec: duration * 60 - 60,
          endSec: duration * 60,
          narration: `Thanks for watching. Subscribe for more on ${topic}.`,
          visualPrompt: `Closing title card`,
          brollIdeas: ["end screen"],
        },
      ],
      description: `${topic}\n\nChapters coming soon.\n\n#${style}`,
      tags: [style, topic.split(" ")[0] || "youtube"].filter(Boolean),
      hashtags: [`#${style}`],
      thumbnailPrompt: `Bold YouTube thumbnail about ${topic}`,
      thumbnailText: topic.split(" ").slice(0, 3).join(" ").toUpperCase(),
      musicMood: "cinematic",
      soundEffects: ["whoosh"],
      callToAction: "Subscribe for more",
      estimatedDurationSec: duration * 60,
    };
  }

  const outDir = path.join(STORAGE, "projects", data.projectId, "long");
  fs.mkdirSync(outDir, { recursive: true });

  const scriptPath = path.join(outDir, "script.txt");
  const packPath = path.join(outDir, "production.json");
  fs.writeFileSync(scriptPath, pack.script || "");
  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2));

  // Write per-chapter visual prompts for image/video generators
  const chaptersDir = path.join(outDir, "chapters");
  fs.mkdirSync(chaptersDir, { recursive: true });
  for (let i = 0; i < (pack.chapters || []).length; i++) {
    const ch = pack.chapters[i];
    fs.writeFileSync(
      path.join(chaptersDir, `chapter_${String(i + 1).padStart(2, "0")}.json`),
      JSON.stringify(ch, null, 2)
    );
  }

  // Optional: generate a simple title-card slideshow MP4 if FFmpeg available
  let renderPath: string | null = null;
  try {
    await execAsync("ffmpeg -version");
    const titleCard = path.join(outDir, "title.txt");
    fs.writeFileSync(titleCard, pack.title || topic);
    // Solid color + drawtext as a minimal stand-in until real assets exist
    renderPath = path.join(outDir, "preview_slideshow.mp4");
    const safeTitle = (pack.title || topic).replace(/'/g, "").slice(0, 50);
    const dur = Math.min(30, duration * 60); // preview max 30s for demo render
    await execAsync(
      `ffmpeg -y -f lavfi -i color=c=0x0f172a:s=1920x1080:d=${Math.min(15, dur)} ` +
        `-vf "drawtext=text='${safeTitle}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" ` +
        `-c:v libx264 -pix_fmt yuv420p -t ${Math.min(15, dur)} "${renderPath}"`,
      { timeout: 60000 }
    );
  } catch (e: any) {
    console.warn("[long] preview render skipped", e.message);
    renderPath = null;
  }

  const video = await prisma.video.create({
    data: {
      userId: project.userId,
      projectId: project.id,
      title: (pack.title || topic).slice(0, 100),
      description: pack.description || "",
      tags: pack.tags || [],
      hashtags: pack.hashtags || [],
      categoryId: "22",
      visibility: "PRIVATE",
      durationSec: pack.estimatedDurationSec || duration * 60,
      filePath: renderPath,
      previewPath: renderPath,
      uploadStatus: "AWAITING_APPROVAL",
      metadata: {
        production: pack,
        scriptPath,
        packPath,
        style,
        topic,
        aspect: "16:9",
        mode: "text_to_long",
      },
    },
  });

  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      status: "PREVIEW",
      progress: 95,
      resultMeta: {
        videoId: video.id,
        title: pack.title,
        chapters: pack.chapters,
        scriptPath,
        packPath,
        thumbnailPrompt: pack.thumbnailPrompt,
      },
    },
  });

  return {
    videoId: video.id,
    title: pack.title,
    chapters: pack.chapters?.length || 0,
    scriptPath,
    renderPath,
  };
}

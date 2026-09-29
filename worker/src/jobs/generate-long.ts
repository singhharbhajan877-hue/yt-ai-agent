import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Long-form generation:
 * 1. Research + full script via Gemini
 * 2. Chapter breakdown
 * 3. (Optional) TTS + image/B-roll generation hooks
 * 4. Assemble with FFmpeg when assets ready
 *
 * Current implementation produces a complete script + chapter metadata
 * and a Video record ready for further production steps.
 */
export async function processGenerateLong(data: {
  projectId: string;
  durationMinutes?: number;
  topic?: string;
  style?: string;
}) {
  const duration = data.durationMinutes || 10;
  const topic = data.topic || "Untitled topic";
  const style = data.style || "educational";

  console.log(`[long] Generating ${duration}min ${style} video on: ${topic}`);

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `Write a complete YouTube video script.
Topic: ${topic}
Style: ${style}
Target duration: approximately ${duration} minutes

Structure:
1. Hook (0:00–0:15)
2. Introduction
3. Main body with 4–8 clear chapters (include estimated timestamps)
4. Strong call-to-action
5. Outro

Also return at the end a JSON block with:
{
  "title": "suggested video title",
  "chapters": [{ "title": "...", "startSec": 0, "summary": "..." }],
  "descriptionOutline": "..."
}`;

  const result = await model.generateContent(prompt);
  const fullText = result.response.text();

  // Extract JSON block if present
  let chapters: any[] = [];
  let suggestedTitle = `${topic} | ${style}`;
  try {
    const match = fullText.match(/\{[\s\S]*"chapters"[\s\S]*\}/);
    if (match) {
      const meta = JSON.parse(match[0]);
      chapters = meta.chapters || [];
      if (meta.title) suggestedTitle = meta.title;
    }
  } catch {}

  const outDir = path.join(STORAGE, "projects", data.projectId, "long");
  fs.mkdirSync(outDir, { recursive: true });
  const scriptPath = path.join(outDir, "script.md");
  fs.writeFileSync(scriptPath, fullText);

  const video = await prisma.video.create({
    data: {
      userId: project.userId,
      projectId: project.id,
      title: suggestedTitle.slice(0, 100),
      description: `AI-generated ${style} video about ${topic}.\n\nChapters:\n${chapters.map((c, i) => `${i + 1}. ${c.title}`).join("\n")}`,
      tags: [style, "ai-generated", topic.split(" ")[0]].filter(Boolean),
      visibility: "PRIVATE",
      durationSec: duration * 60,
      filePath: null, // final render path filled after FFmpeg assembly
      uploadStatus: "PENDING",
      metadata: {
        scriptPath,
        chapters,
        style,
        topic,
        durationMinutes: duration,
      },
    },
  });

  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      resultMeta: {
        scriptPath,
        videoId: video.id,
        chapters,
        title: suggestedTitle,
      },
    },
  });

  return {
    videoId: video.id,
    title: suggestedTitle,
    scriptPath,
    chapters,
    durationMinutes: duration,
  };
}

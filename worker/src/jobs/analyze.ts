import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Analyze downloaded video:
 * - Read metadata + optional SRT transcript
 * - Gemini detects viral moments, hooks, chapters, tone
 */
export async function processAnalyze(data: {
  projectId: string;
  sourceUrl?: string;
  raw?: any;
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const inputMeta = (project.inputMeta as any) || {};
  const download = inputMeta.download || {};
  const duration = download.duration || 600;
  const title = download.title || project.title;
  const description = (download.description || "").slice(0, 3000);

  // Load subtitle text if available
  let transcript = "";
  if (download.srtPath && fs.existsSync(download.srtPath)) {
    transcript = fs.readFileSync(download.srtPath, "utf8").slice(0, 12000);
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `You are a viral YouTube Shorts strategist.
Analyze this video and return ONLY valid JSON (no markdown).

Video title: ${title}
Duration seconds: ${duration}
Description excerpt: ${description.slice(0, 1500)}
${transcript ? `Transcript/SRT excerpt:\n${transcript.slice(0, 8000)}` : "(no transcript available)"}

Return this exact JSON shape:
{
  "summary": "2-3 sentence summary",
  "tone": "educational|funny|dramatic|motivational|horror|news|other",
  "moments": [
    {
      "start": 12.5,
      "end": 45.0,
      "label": "Hook: surprising claim",
      "viralityScore": 0.92,
      "reason": "why this works as a Short"
    }
  ],
  "chapters": [
    { "title": "Intro", "startSec": 0, "summary": "..." }
  ],
  "suggestedShortsCount": 5,
  "hooks": ["opening line idea 1", "opening line idea 2"],
  "keywords": ["keyword1", "keyword2"]
}

Rules:
- moments must be 15–60 seconds long
- start/end within 0..${duration}
- rank by viralityScore descending
- suggest 3–8 moments`;

  let analysis: any;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    analysis = JSON.parse(text);
  } catch (e: any) {
    console.warn("[analyze] Gemini failed, using heuristic moments", e.message);
    const step = Math.max(30, Math.floor(duration / 6));
    analysis = {
      summary: `Video: ${title}`,
      tone: "other",
      moments: Array.from({ length: 5 }, (_, i) => ({
        start: i * step,
        end: Math.min(duration, i * step + 30),
        label: `Moment ${i + 1}`,
        viralityScore: 0.7 - i * 0.05,
        reason: "Evenly sampled segment",
      })),
      chapters: [{ title: "Full video", startSec: 0, summary: title }],
      suggestedShortsCount: 5,
      hooks: [title],
      keywords: [],
    };
  }

  // Persist
  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      status: "PROCESSING",
      progress: 35,
      inputMeta: {
        ...inputMeta,
        analysis,
        moments: analysis.moments,
      },
    },
  });

  return analysis;
}

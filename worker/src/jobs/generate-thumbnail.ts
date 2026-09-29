import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();
const STORAGE = process.env.STORAGE_PATH || "./storage";

/**
 * Thumbnail generation.
 * Gemini text model produces a detailed prompt.
 * For actual images: integrate Gemini image generation or an external
 * image API (Imagen, Flux, etc.) and save under storage/thumbnails.
 */
export async function processGenerateThumbnail(data: { projectId: string }) {
  console.log("[thumbnail] project", data.projectId);

  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: { videos: true },
  });
  if (!project) throw new Error("Project not found");

  const existingPrompt =
    (project.resultMeta as any)?.seo?.thumbnailPrompt ||
    `High CTR YouTube thumbnail for: ${project.title}`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const refinePrompt = `Improve this YouTube thumbnail prompt for maximum CTR.
Make it specific: face expression, text overlay (3–5 words max), colors, composition.
Original: ${existingPrompt}
Return only the improved prompt text.`;

  let finalPrompt = existingPrompt;
  try {
    const result = await model.generateContent(refinePrompt);
    finalPrompt = result.response.text().trim();
  } catch {}

  const outDir = path.join(STORAGE, "projects", data.projectId, "thumbnails");
  fs.mkdirSync(outDir, { recursive: true });
  const promptFile = path.join(outDir, "prompt.txt");
  fs.writeFileSync(promptFile, finalPrompt);

  // Placeholder path – replace when image model is connected
  const placeholderPath = path.join(outDir, "thumbnail_placeholder.txt");
  fs.writeFileSync(
    placeholderPath,
    `Thumbnail prompt saved. Connect an image generation API (Gemini Imagen / Flux / etc.) to render:
${finalPrompt}`
  );

  for (const v of project.videos) {
    await prisma.video.update({
      where: { id: v.id },
      data: {
        thumbnailPath: placeholderPath,
        metadata: {
          ...((v.metadata as object) || {}),
          thumbnailPrompt: finalPrompt,
        },
      },
    });
  }

  return {
    prompt: finalPrompt,
    promptFile,
    note: "Image render requires an image generation provider – prompt is ready",
  };
}

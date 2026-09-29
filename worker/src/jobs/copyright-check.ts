import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();

/**
 * Heuristic copyright risk scan before upload.
 * Does NOT replace legal advice. Flags high-risk content for human review.
 */
export async function processCopyrightCheck(data: {
  videoId: string;
  projectId?: string;
}) {
  const video = await prisma.video.findUnique({ where: { id: data.videoId } });
  if (!video) throw new Error("Video not found");

  const meta = (video.metadata as any) || {};
  const context = [
    video.title,
    video.description,
    JSON.stringify(meta).slice(0, 4000),
  ].join("\n");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are a copyright compliance assistant for YouTube creators.
Assess risk that this planned upload uses third-party copyrighted material without permission.

Content:
${context.slice(0, 6000)}

Return ONLY JSON:
{
  "risk": "low" | "medium" | "high",
  "score": 0.0-1.0,
  "reasons": ["..."],
  "recommendations": ["..."],
  "blockUpload": false
}

Rules:
- Original AI-scripted narration + generic B-roll prompts → usually low
- Mentions of playing full songs, movie clips, sports broadcasts → high
- blockUpload true only if risk is high`;

  let report: any;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    report = JSON.parse(text);
  } catch {
    report = {
      risk: "medium",
      score: 0.5,
      reasons: ["Could not complete automated scan"],
      recommendations: ["Manual review recommended"],
      blockUpload: false,
    };
  }

  await prisma.video.update({
    where: { id: video.id },
    data: {
      metadata: {
        ...meta,
        copyrightCheck: {
          ...report,
          checkedAt: new Date().toISOString(),
        },
      },
    },
  });

  return report;
}

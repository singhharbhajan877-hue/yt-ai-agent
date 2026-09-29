import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Analyze a source (YouTube URL or prompt).
 * In production: download audio with yt-dlp (only for owned content),
 * transcribe with Whisper, then extract hooks / chapters.
 */
export async function processAnalyze(data: {
  projectId: string;
  sourceUrl?: string;
  raw?: any;
}) {
  console.log("[analyze] project", data.projectId, data.sourceUrl);

  // Placeholder transcript / analysis – replace with Whisper + yt-dlp for real media
  let summary = "Analysis placeholder";
  let moments: { start: number; end: number; label: string }[] = [];

  if (data.sourceUrl) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Given a YouTube URL (user-owned content): ${data.sourceUrl}
Suggest 5 potential viral short clip moments as JSON array:
[{ "start": seconds, "end": seconds, "label": "hook description" }]
Assume a typical 10-minute video if length unknown. Return ONLY JSON.`;
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
      moments = JSON.parse(text);
      summary = `Detected ${moments.length} potential moments from ${data.sourceUrl}`;
    } catch (e) {
      console.warn("[analyze] Gemini moment detection failed, using defaults");
      moments = [
        { start: 10, end: 40, label: "Opening hook" },
        { start: 60, end: 90, label: "Key insight" },
        { start: 120, end: 150, label: "Climax moment" },
      ];
      summary = "Default moments (AI parse fallback)";
    }
  }

  return {
    summary,
    moments,
    sourceUrl: data.sourceUrl || null,
    analyzedAt: new Date().toISOString(),
  };
}

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseCommand(command: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an intent parser for a YouTube AI agent.
Parse the user command into structured JSON.

Command: "${command}"

Return ONLY valid JSON with this shape:
{
  "intent": "generate_shorts" | "generate_long" | "edit" | "seo" | "thumbnail" | "schedule" | "research" | "calendar" | "unknown",
  "count": number | null,
  "durationMinutes": number | null,
  "style": string | null,
  "sourceUrl": string | null,
  "topic": string | null,
  "visibility": "private" | "unlisted" | "public" | null,
  "scheduleAt": string | null,
  "notes": string | null
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function generateScript(topic: string, style: string, durationMinutes: number) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `Write a complete YouTube video script.
Topic: ${topic}
Style: ${style}
Target duration: ~${durationMinutes} minutes

Include:
- Hook (first 15 seconds)
- Introduction
- Main sections with clear chapter markers
- Call to action
- Outro

Format with timestamps estimates and chapter titles.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateSEO(titleHint: string, transcriptOrScript: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Generate YouTube SEO assets.
Context: ${titleHint}
Content summary / script excerpt:
${transcriptOrScript.slice(0, 4000)}

Return JSON:
{
  "title": "max 100 chars, high CTR",
  "description": "detailed description with timestamps if possible",
  "tags": ["tag1", "tag2", ...],
  "hashtags": ["#tag1", "#tag2"],
  "thumbnailPrompt": "detailed prompt for AI thumbnail generation",
  "categoryId": "22"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

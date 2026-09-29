import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();

export async function processGenerateSeo(data: { projectId: string }) {
  console.log("[seo] project", data.projectId);

  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: { videos: true },
  });
  if (!project) throw new Error("Project not found");

  const context =
    project.title +
    "\n" +
    (project.command || "") +
    "\n" +
    JSON.stringify(project.resultMeta || {}).slice(0, 2000);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Generate YouTube SEO assets for this project.
Context:
${context}

Return ONLY valid JSON:
{
  "title": "max 100 chars, high CTR",
  "description": "detailed description with line breaks",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
  "categoryId": "22",
  "thumbnailPrompt": "detailed visual prompt for a high-CTR YouTube thumbnail"
}`;

  let seo: any;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    seo = JSON.parse(text);
  } catch {
    seo = {
      title: project.title.slice(0, 100),
      description: project.command || project.title,
      tags: ["youtube", "ai"],
      hashtags: ["#AI", "#YouTube"],
      categoryId: "22",
      thumbnailPrompt: `Eye-catching YouTube thumbnail about: ${project.title}`,
    };
  }

  // Apply to all videos in project that don't have SEO yet
  for (const v of project.videos) {
    await prisma.video.update({
      where: { id: v.id },
      data: {
        title: seo.title || v.title,
        description: seo.description || v.description,
        tags: seo.tags || v.tags,
        hashtags: seo.hashtags || [],
        categoryId: seo.categoryId || "22",
        metadata: {
          ...((v.metadata as object) || {}),
          seo,
          thumbnailPrompt: seo.thumbnailPrompt,
        },
      },
    });
  }

  await prisma.project.update({
    where: { id: data.projectId },
    data: {
      resultMeta: {
        ...((project.resultMeta as object) || {}),
        seo,
      },
    },
  });

  return seo;
}

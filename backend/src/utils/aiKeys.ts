import { PrismaClient } from "@prisma/client";

export async function getOrgAIKeys(prisma: PrismaClient, orgId: string) {
  if (!orgId) return { groqKey: process.env.GROQ_API_KEY, geminiKey: process.env.GEMINI_API_KEY };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      groqKey: true,
      geminiKey: true,
      aiProvider: true
    }
  });

  return {
    groqKey: org?.groqKey || process.env.GROQ_API_KEY,
    geminiKey: org?.geminiKey || process.env.GEMINI_API_KEY,
    aiProvider: org?.aiProvider || "gemini"
  };
}

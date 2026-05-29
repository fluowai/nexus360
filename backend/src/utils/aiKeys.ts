import { PrismaClient } from "@prisma/client";

export async function getOrgAIKeys(prisma: PrismaClient, orgId: string) {
  if (!orgId) {
    return {
      groqKey: process.env.GROQ_API_KEY,
      geminiKey: process.env.GEMINI_API_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      chatgptKey: process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY,
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      groqKey: true,
      geminiKey: true,
      openaiKey: true,
      chatgptKey: true,
      aiProvider: true
    }
  });

  return {
    groqKey: org?.groqKey || process.env.GROQ_API_KEY,
    geminiKey: org?.geminiKey || process.env.GEMINI_API_KEY,
    openaiKey: org?.openaiKey || process.env.OPENAI_API_KEY,
    chatgptKey: org?.chatgptKey || process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY,
    aiProvider: org?.aiProvider || "gemini"
  };
}

import { PrismaClient } from "@prisma/client";
import express from "express";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post("/api/landing-pages", async (req, res) => {
  const { name, slug, templateId, headline, subheadline, heroImage, content, formId, formProvider, formConfig, metaTitle, metaDescription, orgId } = req.body;
  console.log("REQ BODY:", req.body);
  console.log("ORG ID:", orgId);
  try {
    const safeSlug = slug 
      ? slug.replace(/[^a-z0-9-]/g, '').toLowerCase() + '-' + Math.random().toString(36).substr(2, 5)
      : name.toLowerCase().replace(/[^a-z0-9]/g, '-').substr(0, 20) + '-' + Math.random().toString(36).substr(2, 5);
    
    console.log("Creating LP with:", { name, slug: safeSlug, orgId });
    
    const page = await prisma.landingPage.create({
      data: {
        name,
        slug: safeSlug,
        templateId,
        headline,
        subheadline,
        heroImage,
        content,
        formId,
        formProvider,
        formConfig,
        metaTitle,
        metaDescription,
        organizationId: orgId
      }
    });
    res.json(page);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log("Debug server on http://localhost:3001");
});
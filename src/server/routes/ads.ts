import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function adsRoutes(prisma: PrismaClient) {
  const router = Router();

  // Campaigns
  router.get("/campaigns-ads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { adAccountId } = req.query;
    try {
      const campaigns = await prisma.campaignAd.findMany({
        where: { 
          ...(adAccountId ? { adAccountId: String(adAccountId) } : {}),
          adAccount: { organizationId: orgId }
        },
        include: { adAccount: { select: { accountName: true, platform: true } }, adSets: { include: { ads: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // AdSets
  router.get("/adsets", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { campaignAdId } = req.query;
    try {
      const adsets = await prisma.adSet.findMany({
        where: { 
          ...(campaignAdId ? { campaignAdId: String(campaignAdId) } : {}),
          campaignAd: { adAccount: { organizationId: orgId } }
        },
        include: { ads: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(adsets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad sets" });
    }
  });

  // Ads
  router.get("/ads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { adSetId } = req.query;
    try {
      const ads = await prisma.ad.findMany({
        where: { 
          ...(adSetId ? { adSetId: String(adSetId) } : {}),
          adSet: { campaignAd: { adAccount: { organizationId: orgId } } }
        },
        include: { creative: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  // Ad Creatives
  router.get("/ad-creatives", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { adAccountId } = req.query;
    try {
      const creatives = await prisma.adCreative.findMany({
        where: { 
          ...(adAccountId ? { adAccountId: String(adAccountId) } : {}),
          adAccount: { organizationId: orgId }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(creatives);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad creatives" });
    }
  });

  // Audiences
  router.get("/audiences", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { adAccountId } = req.query;
    try {
      const audiences = await prisma.customAudience.findMany({
        where: { 
          ...(adAccountId ? { adAccountId: String(adAccountId) } : {}),
          adAccount: { organizationId: orgId }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(audiences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audiences" });
    }
  });

  return router;
}

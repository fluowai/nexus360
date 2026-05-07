import { PrismaClient } from "@prisma/client";
import { LeadProvider, LeadSearchParams, NormalizedLead, LeadSearchFilters } from "./providers/lead-provider.interface.js";
import { getLeadProvider } from "./providers/lead-provider.factory.js";

export class LeadCaptureService {
  constructor(private prisma: PrismaClient) {}

  async captureLeads(params: LeadSearchParams) {
    const { tenantId, userId, provider: providerName } = params;

    // 1. Fetch organization keys
    console.log(`[LEAD_CAPTURE] Iniciando busca para orgId: ${tenantId}, Provedor: ${providerName}`);
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { serpApiKey: true, outscraperKey: true }
    });

    if (!organization) {
      console.error(`[LEAD_CAPTURE] Organização ${tenantId} não encontrada no banco.`);
      throw new Error(`Organização não encontrada: ${tenantId}`);
    }

    // 1b. Create source record
    const source = await this.prisma.leadCaptureSource.create({
      data: {
        organizationId: tenantId,
        userId,
        provider: providerName,
        query: this.buildQuery(params),
        keyword: params.keyword,
        city: params.city,
        state: params.state,
        country: params.country || 'Brasil',
        requestedLimit: params.limit || 100,
        status: 'processing'
      }
    });

    try {
      const apiKey = (providerName === 'serpapi' ? organization?.serpApiKey : organization?.outscraperKey) || undefined;
      
      console.log(`[LEAD_CAPTURE] Chave recuperada: ${apiKey ? (apiKey.substring(0, 5) + '...') : 'NÃO ENCONTRADA'}`);

      if (!apiKey) {
        throw new Error(`Chave de API do provedor ${providerName} não configurada para esta organização.`);
      }

      const provider = getLeadProvider(providerName);
      const rawResults = await provider.search({ ...params, apiKey });

      // 2. Normalize and filter
      let normalizedLeads = rawResults.map(raw => {
        const lead = provider.normalize(raw);
        lead.phone_normalized = this.normalizeBrazilianPhone(lead.phone);
        return lead;
      });

      normalizedLeads = this.applyFilters(normalizedLeads, params.filters);

      // 3. Save leads with deduplication
      let importedCount = 0;
      const savedLeads = [];

      for (const leadData of normalizedLeads) {
        try {
          const score = this.calculateScore(leadData);
          
          const saved = await this.prisma.capturedLead.upsert({
            where: {
              organizationId_provider_externalId: {
                organizationId: tenantId,
                provider: providerName,
                externalId: leadData.external_id!
              }
            },
            update: {
              ...this.mapToPrisma(leadData),
              scoreOpportunity: score.value,
              opportunityLevel: score.level,
              sourceId: source.id
            },
            create: {
              ...this.mapToPrisma(leadData),
              organizationId: tenantId,
              sourceId: source.id,
              provider: providerName,
              scoreOpportunity: score.value,
              opportunityLevel: score.level
            }
          });

          savedLeads.push(saved);
          importedCount++;
        } catch (err) {
          console.error(`Error saving lead ${leadData.business_name}:`, err);
        }
      }

      // 4. Update source and log usage
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'completed',
          totalFound: rawResults.length,
          totalImported: importedCount
        }
      });

      await this.prisma.leadCaptureUsageLog.create({
        data: {
          organizationId: tenantId,
          userId,
          sourceId: source.id,
          provider: providerName,
          query: source.query,
          requestedLimit: source.requestedLimit,
          returnedCount: rawResults.length,
          importedCount: importedCount,
          status: 'success'
        }
      });

      return {
        sourceId: source.id,
        totalFound: rawResults.length,
        totalImported: importedCount,
        leads: savedLeads
      };

    } catch (error: any) {
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'failed',
          errorMessage: error.message
        }
      });

      throw error;
    }
  }

  private normalizeBrazilianPhone(phone?: string | null): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    
    return '+' + cleaned;
  }

  private applyFilters(leads: NormalizedLead[], filters?: LeadSearchFilters): NormalizedLead[] {
    if (!filters) return leads;

    return leads.filter(lead => {
      if (filters.onlyWithPhone && !lead.phone) return false;
      if (filters.onlyWithWebsite && !lead.website) return false;
      if (filters.onlyWithoutWebsite && lead.website) return false;
      if (filters.minRating && (lead.rating || 0) < filters.minRating) return false;
      if (filters.minReviews && (lead.reviews_count || 0) < filters.minReviews) return false;
      return true;
    });
  }

  private calculateScore(lead: NormalizedLead): { value: number, level: string } {
    let score = 0;

    if (lead.phone) score += 15; else score -= 20;
    if (!lead.website) score += 20; else score += 5;

    const rating = lead.rating || 0;
    if (rating > 0 && rating < 4.3) score += 10;
    else if (rating >= 4.3 && rating < 4.8) score += 5;

    const reviews = lead.reviews_count || 0;
    if (reviews > 0 && reviews < 30) score += 10;
    else if (reviews >= 30 && reviews < 100) score += 5;

    if (lead.email) score += 10;
    if (lead.instagram) score += 5;

    let level = 'Baixa';
    if (score >= 81) level = 'Prioridade';
    else if (score >= 61) level = 'Alta';
    else if (score >= 31) level = 'Média';

    return { value: Math.max(0, score), level };
  }

  private mapToPrisma(lead: NormalizedLead) {
    return {
      externalId: lead.external_id!,
      placeId: lead.place_id,
      businessName: lead.business_name,
      category: lead.category,
      phone: lead.phone,
      phoneNormalized: lead.phone_normalized,
      website: lead.website,
      email: lead.email,
      instagram: lead.instagram,
      facebook: lead.facebook,
      linkedin: lead.linkedin,
      address: lead.address,
      neighborhood: lead.neighborhood,
      city: lead.city,
      state: lead.state,
      country: lead.country || 'Brasil',
      postalCode: lead.postal_code,
      latitude: lead.latitude,
      longitude: lead.longitude,
      rating: lead.rating,
      reviewsCount: lead.reviews_count,
      reviews: lead.reviews as any,
      openingHours: lead.opening_hours as any,
      googleMapsUrl: lead.google_maps_url,
      searchUrl: lead.search_url,
      hasPhone: !!lead.phone,
      hasWebsite: !!lead.website,
      hasEmail: !!lead.email,
      hasSocial: !!(lead.instagram || lead.facebook || lead.linkedin),
      rawData: lead.raw_data as any
    };
  }

  private buildQuery(params: LeadSearchParams): string {
    const parts = [];
    if (params.keyword) parts.push(params.keyword);
    if (params.neighborhood) parts.push(params.neighborhood);
    if (params.city) parts.push(params.city);
    if (params.state) parts.push(params.state);
    if (params.country) parts.push(params.country || 'Brasil');
    return parts.filter(Boolean).join(' ');
  }
}

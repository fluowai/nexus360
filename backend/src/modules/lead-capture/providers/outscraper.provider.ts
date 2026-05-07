import { LeadProvider, LeadSearchParams, NormalizedLead } from "./lead-provider.interface.js";
import axios from "axios";

export class OutscraperLeadProvider implements LeadProvider {
  name = 'outscraper';

  async search(params: LeadSearchParams): Promise<any[]> {
    const query = this.buildQuery(params);
    const endpoint = process.env.OUTSCRAPER_GOOGLE_MAPS_ENDPOINT || 'https://api.app.outscraper.com/maps/search-v3';

    const response = await axios.get(endpoint, {
      params: {
        query,
        limit: params.limit || 100,
        language: params.language || 'pt-BR',
        region: 'BR',
        async: 'false'
      },
      headers: {
        'X-API-KEY': params.apiKey
      }
    });

    const data = response.data;
    
    // Outscraper returns results in an array of arrays usually
    return data.results?.[0] || [];
  }

  normalize(raw: any): NormalizedLead {
    return {
      external_id: raw.google_id || raw.place_id || raw.location_link || raw.name,
      place_id: raw.place_id || raw.google_id,
      business_name: raw.name,
      category: raw.type || (raw.subtypes && raw.subtypes[0]),
      phone: raw.phone,
      website: raw.site,
      email: raw.email_1 || raw.email_2,
      instagram: raw.instagram,
      facebook: raw.facebook,
      linkedin: raw.linkedin,
      address: raw.full_address,
      neighborhood: raw.borough,
      city: raw.city,
      state: raw.state,
      country: raw.country || 'Brasil',
      postal_code: raw.postal_code,
      rating: raw.rating ? Number(raw.rating) : undefined,
      reviews_count: raw.reviews ? Number(raw.reviews) : undefined,
      reviews: raw.reviews_data,
      latitude: raw.latitude ? Number(raw.latitude) : undefined,
      longitude: raw.longitude ? Number(raw.longitude) : undefined,
      opening_hours: raw.working_hours,
      google_maps_url: raw.location_link,
      raw_data: raw
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

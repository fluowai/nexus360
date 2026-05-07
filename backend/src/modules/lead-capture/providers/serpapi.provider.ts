import { LeadProvider, LeadSearchParams, NormalizedLead } from "./lead-provider.interface.js";
import axios from "axios";

export class SerpApiLeadProvider implements LeadProvider {
  name = 'serpapi';

  async search(params: LeadSearchParams): Promise<any[]> {
    const query = this.buildQuery(params);
    
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_maps',
        q: query,
        type: 'search',
        hl: params.language || 'pt-BR',
        gl: 'br',
        api_key: params.apiKey
      }
    });

    const data = response.data;

    if (data.error) {
      throw new Error(`SerpApi Error: ${data.error}`);
    }

    return data.local_results || [];
  }

  normalize(raw: any): NormalizedLead {
    return {
      external_id: raw.place_id || raw.data_id || raw.title,
      place_id: raw.place_id || raw.data_id,
      business_name: raw.title,
      category: raw.type || (raw.types && raw.types[0]),
      phone: raw.phone,
      website: raw.website,
      address: raw.address,
      rating: raw.rating ? Number(raw.rating) : undefined,
      reviews_count: raw.reviews ? Number(raw.reviews) : undefined,
      latitude: raw.gps_coordinates?.latitude,
      longitude: raw.gps_coordinates?.longitude,
      google_maps_url: raw.links?.directions || raw.links?.place,
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

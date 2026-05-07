export interface LeadSearchParams {
  tenantId: string;
  userId?: string;
  provider: 'serpapi' | 'serper' | 'outscraper';
  niche?: string;
  keyword: string;
  city?: string;
  state?: string;
  country?: string;
  neighborhood?: string;
  limit?: number;
  language?: string;
  apiKey?: string;
  filters?: LeadSearchFilters;
  runAiDiagnosis?: boolean;
  sendToCrm?: boolean;
  pipelineId?: string;
  stageId?: string;
  responsibleId?: string;
}

export interface LeadSearchFilters {
  onlyWithPhone?: boolean;
  onlyWithWebsite?: boolean;
  onlyWithoutWebsite?: boolean;
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  maxReviews?: number;
}

export interface NormalizedLead {
  external_id?: string | null;
  place_id?: string | null;
  business_name: string;
  category?: string | null;
  phone?: string | null;
  phone_normalized?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  reviews?: any | null;
  opening_hours?: any | null;
  google_maps_url?: string | null;
  search_url?: string | null;
  raw_data: any;
}

export interface LeadProvider {
  name: string;
  search(params: LeadSearchParams): Promise<any[]>;
  normalize(raw: any): NormalizedLead;
}

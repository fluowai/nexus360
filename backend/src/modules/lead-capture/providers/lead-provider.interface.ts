export interface LeadSearchParams {
  tenantId: string;
  userId?: string;
  provider: 'serpapi' | 'outscraper';
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
  external_id?: string;
  place_id?: string;
  business_name: string;
  category?: string;
  phone?: string;
  phone_normalized?: string;
  website?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviews_count?: number;
  reviews?: any;
  opening_hours?: any;
  google_maps_url?: string;
  search_url?: string;
  raw_data: any;
}

export interface LeadProvider {
  name: string;
  search(params: LeadSearchParams): Promise<any[]>;
  normalize(raw: any): NormalizedLead;
}

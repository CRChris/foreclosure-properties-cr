export type CostaRicaProvince =
  | 'San José'
  | 'Alajuela'
  | 'Cartago'
  | 'Heredia'
  | 'Guanacaste'
  | 'Puntarenas'
  | 'Limón';

export type Currency = 'USD' | 'CRC';

export type PropertyCategory =
  | 'Residential'
  | 'Commercial'
  | 'Land/Development'
  | 'Agricultural'
  | 'Industrial'
  | 'Condo'
  | 'Luxury Estate';

export type PropertyType =
  | 'single_family_home'
  | 'condo_apartment'
  | 'building_lot'
  | 'agricultural_land'
  | 'commercial_industrial'
  | 'other';

export type MortgagePriority =
  | '1st_mortgage'
  | '2nd_mortgage'
  | 'embargo_judicial'
  | 'unknown';

export type AuctionCallStage =
  | 'call_1'
  | 'call_2'
  | 'call_3'
  | 'passed_call_3'
  | 'suspended'
  | 'awarded';

export type AuctionSaleStatus =
  | 'upcoming'
  | 'in_progress'
  | 'deserted'
  | 'adjudicated_to_creditor'
  | 'adjudicated_to_bidder'
  | 'suspended'
  | 'annulled';

// Backwards-compatible alias for existing code
export type AuctionStatus = AuctionSaleStatus;

export interface AuctionLifecycleLog {
  id: string;
  auction_id: string;
  previous_stage?: AuctionCallStage | null;
  new_stage: AuctionCallStage;
  previous_status?: AuctionSaleStatus | null;
  new_status: AuctionSaleStatus;
  call_number?: number | null;
  reason: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type IngestionLogStatus = 'success' | 'no_new_properties' | 'warning' | 'error';

export interface IngestionLog {
  id: string;
  run_date: string;
  source: string;
  status: IngestionLogStatus;
  total_edicts_found: number;
  properties_added: number;
  properties_skipped: number;
  expedientes_added?: string[];
  error_message?: string | null;
  duration_seconds: number;
  created_at: string;
}

export type DealAlphaGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C';

export interface DealAlphaRating {
  score: number; // 0 - 100
  grade: DealAlphaGrade;
  label: string;
  stagePoints: number;
  marginPoints: number;
  assetPoints: number;
  accessPoints: number;
}

export type TitleSecurityTier = 'tier_1' | 'tier_2' | 'tier_3';

export interface TitleSecurityRating {
  tier: TitleSecurityTier;
  tierNumber: 1 | 2 | 3;
  label: string;
  priorityName: string;
  score: number;
  isSeniorLien: boolean;
  extinguishmentProtected: boolean;
  legalCitation: string;
  keyFactors: string[];
}

export type LocationType = 'exact_cadastral' | 'approximate_town' | 'pending_mapping';

export interface SubPropertyParcel {
  id: string;
  parcel_index: number; // 1, 2, 3, 4
  title?: string;
  folio_real: string;
  plano_catastrado?: string | null;
  province: CostaRicaProvince;
  canton: string;
  district: string;
  address_description?: string | null;
  property_type: PropertyType;
  property_category?: PropertyCategory;
  area_m2: number;
  naturaleza_raw?: string | null;
  has_construction?: boolean;
  has_public_road_frontage?: boolean;
  is_condominio?: boolean;
  lindero_norte?: string | null;
  lindero_sur?: string | null;
  lindero_este?: string | null;
  lindero_oeste?: string | null;
  servidumbres_notes?: string | null;
  latitude: number | null;
  longitude: number | null;
  location_type?: LocationType;
  parcel_polygon?: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | Record<string, any> | null;
  images?: string[];
}

export interface Auction {
  id: string;
  expediente_number: string;
  court_name: string;
  folio_real: string;
  plano_catastrado: string | null;
  province: CostaRicaProvince;
  canton: string;
  district: string;
  address_description?: string | null;
  area_m2: number;
  currency: Currency;
  
  // Multi-Property Portfolio (En-Bloc Foreclosure Auction)
  is_portfolio_auction?: boolean;
  portfolio_count?: number;
  sub_properties?: SubPropertyParcel[];
  
  // 3-Call Judicial Auction Schedule (Costa Rica Law)
  base_price_call_1: number;
  auction_date_call_1: string; // ISO string
  
  base_price_call_2: number | null;
  auction_date_call_2: string | null;
  
  base_price_call_3: number | null;
  auction_date_call_3: string | null;
  
  // Automated Call Progression & Lifecycle Tracking (Single Source of Truth)
  call_stage?: AuctionCallStage;
  sale_status?: AuctionSaleStatus;
  current_call_number?: 1 | 2 | 3 | null;
  current_base_price?: number;
  current_auction_date?: string | null;
  current_discount_pct?: number;
  last_status_sync_at?: string;

  // Market Valuations & Margins
  estimated_market_value: number | null;
  estimated_margin_pct: number | null;
  
  // Legal Parties & Content
  plaintiff: string;
  defendant: string | null;
  legal_summary: string | null;
  raw_edict_text: string;

  // Registered Legal Property Characteristics
  property_type?: PropertyType;
  naturaleza_raw?: string | null;
  has_construction?: boolean;
  has_public_road_frontage?: boolean;
  is_condominio?: boolean;
  
  // Boundaries (Linderos Registrales)
  lindero_norte?: string | null;
  lindero_sur?: string | null;
  lindero_este?: string | null;
  lindero_oeste?: string | null;

  // Encumbrances & Priority
  servidumbres_notes?: string | null;
  mortgage_priority?: MortgagePriority;
  
  // Geospatial Coordinates & Cadastral Boundaries
  latitude: number | null;
  longitude: number | null;
  location_type?: LocationType;
  parcel_polygon?: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | Record<string, any> | null;
  
  // Metadata & Media
  property_category?: PropertyCategory;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface AuctionCallDetail {
  callNumber: 1 | 2 | 3;
  name: string;
  basePrice: number;
  date: string;
  discountFromFirstCallPct: number;
  isCurrent: boolean;
  isPast: boolean;
}

export interface CostaRicaClosingCosts {
  transferTax: number; // 1.5% Impuesto de Traspaso (Ley 7088)
  notaryLegalFees: number; // ~0.8% - 1.25% Arancel Notarial / Abogado
  registryStamps: number; // ~0.5% Timbres (Colegio Abogados, Fiscal, Registro Nacional)
  totalEstimatedClosingCosts: number;
}

export interface InvestorMetrics {
  currentBasePrice: number;
  estimatedMarketValue: number;
  grossMarginAmount: number;
  grossMarginPct: number;
  pricePerM2: number;
  marketPricePerM2: number;
  closingCosts: CostaRicaClosingCosts;
  totalAcquisitionCost: number;
  netEstimatedProfit: number;
  netROI: number;
}

export interface AuctionFilters {
  search?: string;
  province?: CostaRicaProvince | 'all';
  canton?: string;
  currency?: Currency | 'all';
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  minMargin?: number;
  propertyCategory?: PropertyCategory | 'all';
  timeframe?: 'all' | '7_days' | '15_days' | '30_days' | '60_days';
  sortBy?:
    | 'date_asc'
    | 'date_desc'
    | 'margin_desc'
    | 'price_asc'
    | 'price_desc'
    | 'area_desc';
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapAuctionMarker {
  id: string;
  expediente_number: string;
  folio_real: string;
  province: CostaRicaProvince;
  canton: string;
  district: string;
  currency: Currency;
  base_price_call_1: number;
  auction_date_call_1: string;
  estimated_margin_pct: number | null;
  area_m2: number;
  latitude: number;
  longitude: number;
  location_type?: LocationType;
  parcel_polygon?: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | Record<string, any> | null;
  property_category?: PropertyCategory;
}

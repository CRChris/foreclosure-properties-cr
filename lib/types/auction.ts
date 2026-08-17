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

export type AuctionCallStage = 'call_1' | 'call_2' | 'call_3';

export type AuctionStatus =
  | 'active'
  | 'upcoming'
  | 'under_review'
  | 'completed'
  | 'suspended';

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
  
  // 3-Call Judicial Auction Schedule (Costa Rica Law)
  base_price_call_1: number;
  auction_date_call_1: string; // ISO string
  
  base_price_call_2: number | null;
  auction_date_call_2: string | null;
  
  base_price_call_3: number | null;
  auction_date_call_3: string | null;
  
  // Market Valuations & Margins
  estimated_market_value: number | null;
  estimated_margin_pct: number | null;
  
  // Legal Parties
  plaintiff: string;
  defendant: string | null;
  legal_summary: string | null;
  raw_edict_text: string;
  
  // Geospatial Coordinates (Point)
  latitude: number | null;
  longitude: number | null;
  
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
  property_category?: PropertyCategory;
}

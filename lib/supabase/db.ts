import { 
  Auction, 
  CostaRicaProvince, 
  Currency, 
  PropertyCategory, 
  PropertyType, 
  MortgagePriority,
  AuctionCallStage,
  AuctionSaleStatus,
  AuctionLifecycleLog,
  IngestionLog,
} from '@/lib/types/auction';
import { detectPropertyCharacteristics, getLiveAuctionProgressionState } from '@/lib/utils';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from './client';

export interface WatchlistItem {
  id: string;
  user_id?: string;
  auction_id: string;
  notes?: string | null;
  target_bid?: number | null;
  created_at?: string;
  auction?: Auction;
}

const CANTON_COORDINATES: Record<string, [number, number]> = {
  'garabito': [9.6152, -84.6298],
  'jacó': [9.6152, -84.6298],
  'escazú': [9.9248, -84.1432],
  'curridabat': [9.9156, -84.0353],
  'granadilla': [9.9285, -84.0241],
  'la unión': [9.9076, -83.9875],
  'tres ríos': [9.9076, -83.9875],
  'alajuela': [10.0163, -84.2116],
  'la guácima': [9.9722, -84.2889],
  'san carlos': [10.3238, -84.4271],
  'heredia': [9.9989, -84.1167],
  'belén': [9.9812, -84.1795],
  'santa cruz': [10.2625, -85.5853],
  'tamarindo': [10.2993, -85.8402],
  'carrillo': [10.4667, -85.5500],
  'playas del coco': [10.5500, -85.6967],
  'quepos': [9.4319, -84.1619],
  'manuel antonio': [9.3889, -84.1528],
  'pérez zeledón': [9.3739, -83.7058],
  'san josé': [9.9281, -84.0907],
  'cartago': [9.8644, -83.9194],
  'puntarenas': [9.9763, -84.8384],
  'limón': [9.9907, -83.0360],
};

const UNIQUE_REAL_ESTATE_GALLERIES: string[][] = [
  // 0: Escazú Los Laureles Condo
  [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 1: Jacó Beachfront Penthouse
  [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  // 2: Tamarindo Beach Luxury Villa
  [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 3: Santa Ana Valle del Sol Residence
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  // 4: Los Reyes Golf Country Estate
  [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  // 5: Belén Heredia Gated Residence
  [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 6: Manuel Antonio Ocean View Parcel
  [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  ],
  // 7: Monterán Curridabat Estate
  [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  // 8: Playas del Coco Beach Condo
  [
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  // 9: Arenal Volcano San Carlos Eco-Estate
  [
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  // 10: Rohrmoser Commercial Plaza & Offices
  [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
  ],
  // 11: Grecia Quinta Campestre
  [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
];

function mapRowToAuction(item: any): Auction {
  let lat = typeof item.latitude === 'number' ? item.latitude : null;
  let lng = typeof item.longitude === 'number' ? item.longitude : null;

  if ((!lat || !lng) && item.location) {
    if (typeof item.location === 'object' && Array.isArray(item.location.coordinates)) {
      lng = item.location.coordinates[0];
      lat = item.location.coordinates[1];
    } else if (typeof item.location === 'string') {
      const match = item.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }
  }

  if (!lat || !lng) {
    const districtKey = (item.district || '').toLowerCase().trim();
    const cantonKey = (item.canton || '').toLowerCase().trim();
    const provKey = (item.province || 'san josé').toLowerCase().trim();

    if (CANTON_COORDINATES[districtKey]) {
      [lat, lng] = CANTON_COORDINATES[districtKey];
    } else if (CANTON_COORDINATES[cantonKey]) {
      [lat, lng] = CANTON_COORDINATES[cantonKey];
    } else if (CANTON_COORDINATES[provKey]) {
      [lat, lng] = CANTON_COORDINATES[provKey];
    } else {
      lat = 9.9281;
      lng = -84.0907;
    }
  }

  // Derive smart property category from text if column not present in table
  let category: PropertyCategory = (item.property_category as PropertyCategory) || 'Residential';
  const textSearch = `${item.address_description || ''} ${item.legal_summary || ''} ${item.raw_edict_text || ''}`.toLowerCase();
  
  if (!item.property_category) {
    if (textSearch.includes('condominio') || textSearch.includes('penthouse') || textSearch.includes('filial') || textSearch.includes('apartamento')) {
      category = 'Condo';
    } else if (textSearch.includes('playa') || textSearch.includes('lujo') || textSearch.includes('villa') || textSearch.includes('quinta') || textSearch.includes('golf') || textSearch.includes('reyes') || textSearch.includes('langosta')) {
      category = 'Luxury Estate';
    } else if (textSearch.includes('comercial') || textSearch.includes('oficina') || textSearch.includes('local') || textSearch.includes('bodega')) {
      category = 'Commercial';
    } else if (textSearch.includes('finca') || textSearch.includes('agrícola') || textSearch.includes('agricola') || textSearch.includes('ganadera') || textSearch.includes('arenal') || textSearch.includes('fortuna')) {
      category = 'Agricultural';
    } else if (textSearch.includes('terreno') || textSearch.includes('lote') || textSearch.includes('solar') || textSearch.includes('desarrollo') || textSearch.includes('parque nacional')) {
      category = 'Land/Development';
    }
  }

  // Derive Property Characteristics using robust detector
  const {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority,
  } = detectPropertyCharacteristics(item);

  // Parse linderos if present or extract from text
  let nNorte = item.lindero_norte || null;
  let nSur = item.lindero_sur || null;
  let nEste = item.lindero_este || null;
  let nOeste = item.lindero_oeste || null;

  if (!nNorte && item.raw_edict_text) {
    const mNorte = item.raw_edict_text.match(/norte[:\s]+([^;,.\n]+)/i);
    if (mNorte) nNorte = mNorte[1].trim();
    const mSur = item.raw_edict_text.match(/sur[:\s]+([^;,.\n]+)/i);
    if (mSur) nSur = mSur[1].trim();
    const mEste = item.raw_edict_text.match(/este[:\s]+([^;,.\n]+)/i);
    if (mEste) nEste = mEste[1].trim();
    const mOeste = item.raw_edict_text.match(/oeste[:\s]+([^;,.\n]+)/i);
    if (mOeste) nOeste = mOeste[1].trim();
  }

  // Assign distinct deterministic gallery for each property based on expediente / ID
  const seedString = String(item.expediente_number || item.id || item.folio_real || '0');
  const hash = Math.abs(seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const galleryIndex = hash % UNIQUE_REAL_ESTATE_GALLERIES.length;
  const uniqueGallery = UNIQUE_REAL_ESTATE_GALLERIES[galleryIndex];

  const auctionObj: Auction = {
    id: String(item.id),
    expediente_number: item.expediente_number,
    court_name: item.court_name,
    folio_real: item.folio_real,
    plano_catastrado: item.plano_catastrado || null,
    province: item.province as CostaRicaProvince,
    canton: item.canton || 'Central',
    district: item.district || 'Central',
    address_description: item.address_description || null,
    area_m2: Number(item.area_m2) || 100,
    currency: (item.currency || 'USD') as Currency,
    property_category: category,
    property_type: propertyType,
    naturaleza_raw: item.naturaleza_raw || item.address_description || null,
    has_construction: hasConstruction,
    has_public_road_frontage: hasPublicRoad,
    is_condominio: isCondominio,
    lindero_norte: nNorte,
    lindero_sur: nSur,
    lindero_este: nEste,
    lindero_oeste: nOeste,
    servidumbres_notes: item.servidumbres_notes || null,
    mortgage_priority: mortgagePriority,
    base_price_call_1: Number(item.base_price_call_1),
    auction_date_call_1: item.auction_date_call_1,
    base_price_call_2: item.base_price_call_2 ? Number(item.base_price_call_2) : null,
    auction_date_call_2: item.auction_date_call_2 || null,
    base_price_call_3: item.base_price_call_3 ? Number(item.base_price_call_3) : null,
    auction_date_call_3: item.auction_date_call_3 || null,
    call_stage: item.call_stage || undefined,
    sale_status: item.sale_status || undefined,
    current_call_number: item.current_call_number !== undefined && item.current_call_number !== null ? Number(item.current_call_number) as (1 | 2 | 3) : undefined,
    current_base_price: item.current_base_price ? Number(item.current_base_price) : undefined,
    current_auction_date: item.current_auction_date || undefined,
    current_discount_pct: item.current_discount_pct !== undefined && item.current_discount_pct !== null ? Number(item.current_discount_pct) : undefined,
    last_status_sync_at: item.last_status_sync_at || undefined,
    estimated_market_value: item.estimated_market_value ? Number(item.estimated_market_value) : null,
    estimated_margin_pct: item.estimated_margin_pct ? Number(item.estimated_margin_pct) : null,
    plaintiff: item.plaintiff || 'Entidad Financiera',
    defendant: item.defendant || null,
    legal_summary: item.legal_summary || null,
    raw_edict_text: item.raw_edict_text || '',
    latitude: lat,
    longitude: lng,
    images: Array.isArray(item.images) && item.images.length > 0 ? item.images : uniqueGallery,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };

  // If live progression fields are not present in row, use live calculator fallback
  if (!auctionObj.call_stage || !auctionObj.sale_status || auctionObj.current_base_price === undefined) {
    const live = getLiveAuctionProgressionState(auctionObj);
    auctionObj.call_stage = auctionObj.call_stage || live.callStage;
    auctionObj.sale_status = auctionObj.sale_status || live.saleStatus;
    auctionObj.current_call_number = auctionObj.current_call_number !== undefined ? auctionObj.current_call_number : live.currentCallNumber;
    auctionObj.current_base_price = auctionObj.current_base_price || live.currentBasePrice;
    auctionObj.current_auction_date = auctionObj.current_auction_date || live.currentAuctionDate;
    auctionObj.current_discount_pct = auctionObj.current_discount_pct !== undefined ? auctionObj.current_discount_pct : live.currentDiscountPct;
  }

  return auctionObj;
}

/**
 * Fetch all auctions from Supabase or fallback to mock data
 */
export async function fetchAuctions(params?: {
  province?: string | null;
  canton?: string | null;
  currency?: string | null;
  query?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  callStage?: string | null;
  includePast?: boolean;
  minLng?: number | null;
  minLat?: number | null;
  maxLng?: number | null;
  maxLat?: number | null;
}): Promise<Auction[]> {
  if (!isSupabaseConfigured()) {
    // If no Supabase, return all mock data (API route will filter in memory as fallback)
    return MOCK_AUCTIONS;
  }

  try {
    const supabase = createClient();
    
    // If bounding box is provided, use the spatial RPC
    if (params?.minLng !== undefined && params?.minLng !== null && 
        params?.minLat !== undefined && params?.minLat !== null &&
        params?.maxLng !== undefined && params?.maxLng !== null &&
        params?.maxLat !== undefined && params?.maxLat !== null) {
      
      let rpcQuery = supabase.rpc('get_auctions_in_bounds', {
        min_lng: params.minLng,
        min_lat: params.minLat,
        max_lng: params.maxLng,
        max_lat: params.maxLat,
        target_currency: params.currency && params.currency !== 'all' ? params.currency.toUpperCase() : null,
        max_price: params.maxPrice !== undefined ? params.maxPrice : null
      });

      const { data, error } = await rpcQuery;
      if (error || !data) return MOCK_AUCTIONS;
      
      let results = data.map(mapRowToAuction);
      
      // Apply remaining filters in-memory for spatial results (RPC doesn't handle all filters yet)
      if (params.province && params.province !== 'all') {
        results = results.filter((a: Auction) => a.province.toLowerCase() === params.province!.toLowerCase());
      }
      if (params.canton) {
        results = results.filter((a: Auction) => a.canton.toLowerCase() === params.canton!.toLowerCase());
      }
      if (params.callStage && params.callStage !== 'all') {
        results = results.filter((a: Auction) => (a.call_stage || '') === params.callStage);
      }
      if (params.minPrice !== null && params.minPrice !== undefined) {
        results = results.filter((a: Auction) => a.base_price_call_1 >= params.minPrice!);
      }
      if (params.query) {
        const q = params.query.toLowerCase();
        results = results.filter(
          (a: Auction) =>
            a.canton.toLowerCase().includes(q) ||
            a.district.toLowerCase().includes(q) ||
            a.province.toLowerCase().includes(q) ||
            a.expediente_number.toLowerCase().includes(q) ||
            a.folio_real.toLowerCase().includes(q) ||
            a.plaintiff.toLowerCase().includes(q)
        );
      }
      
      return results;
    }

    // Standard Query without spatial bounds
    let query = supabase.from('auctions').select('*');

    if (params?.province && params.province !== 'all') {
      query = query.ilike('province', params.province);
    }
    if (params?.canton) {
      query = query.ilike('canton', params.canton);
    }
    if (params?.currency && params.currency !== 'all') {
      query = query.eq('currency', params.currency.toUpperCase());
    }
    if (params?.minPrice !== undefined && params.minPrice !== null) {
      query = query.gte('base_price_call_1', params.minPrice);
    }
    if (params?.maxPrice !== undefined && params.maxPrice !== null) {
      query = query.lte('base_price_call_1', params.maxPrice);
    }
    
    // Active / Call Stage filter
    if (params?.callStage && params.callStage !== 'all') {
      query = query.eq('call_stage', params.callStage);
    }

    // Text Search
    if (params?.query && params.query.trim()) {
      const sanitized = params.query.replace(/[,()"]/g, ' ').trim();
      if (sanitized) {
        const q = `%${sanitized}%`;
        query = query.or(`canton.ilike.${q},district.ilike.${q},province.ilike.${q},expediente_number.ilike.${q},folio_real.ilike.${q},plaintiff.ilike.${q}`);
      }
    }

    query = query.order('auction_date_call_1', { ascending: true });

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Error fetching from Supabase query, falling back:', error);
      return MOCK_AUCTIONS;
    }

    return data.map(mapRowToAuction);
  } catch (err) {
    console.warn('Error fetching from Supabase, using mock dataset:', err);
    return MOCK_AUCTIONS;
  }
}

/**
 * Fetch single auction by ID
 */
export async function fetchAuctionById(id: string): Promise<Auction | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return mapRowToAuction(data);
      }
    } catch {
      // ignore
    }
  }

  // Fallback to mock data by ID
  const mock = MOCK_AUCTIONS.find((a) => a.id === id);
  return mock || null;
}

/**
 * User Watchlist Operations
 */
export async function fetchUserWatchlist(userId?: string): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured() || !userId) {
    if (typeof window === 'undefined') return [];
    try {
      const items: WatchlistItem[] = [];
      const allAuctions = await fetchAuctions({ includePast: true });
      for (const auction of allAuctions) {
        const saved = localStorage.getItem(`saved_auction_${auction.id}`);
        if (saved === 'true') {
          const notes = localStorage.getItem(`notes_auction_${auction.id}`);
          const targetBid = localStorage.getItem(`target_bid_auction_${auction.id}`);
          items.push({
            id: `local_${auction.id}`,
            auction_id: auction.id,
            notes: notes || null,
            target_bid: targetBid ? Number(targetBid) : null,
            auction,
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('*, auctions(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      auction_id: item.auction_id,
      notes: item.notes,
      target_bid: item.target_bid,
      created_at: item.created_at,
      auction: item.auctions ? mapRowToAuction(item.auctions) : undefined,
    }));
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    return [];
  }
}

export async function saveToWatchlist(
  auctionId: string,
  userId?: string,
  notes?: string,
  targetBid?: number
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`saved_auction_${auctionId}`, 'true');
      if (notes !== undefined) localStorage.setItem(`notes_auction_${auctionId}`, notes);
      if (targetBid !== undefined) localStorage.setItem(`target_bid_auction_${auctionId}`, String(targetBid));
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured() || !userId) {
    return true;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('user_watchlists').upsert(
      {
        user_id: userId,
        auction_id: auctionId,
        notes: notes || null,
        target_bid: targetBid || null,
      },
      { onConflict: 'user_id,auction_id' }
    );
    return !error;
  } catch (err) {
    console.error('Error saving to watchlist in Supabase:', err);
    return false;
  }
}

export async function removeFromWatchlist(auctionId: string, userId?: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`saved_auction_${auctionId}`);
      localStorage.removeItem(`notes_auction_${auctionId}`);
      localStorage.removeItem(`target_bid_auction_${auctionId}`);
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured() || !userId) {
    return true;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('auction_id', auctionId);
    return !error;
  } catch (err) {
    console.error('Error removing from watchlist in Supabase:', err);
    return false;
  }
}

/**
 * Trigger batch lifecycle and call progression sync in Supabase via single PostgreSQL RPC
 */
export async function syncAuctionProgressionRPC(): Promise<{
  success: boolean;
  total_processed: number;
  total_updated: number;
  transitions: any[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      total_processed: 0,
      total_updated: 0,
      transitions: [],
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('sync_auction_lifecycle_statuses');
    if (error) {
      console.error('Error executing sync_auction_lifecycle_statuses RPC:', error);
      return {
        success: false,
        total_processed: 0,
        total_updated: 0,
        transitions: [],
        error: error.message,
      };
    }

    return (
      data || {
        success: true,
        total_processed: 0,
        total_updated: 0,
        transitions: [],
      }
    );
  } catch (err: any) {
    console.error('Exception calling sync_auction_lifecycle_statuses:', err);
    return {
      success: false,
      total_processed: 0,
      total_updated: 0,
      transitions: [],
      error: err.message || String(err),
    };
  }
}

/**
 * Fetch audit logs for an auction's progression history
 */
export async function fetchAuctionLifecycleLogs(auctionId?: string): Promise<AuctionLifecycleLog[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = createClient();
    let query = supabase
      .from('auction_lifecycle_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    }

    const { data, error } = await query.limit(50);
    if (error) {
      console.error('Error fetching auction lifecycle logs:', error);
      return [];
    }

    return (data || []) as AuctionLifecycleLog[];
  } catch (err) {
    console.error('Exception fetching auction lifecycle logs:', err);
    return [];
  }
}

/**
 * Fetch daily scraper & pipeline ingestion logs
 */
export async function fetchIngestionLogs(): Promise<IngestionLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ingestion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        return data as IngestionLog[];
      }
    } catch (err) {
      console.warn('Could not fetch ingestion_logs from Supabase, returning mock logs:', err);
    }
  }

  // Graceful fallback mock ingestion logs
  return [
    {
      id: 'log-today',
      run_date: new Date().toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'no_new_properties',
      total_edicts_found: 18,
      properties_added: 0,
      properties_skipped: 18,
      expedientes_added: [],
      error_message: null,
      duration_seconds: 4.35,
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'log-yesterday',
      run_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'success',
      total_edicts_found: 24,
      properties_added: 16,
      properties_skipped: 8,
      expedientes_added: ['24-000123-1158-CJ', '23-004589-1012-CJ', '24-001892-0994-CJ', '23-008912-1200-CJ'],
      error_message: null,
      duration_seconds: 14.82,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'log-prev',
      run_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'no_new_properties',
      total_edicts_found: 12,
      properties_added: 0,
      properties_skipped: 12,
      expedientes_added: [],
      error_message: null,
      duration_seconds: 3.90,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ];
}



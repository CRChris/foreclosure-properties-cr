import { Auction, CostaRicaProvince, Currency, PropertyCategory } from '@/lib/types/auction';
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

const CATEGORY_IMAGES: Record<string, string[]> = {
  'Condo': [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  'Luxury Estate': [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  'Residential': [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  'Commercial': [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  ],
  'Agricultural': [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
  ],
  'Land/Development': [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  ],
};

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

  const category = (item.property_category || 'Residential') as PropertyCategory;
  const defaultImgs = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Residential'];

  return {
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
    base_price_call_1: Number(item.base_price_call_1),
    auction_date_call_1: item.auction_date_call_1,
    base_price_call_2: item.base_price_call_2 ? Number(item.base_price_call_2) : null,
    auction_date_call_2: item.auction_date_call_2 || null,
    base_price_call_3: item.base_price_call_3 ? Number(item.base_price_call_3) : null,
    auction_date_call_3: item.auction_date_call_3 || null,
    estimated_market_value: item.estimated_market_value ? Number(item.estimated_market_value) : null,
    estimated_margin_pct: item.estimated_margin_pct ? Number(item.estimated_margin_pct) : null,
    plaintiff: item.plaintiff || 'Entidad Financiera',
    defendant: item.defendant || null,
    legal_summary: item.legal_summary || null,
    raw_edict_text: item.raw_edict_text || '',
    latitude: lat,
    longitude: lng,
    images: Array.isArray(item.images) && item.images.length > 0 ? item.images : defaultImgs,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch all auctions from Supabase or fallback to mock data
 */
export async function fetchAuctions(): Promise<Auction[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_AUCTIONS;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .order('auction_date_call_1', { ascending: true });

    if (error || !data || data.length === 0) {
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
      const allAuctions = await fetchAuctions();
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

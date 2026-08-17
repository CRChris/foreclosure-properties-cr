import { Auction } from '@/lib/types/auction';
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

    // Map PostGIS point or lat/lng
    return data.map((item: any) => {
      let lat = item.latitude;
      let lng = item.longitude;

      if (!lat && item.location && typeof item.location === 'object' && item.location.coordinates) {
        lng = item.location.coordinates[0];
        lat = item.location.coordinates[1];
      }

      return {
        ...item,
        latitude: lat,
        longitude: lng,
      } as Auction;
    });
  } catch (err) {
    console.warn('Error fetching from Supabase, using mock dataset:', err);
    return MOCK_AUCTIONS;
  }
}

/**
 * Fetch single auction by ID
 */
export async function fetchAuctionById(id: string): Promise<Auction | null> {
  // First check mock data
  const mock = MOCK_AUCTIONS.find((a) => a.id === id);
  if (mock) return mock;

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    let lat = data.latitude;
    let lng = data.longitude;

    if (!lat && data.location && typeof data.location === 'object' && data.location.coordinates) {
      lng = data.location.coordinates[0];
      lat = data.location.coordinates[1];
    }

    return {
      ...data,
      latitude: lat,
      longitude: lng,
    } as Auction;
  } catch (err) {
    return null;
  }
}

/**
 * User Watchlist Operations
 */
export async function fetchUserWatchlist(userId?: string): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured() || !userId) {
    // LocalStorage fallback for guest
    if (typeof window === 'undefined') return [];
    try {
      const items: WatchlistItem[] = [];
      for (const auction of MOCK_AUCTIONS) {
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
      auction: item.auctions,
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

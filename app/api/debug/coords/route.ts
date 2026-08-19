import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Debug endpoint to inspect what the database returns for the first 3 auctions.
 * Checks both raw auctions table and the auctions_with_coords view.
 * Remove or gate behind auth in production.
 * 
 * Usage: GET /api/debug/coords
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createClient();

  // 1. Raw auctions table — what does 'location' look like?
  const { data: rawRows, error: rawError } = await supabase
    .from('auctions')
    .select('id, folio_real, province, canton, location, latitude, longitude, location_type')
    .limit(3);

  // 2. View with extracted lat/lng
  const { data: viewRows, error: viewError } = await supabase
    .from('auctions_with_coords')
    .select('id, folio_real, province, canton, latitude, longitude, location_type')
    .limit(3);

  return NextResponse.json({
    raw_auctions: {
      error: rawError?.message || null,
      rows: (rawRows || []).map((r: any) => ({
        id: r.id,
        folio_real: r.folio_real,
        province: r.province,
        canton: r.canton,
        location_type_db: typeof r.location,
        location_sample: typeof r.location === 'string' ? r.location.slice(0, 60) : r.location,
        latitude_col: r.latitude ?? 'MISSING',
        longitude_col: r.longitude ?? 'MISSING',
        location_type: r.location_type,
      })),
    },
    view_auctions_with_coords: {
      error: viewError?.message || null,
      rows: viewRows || [],
    },
  });
}

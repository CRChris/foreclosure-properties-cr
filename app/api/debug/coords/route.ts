import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Debug endpoint to inspect what the database returns for coordinates.
 * Checks raw auctions table, the view, and an RPC extraction.
 *
 * Usage: GET /api/debug/coords
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createClient();

  // 1. Raw auctions table — what does 'location' column look like from JS?
  const { data: rawRows, error: rawError } = await supabase
    .from('auctions')
    .select('id, folio_real, province, canton, location, location_type, plano_catastrado')
    .limit(3);

  // 2. View with extracted lat/lng (may fail if PostgREST cache hasn't refreshed)
  const { data: viewRows, error: viewError } = await supabase
    .from('auctions_with_coords')
    .select('id, folio_real, province, canton, latitude, longitude, location_type')
    .limit(3);

  // 3. Direct lat/lng extraction via existing get_auctions_in_bounds RPC (whole country bbox)
  const { data: rpcRows, error: rpcError } = await supabase.rpc('get_auctions_in_bounds', {
    min_lng: -87,
    min_lat: 7,
    max_lng: -82,
    max_lat: 12,
    target_currency: null,
    max_price: null,
  });

  return NextResponse.json({
    raw_auctions: {
      error: rawError?.message || null,
      rows: (rawRows || []).map((r: any) => ({
        id: r.id,
        folio_real: r.folio_real,
        province: r.province,
        canton: r.canton,
        plano_catastrado: r.plano_catastrado,
        location_js_type: typeof r.location,
        location_is_null: r.location === null,
        location_sample: typeof r.location === 'string'
          ? r.location.slice(0, 60)
          : JSON.stringify(r.location)?.slice(0, 60),
        location_type: r.location_type,
      })),
    },
    view_auctions_with_coords: {
      error: viewError?.message || null,
      hint: viewError
        ? "Run this in Supabase SQL editor: NOTIFY pgrst, 'reload schema';"
        : null,
      rows: viewRows || [],
    },
    rpc_get_auctions_in_bounds: {
      error: rpcError?.message || null,
      count: Array.isArray(rpcRows) ? rpcRows.length : 0,
      sample: Array.isArray(rpcRows)
        ? rpcRows.slice(0, 3).map((r: any) => ({
            id: r.id,
            folio_real: r.folio_real,
            latitude: r.latitude,
            longitude: r.longitude,
            location_type: r.location_type,
          }))
        : [],
    },
  });
}

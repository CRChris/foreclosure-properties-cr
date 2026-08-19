import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Debug endpoint to inspect what the database returns for coordinates.
 * Checks raw auctions table (using * to avoid schema cache column issues),
 * the auctions_with_coords view, the get_all_auctions RPC, and the bounding box RPC.
 *
 * Usage: GET /api/debug/coords
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createClient();

  // 1. Raw auctions table — use select('*') to avoid cache issues with named columns
  const { data: rawRows, error: rawError } = await supabase
    .from('auctions')
    .select('*')
    .limit(2);

  // 2. View with extracted lat/lng — also use select('*')
  const { data: viewRows, error: viewError } = await supabase
    .from('auctions_with_coords')
    .select('*')
    .limit(2);

  // 3. get_all_auctions RPC (our new function — the primary coord source for map)
  const { data: allRpcRows, error: allRpcError } = await supabase.rpc('get_all_auctions', {
    p_province: null,
    p_canton: null,
    p_currency: null,
    p_call_stage: null,
    p_include_past: true,
  });

  // 4. get_auctions_in_bounds RPC (whole country bbox — existing spatial RPC)
  const { data: boundsRpcRows, error: boundsRpcError } = await supabase.rpc('get_auctions_in_bounds', {
    min_lng: -87,
    min_lat: 7,
    max_lng: -82,
    max_lat: 12,
    target_currency: null,
    max_price: null,
  });

  const summarizeRow = (r: any) => ({
    id: r?.id,
    folio_real: r?.folio_real,
    province: r?.province,
    canton: r?.canton,
    plano_catastrado: r?.plano_catastrado,
    latitude: r?.latitude,
    longitude: r?.longitude,
    location_type: r?.location_type,
    has_parcel_polygon: r?.parcel_polygon != null,
    // Raw location column (PostGIS returns as hex or object)
    location_js_type: typeof r?.location,
    location_sample: typeof r?.location === 'string'
      ? r.location.slice(0, 50)
      : r?.location?.type ?? JSON.stringify(r?.location)?.slice(0, 50),
  });

  return NextResponse.json({
    // What columns does PostgREST expose for raw table?
    raw_auctions_star: {
      error: rawError?.message || null,
      columns_returned: rawRows?.[0] ? Object.keys(rawRows[0]) : [],
      sample: (rawRows || []).map(summarizeRow),
    },
    // What does the view return?
    view_auctions_with_coords_star: {
      error: viewError?.message || null,
      hint: viewError
        ? "PostgREST schema cache is stale. In Supabase dashboard → Settings → API → click 'Reload schema' (or restart the project)."
        : null,
      columns_returned: viewRows?.[0] ? Object.keys(viewRows[0]) : [],
      sample: (viewRows || []).map(summarizeRow),
    },
    // get_all_auctions RPC — primary path for fetchAuctions()
    get_all_auctions_rpc: {
      error: allRpcError?.message || null,
      count: Array.isArray(allRpcRows) ? allRpcRows.length : 0,
      sample: (Array.isArray(allRpcRows) ? allRpcRows.slice(0, 3) : []).map(summarizeRow),
    },
    // get_auctions_in_bounds RPC — spatial bounding-box path
    get_auctions_in_bounds_rpc: {
      error: boundsRpcError?.message || null,
      count: Array.isArray(boundsRpcRows) ? boundsRpcRows.length : 0,
      sample: (Array.isArray(boundsRpcRows) ? boundsRpcRows.slice(0, 3) : []).map(summarizeRow),
    },
  });
}

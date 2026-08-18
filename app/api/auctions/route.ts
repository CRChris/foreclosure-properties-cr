import { NextRequest, NextResponse } from 'next/server';
import { fetchAuctions } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const province = searchParams.get('province');
  const canton = searchParams.get('canton');
  const currency = searchParams.get('currency');
  const query = searchParams.get('q');
  const callStage = searchParams.get('callStage');
  const includePast = searchParams.get('includePast') === 'true';
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
  
  // Bounding box query params
  const minLng = searchParams.get('minLng') ? parseFloat(searchParams.get('minLng')!) : null;
  const minLat = searchParams.get('minLat') ? parseFloat(searchParams.get('minLat')!) : null;
  const maxLng = searchParams.get('maxLng') ? parseFloat(searchParams.get('maxLng')!) : null;
  const maxLat = searchParams.get('maxLat') ? parseFloat(searchParams.get('maxLat')!) : null;

  const results = await fetchAuctions({
    province,
    canton,
    currency,
    query,
    callStage,
    includePast,
    minPrice,
    maxPrice,
    minLng,
    minLat,
    maxLng,
    maxLat,
  });

  return NextResponse.json({
    total: results.length,
    data: results,
  });
}

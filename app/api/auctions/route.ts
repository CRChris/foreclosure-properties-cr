import { NextRequest, NextResponse } from 'next/server';
import { fetchAuctions } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const province = searchParams.get('province');
  const canton = searchParams.get('canton');
  const currency = searchParams.get('currency');
  const query = searchParams.get('q');
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
  
  // Bounding box query params
  const minLng = searchParams.get('minLng') ? parseFloat(searchParams.get('minLng')!) : null;
  const minLat = searchParams.get('minLat') ? parseFloat(searchParams.get('minLat')!) : null;
  const maxLng = searchParams.get('maxLng') ? parseFloat(searchParams.get('maxLng')!) : null;
  const maxLat = searchParams.get('maxLat') ? parseFloat(searchParams.get('maxLat')!) : null;

  const allAuctions = await fetchAuctions();
  let results = [...allAuctions];

  // Query search
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (a) =>
        a.canton.toLowerCase().includes(q) ||
        a.district.toLowerCase().includes(q) ||
        a.province.toLowerCase().includes(q) ||
        a.expediente_number.toLowerCase().includes(q) ||
        a.folio_real.toLowerCase().includes(q) ||
        a.plaintiff.toLowerCase().includes(q)
    );
  }

  // Province filter
  if (province && province !== 'all') {
    results = results.filter((a) => a.province.toLowerCase() === province.toLowerCase());
  }

  // Canton filter
  if (canton) {
    results = results.filter((a) => a.canton.toLowerCase() === canton.toLowerCase());
  }

  // Currency filter
  if (currency && currency !== 'all') {
    results = results.filter((a) => a.currency === currency.toUpperCase());
  }

  // Price range filter
  if (minPrice !== null) {
    results = results.filter((a) => a.base_price_call_1 >= minPrice);
  }
  if (maxPrice !== null) {
    results = results.filter((a) => a.base_price_call_1 <= maxPrice);
  }

  // Geospatial Bounding Box filter
  if (minLng !== null && minLat !== null && maxLng !== null && maxLat !== null) {
    results = results.filter((a) => {
      if (a.latitude === null || a.longitude === null) return false;
      return (
        a.latitude >= minLat &&
        a.latitude <= maxLat &&
        a.longitude >= minLng &&
        a.longitude <= maxLng
      );
    });
  }

  return NextResponse.json({
    total: results.length,
    data: results,
  });
}

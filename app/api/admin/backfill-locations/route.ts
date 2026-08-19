import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { lookupCadastralPlano } from '@/lib/services/snitGeocodeService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout on Vercel Pro if available

interface BackfillResultItem {
  id: string;
  expediente: string;
  plano: string;
  status: 'updated_exact' | 'unindexed' | 'skipped' | 'error';
  lat?: number;
  lng?: number;
  error?: string;
}

/**
 * Admin API Route: Backfill Cadastral Geocoding from SNIT
 * 
 * Usage:
 *   POST /api/admin/backfill-locations
 *   GET  /api/admin/backfill-locations?limit=50&dryRun=true&forceAll=false
 */
export async function POST(request: NextRequest) {
  return handleBackfill(request);
}

export async function GET(request: NextRequest) {
  return handleBackfill(request);
}

async function handleBackfill(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured in this environment.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  let dryRun = searchParams.get('dryRun') === 'true';
  let forceAll = searchParams.get('forceAll') === 'true';
  let limit = parseInt(searchParams.get('limit') || '50', 10);
  let delayMs = parseInt(searchParams.get('delayMs') || '250', 10);

  // Also read from body if POST with JSON
  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (body.dryRun !== undefined) dryRun = Boolean(body.dryRun);
      if (body.forceAll !== undefined) forceAll = Boolean(body.forceAll);
      if (body.limit !== undefined) limit = parseInt(body.limit, 10);
      if (body.delayMs !== undefined) delayMs = parseInt(body.delayMs, 10);
    } catch {
      // ignore
    }
  }

  const supabase = createClient();

  try {
    // 1. Fetch properties that have a plano_catastrado
    let query = supabase
      .from('auctions')
      .select('id, expediente_number, folio_real, plano_catastrado, province, canton, district, location_type, parcel_polygon')
      .not('plano_catastrado', 'is', null)
      .neq('plano_catastrado', '');

    if (!forceAll) {
      // Only process properties not yet exact
      query = query.or('location_type.is.null,location_type.neq.exact_cadastral,parcel_polygon.is.null');
    }

    query = query.limit(limit);

    const { data: properties, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Error querying auctions: ${error.message}` },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No properties found requiring cadastral backfill.',
        total_inspected: 0,
        total_updated_exact: 0,
        total_unindexed: 0,
        results: [],
      });
    }

    const results: BackfillResultItem[] = [];
    let updatedCount = 0;
    let unindexedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const plano = prop.plano_catastrado;

      if (!plano || !plano.trim()) {
        results.push({
          id: prop.id,
          expediente: prop.expediente_number,
          plano: '',
          status: 'skipped',
        });
        continue;
      }

      try {
        // Query SNIT WFS service
        const geocode = await lookupCadastralPlano(plano.trim());

        if (geocode.success && geocode.isExact) {
          const lat = geocode.lat;
          const lng = geocode.lng;
          const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;

          if (!dryRun) {
            const { error: updateErr } = await supabase
              .from('auctions')
              .update({
                location: locationWkt,
                location_type: 'exact_cadastral',
                parcel_polygon: geocode.polygonGeoJSON,
                updated_at: new Date().toISOString(),
              })
              .eq('id', prop.id);

            if (updateErr) {
              results.push({
                id: prop.id,
                expediente: prop.expediente_number,
                plano,
                status: 'error',
                error: updateErr.message,
              });
              errorCount++;
              continue;
            }
          }

          updatedCount++;
          results.push({
            id: prop.id,
            expediente: prop.expediente_number,
            plano,
            status: 'updated_exact',
            lat,
            lng,
          });
        } else {
          // Cadastral plano not found in SNIT layer
          unindexedCount++;
          if (!dryRun && (!prop.location_type || prop.location_type !== 'approximate_town')) {
            await supabase
              .from('auctions')
              .update({
                location_type: 'approximate_town',
                updated_at: new Date().toISOString(),
              })
              .eq('id', prop.id);
          }

          results.push({
            id: prop.id,
            expediente: prop.expediente_number,
            plano,
            status: 'unindexed',
            error: geocode.error,
          });
        }
      } catch (itemErr: any) {
        errorCount++;
        results.push({
          id: prop.id,
          expediente: prop.expediente_number,
          plano,
          status: 'error',
          error: itemErr?.message || String(itemErr),
        });
      }

      // Delay between queries to be polite to SNIT GeoServer
      if (i < properties.length - 1 && delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total_inspected: properties.length,
      total_updated_exact: updatedCount,
      total_unindexed: unindexedCount,
      total_errors: errorCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

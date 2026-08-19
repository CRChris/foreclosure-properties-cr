import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { resolvePropertyLocation } from '@/lib/services/snitGeocodeService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout on Vercel Pro if available

interface BackfillResultItem {
  id: string;
  expediente: string;
  folio_real?: string;
  plano?: string;
  resolutionSource?: 'plano' | 'folio_real' | 'town_fallback';
  status: 'updated_exact' | 'resolved_approximate' | 'skipped' | 'error';
  lat?: number;
  lng?: number;
  error?: string;
}

/**
 * Admin API Route: Master Geolocation Backfill
 * Resolves exact coordinates via Plano Cadastral -> Folio Real / Finca -> Landmark / District Centroid.
 * 
 * Usage:
 *   POST /api/admin/backfill-locations
 *   GET  /api/admin/backfill-locations?limit=50&dryRun=false&forceAll=false
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
    // 1. Fetch properties needing location resolution
    let query = supabase
      .from('auctions')
      .select('id, expediente_number, folio_real, plano_catastrado, province, canton, district, address_description, raw_edict_text, legal_summary, location_type, parcel_polygon');

    if (!forceAll) {
      // Prioritize properties not yet exact
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
        message: 'No properties found requiring geolocation backfill.',
        total_inspected: 0,
        total_updated_exact: 0,
        total_resolved_approximate: 0,
        results: [],
      });
    }

    const results: BackfillResultItem[] = [];
    let exactCount = 0;
    let approxCount = 0;
    let errorCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      try {
        // Execute unified master geolocation hierarchy
        const geocode = await resolvePropertyLocation({
          id: prop.id,
          plano: prop.plano_catastrado,
          folioReal: prop.folio_real,
          province: prop.province,
          canton: prop.canton,
          district: prop.district,
          raw_edict_text: prop.raw_edict_text,
          address_description: prop.address_description,
          legal_summary: prop.legal_summary,
        });

        const lat = geocode.lat;
        const lng = geocode.lng;
        const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;

        if (!dryRun) {
          const updatePayload: Record<string, any> = {
            location: locationWkt,
            location_type: geocode.location_type,
            updated_at: new Date().toISOString(),
          };

          if (geocode.polygonGeoJSON) {
            updatePayload.parcel_polygon = geocode.polygonGeoJSON;
          }

          const { error: updateErr } = await supabase
            .from('auctions')
            .update(updatePayload)
            .eq('id', prop.id);

          if (updateErr) {
            results.push({
              id: prop.id,
              expediente: prop.expediente_number,
              folio_real: prop.folio_real,
              plano: prop.plano_catastrado,
              resolutionSource: geocode.resolutionSource,
              status: 'error',
              error: updateErr.message,
            });
            errorCount++;
            continue;
          }
        }

        if (geocode.isExact) {
          exactCount++;
          results.push({
            id: prop.id,
            expediente: prop.expediente_number,
            folio_real: prop.folio_real,
            plano: prop.plano_catastrado,
            resolutionSource: geocode.resolutionSource,
            status: 'updated_exact',
            lat,
            lng,
          });
        } else {
          approxCount++;
          results.push({
            id: prop.id,
            expediente: prop.expediente_number,
            folio_real: prop.folio_real,
            plano: prop.plano_catastrado,
            resolutionSource: geocode.resolutionSource,
            status: 'resolved_approximate',
            lat,
            lng,
          });
        }
      } catch (itemErr: any) {
        errorCount++;
        results.push({
          id: prop.id,
          expediente: prop.expediente_number,
          folio_real: prop.folio_real,
          plano: prop.plano_catastrado,
          status: 'error',
          error: itemErr?.message || String(itemErr),
        });
      }

      // Delay between queries to avoid rate-limiting
      if (i < properties.length - 1 && delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total_inspected: properties.length,
      total_updated_exact: exactCount,
      total_resolved_approximate: approxCount,
      total_errors: errorCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

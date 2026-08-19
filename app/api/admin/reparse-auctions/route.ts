import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { extractPropertyDeterministic, extractPropertyWithGemini } from '@/lib/services/extractorService';
import { detectPropertyCharacteristics } from '@/lib/utils';
import { PropertyType } from '@/lib/types/auction';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ReparseResultItem {
  id: string;
  expediente: string;
  folio_real: string;
  canton?: string;
  province?: string;
  old_area_m2: number;
  new_area_m2: number;
  old_has_construction: boolean;
  new_has_construction: boolean;
  old_property_type?: string;
  new_property_type: string;
  naturaleza_raw: string;
  changes_applied: boolean;
  status: 'updated' | 'unchanged' | 'error';
  error?: string;
}

/**
 * Admin API Route: Batch Reparse & Verification Endpoint
 * Re-extracts structured fields from verbatim raw_edict_text using strict Costa Rican legal rules:
 * - Fixes lot sizes (spelled-out Spanish words, decimeters, hectares).
 * - Fixes false is_constructed flags on "terreno para construir" / "lote para construir".
 * 
 * Usage:
 *   POST /api/admin/reparse-auctions
 *   GET  /api/admin/reparse-auctions?dryRun=true&limit=50
 */
export async function POST(request: NextRequest) {
  return handleReparse(request);
}

export async function GET(request: NextRequest) {
  return handleReparse(request);
}

async function handleReparse(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured in this environment.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  let dryRun = searchParams.get('dryRun') !== 'false'; // default to true for safety
  let useGemini = searchParams.get('useGemini') === 'true';
  let limit = parseInt(searchParams.get('limit') || '100', 10);
  let targetExpediente = searchParams.get('expediente');

  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (body.dryRun !== undefined) dryRun = Boolean(body.dryRun);
      if (body.useGemini !== undefined) useGemini = Boolean(body.useGemini);
      if (body.limit !== undefined) limit = parseInt(body.limit, 10);
      if (body.expediente !== undefined) targetExpediente = body.expediente;
    } catch {
      // ignore
    }
  }

  const supabase = createClient();

  try {
    let query = supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false });

    if (targetExpediente) {
      query = query.ilike('expediente_number', `%${targetExpediente}%`);
    }

    query = query.limit(limit);

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Error fetching auctions: ${error.message}` },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records found to reparse.',
        total_inspected: 0,
        total_corrected: 0,
        results: [],
      });
    }

    const results: ReparseResultItem[] = [];
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const row of records) {
      try {
        const rawText = row.raw_edict_text || row.address_description || '';
        
        let extracted;
        if (useGemini && process.env.GEMINI_API_KEY) {
          extracted = await extractPropertyWithGemini(rawText);
        } else {
          extracted = extractPropertyDeterministic(rawText);
        }

        if (!extracted) {
          results.push({
            id: row.id,
            expediente: row.expediente_number,
            folio_real: row.folio_real,
            canton: row.canton,
            province: row.province,
            old_area_m2: Number(row.area_m2) || 0,
            new_area_m2: Number(row.area_m2) || 0,
            old_has_construction: Boolean(row.has_construction),
            new_has_construction: Boolean(row.has_construction),
            new_property_type: row.property_type || 'other',
            naturaleza_raw: row.naturaleza_raw || '',
            changes_applied: false,
            status: 'unchanged',
          });
          unchangedCount++;
          continue;
        }

        // Map extractor property_type ("lot" | "house" | "condo" | "commercial" | "farm" | "other")
        // to DB property_type ("building_lot" | "single_family_home" | "condo_apartment" | "commercial_industrial" | "agricultural_land" | "other")
        let dbPropertyType: PropertyType = 'other';
        if (extracted.property_type === 'lot') dbPropertyType = 'building_lot';
        else if (extracted.property_type === 'house') dbPropertyType = 'single_family_home';
        else if (extracted.property_type === 'condo') dbPropertyType = 'condo_apartment';
        else if (extracted.property_type === 'commercial') dbPropertyType = 'commercial_industrial';
        else if (extracted.property_type === 'farm') dbPropertyType = 'agricultural_land';

        const oldArea = Number(row.area_m2) || 0;
        const newArea = extracted.lot_size_m2 || oldArea;
        const oldHasConstruction = Boolean(row.has_construction);
        const newHasConstruction = Boolean(extracted.is_constructed);
        const oldPropType = row.property_type;
        const newNaturaleza = extracted.naturaleza_raw || row.naturaleza_raw || '';

        const hasAreaDiff = Math.abs(oldArea - newArea) > 0.01;
        const hasConstructionDiff = oldHasConstruction !== newHasConstruction;
        const hasTypeDiff = oldPropType !== dbPropertyType;
        const hasNatDiff = !row.naturaleza_raw && !!newNaturaleza;

        const hasChanges = hasAreaDiff || hasConstructionDiff || hasTypeDiff || hasNatDiff;

        if (hasChanges) {
          if (!dryRun) {
            const updatePayload: Record<string, any> = {
              area_m2: newArea,
              has_construction: newHasConstruction,
              property_type: dbPropertyType,
              naturaleza_raw: newNaturaleza,
              updated_at: new Date().toISOString(),
            };

            const { error: updateErr } = await supabase
              .from('auctions')
              .update(updatePayload)
              .eq('id', row.id);

            if (updateErr) {
              results.push({
                id: row.id,
                expediente: row.expediente_number,
                folio_real: row.folio_real,
                canton: row.canton,
                province: row.province,
                old_area_m2: oldArea,
                new_area_m2: newArea,
                old_has_construction: oldHasConstruction,
                new_has_construction: newHasConstruction,
                old_property_type: oldPropType,
                new_property_type: dbPropertyType,
                naturaleza_raw: newNaturaleza,
                changes_applied: false,
                status: 'error',
                error: updateErr.message,
              });
              errorCount++;
              continue;
            }
          }

          updatedCount++;
          results.push({
            id: row.id,
            expediente: row.expediente_number,
            folio_real: row.folio_real,
            canton: row.canton,
            province: row.province,
            old_area_m2: oldArea,
            new_area_m2: newArea,
            old_has_construction: oldHasConstruction,
            new_has_construction: newHasConstruction,
            old_property_type: oldPropType,
            new_property_type: dbPropertyType,
            naturaleza_raw: newNaturaleza,
            changes_applied: !dryRun,
            status: 'updated',
          });
        } else {
          unchangedCount++;
          results.push({
            id: row.id,
            expediente: row.expediente_number,
            folio_real: row.folio_real,
            canton: row.canton,
            province: row.province,
            old_area_m2: oldArea,
            new_area_m2: newArea,
            old_has_construction: oldHasConstruction,
            new_has_construction: newHasConstruction,
            old_property_type: oldPropType,
            new_property_type: dbPropertyType,
            naturaleza_raw: newNaturaleza,
            changes_applied: false,
            status: 'unchanged',
          });
        }
      } catch (err: any) {
        errorCount++;
        results.push({
          id: row.id,
          expediente: row.expediente_number,
          folio_real: row.folio_real,
          old_area_m2: Number(row.area_m2) || 0,
          new_area_m2: 0,
          old_has_construction: Boolean(row.has_construction),
          new_has_construction: false,
          new_property_type: 'other',
          naturaleza_raw: row.naturaleza_raw || '',
          changes_applied: false,
          status: 'error',
          error: err?.message || String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total_inspected: records.length,
      total_corrected: updatedCount,
      total_unchanged: unchangedCount,
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

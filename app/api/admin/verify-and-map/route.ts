import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { verifyAndCorrectAuction } from '@/lib/services/verificationService';
import { Auction } from '@/lib/types/auction';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout on Vercel Pro

/**
 * Admin API Route: Post-Scan Verification & Cadastral Mapping Engine
 * 
 * Verifies and corrects:
 * 1. Title Accuracy (property type, construction status, province, canton, district, area)
 * 2. Map Pin Accuracy (CR coordinate bounds check, SNIT cadastral lot boundary lookup)
 * 
 * Usage:
 *   POST /api/admin/verify-and-map
 *   GET  /api/admin/verify-and-map?limit=50&dryRun=false
 */
export async function POST(request: NextRequest) {
  return handleVerifyAndMap(request);
}

export async function GET(request: NextRequest) {
  return handleVerifyAndMap(request);
}

async function handleVerifyAndMap(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured in this environment.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  let dryRun = searchParams.get('dryRun') === 'true';
  let limit = parseInt(searchParams.get('limit') || '50', 10);
  let targetExpediente = searchParams.get('expediente');

  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      if (body.dryRun !== undefined) dryRun = Boolean(body.dryRun);
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
        message: 'No auctions found to verify and map.',
        total_inspected: 0,
        results: [],
      });
    }

    const results = [];
    let updatedCount = 0;

    for (const record of records) {
      try {
        const { verification, updatedPayload } = await verifyAndCorrectAuction(record as Auction);

        if (updatedPayload && !dryRun) {
          const { error: updateErr } = await supabase
            .from('auctions')
            .update({
              ...updatedPayload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);

          if (updateErr) {
            results.push({
              id: record.id,
              expediente: record.expediente_number,
              status: 'error',
              error: updateErr.message,
              verification,
            });
            continue;
          }
        }

        if (updatedPayload) updatedCount++;

        results.push({
          id: record.id,
          expediente: record.expediente_number,
          folio_real: record.folio_real,
          status: updatedPayload ? (dryRun ? 'would_update' : 'updated') : 'verified_accurate',
          has_updates: !!updatedPayload,
          title_verified: verification.titleCheck,
          map_pin_verified: verification.mapPinCheck,
        });
      } catch (itemErr: any) {
        results.push({
          id: record.id,
          expediente: record.expediente_number,
          status: 'error',
          error: itemErr.message || String(itemErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total_inspected: records.length,
      total_updated: updatedCount,
      total_accurate: records.length - updatedCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

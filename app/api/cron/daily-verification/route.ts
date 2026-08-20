import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAndCorrectAuction } from '@/lib/services/verificationService';
import { Auction } from '@/lib/types/auction';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes

/**
 * Automated Daily Post-Scan Verification & Cadastral Mapping Cron Route
 * Scheduled for daily execution at 9:30 AM Costa Rica Time (15:30 UTC).
 * 
 * Verifies all properties added today:
 * 1. Title Accuracy & Construction Classification
 * 2. Map Pin Accuracy & SNIT Cadastral Parcel Polygon Georeferencing
 */
export async function GET(request: NextRequest) {
  return handleDailyVerification(request);
}

export async function POST(request: NextRequest) {
  return handleDailyVerification(request);
}

async function handleDailyVerification(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (cronSecret && !isVercelCron) {
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '');
    if (bearerToken !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid CRON_SECRET Bearer token' },
        { status: 401 }
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.json(
      { success: false, message: 'Supabase credentials not configured' },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Determine start of day in Costa Rica (UTC-6)
    const now = new Date();
    const crOffsetMs = 6 * 60 * 60 * 1000;
    const crNow = new Date(now.getTime() - crOffsetMs);
    crNow.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(crNow.getTime() + crOffsetMs).toISOString();

    const { data: auctions, error } = await supabase
      .from('auctions')
      .select('*')
      .gte('created_at', startOfTodayUtc)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!auctions || auctions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new auctions added today to verify.',
        evaluated: 0,
        updated: 0,
        timestamp_cr: new Date(now.getTime() - crOffsetMs).toISOString(),
      });
    }

    let updatedCount = 0;
    let exactCadastralCount = 0;
    let exactPinCount = 0;
    let approxCount = 0;

    for (const record of auctions) {
      try {
        const { verification, updatedPayload } = await verifyAndCorrectAuction(record as Auction);

        if (verification.mapPinCheck.hasLotBoundaries) exactCadastralCount++;
        else if (verification.mapPinCheck.isExactPin) exactPinCount++;
        else approxCount++;

        if (updatedPayload) {
          await supabase
            .from('auctions')
            .update({
              ...updatedPayload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error verifying auction ${record.expediente_number}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      execution_time: '9:30 AM Costa Rica Time (15:30 UTC)',
      total_added_today: auctions.length,
      corrected_and_updated: updatedCount,
      exact_cadastral_lots: exactCadastralCount,
      exact_gps_pins: exactPinCount,
      approximate_centroids: approxCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}

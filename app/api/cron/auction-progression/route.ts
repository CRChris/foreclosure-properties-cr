import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Enforce dynamic execution for cron endpoints
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Automated Background Cron Engine: Call Progression & Status Tracker
 * Single Source of Truth: Calls PostgreSQL stored procedure public.sync_auction_lifecycle_statuses()
 * Runs on periodic schedule (e.g. every 5-15 mins via Vercel Cron, GitHub Actions, or Supabase)
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  // Verify authorization if CRON_SECRET is configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    if (!isVercelCron && bearerToken !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid CRON_SECRET Bearer token' },
        { status: 401 }
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.json(
      {
        success: false,
        message: 'Supabase credentials not configured',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    // Create admin client with service role key for full RPC execution permissions
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute the Master Single Source of Truth PostgreSQL RPC function
    const { data, error } = await supabaseAdmin.rpc('sync_auction_lifecycle_statuses');

    if (error) {
      console.error('[CRON Engine] Failed to execute sync_auction_lifecycle_statuses RPC:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      engine: 'PostgreSQL public.sync_auction_lifecycle_statuses()',
      timezone: 'America/Costa_Rica (UTC-6)',
      data,
    });
  } catch (err: any) {
    console.error('[CRON Engine] Exception during execution:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

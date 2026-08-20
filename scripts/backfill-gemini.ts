/**
 * Standalone Gemini Geocoding Backfill Script
 * Run with: npx tsx scripts/backfill-gemini.ts
 *
 * Reads .env.local, geocodes all properties via the full pipeline:
 * 1. SNIT Plano  →  2. SNIT Finca  →  2.5. Gemini Flash AI  →  3. Centroid fallback
 * Writes resulting coordinates back to Supabase auctions table.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local before importing anything that uses process.env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env.local');
} else {
  dotenv.config();
  console.log('⚠️  .env.local not found, using process.env');
}

// Verify required env vars
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env.local');
  process.exit(1);
}

console.log('🔑 Gemini API key present:', GEMINI_KEY.slice(0, 8) + '...');
console.log('🗄️  Supabase URL:', SUPABASE_URL);

import { createClient } from '@supabase/supabase-js';
import { resolvePropertyLocation } from '../lib/services/snitGeocodeService';

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const LIMIT = parseInt(process.argv[2] || '50', 10);
const FORCE_ALL = process.argv.includes('--force-all');
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 400; // ms between properties to avoid Gemini rate limits

async function run() {
  console.log(`\n🚀 Starting backfill: limit=${LIMIT}, forceAll=${FORCE_ALL}, dryRun=${DRY_RUN}\n`);

  let query = supabase
    .from('auctions')
    .select('id, expediente_number, folio_real, plano_catastrado, province, canton, district, address_description, raw_edict_text, legal_summary, location_type, location');

  if (!FORCE_ALL) {
    // Prioritize properties not yet Gemini-geocoded (location_type is null or approximate_town)
    query = query.or('location_type.is.null,location_type.eq.approximate_town');
  }

  query = query.limit(LIMIT);

  const { data: properties, error } = await query;
  if (error || !properties) {
    console.error('❌ Failed to fetch properties:', error?.message);
    process.exit(1);
  }

  console.log(`📋 Found ${properties.length} properties to process\n`);

  let geminiCount = 0;
  let planoCount = 0;
  let folioCount = 0;
  let centroidCount = 0;
  let errorCount = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    process.stdout.write(`[${i + 1}/${properties.length}] ${prop.folio_real || prop.expediente_number} ... `);

    try {
      const geocode = await resolvePropertyLocation(
        {
          id: prop.id,
          plano: prop.plano_catastrado,
          folioReal: prop.folio_real,
          province: prop.province,
          canton: prop.canton,
          district: prop.district,
          raw_edict_text: prop.raw_edict_text,
          address_description: prop.address_description,
          legal_summary: prop.legal_summary,
        },
        {
          apiKey: GEMINI_KEY,
          timeoutMs: 12000,
        }
      );

      const { lat, lng, resolutionSource, geminiResolvedAs } = geocode;

      // Track resolution source counts
      if (resolutionSource === 'plano') planoCount++;
      else if (resolutionSource === 'folio_real') folioCount++;
      else if (resolutionSource === 'gemini_ai') geminiCount++;
      else centroidCount++;

      const sourceEmoji = {
        plano: '📐',
        folio_real: '📝',
        gemini_ai: '🤖',
        town_fallback: '🏘️',
      }[resolutionSource] ?? '❓';

      const label = geminiResolvedAs ? ` → "${geminiResolvedAs}"` : ` → ${geocode.province}/${geocode.canton}`;
      process.stdout.write(`${sourceEmoji} ${resolutionSource}${label} [${lat.toFixed(4)}, ${lng.toFixed(4)}]\n`);

      if (!DRY_RUN) {
        const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;
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
          console.error(`  ❌ DB update failed: ${updateErr.message}`);
          errorCount++;
        }
      }
    } catch (err: any) {
      console.error(`\n  ❌ Error: ${err?.message}`);
      errorCount++;
    }

    // Small delay between requests to respect Gemini rate limits
    if (i < properties.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total processed:  ${properties.length}`);
  console.log(`  📐 SNIT Plano:    ${planoCount}`);
  console.log(`  📝 SNIT Finca:    ${folioCount}`);
  console.log(`  🤖 Gemini AI:     ${geminiCount}`);
  console.log(`  🏘️  Centroid:      ${centroidCount}`);
  console.log(`  ❌ Errors:        ${errorCount}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no changes written to DB');
  else console.log('\n✅ Done — coordinates written to Supabase');
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

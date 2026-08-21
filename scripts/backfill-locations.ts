/**
 * Cadastral Location Backfill Script
 * 
 * Iterates through all properties in Supabase,
 * executes the full Costa Rican cadastral resolution hierarchy:
 * 1. SNIT Plano lookup (SIRI service for exact 12-digit cadastral survey boundary polygon).
 * 2. SNIT Folio Real lookup (SIRI service for 7-digit zero-padded finca boundary polygon).
 * 3. High-precision landmark / development coordinates.
 * 4. Fallback to town/district center centroid (tagged as general vicinity).
 * 
 * Run with:
 *   npx tsx scripts/backfill-locations.ts --force
 *   or
 *   pnpm dlx tsx scripts/backfill-locations.ts --dry-run
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { resolvePropertyLocation } from '../lib/services/snitGeocodeService';

function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const forceAll = process.argv.includes('--force') || !process.argv.includes('--only-missing');

  console.log('================================================================');
  console.log('📍 Costa Rica Foreclosures: SNIT Cadastral Backfill Engine');
  console.log(`🔧 Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION (Database Updates Active)'}`);
  console.log(`🎯 Scope: ${forceAll ? 'All records in database' : 'Only unindexed / approximate records'}`);
  console.log('================================================================\n');

  let query = supabase
    .from('auctions')
    .select('id, expediente_number, folio_real, plano_catastrado, province, canton, district, address_description, raw_edict_text, legal_summary, location_type, parcel_polygon')
    .order('created_at', { ascending: false });

  const { data: properties, error } = await query;

  if (error) {
    console.error('❌ Failed to query auctions from Supabase:', error.message);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('✓ No properties found. Database is empty!');
    return;
  }

  console.log(`📋 Found ${properties.length} properties to inspect...\n`);

  let updatedPolygons = 0;
  let updatedExactPins = 0;
  let townCenterFallbacks = 0;
  let errors = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const progress = `[${i + 1}/${properties.length}]`;

    try {
      console.log(`${progress} 🔍 Checking ${prop.expediente_number} (Folio: ${prop.folio_real || 'N/A'}, Plano: ${prop.plano_catastrado || 'N/A'}, ${prop.canton}, ${prop.province})...`);
      
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
      }, { timeoutMs: 8000 });

      const { lat, lng } = geocode;
      const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;
      const hasPolygon = Boolean(geocode.polygonGeoJSON);

      if (!isDryRun) {
        const updatePayload: Record<string, any> = {
          location: locationWkt,
          location_type: geocode.location_type,
          parcel_polygon: geocode.polygonGeoJSON || null,
          province: geocode.province || prop.province,
          canton: geocode.canton || prop.canton,
          district: geocode.district || prop.district,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('auctions')
          .update(updatePayload)
          .eq('id', prop.id);

        if (updateErr) {
          console.error(`  ❌ Update error for ${prop.expediente_number}: ${updateErr.message}`);
          errors++;
          continue;
        }
      }

      if (hasPolygon) {
        console.log(`  ✅ SNIT Cadastral Polygon resolved! Source: ${geocode.resolutionSource} | GPS: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        updatedPolygons++;
      } else if (geocode.isExact) {
        console.log(`  🎯 Exact location resolved (${geocode.resolutionSource}) | GPS: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        updatedExactPins++;
      } else {
        console.log(`  📍 Town center fallback (General vicinity) | GPS: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        townCenterFallbacks++;
      }
    } catch (err: any) {
      console.error(`  ❌ Exception processing ${prop.expediente_number}: ${err.message}`);
      errors++;
    }

    // Small delay between queries to avoid SNIT rate limiting
    if (i < properties.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  console.log('\n================================================================');
  console.log('🎯 Backfill Summary:');
  console.log(`   - Total properties evaluated: ${properties.length}`);
  console.log(`   - SNIT Cadastral Polygons:    ${updatedPolygons} (${Math.round((updatedPolygons / properties.length) * 100)}%)`);
  console.log(`   - Exact Pin Locations:        ${updatedExactPins}`);
  console.log(`   - Town Center Fallbacks:      ${townCenterFallbacks}`);
  console.log(`   - Errors encountered:         ${errors}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

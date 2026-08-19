/**
 * Cadastral Location Backfill Script
 * 
 * Iterates through all properties in Supabase that have a plano number,
 * queries the SNIT GeoServer WFS endpoint, and updates records from approximate
 * town centroids to exact cadastral polygons and reprojected coordinates.
 * 
 * Run with:
 *   npx tsx scripts/backfill-locations.ts
 *   or
 *   pnpm dlx tsx scripts/backfill-locations.ts --dry-run
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { lookupCadastralPlano } from '../lib/services/snitGeocodeService';

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
  const forceAll = process.argv.includes('--force');

  console.log('================================================================');
  console.log('📍 Costa Rica Foreclosures: SNIT Cadastral Backfill Engine');
  console.log(`🔧 Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION (Database Updates Active)'}`);
  console.log(`🎯 Scope: ${forceAll ? 'All records with plano' : 'Only unindexed / approximate records'}`);
  console.log('================================================================\n');

  let query = supabase
    .from('auctions')
    .select('id, expediente_number, folio_real, plano_catastrado, province, canton, district, location_type, parcel_polygon')
    .not('plano_catastrado', 'is', null)
    .neq('plano_catastrado', '');

  if (!forceAll) {
    query = query.or('location_type.is.null,location_type.neq.exact_cadastral,parcel_polygon.is.null');
  }

  const { data: properties, error } = await query;

  if (error) {
    console.error('❌ Failed to query auctions from Supabase:', error.message);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('✓ No properties found requiring cadastral geocoding backfill. All up to date!');
    return;
  }

  console.log(`📋 Found ${properties.length} properties to inspect...\n`);

  let updatedExact = 0;
  let unindexed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const plano = prop.plano_catastrado?.trim();
    const progress = `[${i + 1}/${properties.length}]`;

    if (!plano) {
      console.log(`${progress} ⏭️ Skipped ${prop.expediente_number}: Empty plano`);
      skipped++;
      continue;
    }

    try {
      console.log(`${progress} 🔍 Querying SNIT for Plano "${plano}" (${prop.expediente_number} - ${prop.canton})...`);
      const geocode = await lookupCadastralPlano(plano);

      if (geocode.success && geocode.isExact) {
        const { lat, lng } = geocode;
        const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;

        if (!isDryRun) {
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
            console.error(`  ❌ Update error for ${prop.expediente_number}: ${updateErr.message}`);
            errors++;
            continue;
          }
        }

        console.log(`  ✅ Exact cadastral polygon found! GPS: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        updatedExact++;
      } else {
        console.log(`  ⚠️ Not indexed in SNIT cadastral layer: ${geocode.error || 'No polygon'}`);
        unindexed++;

        if (!isDryRun && (!prop.location_type || prop.location_type !== 'approximate_town')) {
          await supabase
            .from('auctions')
            .update({
              location_type: 'approximate_town',
              updated_at: new Date().toISOString(),
            })
            .eq('id', prop.id);
        }
      }
    } catch (err: any) {
      console.error(`  ❌ Exception processing ${prop.expediente_number}: ${err.message}`);
      errors++;
    }

    // Rate-limiting delay to respect SNIT server
    if (i < properties.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log('\n================================================================');
  console.log('🎯 Backfill Summary:');
  console.log(`   - Total properties evaluated: ${properties.length}`);
  console.log(`   - Exact Cadastral Polygons:   ${updatedExact} (${Math.round((updatedExact / properties.length) * 100)}%)`);
  console.log(`   - Unindexed in SNIT:          ${unindexed}`);
  console.log(`   - Errors encountered:         ${errors}`);
  console.log(`   - Skipped:                    ${skipped}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

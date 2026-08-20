import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { verifyAndCorrectAuction } from '../lib/services/verificationService';
import { Auction } from '../lib/types/auction';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing from environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerifyAndMap() {
  const args = process.argv.slice(2);
  const todayOnly = args.includes('--today-only') || args.includes('-t');
  const expIndex = args.indexOf('--expedientes');
  const targetExpedientes = expIndex !== -1 && args[expIndex + 1] ? args[expIndex + 1].split(',').map(s => s.trim().toUpperCase()) : [];

  console.log('🚀 Starting Post-Scan Verification & Cadastral Mapping Engine...');
  console.log('📡 Supabase Endpoint:', supabaseUrl);
  if (todayOnly) console.log('📅 Mode: Verifying newly added properties for today');
  if (targetExpedientes.length > 0) console.log(`🎯 Targeting ${targetExpedientes.length} specific expedientes`);

  let query = supabase
    .from('auctions')
    .select('*')
    .order('created_at', { ascending: false });

  if (targetExpedientes.length > 0) {
    query = query.in('expediente_number', targetExpedientes);
  } else if (todayOnly) {
    // Start of day in Costa Rica (UTC-6)
    const now = new Date();
    const crOffsetMs = 6 * 60 * 60 * 1000;
    const crNow = new Date(now.getTime() - crOffsetMs);
    crNow.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(crNow.getTime() + crOffsetMs).toISOString();
    query = query.gte('created_at', startOfTodayUtc);
  }

  const { data: auctions, error } = await query;

  if (error) {
    console.error('❌ Error querying auctions:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${auctions.length} auctions to verify.`);

  let totalExactCadastral = 0;
  let totalExactPin = 0;
  let totalApproximate = 0;
  let totalUpdated = 0;
  let totalCorrect = 0;

  for (let i = 0; i < auctions.length; i++) {
    const record = auctions[i];
    try {
      const { verification, updatedPayload } = await verifyAndCorrectAuction(record as Auction);

      if (verification.mapPinCheck.hasLotBoundaries) {
        totalExactCadastral++;
      } else if (verification.mapPinCheck.isExactPin) {
        totalExactPin++;
      } else {
        totalApproximate++;
      }

      if (updatedPayload) {
        const { error: updateErr } = await supabase
          .from('auctions')
          .update({
            ...updatedPayload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateErr) {
          console.error(`   ❌ Failed to update ${record.expediente_number}:`, updateErr.message);
        } else {
          totalUpdated++;
          console.log(`   ✓ Corrected [${record.expediente_number}] | Type: ${verification.titleCheck.verifiedPropertyType} | Loc: ${verification.titleCheck.verifiedDistrict}, ${verification.titleCheck.verifiedCanton} | Title: "${verification.titleCheck.titleEs}"`);
        }
      } else {
        totalCorrect++;
      }

      if ((i + 1) % 25 === 0 || i === auctions.length - 1) {
        console.log(`⏳ Verified ${i + 1}/${auctions.length} properties...`);
      }
    } catch (err: any) {
      console.error(`❌ Error verifying ${record.expediente_number}:`, err.message);
    }
  }

  console.log('\n🎉 Verification & Mapping Summary:');
  console.log(`   • Total Inspected: ${auctions.length}`);
  console.log(`   • Records Corrected & Updated: ${totalUpdated}`);
  console.log(`   • Already Accurate Records: ${totalCorrect}`);
  console.log(`   • Exact Cadastral Lot Overlays (SNIT Polygons): ${totalExactCadastral}`);
  console.log(`   • Exact Pin Locations (GPS): ${totalExactPin}`);
  console.log(`   • Approximate Town Centroids: ${totalApproximate}`);
}

runVerifyAndMap().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

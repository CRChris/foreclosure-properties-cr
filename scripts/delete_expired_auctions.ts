import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function deleteExpiredAuctions() {
  console.log('🚀 Connecting to Supabase at:', supabaseUrl);
  
  // Fetch all auctions to evaluate expiration
  const { data: auctions, error } = await supabase
    .from('auctions')
    .select('id, expediente_number, folio_real, canton, province, call_stage, sale_status, auction_date_call_1, auction_date_call_2, auction_date_call_3');

  if (error) {
    console.error('❌ Error fetching auctions:', error);
    process.exit(1);
  }

  console.log(`📊 Total auctions currently in DB: ${auctions.length}`);
  const now = new Date();
  console.log(`🕒 Evaluation reference time (UTC): ${now.toISOString()}`);

  const expiredIds: string[] = [];
  const activeIds: string[] = [];

  for (const a of auctions) {
    const d3 = a.auction_date_call_3 ? new Date(a.auction_date_call_3) : null;
    const d2 = a.auction_date_call_2 ? new Date(a.auction_date_call_2) : null;
    const d1 = a.auction_date_call_1 ? new Date(a.auction_date_call_1) : null;

    // Check if 3rd call expired, or if only call 2 / call 1 existed and expired, or explicitly terminal
    const is3rdExpired = d3 ? d3 < now : (d2 ? d2 < now : (d1 ? d1 < now : true));
    const isTerminalState =
      a.call_stage === 'passed_call_3' ||
      a.sale_status === 'deserted' ||
      a.sale_status === 'adjudicated_to_creditor' ||
      a.sale_status === 'adjudicated_to_bidder';

    if (is3rdExpired || isTerminalState) {
      expiredIds.push(a.id);
    } else {
      activeIds.push(a.id);
    }
  }

  console.log(`\n🔍 Analysis results:`);
  console.log(`   • Expired auctions to delete (3rd Call expired): ${expiredIds.length}`);
  console.log(`   • Active / upcoming auctions to retain: ${activeIds.length}`);

  if (expiredIds.length === 0) {
    console.log('✅ No expired auctions found. Database is already clean.');
    return;
  }

  // Delete in batches of 100 to avoid payload/URL limits
  const batchSize = 100;
  let totalDeleted = 0;

  console.log(`\n🗑️ Deleting ${expiredIds.length} expired auctions in batches of ${batchSize}...`);

  for (let i = 0; i < expiredIds.length; i += batchSize) {
    const batch = expiredIds.slice(i, i + batchSize);
    
    const { error: delError, count } = await supabase
      .from('auctions')
      .delete({ count: 'exact' })
      .in('id', batch);

    if (delError) {
      console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, delError);
    } else {
      totalDeleted += (count ?? batch.length);
      console.log(`   ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${totalDeleted}/${expiredIds.length})`);
    }
  }

  // Double check remaining count in Supabase
  const { data: remaining, count: remainingCount } = await supabase
    .from('auctions')
    .select('id', { count: 'exact' });

  console.log(`\n🎉 Cleanup complete!`);
  console.log(`   • Total expired auctions deleted: ${totalDeleted}`);
  console.log(`   • Remaining active auctions in database: ${remainingCount ?? remaining?.length}`);
}

deleteExpiredAuctions().catch((err) => {
  console.error('Fatal error during cleanup:', err);
  process.exit(1);
});

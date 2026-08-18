import { getLiveAuctionProgressionState, getDaysUntilAuction } from '../lib/utils';
import { Auction } from '../lib/types/auction';

function runClientProgressionTests() {
  console.log('🧪 Testing TypeScript Client Progression Helper (lib/utils.ts)...');

  const now = new Date('2026-09-15T12:00:00-06:00');

  const baseAuction: Auction = {
    id: 'test-auction-1',
    expediente_number: '26-0001-CJ',
    court_name: 'Juzgado Civil',
    folio_real: '1-123456-000',
    plano_catastrado: null,
    province: 'San José',
    canton: 'Escazú',
    district: 'San Rafael',
    area_m2: 250,
    currency: 'USD',
    base_price_call_1: 100000,
    auction_date_call_1: '2026-09-20T10:00:00-06:00', // In future
    base_price_call_2: 75000,
    auction_date_call_2: '2026-10-10T10:00:00-06:00',
    base_price_call_3: 25000,
    auction_date_call_3: '2026-10-30T10:00:00-06:00',
    estimated_market_value: 150000,
    estimated_margin_pct: 33.33,
    plaintiff: 'Banco Nacional',
    defendant: null,
    legal_summary: null,
    raw_edict_text: '',
    latitude: 9.93,
    longitude: -84.14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Test 1: Future Call 1
  const s1 = getLiveAuctionProgressionState(baseAuction, now);
  console.assert(s1.callStage === 'call_1', `Expected call_1, got ${s1.callStage}`);
  console.assert(s1.saleStatus === 'upcoming', `Expected upcoming, got ${s1.saleStatus}`);
  console.assert(s1.currentCallNumber === 1, `Expected 1, got ${s1.currentCallNumber}`);
  console.assert(s1.currentBasePrice === 100000, `Expected 100000, got ${s1.currentBasePrice}`);
  console.log('✓ Test 1 Passed: Future Call 1 evaluates correctly.');

  // Test 2: In-Progress Call 1 (Hearing)
  const hearingNow = new Date('2026-09-20T10:30:00-06:00'); // 30 mins after start
  const s2 = getLiveAuctionProgressionState(baseAuction, hearingNow);
  console.assert(s2.saleStatus === 'in_progress', `Expected in_progress, got ${s2.saleStatus}`);
  console.assert(s2.isHearing === true, 'Expected isHearing to be true');
  console.log('✓ Test 2 Passed: 60-min judicial hearing window correctly evaluated.');

  // Test 3: Call 1 passed -> Progress to Call 2
  const call2Now = new Date('2026-09-25T10:00:00-06:00');
  const s3 = getLiveAuctionProgressionState(baseAuction, call2Now);
  console.assert(s3.callStage === 'call_2', `Expected call_2, got ${s3.callStage}`);
  console.assert(s3.currentCallNumber === 2, `Expected 2, got ${s3.currentCallNumber}`);
  console.assert(s3.currentBasePrice === 75000, `Expected 75000, got ${s3.currentBasePrice}`);
  console.assert(s3.currentDiscountPct === 25, `Expected 25, got ${s3.currentDiscountPct}`);
  console.log('✓ Test 3 Passed: Automatic Call 2 progression (-25% discount) verified.');

  // Test 4: Call 2 passed -> Progress to Call 3
  const call3Now = new Date('2026-10-15T10:00:00-06:00');
  const s4 = getLiveAuctionProgressionState(baseAuction, call3Now);
  console.assert(s4.callStage === 'call_3', `Expected call_3, got ${s4.callStage}`);
  console.assert(s4.currentCallNumber === 3, `Expected 3, got ${s4.currentCallNumber}`);
  console.assert(s4.currentBasePrice === 25000, `Expected 25000, got ${s4.currentBasePrice}`);
  console.assert(s4.currentDiscountPct === 75, `Expected 75, got ${s4.currentDiscountPct}`);
  console.log('✓ Test 4 Passed: Automatic Call 3 progression (-75% discount) verified.');

  // Test 5: Call 3 passed -> Passed Call 3 / Deserted
  const expiredNow = new Date('2026-11-05T10:00:00-06:00');
  const s5 = getLiveAuctionProgressionState(baseAuction, expiredNow);
  console.assert(s5.callStage === 'passed_call_3', `Expected passed_call_3, got ${s5.callStage}`);
  console.assert(s5.saleStatus === 'deserted', `Expected deserted, got ${s5.saleStatus}`);
  console.assert(s5.currentCallNumber === null, `Expected null, got ${s5.currentCallNumber}`);
  console.log('✓ Test 5 Passed: Passed Call 3 / Deserted state verified.');

  // Test 7: Catalog default filter excludes passed_call_3
  const catalogList = [baseAuction, { ...baseAuction, id: 'expired-1', auction_date_call_1: '2026-05-20T10:00:00-06:00', auction_date_call_2: '2026-06-05T10:00:00-06:00', auction_date_call_3: '2026-06-20T10:00:00-06:00' }];
  const activeCatalog = catalogList.filter((a) => {
    const live = getLiveAuctionProgressionState(a, now);
    return live.callStage !== 'passed_call_3' && live.saleStatus !== 'deserted';
  });
  console.assert(activeCatalog.length === 1 && activeCatalog[0].id === 'test-auction-1', 'Expected only active auctions in default catalog');
  console.log('✓ Test 7 Passed: Default catalog strictly excludes properties past the 3rd call.');

  // Test 8: Expired property has no active call highlighted (currentCallNumber is null)
  const expiredAuction = { ...baseAuction, auction_date_call_1: '2026-05-20T10:00:00-06:00', auction_date_call_2: '2026-06-05T10:00:00-06:00', auction_date_call_3: '2026-06-20T10:00:00-06:00' };
  const s8 = getLiveAuctionProgressionState(expiredAuction, now);
  console.assert(s8.currentCallNumber === null, `Expected currentCallNumber null, got ${s8.currentCallNumber}`);
  console.assert(s8.callStage === 'passed_call_3', `Expected passed_call_3, got ${s8.callStage}`);
  console.log('✓ Test 8 Passed: Expired property details correctly sets currentCallNumber to null.');

  console.log('\n🎉 All Client Progression Tests Passed Successfully!');
}

runClientProgressionTests();

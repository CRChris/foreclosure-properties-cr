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

const SPANISH_WORD_NUMBERS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciséis: 16, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiún: 21,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidós: 22, veintidos: 22,
  veintitrés: 23, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiséis: 26, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, 'treinta y un': 31, 'treinta y uno': 31,
};

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function normalizeSpanishText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseSpanishYear(text: string): number | null {
  if (!text) return null;
  const norm = normalizeSpanishText(text);
  const digitMatch = norm.match(/\b(20[123][0-9])\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  if (norm.includes('dos mil treinta y cinco')) return 2035;
  if (norm.includes('dos mil treinta')) return 2030;
  if (norm.includes('dos mil veintinueve')) return 2029;
  if (norm.includes('dos mil veintiocho')) return 2028;
  if (norm.includes('dos mil veintisiete')) return 2027;
  if (norm.includes('dos mil veintiseis') || norm.includes('dos mil veintiséis')) return 2026;
  if (norm.includes('dos mil veinticinco')) return 2025;
  if (norm.includes('dos mil veinticuatro')) return 2024;
  if (norm.includes('dos mil veintitres') || norm.includes('dos mil veintitrés')) return 2023;
  if (norm.includes('dos mil veintidos') || norm.includes('dos mil veintidós')) return 2022;
  if (norm.includes('dos mil veintiuno') || norm.includes('dos mil veintiun') || norm.includes('dos mil veintiún')) return 2021;
  if (norm.includes('dos mil veinte')) return 2020;
  if (norm.includes('dos mil diecinueve')) return 2019;
  if (norm.includes('dos mil dieciocho')) return 2018;

  return null;
}

export function extractAllCallDatesComprehensive(rawText: string): { date: Date; year: number; raw: string }[] {
  if (!rawText) return [];
  const text = rawText.replace(/\s+/g, ' ');
  const dates: { date: Date; year: number; raw: string }[] = [];

  // 1. Slash/dash numeric dates: e.g. "1/7/2026", "07/04/2026", "11-6-2024", "28/05/2025", "15/01/2025", "7/4/2026"
  const numDateRegex = /(?:del\s+|el\s+|hrs\s+)?\b([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-](20[123][0-9])\b/gi;
  let matchNum: RegExpExecArray | null;
  while ((matchNum = numDateRegex.exec(text)) !== null) {
    const day = parseInt(matchNum[1], 10);
    const month = parseInt(matchNum[2], 10);
    const year = parseInt(matchNum[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2010 && year <= 2040) {
      const d = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
      dates.push({ date: d, year, raw: matchNum[0] });
    }
  }

  // 2. Spanish worded dates: e.g. "28 de mayo del año dos mil veinticinco", "13 de octubre de 2026"
  const textDateRegex = /(?:(?:a\s+las|al\s+ser\s+las|se\s+señalan|señálanse|para\s+tal\s+efecto)\s+[a-záéíóú0-9:\s”\"]+?\s+(?:del|de)\s+)?([0-9]{1,2}|[a-záéíóú\s]+?)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+(?:de|del|de\s+el|del\s+año)\s+(20[123][0-9]|dos\s+mil\s+[a-záéíóú\s]+?)(?=[,.;\n]|\s+con|\s+de\s+no|\s+y\s+de|\s*\(|$)/gi;
  let matchText: RegExpExecArray | null;
  while ((matchText = textDateRegex.exec(text)) !== null) {
    const dayStr = normalizeSpanishText(matchText[1].trim());
    const monthStr = normalizeSpanishText(matchText[2].trim());
    const yearStr = matchText[3].trim();

    let day = parseInt(dayStr, 10);
    if (isNaN(day)) day = SPANISH_WORD_NUMBERS[dayStr] || 0;
    const month = SPANISH_MONTHS[monthStr];
    const year = parseSpanishYear(yearStr);

    if (day >= 1 && day <= 31 && month && year && year >= 2010 && year <= 2040) {
      const d = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
      dates.push({ date: d, year, raw: matchText[0] });
    }
  }

  return dates;
}

async function auditAndPurgeUnverifiable() {
  console.log('🚀 Connecting to Supabase at:', supabaseUrl);

  const { data: auctions, error } = await supabase
    .from('auctions')
    .select('id, expediente_number, folio_real, canton, province, address_description, raw_edict_text, auction_date_call_1, auction_date_call_2, auction_date_call_3');

  if (error || !auctions) {
    console.error('❌ Error querying auctions:', error);
    process.exit(1);
  }

  console.log(`📊 Total auctions currently in DB: ${auctions.length}`);
  const now = new Date('2026-08-20T23:59:59Z'); // Current evaluation reference time

  const toDeleteIds: string[] = [];
  const activeIds: string[] = [];

  for (const a of auctions) {
    const rawText = a.raw_edict_text || '';
    const dates = extractAllCallDatesComprehensive(rawText);

    let isInvalid = false;
    let reason = '';

    if (dates.length === 0) {
      // No verifiable dates in publication text!
      isInvalid = true;
      reason = 'No verifiable dates in publication text';
    } else {
      const maxDate = dates.reduce((max, curr) => (curr.date > max.date ? curr : max)).date;
      if (maxDate < now) {
        isInvalid = true;
        reason = `All call dates in the past (latest: ${maxDate.toISOString().split('T')[0]})`;
      }
    }

    if (isInvalid) {
      toDeleteIds.push(a.id);
      console.log(`❌ Flagged for deletion: [${a.expediente_number}] Folio: ${a.folio_real} | Reason: ${reason}`);
    } else {
      activeIds.push(a.id);
    }
  }

  console.log(`\n🔍 Summary:`);
  console.log(`   • Auctions to delete (expired or unverifiable): ${toDeleteIds.length}`);
  console.log(`   • Genuine upcoming verifiable auctions to retain: ${activeIds.length}`);

  if (toDeleteIds.length === 0) {
    console.log('✅ No unverifiable or expired auctions found.');
    return;
  }

  // Batch delete
  const batchSize = 50;
  let totalDeleted = 0;
  console.log(`\n🗑️ Deleting ${toDeleteIds.length} unverifiable/expired auctions in batches of ${batchSize}...`);

  for (let i = 0; i < toDeleteIds.length; i += batchSize) {
    const batch = toDeleteIds.slice(i, i + batchSize);
    const { error: delError, count } = await supabase
      .from('auctions')
      .delete({ count: 'exact' })
      .in('id', batch);

    if (delError) {
      console.error(`❌ Batch error:`, delError);
    } else {
      totalDeleted += count ?? batch.length;
      console.log(`   ✓ Deleted ${totalDeleted}/${toDeleteIds.length}`);
    }
  }

  const { count: remainingCount } = await supabase
    .from('auctions')
    .select('id', { count: 'exact' });

  console.log(`\n🎉 Purge complete!`);
  console.log(`   • Total deleted: ${totalDeleted}`);
  console.log(`   • Remaining active auctions in DB: ${remainingCount}`);
}

auditAndPurgeUnverifiable().catch(err => {
  console.error('Fatal error during cleanup:', err);
  process.exit(1);
});

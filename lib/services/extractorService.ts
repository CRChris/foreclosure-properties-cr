import { z } from 'zod';
import { parseFolioReal } from './snitGeocodeService';
import { sanitizeLocationName, getProvinceFromFolioOrPlano } from '../utils';

// ==============================================================================
// 1. ZOD STRUCTURED OUTPUT SCHEMAS
// ==============================================================================

export const PropertyAuctionSchema = z.object({
  finca_number: z.string().describe("Normalized finca/matricula (e.g., 6-123456-000)"),
  plano_number: z.string().nullable().describe("Cadastral plano number (e.g., P-0948699-2004)"),
  province: z.string().describe("Province name or number"),
  canton: z.string().nullable(),
  district: z.string().nullable(),
  naturaleza_raw: z.string().describe("The exact verbatim text under NATURALEZA"),
  property_type: z.enum(["lot", "house", "condo", "commercial", "farm", "other"]),
  is_constructed: z.boolean().describe("False if bare land/terreno para construir; True only if existing building/house is explicitly cited"),
  lot_size_m2: z.number().describe("Exact lot size converted to numeric square meters"),
  base_price: z.number().describe("Auction opening base price"),
  currency: z.enum(["CRC", "USD"]),
  auction_date: z.string().nullable().describe("ISO date string for the 1st auction date if available"),
  expediente: z.string().nullable().describe("Judicial case file number (e.g., 22-000123-1234-CJ)")
});

export type PropertyAuction = z.infer<typeof PropertyAuctionSchema>;

export const PropertyAuctionListSchema = z.object({
  properties: z.array(PropertyAuctionSchema).describe("List of structured property records extracted from notice")
});

export type PropertyAuctionList = z.infer<typeof PropertyAuctionListSchema>;

// ==============================================================================
// 2. SYSTEM PROMPT & EXTRACTION INSTRUCTIONS
// ==============================================================================

export const COSTA_RICA_LEGAL_SYSTEM_PROMPT = `You are an expert Costa Rican legal real estate notary parsing "Edictos de Remate Judicial" published in the Boletín Judicial.
Extract structured property data from the provided notice text following these mandatory domain rules:

--- 1. PROPERTY TYPE & CONSTRUCTION STATUS ---
Analyze the exact clause starting with "NATURALEZA:".
- "NATURALEZA: TERRENO PARA CONSTRUIR", "TERRENO DE SOLAR", "TERRENO DE AGRICULTURA", "LOTE PARA VIVIENDA":
  -> MUST be classified as: property_type = "lot" (or "land") and is_constructed = false.
  -> DO NOT classify as constructed just because the phrase contains the word "construir".
- ONLY mark is_constructed = true (and property_type = "house" | "commercial" | "apartment" | "building") if the text explicitly states:
  "CON UNA CASA", "CON CASA DE HABITACION", "CON EDIFICIO", "CON CONSTRUCCIONES", "LOCAL COMERCIAL", "FINCA CON CASA", or "EDIFICACIÓN".
- If the edict lists "TERRENO PARA CONSTRUIR CON UNA CASA...", then property_type = "house" and is_constructed = true.

--- 2. LOT SIZE (AREA IN SQUARE METERS) ---
Analyze the exact clause starting with "MIDE:".
- Court edicts write area in words (e.g., "MIDE: DOSCIENTOS CINCUENTA METROS CUADRADOS" -> 250.00, "TRES MIL QUINIENTOS METROS CON CINCUENTA DECÍMETROS CUADRADOS" -> 3500.50, "UNA HECTÁREA CON TRES MIL METROS" -> 13000.00).
- Convert written Spanish area units strictly into numeric square meters (\`lot_size_m2\` as Float). Note: 1 decímetro cuadrado (dm²) = 0.01 m², 1 hectárea (ha) = 10,000 m².
- If the edict describes multiple fincas/properties in one notice, parse each property block independently and map the exact "MIDE" and "PLANO" to the corresponding "FINCA/MATRÍCULA" block. Do not mix measurements between parcels.

--- 3. IDENTIFIERS ---
- "MATRÍCULA / FINCA": Extract province digit and number (e.g., "PUNTARENAS, matrícula 123456-000" -> "6-123456-000").
- "PLANO": Extract full cadastral survey code (e.g., "P-0948699-2004" or "6-948699-2004").
- "BASE": Extract base auction currency and numeric amount (e.g., "¢25.000.000,00" -> 25000000 CRC).`;

export const GEMINI_JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    finca_number: { type: "STRING", description: "Normalized finca/matricula (e.g., 6-123456-000)" },
    plano_number: { type: "STRING", nullable: true, description: "Cadastral plano number (e.g., P-0948699-2004)" },
    province: { type: "STRING", description: "Province name or number" },
    canton: { type: "STRING", nullable: true },
    district: { type: "STRING", nullable: true },
    naturaleza_raw: { type: "STRING", description: "The exact verbatim text under NATURALEZA" },
    property_type: { 
      type: "STRING", 
      enum: ["lot", "house", "condo", "commercial", "farm", "other"],
      description: "Classified property type"
    },
    is_constructed: { 
      type: "BOOLEAN", 
      description: "False if bare land/terreno para construir; True only if existing building/house is explicitly cited" 
    },
    lot_size_m2: { type: "NUMBER", description: "Exact lot size converted to numeric square meters" },
    base_price: { type: "NUMBER", description: "Auction opening base price" },
    currency: { type: "STRING", enum: ["CRC", "USD"] },
    auction_date: { type: "STRING", nullable: true, description: "ISO date string for the 1st auction date if available" },
    expediente: { type: "STRING", nullable: true, description: "Judicial case file number (e.g., 22-000123-1234-CJ)" }
  },
  required: [
    "finca_number",
    "province",
    "naturaleza_raw",
    "property_type",
    "is_constructed",
    "lot_size_m2",
    "base_price",
    "currency"
  ]
};

// ==============================================================================
// 3. DETERMINISTIC SPANISH WORD & LEGAL PHRASE PARSER (High Precision Fallback)
// ==============================================================================

const PROVINCE_MAP: Record<string, string> = {
  '1': 'San José',
  '2': 'Alajuela',
  '3': 'Cartago',
  '4': 'Heredia',
  '5': 'Guanacaste',
  '6': 'Puntarenas',
  '7': 'Limón',
  'san jose': 'San José',
  'san josé': 'San José',
  'alajuela': 'Alajuela',
  'cartago': 'Cartago',
  'heredia': 'Heredia',
  'guanacaste': 'Guanacaste',
  'puntarenas': 'Puntarenas',
  'limon': 'Limón',
  'limón': 'Limón',
};

const PROVINCE_TO_DIGIT: Record<string, string> = {
  'san jose': '1',
  'san josé': '1',
  'alajuela': '2',
  'cartago': '3',
  'heredia': '4',
  'guanacaste': '5',
  'puntarenas': '6',
  'limon': '7',
  'limón': '7',
};

const SPANISH_WORD_NUMBERS: Record<string, number> = {
  'cero': 0, 'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 'once': 11, 'doce': 12,
  'trece': 13, 'catorce': 14, 'quince': 15, 'dieciséis': 16, 'dieciseis': 16,
  'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20, 'veintiún': 21,
  'veintiun': 21, 'veintiuno': 21, 'veintiuna': 21, 'veintidós': 22, 'veintidos': 22,
  'veintitrés': 23, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25,
  'veintiséis': 26, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
  'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70,
  'ochenta': 80, 'noventa': 90, 'cien': 100, 'ciento': 100, 'doscientos': 200,
  'doscientas': 200, 'trescientos': 300, 'trescientas': 300, 'cuatrocientos': 400,
  'cuatrocientas': 400, 'quinientos': 500, 'quinientas': 500, 'seiscientos': 600,
  'seiscientas': 600, 'setecientos': 700, 'setecientas': 700, 'ochocientos': 800,
  'ochocientas': 800, 'novecientos': 900, 'novecientas': 900,
};

export function normalizeSpanishText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Converts spelled-out Spanish numbers into a floating point number.
 * Correctly handles:
 * - "doscientos ochenta y ocho" -> 288
 * - "tres mil quinientos" -> 3500
 * - "dieciseis millones novecientos mil" -> 16900000
 */
export function parseSpanishYear(text: string): number | null {
  if (!text) return null;
  const norm = normalizeSpanishText(text);
  const digitMatch = norm.match(/\b(20[123][0-9])\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  if (norm.includes('dos mil treinta y cinco')) return 2035;
  if (norm.includes('dos mil treinta')) return 2030;
  if (norm.includes('dos mil veintinueve')) return 2029;
  if (norm.includes('dos mil veintiocho')) return 2028;
  if (norm.includes('dos mil veintisiete')) return 2027;
  if (norm.includes('dos mil veintiséis') || norm.includes('dos mil veintiseis')) return 2026;
  if (norm.includes('dos mil veinticinco')) return 2025;
  if (norm.includes('dos mil veinticuatro')) return 2024;
  if (norm.includes('dos mil veintitrés') || norm.includes('dos mil veintitres')) return 2023;
  if (norm.includes('dos mil veintidós') || norm.includes('dos mil veintidos')) return 2022;
  if (norm.includes('dos mil veintiuno') || norm.includes('dos mil veintiún') || norm.includes('dos mil veintiun')) return 2021;
  if (norm.includes('dos mil veinte')) return 2020;
  if (norm.includes('dos mil diecinueve')) return 2019;
  if (norm.includes('dos mil dieciocho')) return 2018;

  return null;
}

const SPANISH_MONTHS: Record<string, number> = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
  'julio': 7, 'agosto': 8, 'setiembre': 9, 'septiembre': 9, 'octubre': 10,
  'noviembre': 11, 'diciembre': 12,
};

/**
 * Robustly parses a Costa Rican court auction date from edict text into an ISO string.
 * Strictly respects America/Costa_Rica timezone (-06:00).
 */
export function parseSpanishAuctionDate(text: string): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ');

  // 1. Time extraction
  let hour = 14;
  let minute = 30;
  const timeWordMatch = normalized.match(/(?:a\s+las|al\s+ser\s+las|las|se\s+señalan|señálanse)\s+([a-záéíóú0-9]+)\s+horas(?:\s+(?:con|y)\s+([a-záéíóú0-9]+)\s+minutos)?/i);
  if (timeWordMatch) {
    const hWord = normalizeSpanishText(timeWordMatch[1]);
    const mWord = timeWordMatch[2] ? normalizeSpanishText(timeWordMatch[2]) : 'cero';
    hour = /^\d+$/.test(hWord) ? parseInt(hWord, 10) : (SPANISH_WORD_NUMBERS[hWord] ?? 14);
    minute = /^\d+$/.test(mWord) ? parseInt(mWord, 10) : (SPANISH_WORD_NUMBERS[mWord] ?? 0);
  } else {
    const digTime = normalized.match(/\b([0-2]?[0-9]):([0-5][0-9])\b/);
    if (digTime) {
      hour = parseInt(digTime[1], 10);
      minute = parseInt(digTime[2], 10);
    }
  }

  // 2. Date pattern match (e.g. "veinticuatro de noviembre del dos mil veintitrés", "15 de setiembre de 2026")
  const dateRegex = /(?:(?:a\s+las|al\s+ser\s+las|se\s+señalan|señálanse|para\s+tal\s+efecto)\s+[a-záéíóú0-9:\s]+?\s+(?:del|de)\s+)?([0-9]{1,2}|[a-záéíóú\s]+?)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+(?:de|del|de\s+el)\s+(20[123][0-9]|dos\s+mil\s+[a-záéíóú\s]+?)(?=[,.;\n]|\s+con|\s+de\s+no|\s+y\s+de|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = dateRegex.exec(normalized)) !== null) {
    const dayStr = normalizeSpanishText(match[1].trim());
    const monthStr = normalizeSpanishText(match[2].trim());
    const yearStr = match[3].trim();

    let day = parseInt(dayStr, 10);
    if (isNaN(day)) {
      day = SPANISH_WORD_NUMBERS[dayStr] || parseSpanishWordsToNumber(dayStr) || 0;
    }

    const month = SPANISH_MONTHS[monthStr];
    const year = parseSpanishYear(yearStr);

    if (day >= 1 && day <= 31 && month && year && year >= 2015 && year <= 2035) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-06:00`;
    }
  }

  return null;
}

export function parseSpanishWordsToNumber(text: string): number {
  if (!text) return 0;
  const norm = normalizeSpanishText(text);

  // Check for decimals / céntimos / decímetros
  let fractionalPart = 0;
  const decMatch = norm.match(/con\s+([a-z\s,]+?)\s+(?:decimetros|centimos|centavos|centesimas|decimas)/i);
  let mainText = norm;
  if (decMatch) {
    const fracWords = decMatch[1].split(/[\s,-]+/).filter(w => w && w !== 'y' && w !== 'de');
    let fracVal = 0;
    for (const w of fracWords) {
      if (SPANISH_WORD_NUMBERS[w] !== undefined) {
        fracVal += SPANISH_WORD_NUMBERS[w];
      }
    }
    fractionalPart = fracVal / 100;
    mainText = norm.substring(0, decMatch.index).trim();
  }

  const words = mainText.split(/[\s,-]+/).filter(w => (
    w && !['de', 'con', 'y', 'del', 'la', 'el', 'los', 'las', 'metros', 'cuadrados', 'colones', 'dolares', 'exactos', 'netos', 'decimetros'].includes(w)
  ));

  let total = 0;
  let current = 0;

  for (const w of words) {
    if (SPANISH_WORD_NUMBERS[w] !== undefined) {
      current += SPANISH_WORD_NUMBERS[w];
    } else if (w === 'mil') {
      if (current === 0) current = 1;
      current *= 1000;
    } else if (w === 'millon' || w === 'millones') {
      if (current === 0) current = 1;
      total += current * 1000000;
      current = 0;
    } else if (w === 'billon' || w === 'billones') {
      if (current === 0) current = 1;
      total += current * 1000000000000;
      current = 0;
    }
  }

  return total + current + fractionalPart;
}

/**
 * Extracts and converts area clauses starting with "MIDE:" or similar into numeric square meters.
 * Examples:
 * - "MIDE: 1,400.00 metros cuadrados" -> 1400.00
 * - "MIDE: 1.400,00 metros cuadrados" -> 1400.00
 * - "MIDE: DOSCIENTOS CINCUENTA METROS CUADRADOS" -> 250.00
 * - "MIDE: 1687 metros con noventa y seis, decímetros cuadrados" -> 1687.96
 * - "MIDE: TRES MIL QUINIENTOS METROS CON CINCUENTA DECÍMETROS CUADRADOS" -> 3500.50
 * - "UNA HECTÁREA CON TRES MIL METROS" -> 13000.00
 * - "45.000,00 m2" -> 45000.00
 */
export function extractLotSizeM2(text: string): number {
  if (!text) return 0;
  const normalizedText = text.replace(/\s+/g, ' ');

  // Ignore legal procedural mentions of "medida" (e.g. "medida cautelar", "medida de tratamiento", "a medida que")
  const sanitizedText = normalizedText
    .replace(/medida\s+cautelar/gi, ' ')
    .replace(/medida\s+de\s+tratamiento/gi, ' ')
    .replace(/a\s+medida\s+que/gi, ' ');

  // 1. Check for compound hectare + meters pattern (e.g., "UNA HECTÁREA CON TRES MIL METROS", "2 hectáreas con 500 m2")
  const haPlusMetersMatch = sanitizedText.match(/(?:(?:una|[0-9]+(?:\.[0-9]+)?)\s+hect[áa]rea[s]?)\s+con\s+([^.,;\n]+?)(?:metros|m2|m²)/i);
  if (haPlusMetersMatch) {
    const haCountMatch = sanitizedText.match(/(una|[0-9]+(?:\.[0-9]+)?)\s+hect[áa]rea/i);
    let haMultiplier = 1;
    if (haCountMatch) {
      if (haCountMatch[1].toLowerCase() === 'una') haMultiplier = 1;
      else haMultiplier = parseFloat(haCountMatch[1]) || 1;
    }
    const extraMetersWords = haPlusMetersMatch[1].trim();
    const extraNum = /^\d+/.test(extraMetersWords)
      ? parseFloat(extraMetersWords.replace(/\./g, '').replace(',', '.'))
      : parseSpanishWordsToNumber(extraMetersWords);
    return (haMultiplier * 10000) + (extraNum || 0);
  }

  // 2. Check for standalone hectares (e.g. "12 hectáreas", "1.5 ha", "3 hectáreas")
  const haStandaloneMatch = sanitizedText.match(/(?:mide|cabida|superficie|área|medida)[^.,;\n]*?[:\s]+([0-9]+(?:[.,][0-9]+)?|[a-záéíóú\s]+?)\s*(?:hect[áa]reas|ha\b)/i);
  if (haStandaloneMatch) {
    const rawVal = haStandaloneMatch[1].trim();
    const num = /^\d+/.test(rawVal)
      ? parseFloat(rawVal.replace(/\./g, '').replace(',', '.'))
      : parseSpanishWordsToNumber(rawVal);
    if (num > 0) return num * 10000;
  }

  // 3. Formatted numeric measurement under "MIDE" / "CABIDA" / "SUPERFICIE" / "ÁREA"
  // Example: "Mide: 1,400.00 metros cuadrados", "Mide: 2,450.00 m2", "MIDE: 1.400,00 metros", "Mide: 260.00 metros", "MIDE: 6246 METROS CUADRADOS"
  const directNumericMatch = sanitizedText.match(/(?:mide|cabida|superficie|área|medida\s+superficial)[^.,;\n]*?[:\s]+([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?|[0-9]+(?:[.,][0-9]+)?)\s*(?:metros\s+cuadrados|metros|m2|m²|mts|mts2|dm2)\b/i);

  if (directNumericMatch) {
    let clean = directNumericMatch[1].trim();
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = clean.replace(/\./g, '');
      }
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        clean = clean.replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    }
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0 && val < 100000000) {
      // Check if there is an additional decimeters clause
      const decMatch = sanitizedText.match(/(?:mide|cabida)[^;.]+?con\s+([0-9]+|[a-záéíóú\s,]+?)\s*(?:dec[íi]metros)/i);
      if (decMatch) {
        const decVal = /^\d+/.test(decMatch[1].trim())
          ? parseFloat(decMatch[1].trim())
          : parseSpanishWordsToNumber(decMatch[1].trim());
        return val + (decVal * 0.01);
      }
      return val;
    }
  }

  // 4. Extract spelled-out Spanish numbers strictly between "MIDE:" and "METROS CUADRADOS"
  // Example: "MIDE: seis mil doscientos cuarenta y seis METROS CUADRADOS" -> 6246
  // Example: "MIDE: DOSCIENTOS CINCUENTA METROS CUADRADOS" -> 250
  // Example: "MIDE: CUATRO MIL CUATROCIENTOS VEINTIÚN METROS CUADRADOS" -> 4421
  const mideWordsMatch = sanitizedText.match(/(?:mide|cabida|superficie|área|medida\s+superficial)\s*[:\s]*([^;.]+?)\s*(?:metros\s+cuadrados|metros|m2|m²|mts|mts2)\b/i);
  if (mideWordsMatch) {
    const wordsClause = mideWordsMatch[1].trim();
    const areaNum = parseSpanishWordsToNumber(wordsClause);
    if (areaNum > 0 && areaNum < 100000000) {
      // Check if there is a following decimeters clause
      const decMatch = sanitizedText.match(/(?:mide|cabida)[^;.]+?con\s+([0-9]+|[a-záéíóú\s,]+?)\s*(?:dec[íi]metros)/i);
      if (decMatch) {
        const decVal = /^\d+/.test(decMatch[1].trim())
          ? parseFloat(decMatch[1].trim())
          : parseSpanishWordsToNumber(decMatch[1].trim());
        return areaNum + (decVal * 0.01);
      }
      return areaNum;
    }
  }

  // 5. Fallback full-text spelled-out area parser bounded strictly to units
  const fullTextWordsMatch = sanitizedText.match(/(?:mide\s+|cabida\s+de\s+|superficie\s+de\s+)([a-záéíóú\s,]+?)(?:metros\s+cuadrados|metros|m2|m²)\b/i);
  if (fullTextWordsMatch) {
    const areaNum = parseSpanishWordsToNumber(fullTextWordsMatch[1].trim());
    if (areaNum > 0 && areaNum < 100000000) return areaNum;
  }

  return 0;
}

/**
 * Disambiguates Costa Rican judicial NATURALEZA and classifies property_type & is_constructed.
 * Strict rules:
 * - "NATURALEZA: TERRENO PARA CONSTRUIR", "TERRENO DE SOLAR", "TERRENO DE AGRICULTURA", "LOTE PARA VIVIENDA", "FINCA CON VISTA"
 *   -> property_type = "lot" (or "farm") and is_constructed = false.
 *   -> NEVER mark constructed just because of "construir" or "residencial" in zoning.
 * - Only mark is_constructed = true (and property_type = "house" | "commercial" | "condo") if explicitly states:
 *   "CON UNA CASA", "CON CASA DE HABITACION", "CON EDIFICIO", "CON CONSTRUCCIONES", "LOCAL COMERCIAL", "FINCA CON CASA", or "EDIFICACIÓN".
 * - "TERRENO PARA CONSTRUIR CON UNA CASA..." -> property_type = "house" and is_constructed = true.
 */
export function classifyPropertyNaturaleza(naturalezaRaw: string, fullEdictText?: string): {
  property_type: "lot" | "house" | "condo" | "commercial" | "farm" | "other";
  is_constructed: boolean;
  naturaleza_raw: string;
} {
  const raw = naturalezaRaw.trim();
  const fullContext = `${raw} ${fullEdictText || ''}`;
  const norm = normalizeSpanishText(fullContext);
  const normNat = normalizeSpanishText(raw);

  // 1. Explicit construction presence markers
  const explicitConstructionPatterns = [
    /\bcon\s+(?:una\s+|dos\s+|tres\s+)?casa\b/i,
    /\bcon\s+casa\s+de\s+habitaci[oó]n\b/i,
    /\bcon\s+(?:un\s+)?edificio\b/i,
    /\bcon\s+construcci[oó]n(?:es)?\b/i,
    /\bcon\s+edificaci[oó]n(?:es)?\b/i,
    /\bcon\s+mejoras\b/i,
    /\bfinca\s+con\s+casa\b/i,
    /\bedificaci[oó]n\s+de\b/i,
    /\bedificio\s+comercial\b/i,
    /\blocal\s+comercial\b/i,
    /\bnave\s+industrial\b/i,
    /\bbodega(?:s)?\b/i,
  ];

  const hasExplicitConstruction = explicitConstructionPatterns.some(p => p.test(normNat) || p.test(norm));

  // 2. Condominium / Filial check
  const isCondo = (
    normNat.includes('condominio') ||
    normNat.includes('finca filial') ||
    normNat.includes('filial') ||
    normNat.includes('apartamento') ||
    normNat.includes('propiedad horizontal')
  );

  // 3. Commercial check
  const isCommercial = (
    normNat.includes('local comercial') ||
    normNat.includes('oficinas corporativas') ||
    normNat.includes('oficentro') ||
    normNat.includes('bodega') ||
    normNat.includes('nave industrial') ||
    (normNat.includes('comercial') && !normNat.includes('uso de suelo') && !normNat.includes('comercial-residencial'))
  );

  // 4. Agricultural / Farm check
  const isFarm = (
    normNat.includes('agricultura') ||
    normNat.includes('agricola') ||
    normNat.includes('ganader') ||
    normNat.includes('pastos') ||
    normNat.includes('cultivo') ||
    normNat.includes('repastos') ||
    normNat.includes('cafetal') ||
    (normNat.includes('finca') && !normNat.includes('vista') && !normNat.includes('filial') && !hasExplicitConstruction)
  );

  // 5. Bare lot / Future-intent land phrases
  const isBareLotPhrase = (
    normNat.includes('terreno para construir') ||
    normNat.includes('lote para construir') ||
    normNat.includes('terreno de solar') ||
    normNat.includes('lote para vivienda') ||
    normNat.includes('terreno apto para') ||
    normNat.includes('solar para construir') ||
    normNat.includes('terreno sin construir') ||
    normNat.includes('finca con vista') ||
    normNat.includes('solar') ||
    normNat.includes('lote') ||
    normNat.includes('terreno')
  );

  // Resolution
  if (hasExplicitConstruction) {
    if (isCondo) {
      return { property_type: 'condo', is_constructed: true, naturaleza_raw: raw };
    }
    if (isCommercial) {
      return { property_type: 'commercial', is_constructed: true, naturaleza_raw: raw };
    }
    if (isFarm) {
      return { property_type: 'farm', is_constructed: true, naturaleza_raw: raw };
    }
    return { property_type: 'house', is_constructed: true, naturaleza_raw: raw };
  }

  if (isCondo) {
    // If it's a condo filial without explicit mention of unbuilt lot, standard is condo
    const isBareCondoLot = normNat.includes('lote') || normNat.includes('terreno para construir');
    return { 
      property_type: isBareCondoLot ? 'lot' : 'condo', 
      is_constructed: !isBareCondoLot, 
      naturaleza_raw: raw 
    };
  }

  if (isCommercial) {
    return { property_type: 'commercial', is_constructed: true, naturaleza_raw: raw };
  }

  if (isFarm) {
    return { property_type: 'farm', is_constructed: false, naturaleza_raw: raw };
  }

  if (isBareLotPhrase) {
    return { property_type: 'lot', is_constructed: false, naturaleza_raw: raw };
  }

  return { property_type: 'lot', is_constructed: false, naturaleza_raw: raw };
}

/**
 * Extracts verbatim NATURALEZA clause from edict text.
 */
export function extractVerbatimNaturaleza(text: string): string {
  if (!text) return '';
  const match = text.match(/(?:naturaleza\s*[:\s]+|la\s+cual\s+es\s+|terreno\s+de\s+|finca\s+que\s+es\s+)([^\.\n;]+)/i);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * Deterministic full-edict parser conforming to PropertyAuctionSchema
 */
export function extractPropertyDeterministic(edictText: string): PropertyAuction | null {
  if (!edictText || edictText.trim().length < 50) return null;

  const normalizedText = edictText.replace(/\s+/g, ' ');
  const norm = normalizeSpanishText(normalizedText);

  // 1. Folio Real / Finca
  const folioMatch = normalizedText.match(/(?:matr[íi]cula\s+(?:de\s+folio\s+real\s+)?(?:n[úu]mero\s+)?|finca\s+(?:filial\s+(?:\d+\s+)?)?(?:n[úu]mero\s+|matr[íi]cula\s+)?|folio\s+real\s*(?:matr[íi]cula\s+)?(?:n[úu]mero\s+|:)?\s*)([0-9]{1,7}(?:-[A-Za-z0-9]+){1,3}|[0-9]-[0-9]+-[0-9]+|[0-9]{5,8}-[0-9]{3}|[0-9]{5,8})/i)
    || normalizedText.match(/\b([1-7]-[0-9]{5,7}-[0-9]{3})\b/i);
  
  let fincaNumber = folioMatch ? folioMatch[1].trim() : '1-000000-000';

  // 2. Province
  let province = 'San José';
  const provExplicitMatch = normalizedText.match(/(?:provincia\s+de|partido\s+de)\s+([A-Za-zÁÉÍÓÚáéíóú]+)/i);
  if (provExplicitMatch) {
    const pKey = normalizeSpanishText(provExplicitMatch[1].trim());
    if (PROVINCE_MAP[pKey]) {
      province = PROVINCE_MAP[pKey];
    }
  } else if (fincaNumber.includes('-') && PROVINCE_MAP[fincaNumber[0]]) {
    province = PROVINCE_MAP[fincaNumber[0]];
  } else {
    for (const [pName, pStandard] of Object.entries(PROVINCE_MAP)) {
      if (norm.includes(`partido de ${pName}`) || norm.includes(`provincia de ${pName}`) || norm.includes(pName)) {
        province = pStandard;
        break;
      }
    }
  }

  // Standardize finca format (e.g. 6-123456-000) and derive ground-truth province
  const normFolio = parseFolioReal(fincaNumber, province);
  if (normFolio) {
    fincaNumber = normFolio.formattedFolio;
    province = normFolio.provinciaNombre;
  } else {
    province = getProvinceFromFolioOrPlano(fincaNumber, null, province);
    const pDigit = PROVINCE_TO_DIGIT[normalizeSpanishText(province)] || '1';
    fincaNumber = `${pDigit}-${fincaNumber.replace(/\D/g, '') || '000000'}-000`;
  }

  // 3. Plano Catastrado
  const planoMatch = normalizedText.match(/(?:plano\s*(?:catastro\s+|catastrado\s+)?(?:n[úu]mero\s*[:\.]?|[:\.]\s*|\s+)?|catastro\s*n[úu]mero\s*[:\.]?\s*)([A-Z0-9]{1,4}-[0-9]+-[0-9]{2,4}|[A-Z0-9]+-[0-9]+)/i);
  const planoNumber = planoMatch ? planoMatch[1].trim() : null;

  // 4. Canton & District
  const cantonMatch = normalizedText.match(/cant[oó]n\s+(?:(?:n[úu]mero\s+|n[ºo]\.?\s*)?\d+\s*[-–]?\s*)?([A-Za-zÁÉÍÓÚáéíóú\s]+?)(?:,|\.|\s+distrito|\s+de\s+|\s+cuya|\s+mide)/i);
  let canton = sanitizeLocationName(cantonMatch ? cantonMatch[1] : null) || null;

  const distMatch = normalizedText.match(/distrito\s+(?:(?:n[úu]mero\s+|n[ºo]\.?\s*)?\d+\s*[-–]?\s*)?([A-Za-zÁÉÍÓÚáéíóú\s]+?)(?:,|\.|\s+cant[oó]n|\s+de\s+la|\s+cuya|\s+mide)/i);
  let district = sanitizeLocationName(distMatch ? distMatch[1] : null) || null;

  // Keyword-assisted resolution for specific provinces
  if (province === 'Puntarenas') {
    if (norm.includes('jaco') || norm.includes('playa jaco')) {
      district = district || 'Jacó';
      canton = canton || 'Garabito';
    } else if (norm.includes('herradura')) {
      district = district || 'Herradura';
      canton = canton || 'Garabito';
    } else if (norm.includes('tarcoles')) {
      district = district || 'Tárcoles';
      canton = canton || 'Garabito';
    } else if (norm.includes('cobano') || norm.includes('santa teresa') || norm.includes('malpais') || norm.includes('montezuma') || norm.includes('tambor')) {
      district = district || 'Cóbano';
      canton = canton || 'Puntarenas';
    } else if (norm.includes('paquera')) {
      district = district || 'Paquera';
      canton = canton || 'Puntarenas';
    } else if (norm.includes('lepanto') || norm.includes('jicaral')) {
      district = district || 'Lepanto';
      canton = canton || 'Puntarenas';
    }
  }

  // 5. Verbatim Naturaleza & Classification
  const naturalezaRaw = extractVerbatimNaturaleza(normalizedText) || `Inmueble situado en ${province}`;
  const { property_type, is_constructed } = classifyPropertyNaturaleza(naturalezaRaw, normalizedText);

  // 6. Lot Size in m2
  const lotSizeM2 = extractLotSizeM2(normalizedText) || 0;

  // 7. Base Price & Currency
  let currency: "CRC" | "USD" = "CRC";
  if (norm.includes('dolar') || norm.includes('usd') || edictText.includes('$') || norm.includes('estados unidos')) {
    currency = "USD";
  }

  let basePrice = 0;
  const baseMatch = normalizedText.match(/(?:con\s+la\s+base\s+de|base\s+de|precio\s+base\s+de|base\s*:)\s*([^;\n]+?)(?=\.\s*(?:de\s+no|para\s+el|se\s+remata|en\s+el\s+primer|[A-Z][a-z]+:)|;|\.\s*$|$)/i);
  if (baseMatch) {
    const rawPriceStr = baseMatch[1].trim();
    const numMatch = rawPriceStr.match(/([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2})?|[0-9]+(?:[\.,][0-9]+)?)/);
    if (numMatch) {
      let clean = numMatch[1].trim();
      const dotParts = clean.split('.');
      if (dotParts.length === 3 && dotParts[2].length === 2 && dotParts[1].length === 3) {
        clean = dotParts[0] + dotParts[1] + '.' + dotParts[2];
      } else if (clean.includes(',') && clean.includes('.')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
          clean = clean.replace(/,/g, '');
        }
      } else if (clean.includes('.')) {
        if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length === 3)) {
          clean = clean.replace(/\./g, '');
        }
      } else if (clean.includes(',')) {
        const commaParts = clean.split(',');
        if (commaParts.length === 2 && commaParts[1].length <= 2) {
          clean = clean.replace(',', '.');
        } else {
          clean = clean.replace(/,/g, '');
        }
      }
      basePrice = parseFloat(clean) || 0;
    } else {
      basePrice = parseSpanishWordsToNumber(rawPriceStr);
    }
  }

  // 8. Expediente Docket Number
  const expMatch = normalizedText.match(/\b([0-9]{2}-[0-9]{4,8}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C|PE|FA)[A-Za-z0-9]*)\b/i)
    || normalizedText.match(/(?:EXP(?:EDIENTE)?|NO\.\s*EXP\.?)\s*[:\.\s]*([0-9]{2}-[0-9]{4,8}-[0-9]{3,4}-[A-Za-z0-9]+)/i)
    || normalizedText.match(/\(\s*(IN[0-9]{8,14})\s*\)/i);
  const expediente = expMatch ? expMatch[1].trim() : null;

  // 9. Auction Date (Call 1)
  let auctionDate: string | null = parseSpanishAuctionDate(normalizedText);

  const result: PropertyAuction = {
    finca_number: fincaNumber,
    plano_number: planoNumber,
    province,
    canton,
    district,
    naturaleza_raw: naturalezaRaw,
    property_type,
    is_constructed,
    lot_size_m2: lotSizeM2,
    base_price: basePrice,
    currency,
    auction_date: auctionDate,
    expediente
  };

  const parsed = PropertyAuctionSchema.safeParse(result);
  return parsed.success ? parsed.data : result;
}

// ==============================================================================
// 4. GEMINI FLASH EXTRACTION INTEGRATION
// ==============================================================================

export async function extractPropertyWithGemini(
  edictText: string,
  apiKey?: string
): Promise<PropertyAuction> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!key) {
    const fallback = extractPropertyDeterministic(edictText);
    if (!fallback) throw new Error("Could not extract property data using deterministic parser.");
    return fallback;
  }

  // Model candidates prioritizing Gemini Flash models
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${COSTA_RICA_LEGAL_SYSTEM_PROMPT}\n\nEDICT TEXT:\n${edictText}`
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: GEMINI_JSON_SCHEMA,
          temperature: 0.1,
        }
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        continue;
      }

      const resJson = await response.json();
      const rawJsonText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJsonText) continue;

      const parsedObj = JSON.parse(rawJsonText);
      const validated = PropertyAuctionSchema.parse(parsedObj);
      return validated;
    } catch {
      continue;
    }
  }

  // Fallback if all Gemini models fail
  const fallback = extractPropertyDeterministic(edictText);
  if (!fallback) throw new Error("Extraction failed on all Gemini models and deterministic fallback.");
  return fallback;
}

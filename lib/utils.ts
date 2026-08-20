import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Auction, 
  CostaRicaProvince,
  Currency, 
  InvestorMetrics, 
  CostaRicaClosingCosts, 
  PropertyType, 
  MortgagePriority,
  AuctionCallStage,
  AuctionSaleStatus,
  DealAlphaRating,
  DealAlphaGrade,
  TitleSecurityRating,
  TitleSecurityTier,
} from './types/auction';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse any Costa Rican judicial foreclosure date string into a Date object.
 * Guarantees interpretation in America/Costa_Rica timezone (UTC-6) if no explicit offset is present.
 */
export function parseCostaRicaDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // If string already includes timezone offset (+HH:MM, -HH:MM, or Z), parse directly
  if (/[zZ]|[+-]\d{2}(:?\d{2})?$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // If format is YYYY-MM-DD HH:mm(:ss) or YYYY-MM-DDTHH:mm(:ss), append Costa Rica timezone (-06:00)
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
    const iso = trimmed.replace(' ', 'T') + '-06:00';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  // If date-only format YYYY-MM-DD, set to 08:00 AM Costa Rica Time (morning court opening hour)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = `${trimmed}T08:00:00-06:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Dynamic Call Resolution Logic (America/Costa_Rica timezone):
 * Compares current timestamp against first_call_date, second_call_date, and third_call_date.
 * 
 * Rules:
 * 1. If now <= first_call_date:
 *    - Active Call = 1 (1st Call box marked as Active Call)
 * 2. If now > first_call_date AND now <= second_call_date:
 *    - Active Call = 2 (2nd Call box marked as Active Call, 1st marked as past)
 * 3. If now > second_call_date AND now <= third_call_date:
 *    - Active Call = 3 (3rd Call box marked as Active Call, 1st & 2nd marked as past)
 * 4. If now > third_call_date:
 *    - Active Call = None / Expired (all 3 calls concluded/deserted)
 */
export function getLiveAuctionProgressionState(
  auction: Auction,
  customNow?: Date
): {
  callStage: AuctionCallStage;
  saleStatus: AuctionSaleStatus;
  currentCallNumber: 1 | 2 | 3 | null;
  currentBasePrice: number;
  currentAuctionDate: string | null;
  currentDiscountPct: number;
  isHearing: boolean;
} {
  // If database already locked terminal judicial state, preserve it
  if (
    auction.sale_status &&
    ['suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled'].includes(auction.sale_status)
  ) {
    return {
      callStage: auction.call_stage || 'passed_call_3',
      saleStatus: auction.sale_status,
      currentCallNumber: auction.current_call_number ?? null,
      currentBasePrice: auction.current_base_price || auction.base_price_call_1,
      currentAuctionDate: auction.current_auction_date || auction.auction_date_call_1,
      currentDiscountPct: auction.current_discount_pct || 0,
      isHearing: false,
    };
  }

  const nowMs = customNow ? customNow.getTime() : Date.now();
  const d1Date = parseCostaRicaDate(auction.auction_date_call_1);
  const d1Ms = d1Date ? d1Date.getTime() : nowMs + (14 * 24 * 60 * 60 * 1000);
  
  // 14 days interval statutory default if calls 2/3 are not set in docket
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const SIXTY_MINS_MS = 60 * 60 * 1000;

  const d2Date = parseCostaRicaDate(auction.auction_date_call_2);
  const d2Ms = d2Date ? d2Date.getTime() : d1Ms + FOURTEEN_DAYS_MS;

  const d3Date = parseCostaRicaDate(auction.auction_date_call_3);
  const d3Ms = d3Date ? d3Date.getTime() : d2Ms + FOURTEEN_DAYS_MS;

  const p1 = auction.base_price_call_1;
  const p2 = auction.base_price_call_2 || Math.round(p1 * 0.75);
  const p3 = auction.base_price_call_3 || Math.round(p1 * 0.25);

  const d2ISO = auction.auction_date_call_2 || new Date(d2Ms).toISOString();
  const d3ISO = auction.auction_date_call_3 || new Date(d3Ms).toISOString();

  // Rule 1: If now <= first_call_date -> Active Call = 1
  if (nowMs <= d1Ms) {
    const isHearing = nowMs >= d1Ms - (10 * 60 * 1000) && nowMs <= d1Ms + SIXTY_MINS_MS;
    return {
      callStage: 'call_1',
      saleStatus: isHearing ? 'in_progress' : 'upcoming',
      currentCallNumber: 1,
      currentBasePrice: p1,
      currentAuctionDate: auction.auction_date_call_1,
      currentDiscountPct: 0,
      isHearing,
    };
  }

  // Rule 2: If now > first_call_date AND now <= second_call_date -> Active Call = 2
  if (nowMs > d1Ms && nowMs <= d2Ms) {
    const isHearing = nowMs >= d2Ms - (10 * 60 * 1000) && nowMs <= d2Ms + SIXTY_MINS_MS;
    return {
      callStage: 'call_2',
      saleStatus: isHearing ? 'in_progress' : 'upcoming',
      currentCallNumber: 2,
      currentBasePrice: p2,
      currentAuctionDate: d2ISO,
      currentDiscountPct: 25,
      isHearing,
    };
  }

  // Rule 3: If now > second_call_date AND now <= third_call_date -> Active Call = 3
  if (nowMs > d2Ms && nowMs <= d3Ms) {
    const isHearing = nowMs >= d3Ms - (10 * 60 * 1000) && nowMs <= d3Ms + SIXTY_MINS_MS;
    return {
      callStage: 'call_3',
      saleStatus: isHearing ? 'in_progress' : 'upcoming',
      currentCallNumber: 3,
      currentBasePrice: p3,
      currentAuctionDate: d3ISO,
      currentDiscountPct: 75,
      isHearing,
    };
  }

  // Rule 4: If now > third_call_date -> Active Call = None / Expired
  return {
    callStage: 'passed_call_3',
    saleStatus: 'deserted',
    currentCallNumber: null,
    currentBasePrice: p3,
    currentAuctionDate: d3ISO,
    currentDiscountPct: 75,
    isHearing: false,
  };
}


/**
 * Format currency with proper symbols (CRC ₡ or USD $)
 */
export function formatCurrency(amount: number | null | undefined, currency: Currency = 'USD'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  if (currency === 'CRC') {
    return `₡${new Intl.NumberFormat('es-CR', {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/**
 * Format area in square meters and hectares if large
 */
export function formatArea(m2: number): string {
  if (m2 >= 10000) {
    const ha = (m2 / 10000).toFixed(2);
    return `${ha} ha (${new Intl.NumberFormat('es-CR').format(m2)} m²)`;
  }
  return `${new Intl.NumberFormat('es-CR').format(m2)} m²`;
}

/**
 * Calculate Costa Rican legal property transfer closing costs
 * Standard CR breakdown:
 * - 1.5% Real Estate Transfer Tax (Ley 7088)
 * - 0.8% - 1.0% Legal / Notary Bar Association Fees (Decreto de Aranceles)
 * - 0.5% National Registry & Fiscal Stamps (Timbres Fiscales, Agrario, Colegio Abogados)
 * Total estimated: ~2.8% of base price
 */
export function calculateClosingCosts(basePrice: number): CostaRicaClosingCosts {
  const transferTax = basePrice * 0.015;
  const notaryLegalFees = basePrice * 0.008;
  const registryStamps = basePrice * 0.005;
  const totalEstimatedClosingCosts = transferTax + notaryLegalFees + registryStamps;

  return {
    transferTax,
    notaryLegalFees,
    registryStamps,
    totalEstimatedClosingCosts,
  };
}

/**
 * Calculate Investor Metrics for a given call stage
 */
export function calculateInvestorMetrics(auction: Auction, callNumber?: 1 | 2 | 3): InvestorMetrics {
  const live = getLiveAuctionProgressionState(auction);
  const targetCall = callNumber || live.currentCallNumber || 1;

  let currentBasePrice = auction.base_price_call_1;
  if (targetCall === 2) {
    currentBasePrice = auction.base_price_call_2 || Math.round(auction.base_price_call_1 * 0.75);
  } else if (targetCall === 3) {
    currentBasePrice = auction.base_price_call_3 || Math.round(auction.base_price_call_1 * 0.25);
  }

  const estimatedMarketValue = auction.estimated_market_value || currentBasePrice * 1.35;
  const grossMarginAmount = Math.max(0, estimatedMarketValue - currentBasePrice);
  const grossMarginPct = estimatedMarketValue > 0 
    ? (grossMarginAmount / estimatedMarketValue) * 100 
    : 0;

  const pricePerM2 = auction.area_m2 > 0 ? currentBasePrice / auction.area_m2 : 0;
  const marketPricePerM2 = auction.area_m2 > 0 ? estimatedMarketValue / auction.area_m2 : 0;

  const closingCosts = calculateClosingCosts(currentBasePrice);
  const totalAcquisitionCost = currentBasePrice + closingCosts.totalEstimatedClosingCosts;
  const netEstimatedProfit = Math.max(0, estimatedMarketValue - totalAcquisitionCost);
  const netROI = totalAcquisitionCost > 0 
    ? (netEstimatedProfit / totalAcquisitionCost) * 100 
    : 0;

  return {
    currentBasePrice,
    estimatedMarketValue,
    grossMarginAmount,
    grossMarginPct,
    pricePerM2,
    marketPricePerM2,
    closingCosts,
    totalAcquisitionCost,
    netEstimatedProfit,
    netROI,
  };
}

/**
 * Format Date in localized format (Spanish / English)
 */
export function formatDateCR(dateString: string, lang: string = 'es'): string {
  try {
    const date = parseCostaRicaDate(dateString) ?? new Date(dateString);
    const locale = lang === 'en' ? 'en-US' : 'es-CR';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format Date Added for property dossier & cadastral details (e.g. August 18, 2026 / 18 de agosto de 2026)
 */
export function formatDateAdded(dateString?: string | null, lang: string = 'es'): string {
  if (!dateString) return lang === 'en' ? 'Recently published' : 'Publicación reciente';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const locale = lang === 'en' ? 'en-US' : 'es-CR';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Check if a property was added today (strictly matching the calendar date the property was added in Costa Rica time UTC-6).
 * "New Today" only remains tagged for the day that the property was added.
 */
export function isPropertyNewToday(createdAt?: string | null, customNow?: Date): boolean {
  if (!createdAt) return false;
  try {
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return false;
    
    // Format both dates in Costa Rica timezone (America/Costa_Rica, UTC-6) as YYYY-MM-DD
    const crFormatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const createdDayCR = crFormatter.format(created);
    const nowDayCR = crFormatter.format(customNow || new Date());
    
    return createdDayCR === nowDayCR;
  } catch {
    return false;
  }
}

/**
 * Get remaining days until auction with bilingual labels and 60-min hearing window detection
 */
export function getDaysUntilAuction(
  dateString?: string | null, 
  lang: string = 'es'
): { days: number; isPast: boolean; isHearing: boolean; label: string } {
  if (!dateString) {
    return { days: 0, isPast: false, isHearing: false, label: lang === 'en' ? 'Date pending' : 'Fecha pendiente' };
  }
  try {
    const parsedDate = parseCostaRicaDate(dateString);
    if (!parsedDate) {
      return { days: 0, isPast: false, isHearing: false, label: lang === 'en' ? 'Date pending' : 'Fecha pendiente' };
    }
    const target = parsedDate.getTime();
    const now = Date.now();
    const SIXTY_MINS_MS = 60 * 60 * 1000;

    // Check if within the 60-minute active hearing window
    if (now >= target && now <= target + SIXTY_MINS_MS) {
      return {
        days: 0,
        isPast: false,
        isHearing: true,
        label: lang === 'en' ? 'In Judicial Hearing' : 'En Audiencia Judicial',
      };
    }

    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (lang === 'en') {
      if (diffMs < 0) {
        const pastDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        return { days: pastDays, isPast: true, isHearing: false, label: `Concluded (${pastDays}d ago)` };
      }
      if (diffDays === 0) {
        return { days: 0, isPast: false, isHearing: false, label: 'Today!' };
      }
      if (diffDays === 1) {
        return { days: 1, isPast: false, isHearing: false, label: 'Tomorrow' };
      }
      return { days: diffDays, isPast: false, isHearing: false, label: `In ${diffDays} days` };
    }

    if (diffMs < 0) {
      const pastDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return { days: pastDays, isPast: true, isHearing: false, label: `Concluido (hace ${pastDays}d)` };
    }
    if (diffDays === 0) {
      return { days: 0, isPast: false, isHearing: false, label: '¡Hoy mismo!' };
    }
    if (diffDays === 1) {
      return { days: 1, isPast: false, isHearing: false, label: 'Mañana' };
    }
    return { days: diffDays, isPast: false, isHearing: false, label: `En ${diffDays} días` };
  } catch {
    return { days: 0, isPast: false, isHearing: false, label: lang === 'en' ? 'Date pending' : 'Fecha pendiente' };
  }
}

/**
 * Decode Costa Rica Folio Real to readable string
 * e.g. '6-189342-000' -> Province 6 (Puntarenas), Finca 189342, Sublot 000
 * Handles legacy '117243-000-000' or single-dash formats safely.
 */
export function parseFolioReal(folio: string, fallbackProvinceCode: number = 1): { provinceCode: number; fincaNumber: string; sublot: string; formattedFolio: string } {
  if (!folio) {
    return { provinceCode: fallbackProvinceCode, fincaNumber: '', sublot: '000', formattedFolio: '' };
  }
  const clean = folio.trim().replace(/^(?:FOLIO\s*REAL|FINCA|MATR[IÍ]CULA)[:\s]*/i, '').replace(/[\(\)]/g, '');
  const parts = clean.split(/[-/]/).map(p => p.trim()).filter(Boolean);

  let prov = fallbackProvinceCode;
  let finca = '';
  let sublot = '000';

  if (parts.length === 1) {
    finca = parts[0].replace(/^0+/, '');
  } else if (parts.length === 2) {
    if (/^[1-7]$/.test(parts[0])) {
      prov = parseInt(parts[0], 10);
      finca = parts[1].replace(/^0+/, '');
    } else {
      finca = parts[0].replace(/^0+/, '');
      sublot = parts[1];
    }
  } else if (parts.length >= 3) {
    if (/^[1-7]$/.test(parts[0])) {
      prov = parseInt(parts[0], 10);
      finca = parts[1].replace(/^0+/, '');
      sublot = parts[2] || '000';
    } else {
      finca = parts[0].replace(/^0+/, '');
      sublot = parts[1] || '000';
    }
  }

  sublot = sublot.replace(/[^A-Za-z0-9]/g, '');
  if (!sublot || sublot === '0' || sublot === '00' || sublot === 'DERECHO000' || sublot === 'DERECHO') {
    sublot = '000';
  } else if (/^\d+$/.test(sublot)) {
    sublot = sublot.padStart(3, '0').slice(-3);
  }

  const cleanFinca = finca.replace(/\D/g, '') || finca;
  const formattedFolio = `${prov}-${cleanFinca}-${sublot}`;

  return {
    provinceCode: prov,
    fincaNumber: cleanFinca,
    sublot,
    formattedFolio,
  };
}

/**
 * Intelligent deterministic inference of property characteristics, construction status,
 * frontage, condominium status, and mortgage priority using all available resources
 * (registry nature, edict announcement, legal summary, and physical description).
 */
export function detectPropertyCharacteristics(data: {
  address_description?: string | null;
  legal_summary?: string | null;
  raw_edict_text?: string | null;
  naturaleza_raw?: string | null;
  property_type?: PropertyType;
  property_category?: string;
  has_construction?: boolean;
  has_public_road_frontage?: boolean;
  is_condominio?: boolean;
  mortgage_priority?: MortgagePriority;
}) {
  // Combine all descriptive text sources while avoiding court name noise (e.g. "Juzgado Civil y Agrario")
  const extractedNat = (data.raw_edict_text?.match(/(?:naturaleza\s*[:\s]+|la\s+cual\s+es\s+|terreno\s+de\s+|finca\s+que\s+es\s+)([^.]+?)(?=\.\s*(?:situada|ubicada|mide|linderos|plano)|situada|ubicada|mide|linderos|plano|\.|$)/i) || [])[1] || '';
  const natRaw = (data.naturaleza_raw || extractedNat || '').toLowerCase();
  const text = `${data.naturaleza_raw || ''} ${data.address_description || ''} ${data.legal_summary || ''} ${data.raw_edict_text || ''}`.toLowerCase();

  // 1. Explicit construction presence markers (Costa Rica Legal Semantics)
  // Must describe an existing built structure on the parcel
  const hasExplicitBuiltConstruction = (
    text.includes('con una casa') ||
    text.includes('con casa de habitacion') ||
    text.includes('con casa de habitación') ||
    text.includes('con casa') ||
    text.includes('con edificio') ||
    text.includes('con construcciones') ||
    text.includes('con edificacion') ||
    text.includes('con edificación') ||
    text.includes('con mejoras') ||
    text.includes('finca con casa') ||
    text.includes('local comercial') ||
    text.includes('edificio comercial') ||
    text.includes('nave industrial') ||
    text.includes('bodega') ||
    text.includes('apartamento') ||
    text.includes('penthouse') ||
    text.includes('dormitorios en suite') ||
    text.includes('habitaciones') ||
    text.includes('piscina privada')
  );

  // 2. Bare land / future-intent phrases (MUST be vacant lot: hasConstruction = false)
  const isBareLandPhrase = (
    natRaw.includes('terreno para construir') ||
    natRaw.includes('lote para construir') ||
    natRaw.includes('terreno de solar') ||
    natRaw.includes('lote para vivienda') ||
    natRaw.includes('terreno de agricultura') ||
    natRaw.includes('terreno apto para') ||
    natRaw.includes('terreno sin construir') ||
    natRaw.includes('lote sin edificar') ||
    natRaw.includes('solar sin edificar') ||
    natRaw.includes('solar') ||
    (natRaw.includes('lote condominal') && !hasExplicitBuiltConstruction) ||
    (natRaw.includes('lote') && !hasExplicitBuiltConstruction) ||
    (natRaw.includes('terreno') && !hasExplicitBuiltConstruction)
  );

  // 3. High-confidence specific signal detectors
  const isCondoSignal = (
    text.includes('condominio') ||
    text.includes('condominal') ||
    text.includes('finca filial') ||
    text.includes('casa filial') ||
    text.includes('filial número') ||
    text.includes('filial no') ||
    text.includes('filial 502') ||
    text.includes('filial 14') ||
    text.includes('apartamento') ||
    text.includes('penthouse') ||
    text.includes('propiedad horizontal') ||
    text.includes('ley 7933') ||
    text.includes('régimen de condominio') ||
    text.includes('regimen de condominio')
  );

  const isCommercialSignal = (
    text.includes('local comercial') ||
    text.includes('oficinas corporativas') ||
    text.includes('oficentro') ||
    text.includes('módulo comercial') ||
    text.includes('modulo comercial') ||
    text.includes('bodega') ||
    text.includes('bodegas') ||
    text.includes('nave industrial') ||
    text.includes('galerón industrial') ||
    text.includes('galeron industrial') ||
    text.includes('parque industrial') ||
    text.includes('centro comercial') ||
    text.includes('plaza comercial')
  );

  const isResidentialSignal = (
    text.includes('casa de habitación') ||
    text.includes('casa de habitacion') ||
    text.includes('casa habitacion') ||
    text.includes('casa de campo') ||
    text.includes('casa contemporánea') ||
    text.includes('casa contemporanea') ||
    text.includes('casa unifamiliar') ||
    text.includes('villa') ||
    text.includes('chalet') ||
    text.includes('residencia') ||
    text.includes('vivienda') ||
    text.includes('con una casa') ||
    text.includes('con casa') ||
    text.includes('con edificación') ||
    text.includes('con edificacion') ||
    text.includes('los laureles') ||
    text.includes('valle del sol') ||
    text.includes('los reyes') ||
    text.includes('monterán')
  );

  const isAgriculturalSignal = (
    text.includes('agrícola') ||
    text.includes('agricola') ||
    text.includes('ganadera') ||
    text.includes('ganadero') ||
    text.includes('agropecuaria') ||
    text.includes('agropecuario') ||
    text.includes('repastos') ||
    text.includes('pastos') ||
    text.includes('cultivo') ||
    text.includes('cafetal') ||
    text.includes('cañal') ||
    text.includes('canal') ||
    text.includes('palma africana') ||
    text.includes('forestal') ||
    text.includes('potrero') ||
    text.includes('finca lechera') ||
    text.includes('plantación') ||
    text.includes('plantacion') ||
    text.includes('árboles frutales') ||
    text.includes('arboles frutales')
  );

  // 4. Resolve Property Type using legal precedence
  let propertyType: PropertyType = 'other';

  if (isBareLandPhrase && !hasExplicitBuiltConstruction) {
    propertyType = isAgriculturalSignal ? 'agricultural_land' : 'building_lot';
  } else if (isCondoSignal) {
    propertyType = 'condo_apartment';
  } else if (isCommercialSignal) {
    propertyType = 'commercial_industrial';
  } else if (hasExplicitBuiltConstruction || isResidentialSignal) {
    propertyType = 'single_family_home';
  } else if (isAgriculturalSignal) {
    propertyType = 'agricultural_land';
  } else if (data.property_type && data.property_type !== 'other') {
    propertyType = data.property_type;
  } else if (text.includes('terreno') || text.includes('lote') || text.includes('solar')) {
    propertyType = 'building_lot';
  }

  // 5. Has Construction (False for bare land/terreno para construir; True only if existing building cited)
  let hasConstruction = data.has_construction;
  if (typeof hasConstruction !== 'boolean') {
    if (isBareLandPhrase && !hasExplicitBuiltConstruction) {
      hasConstruction = false;
    } else if (hasExplicitBuiltConstruction) {
      hasConstruction = true;
    } else if (propertyType === 'single_family_home' || propertyType === 'commercial_industrial') {
      hasConstruction = true;
    } else if (propertyType === 'condo_apartment') {
      // Condo apartment with bare land phrase is unbuilt condo lot
      hasConstruction = !isBareLandPhrase;
    } else {
      hasConstruction = false;
    }
  }

  // 6. Public Road Frontage
  let hasPublicRoad = data.has_public_road_frontage;
  if (typeof hasPublicRoad !== 'boolean') {
    hasPublicRoad = (
      text.includes('calle pública') ||
      text.includes('calle publica') ||
      text.includes('frente a calle') ||
      text.includes('acceso asfaltado') ||
      text.includes('boulevard') ||
      text.includes('avenida') ||
      text.includes('carretera') ||
      text.includes('frente a parque')
    );
  }

  // 7. Is Condominio
  let isCondominio = data.is_condominio;
  if (typeof isCondominio !== 'boolean') {
    isCondominio = (
      propertyType === 'condo_apartment' ||
      isCondoSignal
    );
  }

  // 8. Mortgage Priority
  let mortgagePriority: MortgagePriority = data.mortgage_priority || '1st_mortgage';
  if (!data.mortgage_priority) {
    if (text.includes('segundo grado') || text.includes('segunda hipoteca')) {
      mortgagePriority = '2nd_mortgage';
    } else if (text.includes('embargo')) {
      mortgagePriority = 'embargo_judicial';
    } else {
      mortgagePriority = '1st_mortgage';
    }
  }

  return {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority,
  };
}

/**
 * Translates comprehensive real estate and legal phrases into clean English or Spanish
 */
export function localizeRealEstateText(text: string | null | undefined, language: 'es' | 'en'): string {
  if (!text) return '';
  if (language === 'es') return text;

  let out = text;

  const phraseMap: [RegExp, string][] = [
    [/Condominio horizontal residencial/gi, 'Residential Gated Community'],
    [/Condominio horizontal cerrado/gi, 'Gated Residential Community'],
    [/Condominio Frente al Mar/gi, 'Oceanfront Condominium'],
    [/Condominio/gi, 'Condominium'],
    [/casa filial número\s*(\d+)/gi, 'Residential Unit #$1'],
    [/casa filial/gi, 'Residence Unit'],
    [/finca filial/gi, 'Condominium Subsidiary Unit'],
    [/Filial/gi, 'Unit'],
    [/casa de habitación/gi, 'Single-Family Residence'],
    [/casa contemporánea de dos plantas/gi, 'Contemporary Two-Story Residence'],
    [/casa de campo/gi, 'Country Residence'],
    [/villa de playa situada en/gi, 'Beach Villa located in'],
    [/villa amueblada a/gi, 'Furnished Villa'],
    [/villa amueblada/gi, 'Furnished Villa'],
    [/penthouse con vista panorámica al Océano Pacífico/gi, 'Penthouse with Panoramic Pacific Ocean Views'],
    [/penthouse con vista panorámica/gi, 'Penthouse with Panoramic Views'],
    [/penthouse con vista/gi, 'Penthouse with Views'],
    [/terreno plano y casa unifamiliar/gi, 'Flat Lot & Single-Family Residence'],
    [/terreno para construir con una casa de habitación/gi, 'Building Land with Single-Family Residence'],
    [/terreno para construir/gi, 'Building Lot / Development Land'],
    [/lote para construir/gi, 'Building Lot'],
    [/finca con vista panorámica al mar/gi, 'Estate with Panoramic Ocean Views'],
    [/finca turística y agropecuaria/gi, 'Eco-Tourism & Agricultural Estate'],
    [/local comercial \/ oficinas corporativas/gi, 'Commercial Suite & Corporate Offices'],
    [/local comercial/gi, 'Commercial Retail/Office Space'],
    [/módulo comercial/gi, 'Commercial Unit'],
    [/oficentro/gi, 'Office Center'],
    [/quinta campestre/gi, 'Country Villa & Estate'],
    [/inmueble judicial en/gi, 'Judicial Foreclosure Property in'],
    [/habitaciones/gi, 'bedrooms'],
    [/dormitorios en suite/gi, 'en-suite bedrooms'],
    [/dormitorios/gi, 'bedrooms'],
    [/cuartos/gi, 'rooms'],
    [/baños/gi, 'bathrooms'],
    [/terraza y jardín privado/gi, 'terrace and private garden'],
    [/terraza/gi, 'terrace'],
    [/jardín privado/gi, 'private garden'],
    [/jardín perimetral/gi, 'perimeter garden'],
    [/acabados de primera/gi, 'premium luxury finishes'],
    [/acabados finos y chimenea/gi, 'fine finishes and fireplace'],
    [/garaje techado y seguridad automatizada/gi, 'covered garage and automated 24/7 security'],
    [/garaje techado/gi, 'covered garage'],
    [/garaje/gi, 'garage'],
    [/piscina privada y senderos a la playa/gi, 'private swimming pool and walking trails to beach'],
    [/piscina privada/gi, 'private pool'],
    [/piscina comunitaria/gi, 'community pool'],
    [/piscina y árboles frutales/gi, 'swimming pool and fruit orchard'],
    [/árboles frutales/gi, 'fruit trees / orchard'],
    [/piscina/gi, 'swimming pool'],
    [/vistas al campo de golf/gi, 'golf course views'],
    [/vista frontal al Volcán Arenal/gi, 'front-row views of the Arenal Volcano'],
    [/vistas al Valle Central/gi, 'panoramic Central Valley views'],
    [/en la colina de/gi, 'on the hillside of'],
    [/del Parque Nacional/gi, 'from the National Park'],
    [/naciente de agua/gi, 'natural water spring'],
    [/acceso asfaltado/gi, 'paved access road'],
    [/primera planta/gi, 'first floor / ground level'],
    [/segunda planta/gi, 'second floor'],
    [/primer nivel/gi, 'ground level'],
    [/segundo nivel/gi, 'second level'],
    [/nivel 7/gi, '7th floor'],
    [/metros de la playa/gi, 'meters from the beach'],
    [/frente a Playa/gi, 'facing beach'],
    [/frente a parque público/gi, 'facing public park'],
    [/frente a calle pública/gi, 'with public road frontage'],
    [/calle pública/gi, 'public road'],
    [/propiedad privada/gi, 'private property'],
    [/residencia de estilo toscano/gi, 'Tuscan-style luxury residence'],
    [/residencia/gi, 'residence'],
    [/terreno/gi, 'land parcel'],
    [/finca/gi, 'estate / farm'],
    [/quinta/gi, 'country estate'],
    [/lote/gi, 'lot'],
  ];

  for (const [pattern, replacement] of phraseMap) {
    out = out.replace(pattern, replacement);
  }

  return out;
}

/**
 * Authoritative mapping of Costa Rican Province codes (1-7) to official names
 */
export const PROVINCE_CODE_TO_NAME: Record<string, CostaRicaProvince> = {
  '1': 'San José',
  '2': 'Alajuela',
  '3': 'Cartago',
  '4': 'Heredia',
  '5': 'Guanacaste',
  '6': 'Puntarenas',
  '7': 'Limón',
};

/**
 * Derives the ground truth Costa Rican province from Folio Real (matrícula) or Plano Catastrado
 */
export function getProvinceFromFolioOrPlano(
  folioReal?: string | null,
  planoCatastrado?: string | null,
  fallback?: CostaRicaProvince | string | null
): CostaRicaProvince {
  // 1. Folio Real prefix is ground truth in Costa Rica (e.g. 6-123456-000 -> Puntarenas)
  if (folioReal) {
    const cleanFolio = folioReal.trim().toUpperCase().replace(/^(?:FOLIO\s*REAL|FINCA|MATR[IÍ]CULA)[:\s]*/i, '');
    const mFolio = cleanFolio.match(/^([1-7])\s*[-/]/);
    if (mFolio && PROVINCE_CODE_TO_NAME[mFolio[1]]) {
      return PROVINCE_CODE_TO_NAME[mFolio[1]];
    }
  }

  // 2. Plano Catastrado prefix (e.g. P-0948699-2004 or 6-948699-2004 -> Puntarenas)
  if (planoCatastrado) {
    const cleanPlano = planoCatastrado.trim().toUpperCase().replace(/^(?:PLANO|CATASTRO)[:\s]*/i, '');
    const mNum = cleanPlano.match(/^([1-7])\s*[-/]/);
    if (mNum && PROVINCE_CODE_TO_NAME[mNum[1]]) {
      return PROVINCE_CODE_TO_NAME[mNum[1]];
    }
    const mLetter = cleanPlano.match(/^(SJ|A|C|H|G|P|L)\s*[-/]/i);
    if (mLetter) {
      const codeMap: Record<string, CostaRicaProvince> = {
        SJ: 'San José',
        A: 'Alajuela',
        C: 'Cartago',
        H: 'Heredia',
        G: 'Guanacaste',
        P: 'Puntarenas',
        L: 'Limón',
      };
      const found = codeMap[mLetter[1].toUpperCase()];
      if (found) return found;
    }
  }

  // 3. Fallback province
  if (fallback) {
    const norm = fallback.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('san jose')) return 'San José';
    if (norm.includes('alajuela')) return 'Alajuela';
    if (norm.includes('cartago')) return 'Cartago';
    if (norm.includes('heredia')) return 'Heredia';
    if (norm.includes('guanacaste')) return 'Guanacaste';
    if (norm.includes('puntarenas')) return 'Puntarenas';
    if (norm.includes('limon')) return 'Limón';
  }

  return 'San José';
}

/**
 * Sanitizes and normalizes Costa Rican canton and district names.
 * Strips legal ordinals (primero, 11º, nº), noise words (de, del, en), and discards single-letter fragments (e.g. 'o').
 */
export function sanitizeLocationName(rawName?: string | null): string {
  if (!rawName || typeof rawName !== 'string') return '';

  let name = rawName
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\/#º°ª]+/g, ' ')
    .replace(/^[\s\-–—:;,\.]+|[\s\-–—:;,\.]+$/g, '')
    .trim();

  // Strip leading court numbering and ordinals: '11º Garabito' -> 'Garabito', 'primero Jacó' -> 'Jacó'
  name = name.replace(/^(?:(?:n[úu]mero\s*|n[ºo°ª]\.?\s*|c[oó]digo\s*)?\d+[ºo°ª\.\-–—:]*)\s*/i, '');
  name = name.replace(/^(?:primero|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|séptimo|septima|séptima|octavo|octava|noveno|novena|d[eé]cimo|d[eé]cima|und[eé]cimo|und[eé]cima|duod[eé]cimo|duod[eé]cima|onceavo|onceava|doceavo|doceava|treceavo|catorceavo|quinceavo)\s*[:-]?\s*/i, '');
  name = name.replace(/^(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince)\s*[:-]?\s*/i, '');
  name = name.replace(/^(?:distrito|cant[oó]n|provincia)\s*[:-]?\s*/i, '');
  name = name.replace(/^[\s\-–—:;,\.]+|[\s\-–—:;,\.]+$/g, '').trim();

  // Legitimate Costa Rican toponyms that start with articles
  const VALID_PREFIX_NAMES = [
    'la guacima', 'la guácima', 'la fortuna', 'la uruca', 'la union', 'la unión', 'la cruz',
    'la asuncion', 'la asunción', 'la ribera', 'la garita', 'la suiza', 'la palma', 'la tigra',
    'la palmera', 'la rita', 'la virgen', 'la cuesta', 'la amistad', 'la ceiba', 'la trinidad',
    'la victoria', 'la aurora', 'la legua',
    'los chiles', 'los angeles', 'los ángeles', 'los laureles', 'los reyes', 'los negritos',
    'los sitios', 'los guido', 'los suenos', 'los sueños', 'los arcos', 'los cedros',
    'las juntas', 'las delicias', 'las palmas', 'las mercedes', 'las vueltas', 'las horquetas',
    'las canas', 'las cañas', 'las nubes',
    'el roble', 'el guarco', 'el carmen', 'el tejar', 'el rosario', 'el cairo', 'el general',
    'el silencio', 'el porvenir', 'el prado', 'el cacao', 'el coyol', 'el alto',
  ];

  const normLower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isValidPrefixed = VALID_PREFIX_NAMES.some((p) => normLower.startsWith(p));

  if (!isValidPrefixed) {
    name = name.replace(/^(?:de\s+la\s+|de\s+los\s+|de\s+las\s+|de\s+el\s+|del\s+|de\s+|en\s+|el\s+|la\s+|los\s+|las\s+|un\s+|una\s+|y\s+|o\s+)/i, '');
    name = name.replace(/^[\s\-–—:;,\.]+|[\s\-–—:;,\.]+$/g, '').trim();
  }

  // JUNK & SINGLE CHARACTER FILTER:
  // Discard isolated letters like 'o', 'a', 'y', 'de', 'del', 'en', 'un', or non-alphabetic
  if (name.length <= 1 || /^(?:o|a|y|e|de|del|en|el|la|los|las|un|una|al|con|sin|por|para|finca|lote|terreno|distrito|canton|cantón|provincia|numero|número|plano|matricula|matrícula|folio|real)$/i.test(name)) {
    return '';
  }

  // Canonical name formatting
  const CANONICAL_MAP: Record<string, string> = {
    'jaco': 'Jacó',
    'garabito': 'Garabito',
    'san sebastian': 'San Sebastián',
    'san jose': 'San José',
    'perez zeledon': 'Pérez Zeledón',
    'san isidro': 'San Isidro',
    'escazu': 'Escazú',
    'santa ana': 'Santa Ana',
    'desamparados': 'Desamparados',
    'alajuela': 'Alajuela',
    'heredia': 'Heredia',
    'cartago': 'Cartago',
    'guanacaste': 'Guanacaste',
    'puntarenas': 'Puntarenas',
    'limon': 'Limón',
    'paquera': 'Paquera',
    'cobano': 'Cóbano',
    'lepanto': 'Lepanto',
    'jicaral': 'Lepanto',
    'santa teresa': 'Santa Teresa',
    'malpais': 'Malpaís',
    'montezuma': 'Montezuma',
    'tambor': 'Tambor',
    'quepos': 'Quepos',
    'aguirre': 'Quepos',
    'manuel antonio': 'Manuel Antonio',
    'herradura': 'Herradura',
    'tarcoles': 'Tárcoles',
    'golfito': 'Golfito',
    'osa': 'Osa',
    'palmar': 'Palmar',
    'coto brus': 'Coto Brus',
    'san vito': 'San Vito',
    'parrita': 'Parrita',
    'corredores': 'Corredores',
    'ciudad neily': 'Ciudad Neily',
    'monteverde': 'Monteverde',
    'puerto jimenez': 'Puerto Jiménez',
    'san ramon': 'San Ramón',
    'san carlos': 'San Carlos',
    'la fortuna': 'La Fortuna',
    'ciudad quesada': 'Ciudad Quesada',
    'la guacima': 'La Guácima',
    'tibas': 'Tibás',
    'belen': 'Belén',
    'la asuncion': 'La Asunción',
    'moravia': 'Moravia',
    'curridabat': 'Curridabat',
    'montes de oca': 'Montes de Oca',
    'san pedro': 'San Pedro',
    'tamarindo': 'Tamarindo',
    'playas del coco': 'Playas del Coco',
    'liberia': 'Liberia',
    'santa cruz': 'Santa Cruz',
    'nicoya': 'Nicoya',
    'nosara': 'Nosara',
    'samara': 'Sámara',
    'pococi': 'Pococí',
    'guapiles': 'Guápiles',
    'siquirres': 'Siquirres',
    'talamanca': 'Talamanca',
    'puerto viejo': 'Puerto Viejo',
  };

  const key = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (CANONICAL_MAP[key]) {
    return CANONICAL_MAP[key];
  }

  // Capitalize words neatly
  return name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
}

/**
 * Resolves full clean location context (Province, Canton, District)
 */
export function resolveLocationContext(auction: Partial<Auction>): {
  province: CostaRicaProvince;
  canton: string;
  district: string;
} {
  const province = getProvinceFromFolioOrPlano(
    auction.folio_real,
    auction.plano_catastrado,
    auction.province
  );

  let canton = sanitizeLocationName(auction.canton);
  let district = sanitizeLocationName(auction.district);

  // If the declared canton/district belongs to a different province (e.g., court docket in San José vs property in Puntarenas)
  if (province !== 'San José') {
    if (canton.toLowerCase() === 'san jose' || district.toLowerCase() === 'san sebastian' || canton.toLowerCase() === 'central') {
      canton = '';
      district = '';
    }
  }

  const fullText = `${auction.address_description || ''} ${auction.raw_edict_text || ''} ${auction.naturaleza_raw || ''} ${auction.legal_summary || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (province === 'Puntarenas') {
    if (fullText.includes('jaco') || fullText.includes('playa jaco')) {
      district = 'Jacó';
      canton = 'Garabito';
    } else if (fullText.includes('herradura') || fullText.includes('los suenos')) {
      district = 'Herradura';
      canton = 'Garabito';
    } else if (fullText.includes('tarcoles')) {
      district = 'Tárcoles';
      canton = 'Garabito';
    } else if (fullText.includes('manuel antonio')) {
      district = 'Manuel Antonio';
      canton = 'Quepos';
    } else if (fullText.includes('quepos') || fullText.includes('aguirre')) {
      district = 'Quepos';
      canton = 'Quepos';
    } else if (
      fullText.includes('cobano') ||
      fullText.includes('santa teresa') ||
      fullText.includes('malpais') ||
      fullText.includes('montezuma') ||
      fullText.includes('tambor')
    ) {
      district = 'Cóbano';
      canton = 'Puntarenas';
    } else if (fullText.includes('paquera')) {
      district = 'Paquera';
      canton = 'Puntarenas';
    } else if (fullText.includes('lepanto') || fullText.includes('jicaral')) {
      district = 'Lepanto';
      canton = 'Puntarenas';
    } else if (fullText.includes('dominical') || fullText.includes('uvita')) {
      district = 'Bahía Ballena';
      canton = 'Osa';
    }
  } else if (province === 'Guanacaste') {
    if (fullText.includes('tamarindo')) {
      district = 'Tamarindo';
      canton = 'Santa Cruz';
    } else if (fullText.includes('playas del coco') || fullText.includes('del coco')) {
      district = 'Playas del Coco';
      canton = 'Carrillo';
    } else if (fullText.includes('flamingos') || fullText.includes('playa flamingo')) {
      district = 'Flamingo';
      canton = 'Santa Cruz';
    } else if (fullText.includes('nosara')) {
      district = 'Nosara';
      canton = 'Nicoya';
    } else if (fullText.includes('samara')) {
      district = 'Sámara';
      canton = 'Nicoya';
    }
  } else if (province === 'Alajuela') {
    if (fullText.includes('la fortuna') || fullText.includes('arenal') || fullText.includes('volcan arenal')) {
      district = 'La Fortuna';
      canton = 'San Carlos';
    } else if (fullText.includes('la guacima') || fullText.includes('los reyes')) {
      district = 'La Guácima';
      canton = 'Alajuela';
    }
  } else if (province === 'San José') {
    if (fullText.includes('escazu') || fullText.includes('san rafael de escazu') || fullText.includes('san antonio de escazu')) {
      canton = 'Escazú';
    } else if (fullText.includes('santa ana') || fullText.includes('pozos') || fullText.includes('piedades')) {
      canton = 'Santa Ana';
    } else if (fullText.includes('san sebastian')) {
      district = 'San Sebastián';
      canton = 'San José';
    }
  }

  return {
    province,
    canton: canton || province,
    district: district || '',
  };
}

/**
 * Return an executive, accurate localized property title for foreclosure dossiers and cards
 */
export function getLocalizedPropertyTitle(auction: Auction, language: 'es' | 'en'): string {
  const { propertyType, isCondominio, hasConstruction } = detectPropertyCharacteristics(auction);
  const { province, canton, district } = resolveLocationContext(auction);

  let locationStr = '';
  if (
    district &&
    canton &&
    district.toLowerCase() !== canton.toLowerCase() &&
    canton.toLowerCase() !== province.toLowerCase() &&
    canton.toLowerCase() !== 'central'
  ) {
    locationStr = `${district}, ${canton}`;
  } else if (district && district.toLowerCase() !== 'central') {
    locationStr = `${district}, ${province}`;
  } else if (canton && canton.toLowerCase() !== 'central' && canton.toLowerCase() !== province.toLowerCase()) {
    locationStr = `${canton}, ${province}`;
  } else {
    locationStr = province || 'Costa Rica';
  }

  const nat = (auction.naturaleza_raw || '').toLowerCase();
  const addr = (auction.address_description || '').toLowerCase();

  // Check for genuine condominium or development name in address
  let condoName = '';
  const condoMatch = (auction.address_description || '').match(/(?:condominio|residencial|oficentro|torre|hacienda)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]+?)(?:,\s*|\.\s*|filial|casa|lote|m[óo]dulo|piso|$)/i);
  if (condoMatch && condoMatch[1]) {
    const rawName = condoMatch[1].trim();
    if (rawName.length >= 3 && rawName.length <= 35 && !rawName.toLowerCase().startsWith('de') && !rawName.toLowerCase().startsWith('en')) {
      condoName = rawName;
    }
  }

  // 1. Condominium / Apartments
  if (propertyType === 'condo_apartment' || isCondominio) {
    if (condoName) {
      return language === 'es'
        ? `Condominio ${condoName} en ${locationStr}`
        : `Condominium at ${condoName} in ${locationStr}`;
    }
    if (addr.includes('penthouse') || nat.includes('penthouse')) {
      return language === 'es'
        ? `Penthouse en Condominio en ${locationStr}`
        : `Condominium Penthouse in ${locationStr}`;
    }
    return language === 'es'
      ? `Condominio Residencial en ${locationStr}`
      : `Residential Condominium in ${locationStr}`;
  }

  // 2. Commercial / Industrial
  if (propertyType === 'commercial_industrial') {
    if (addr.includes('bodega') || nat.includes('bodega') || addr.includes('nave industrial') || nat.includes('nave industrial')) {
      return language === 'es'
        ? `Bodega / Nave Industrial en ${locationStr}`
        : `Industrial Warehouse in ${locationStr}`;
    }
    if (addr.includes('oficina') || addr.includes('oficentro')) {
      return language === 'es'
        ? `Oficina Comercial en ${locationStr}`
        : `Commercial Office in ${locationStr}`;
    }
    return language === 'es'
      ? `Inmueble Comercial en ${locationStr}`
      : `Commercial Property in ${locationStr}`;
  }

  // 3. Agricultural Land / Farm
  if (propertyType === 'agricultural_land') {
    if (nat.includes('café') || nat.includes('cafe') || nat.includes('cafetal')) {
      return language === 'es'
        ? `Finca Cafetalera en ${locationStr}`
        : `Coffee Farm & Land in ${locationStr}`;
    }
    if (nat.includes('ganado') || nat.includes('ganadera') || nat.includes('pasto')) {
      return language === 'es'
        ? `Finca Ganadera / Repasto en ${locationStr}`
        : `Cattle Ranch & Pasture in ${locationStr}`;
    }
    return language === 'es'
      ? `Finca Agrícola / Terreno en ${locationStr}`
      : `Agricultural Land / Farm in ${locationStr}`;
  }

  // 4. Building Lot (Bare land / Terreno para construir)
  if (propertyType === 'building_lot' || (!hasConstruction && (nat.includes('terreno') || nat.includes('lote') || nat.includes('solar')))) {
    if (auction.area_m2 && auction.area_m2 > 0) {
      const formattedArea = auction.area_m2 >= 10000 
        ? `${(auction.area_m2 / 10000).toFixed(1)} ha` 
        : `${Math.round(auction.area_m2)} m²`;
      return language === 'es'
        ? `Terreno para Construir (${formattedArea}) en ${locationStr}`
        : `Building Lot (${formattedArea}) in ${locationStr}`;
    }
    return language === 'es'
      ? `Terreno para Construir en ${locationStr}`
      : `Building Lot in ${locationStr}`;
  }

  // 5. Single Family Home / Residence
  if (propertyType === 'single_family_home' || hasConstruction) {
    if (condoName) {
      return language === 'es'
        ? `Casa en ${condoName}, ${locationStr}`
        : `Home in ${condoName}, ${locationStr}`;
    }
    return language === 'es'
      ? `Casa de Habitación en ${locationStr}`
      : `Single-Family Home in ${locationStr}`;
  }

  // 6. Generic Foreclosure Property
  return language === 'es'
    ? `Inmueble Judicial en ${locationStr}`
    : `Judicial Foreclosure Property in ${locationStr}`;
}

/**
 * Calculate Opportunity Alpha Rating (0 - 100 with Grades AAA, AA, A, B, C)
 * Proprietary multi-factor scoring evaluating statutory discount, valuation spread, liquidity, and road access.
 */
export function calculateOpportunityAlpha(auction: Auction, lang: 'es' | 'en' = 'es'): DealAlphaRating {
  const liveState = getLiveAuctionProgressionState(auction);
  const chars = detectPropertyCharacteristics(auction);

  // 1. Stage Discounting Points (Max 50 pts)
  let stagePoints = 15; // 1st Call baseline
  if (liveState.currentCallNumber === 2) {
    stagePoints = 35; // 25% discount
  } else if (liveState.currentCallNumber === 3) {
    stagePoints = 50; // 75% discount / liquidation
  }

  // 2. Valuation Spread Margin Points (Max 35 pts)
  const marginPct = auction.estimated_margin_pct || 0;
  let marginPoints = 5;
  if (marginPct >= 40) {
    marginPoints = 35;
  } else if (marginPct >= 28) {
    marginPoints = 28;
  } else if (marginPct >= 18) {
    marginPoints = 18;
  } else if (marginPct >= 10) {
    marginPoints = 10;
  }

  // 3. Asset Liquidity & Typology Points (Max 10 pts)
  let assetPoints = 5;
  if (chars.propertyType === 'condo_apartment' || chars.propertyType === 'single_family_home') {
    assetPoints = 10;
  } else if (chars.propertyType === 'commercial_industrial') {
    assetPoints = 8;
  } else if (chars.propertyType === 'building_lot') {
    assetPoints = 7;
  }

  // 4. Access & Frontage Advantage Points (Max 5 pts)
  const accessPoints = chars.hasPublicRoad ? 5 : 2;

  const rawScore = stagePoints + marginPoints + assetPoints + accessPoints;
  const score = Math.min(100, Math.max(10, rawScore));

  // Determine Grade & localized summary
  let grade: DealAlphaGrade = 'C';
  let label = lang === 'en' ? 'Narrow Margin' : 'Margen Reducido';
  if (score >= 90) {
    grade = 'AAA';
    label = lang === 'en' ? 'Exceptional Opportunity' : 'Oportunidad Extraordinaria';
  } else if (score >= 80) {
    grade = 'AA';
    label = lang === 'en' ? 'High Yield Spread' : 'Excelente Rentabilidad';
  } else if (score >= 70) {
    grade = 'A';
    label = lang === 'en' ? 'Solid Investment Margin' : 'Sólido Margen de Inversión';
  } else if (score >= 55) {
    grade = 'B';
    label = lang === 'en' ? 'Moderate Spread' : 'Margen Moderado';
  }

  return {
    score,
    grade,
    label,
    stagePoints,
    marginPoints,
    assetPoints,
    accessPoints,
  };
}

/**
 * Calculate Title Security & Lien Seniority Rating
 * Grounded in Costa Rican Civil Procedure Code (Art. 162 CPC - Lien Extinguishment)
 */
export function calculateTitleSecurityRating(auction: Auction, lang: 'es' | 'en' = 'es'): TitleSecurityRating {
  const chars = detectPropertyCharacteristics(auction);
  const priority = chars.mortgagePriority;

  if (priority === '1st_mortgage') {
    return {
      tier: 'tier_1',
      tierNumber: 1,
      label: lang === 'en' ? 'Tier 1 · Senior Clean Lien' : 'Nivel 1 · Primer Grado Preferente',
      priorityName: lang === 'en' ? '1st Mortgage Senior Lien' : '1° Grado Hipotecario Preferente',
      score: 95,
      isSeniorLien: true,
      extinguishmentProtected: true,
      legalCitation: 'Art. 162 CPC (Ley 9342)',
      keyFactors: [
        lang === 'en' ? 'Senior Priority Ranking' : 'Rango Hipotecario Preferente',
        lang === 'en' ? 'Automatic Junior Lien Cancellation upon Adjudication' : 'Cancelación de Gravámenes Inferiores por Adjudicación',
        chars.hasPublicRoad 
          ? (lang === 'en' ? 'Direct Public Road Access' : 'Frente a Calle Pública') 
          : (lang === 'en' ? 'Right of Way Easement' : 'Acceso por Servidumbre'),
      ],
    };
  }

  if (priority === '2nd_mortgage') {
    return {
      tier: 'tier_2',
      tierNumber: 2,
      label: lang === 'en' ? 'Tier 2 · Subordinate Lien' : 'Nivel 2 · Segundo Grado Subordinado',
      priorityName: lang === 'en' ? '2nd Mortgage Subordinate Lien' : '2° Grado Hipotecario Subordinado',
      score: 65,
      isSeniorLien: false,
      extinguishmentProtected: false,
      legalCitation: 'Art. 160-162 CPC (Ley 9342)',
      keyFactors: [
        lang === 'en' ? 'Subordinate to Senior 1st Mortgage' : 'Subordinado a Hipoteca de Primer Grado',
        lang === 'en' ? 'Prior Mortgage Payoff Verification Advised' : 'Verificación de Saldo Anterior Requerida',
        chars.hasPublicRoad 
          ? (lang === 'en' ? 'Direct Public Road Access' : 'Frente a Calle Pública') 
          : (lang === 'en' ? 'Right of Way Easement' : 'Acceso por Servidumbre'),
      ],
    };
  }

  return {
    tier: 'tier_3',
    tierNumber: 3,
    label: lang === 'en' ? 'Tier 3 · Complex Claim / Embargo' : 'Nivel 3 · Embargo Judicial Complejo',
    priorityName: lang === 'en' ? 'Judicial Embargo Claim' : 'Embargo Judicial en Ejecución',
    score: 45,
    isSeniorLien: false,
    extinguishmentProtected: false,
    legalCitation: 'Art. 158-164 CPC (Ley 9342)',
    keyFactors: [
      lang === 'en' ? 'Unsecured Litigation Execution' : 'Ejecución de Proceso Monitorio / Cobro',
      lang === 'en' ? 'Requires Full Docket Study for Prior Liens' : 'Requiere Estudio Integral de Gravámenes Previos',
      chars.hasPublicRoad 
        ? (lang === 'en' ? 'Direct Public Road Access' : 'Frente a Calle Pública') 
        : (lang === 'en' ? 'Right of Way Easement' : 'Acceso por Servidumbre'),
    ],
  };
}

export interface CallStageConfig {
  callNumber: 1 | 2 | 3 | null;
  labelEs: string;
  labelEn: string;
  shortLabelEs: string;
  shortLabelEn: string;
  tagClass: string;
  dotClass: string;
  borderClass: string;
  hoverBorderClass: string;
  selectedBorderClass: string;
  colorName: 'green' | 'yellow' | 'orange' | 'rose' | 'slate';
  hexColor: string;
}

/**
 * Standardized call stage color mapping:
 * - 1st Call = Green (emerald)
 * - 2nd Call = Yellow (yellow)
 * - 3rd Call = Orange (orange)
 */
export function getCallStageConfig(auctionOrState: Auction | ReturnType<typeof getLiveAuctionProgressionState>): CallStageConfig {
  const live = 'callStage' in auctionOrState && 'currentCallNumber' in auctionOrState
    ? (auctionOrState as ReturnType<typeof getLiveAuctionProgressionState>)
    : getLiveAuctionProgressionState(auctionOrState as Auction);

  if (live.saleStatus === 'in_progress' || live.isHearing) {
    return {
      callNumber: live.currentCallNumber,
      labelEs: 'En Audiencia Judicial',
      labelEn: 'In Judicial Hearing',
      shortLabelEs: 'Audiencia',
      shortLabelEn: 'Hearing',
      tagClass: 'bg-rose-950/90 border-rose-500/60 text-rose-300 animate-pulse',
      dotClass: 'bg-rose-400',
      borderClass: 'border-rose-500/60',
      hoverBorderClass: 'hover:border-rose-400 hover:shadow-rose-950/30',
      selectedBorderClass: 'border-rose-400 ring-2 ring-rose-500/40 shadow-xl shadow-rose-950/40',
      colorName: 'rose',
      hexColor: '#f43f5e',
    };
  }

  // 3rd Call = Orange
  if (live.callStage === 'call_3' || live.currentCallNumber === 3) {
    return {
      callNumber: 3,
      labelEs: '3° Remate (75% DESCUENTO)',
      labelEn: '3rd Call (75% DISCOUNT)',
      shortLabelEs: '3° Remate (-75%)',
      shortLabelEn: '3rd Call (-75%)',
      tagClass: 'bg-orange-950/90 border-orange-500/60 text-orange-300',
      dotClass: 'bg-orange-400',
      borderClass: 'border-orange-500/50',
      hoverBorderClass: 'hover:border-orange-400 hover:shadow-orange-950/30',
      selectedBorderClass: 'border-orange-400 ring-2 ring-orange-500/40 shadow-xl shadow-orange-950/40',
      colorName: 'orange',
      hexColor: '#f97316',
    };
  }

  // 2nd Call = Yellow
  if (live.callStage === 'call_2' || live.currentCallNumber === 2) {
    return {
      callNumber: 2,
      labelEs: '2° Remate (25% DESCUENTO)',
      labelEn: '2nd Call (25% DISCOUNT)',
      shortLabelEs: '2° Remate (-25%)',
      shortLabelEn: '2nd Call (-25%)',
      tagClass: 'bg-yellow-950/90 border-yellow-500/60 text-yellow-300',
      dotClass: 'bg-yellow-400',
      borderClass: 'border-yellow-500/50',
      hoverBorderClass: 'hover:border-yellow-400 hover:shadow-yellow-950/30',
      selectedBorderClass: 'border-yellow-400 ring-2 ring-yellow-500/40 shadow-xl shadow-yellow-950/40',
      colorName: 'yellow',
      hexColor: '#eab308',
    };
  }

  // Expired / Passed
  if (live.callStage === 'passed_call_3' || live.saleStatus === 'deserted') {
    return {
      callNumber: null,
      labelEs: '3° Remate Vencido • En Adjudicación',
      labelEn: '3rd Call Expired • In Adjudication',
      shortLabelEs: '3° Remate Vencido',
      shortLabelEn: '3rd Call Expired',
      tagClass: 'bg-slate-900 border-slate-700 text-slate-400',
      dotClass: 'bg-slate-500',
      borderClass: 'border-slate-800',
      hoverBorderClass: 'hover:border-slate-700',
      selectedBorderClass: 'border-slate-600 ring-2 ring-slate-700/40 shadow-xl',
      colorName: 'slate',
      hexColor: '#64748b',
    };
  }

  // 1st Call = Green (Default)
  return {
    callNumber: 1,
    labelEs: '1° Remate (100% Base)',
    labelEn: '1st Call (100% Base)',
    shortLabelEs: '1° Remate (Base)',
    shortLabelEn: '1st Call (Base)',
    tagClass: 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-emerald-500/50',
    hoverBorderClass: 'hover:border-emerald-400 hover:shadow-emerald-950/30',
    selectedBorderClass: 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/40',
    colorName: 'green',
    hexColor: '#10b981',
  };
}





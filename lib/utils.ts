import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Auction, 
  Currency, 
  InvestorMetrics, 
  CostaRicaClosingCosts, 
  PropertyType, 
  MortgagePriority,
  AuctionCallStage,
  AuctionSaleStatus,
} from './types/auction';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lightweight client helper strictly as a fallback UI resolver for zero-latency display.
 * Pinned to Costa Rica Timezone (UTC-6) with 60-minute judicial hearing window.
 * Terminal states (suspended, awarded, annulled) are strictly respected.
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
  // If database already locked terminal state, preserve it
  if (
    auction.sale_status &&
    ['suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled'].includes(auction.sale_status)
  ) {
    return {
      callStage: auction.call_stage || 'suspended',
      saleStatus: auction.sale_status,
      currentCallNumber: auction.current_call_number ?? null,
      currentBasePrice: auction.current_base_price || auction.base_price_call_1,
      currentAuctionDate: auction.current_auction_date || auction.auction_date_call_1,
      currentDiscountPct: auction.current_discount_pct || 0,
      isHearing: false,
    };
  }

  const nowMs = customNow ? customNow.getTime() : Date.now();
  const d1Ms = new Date(auction.auction_date_call_1).getTime();
  const d2Ms = auction.auction_date_call_2 ? new Date(auction.auction_date_call_2).getTime() : null;
  const d3Ms = auction.auction_date_call_3 ? new Date(auction.auction_date_call_3).getTime() : null;

  const SIXTY_MINS_MS = 60 * 60 * 1000;
  const d1EndMs = d1Ms + SIXTY_MINS_MS;
  const d2EndMs = d2Ms ? d2Ms + SIXTY_MINS_MS : null;
  const d3EndMs = d3Ms ? d3Ms + SIXTY_MINS_MS : null;

  const p1 = auction.base_price_call_1;
  const p2 = auction.base_price_call_2 || Math.round(p1 * 0.75);
  const p3 = auction.base_price_call_3 || Math.round(p1 * 0.25);

  if (nowMs < d1Ms) {
    return {
      callStage: 'call_1',
      saleStatus: 'upcoming',
      currentCallNumber: 1,
      currentBasePrice: p1,
      currentAuctionDate: auction.auction_date_call_1,
      currentDiscountPct: 0,
      isHearing: false,
    };
  }

  if (nowMs >= d1Ms && nowMs <= d1EndMs) {
    return {
      callStage: 'call_1',
      saleStatus: 'in_progress',
      currentCallNumber: 1,
      currentBasePrice: p1,
      currentAuctionDate: auction.auction_date_call_1,
      currentDiscountPct: 0,
      isHearing: true,
    };
  }

  if (d2Ms && nowMs > d1EndMs && nowMs < d2Ms) {
    return {
      callStage: 'call_2',
      saleStatus: 'upcoming',
      currentCallNumber: 2,
      currentBasePrice: p2,
      currentAuctionDate: auction.auction_date_call_2,
      currentDiscountPct: 25,
      isHearing: false,
    };
  }

  if (d2Ms && d2EndMs && nowMs >= d2Ms && nowMs <= d2EndMs) {
    return {
      callStage: 'call_2',
      saleStatus: 'in_progress',
      currentCallNumber: 2,
      currentBasePrice: p2,
      currentAuctionDate: auction.auction_date_call_2,
      currentDiscountPct: 25,
      isHearing: true,
    };
  }

  if (d3Ms && (!d2EndMs || nowMs > d2EndMs) && nowMs < d3Ms) {
    return {
      callStage: 'call_3',
      saleStatus: 'upcoming',
      currentCallNumber: 3,
      currentBasePrice: p3,
      currentAuctionDate: auction.auction_date_call_3,
      currentDiscountPct: 75,
      isHearing: false,
    };
  }

  if (d3Ms && d3EndMs && nowMs >= d3Ms && nowMs <= d3EndMs) {
    return {
      callStage: 'call_3',
      saleStatus: 'in_progress',
      currentCallNumber: 3,
      currentBasePrice: p3,
      currentAuctionDate: auction.auction_date_call_3,
      currentDiscountPct: 75,
      isHearing: true,
    };
  }

  // All 3 calls elapsed
  return {
    callStage: 'passed_call_3',
    saleStatus: 'deserted',
    currentCallNumber: null,
    currentBasePrice: p3,
    currentAuctionDate: auction.auction_date_call_3 || auction.auction_date_call_2 || auction.auction_date_call_1,
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
    const date = new Date(dateString);
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
 * Check if a property was added today (or within the last 24 hours)
 */
export function isPropertyNewToday(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  try {
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return false;
    
    const now = new Date();
    const isSameDay = 
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate();

    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return isSameDay || (diffHours >= 0 && diffHours <= 24);
  } catch {
    return false;
  }
}

/**
 * Get remaining days until auction with bilingual labels and 60-min hearing window detection
 */
export function getDaysUntilAuction(
  dateString: string, 
  lang: string = 'es'
): { days: number; isPast: boolean; isHearing: boolean; label: string } {
  try {
    const target = new Date(dateString).getTime();
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
        return { days: Math.abs(diffDays), isPast: true, isHearing: false, label: `Ended ${Math.abs(diffDays)}d ago` };
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
      return { days: Math.abs(diffDays), isPast: true, isHearing: false, label: `Finalizó hace ${Math.abs(diffDays)}d` };
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
 */
export function parseFolioReal(folio: string): { provinceCode: number; fincaNumber: string; sublot: string } {
  const parts = folio.split('-');
  return {
    provinceCode: parts[0] ? parseInt(parts[0], 10) : 0,
    fincaNumber: parts[1] || '',
    sublot: parts[2] || '000',
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
  const text = `${data.naturaleza_raw || ''} ${data.address_description || ''} ${data.legal_summary || ''} ${data.raw_edict_text || ''}`.toLowerCase();

  // 1. High-confidence specific signal detectors
  const isCondoSignal = (
    text.includes('condominio') ||
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
    text.includes('4 dormitorios') ||
    text.includes('3 dormitorios') ||
    text.includes('2 dormitorios') ||
    text.includes('dormitorios en suite') ||
    text.includes('habitaciones') ||
    text.includes('piscina privada') ||
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

  const isLotSignal = (
    text.includes('lote para construir') ||
    text.includes('terreno para construir') ||
    text.includes('lote para desarrollo') ||
    text.includes('solar') ||
    text.includes('terreno sin construir') ||
    text.includes('lote sin edificar') ||
    text.includes('terreno yermo')
  );

  // 2. Resolve Property Type using legal precedence
  let propertyType: PropertyType = 'other';

  if (isCondoSignal) {
    propertyType = 'condo_apartment';
  } else if (isCommercialSignal) {
    propertyType = 'commercial_industrial';
  } else if (isResidentialSignal) {
    // If it has a villa/home/bedrooms/pool, it is a Single-Family Home even if registered as finca
    propertyType = 'single_family_home';
  } else if (isAgriculturalSignal) {
    propertyType = 'agricultural_land';
  } else if (isLotSignal) {
    propertyType = 'building_lot';
  } else if (data.property_type && data.property_type !== 'other' && data.property_type !== 'agricultural_land') {
    propertyType = data.property_type;
  } else if (text.includes('casa') || text.includes('unifamiliar')) {
    propertyType = 'single_family_home';
  } else if (text.includes('terreno') || text.includes('lote')) {
    propertyType = 'building_lot';
  }

  // 3. Has Construction
  let hasConstruction = data.has_construction;
  if (typeof hasConstruction !== 'boolean') {
    const constructionKeywords = [
      'casa', 'edificio', 'edificación', 'edificacion', 'construcción', 'construccion',
      'bodega', 'local', 'oficina', 'oficinas', 'filial', 'apartamento', 'penthouse',
      'villa', 'quinta', 'residencia', 'mejoras', 'planta', 'habitaciones', 'baños',
      'banos', 'cochera', 'garaje', 'piscina', 'mampostería', 'mamposteria', 'piso',
      'techada', 'seguridad', 'acabados', 'dormitorios'
    ];
    
    const unbuiltKeywords = [
      'terreno sin construir', 'lote sin construir', 'terreno yermo', 'solar sin edificar',
      'terreno apto para', 'lote para construir', 'finca rústica', 'finca rustica'
    ];
    
    const hasBuiltMention = constructionKeywords.some(k => text.includes(k));
    const hasExplicitUnbuilt = unbuiltKeywords.some(k => text.includes(k));

    if (propertyType === 'single_family_home' || propertyType === 'condo_apartment' || propertyType === 'commercial_industrial') {
      hasConstruction = true;
    } else if (propertyType === 'building_lot' || propertyType === 'agricultural_land') {
      hasConstruction = hasBuiltMention && !hasExplicitUnbuilt;
    } else {
      hasConstruction = hasBuiltMention;
    }
  }

  // 4. Public Road Frontage
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

  // 5. Is Condominio
  let isCondominio = data.is_condominio;
  if (typeof isCondominio !== 'boolean') {
    isCondominio = (
      propertyType === 'condo_apartment' ||
      isCondoSignal
    );
  }

  // 6. Mortgage Priority
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
 * Return an executive, localized property title for foreclosure dossiers and cards
 */
export function getLocalizedPropertyTitle(auction: Auction, language: 'es' | 'en'): string {
  const { propertyType } = detectPropertyCharacteristics(auction);
  const text = `${auction.address_description || ''} ${auction.legal_summary || ''} ${auction.raw_edict_text || ''} ${auction.canton} ${auction.district}`.toLowerCase();

  // 1. Identify specific signature properties for high-caliber titles
  if (text.includes('los laureles')) {
    return language === 'en'
      ? 'Luxury Gated Residence in Los Laureles, Escazú'
      : 'Residencia en Condominio Los Laureles, Escazú';
  }

  if (text.includes('acqua') || (text.includes('jacó') && text.includes('penthouse'))) {
    return language === 'en'
      ? 'Oceanfront Luxury Penthouse in Jacó, Garabito'
      : 'Penthouse Frente al Mar en Jacó, Garabito';
  }

  if (text.includes('langosta') || text.includes('cala luna') || text.includes('tamarindo')) {
    return language === 'en'
      ? 'Private Beach Villa in Playa Langosta, Tamarindo'
      : 'Villa de Playa en Playa Langosta, Tamarindo';
  }

  if (text.includes('valle del sol')) {
    return language === 'en'
      ? 'Contemporary Two-Story Residence in Valle del Sol, Santa Ana'
      : 'Casa Contemporánea en Valle del Sol, Santa Ana';
  }

  if (text.includes('los reyes') || text.includes('guácima') || text.includes('guacima')) {
    return language === 'en'
      ? 'Golf Course Home & Lot in Hacienda Los Reyes, La Guácima'
      : 'Casa y Terreno con Vista al Golf en Hacienda Los Reyes, La Guácima';
  }

  if (text.includes('belén') || text.includes('belen')) {
    return language === 'en'
      ? 'Gated Community Home in Belén, Heredia'
      : 'Casa en Condominio Cerrado en Belén, Heredia';
  }

  if (text.includes('manuel antonio')) {
    return language === 'en'
      ? 'Panoramic Ocean View Estate in Manuel Antonio, Quepos'
      : 'Finca con Vista Panorámica al Mar en Manuel Antonio, Quepos';
  }

  if (text.includes('monterán') || text.includes('monteran') || text.includes('granadilla')) {
    return language === 'en'
      ? 'Tuscan-Style Luxury Estate in Monterán, Curridabat'
      : 'Residencia Estilo Toscano en Monterán, Curridabat';
  }

  if (text.includes('las palmas') || text.includes('playas del coco') || text.includes('coco')) {
    return language === 'en'
      ? 'Furnished Beach Villa in Las Palmas, Playas del Coco'
      : 'Villa Amueblada en Las Palmas, Playas del Coco';
  }

  if (text.includes('arenal') || text.includes('florencia') || text.includes('ron ron')) {
    return language === 'en'
      ? 'Arenal Volcano Eco-Farm & Estate in San Carlos'
      : 'Finca Ecoturística y Agropecuaria en Volcán Arenal, San Carlos';
  }

  if (text.includes('rohrmoser') || text.includes('el cedro') || (text.includes('pavas') && text.includes('comercial'))) {
    return language === 'en'
      ? 'First-Floor Commercial Suite & Corporate Offices in Rohrmoser'
      : 'Local Comercial y Oficinas Corporativas en Rohrmoser';
  }

  if (text.includes('grecia') || text.includes('san isidro')) {
    return language === 'en'
      ? 'Country Villa & Fruit Orchard in San Isidro, Grecia'
      : 'Quinta Campestre con Frutales en San Isidro, Grecia';
  }

  // 2. Fallback to clean, 100% localized structured title
  const typeMap: Record<PropertyType, { es: string; en: string }> = {
    single_family_home: {
      es: `Casa de Habitación en ${auction.district}, ${auction.canton}`,
      en: `Single-Family Home in ${auction.district}, ${auction.canton}`,
    },
    condo_apartment: {
      es: `Condominio Residencial en ${auction.district}, ${auction.canton}`,
      en: `Residential Condominium in ${auction.district}, ${auction.canton}`,
    },
    building_lot: {
      es: `Lote para Construir en ${auction.district}, ${auction.canton}`,
      en: `Building Lot in ${auction.district}, ${auction.canton}`,
    },
    agricultural_land: {
      es: `Finca Agrícola / Quinta en ${auction.district}, ${auction.canton}`,
      en: `Agricultural Land / Farm in ${auction.district}, ${auction.canton}`,
    },
    commercial_industrial: {
      es: `Inmueble Comercial / Industrial en ${auction.district}, ${auction.canton}`,
      en: `Commercial / Industrial Property in ${auction.district}, ${auction.canton}`,
    },
    other: {
      es: `Inmueble Judicial en ${auction.district}, ${auction.canton}`,
      en: `Judicial Foreclosure Property in ${auction.district}, ${auction.canton}`,
    },
  };

  return typeMap[propertyType]?.[language] || `${auction.district}, ${auction.canton}`;
}



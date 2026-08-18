import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Auction, Currency, InvestorMetrics, CostaRicaClosingCosts, PropertyType, MortgagePriority } from './types/auction';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
export function calculateInvestorMetrics(auction: Auction, callNumber: 1 | 2 | 3 = 1): InvestorMetrics {
  let currentBasePrice = auction.base_price_call_1;
  if (callNumber === 2 && auction.base_price_call_2) {
    currentBasePrice = auction.base_price_call_2;
  } else if (callNumber === 3 && auction.base_price_call_3) {
    currentBasePrice = auction.base_price_call_3;
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
 * Get remaining days until auction with bilingual labels
 */
export function getDaysUntilAuction(dateString: string, lang: string = 'es'): { days: number; isPast: boolean; label: string } {
  try {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (lang === 'en') {
      if (diffDays < 0) {
        return { days: Math.abs(diffDays), isPast: true, label: `Ended ${Math.abs(diffDays)}d ago` };
      }
      if (diffDays === 0) {
        return { days: 0, isPast: false, label: 'Today!' };
      }
      if (diffDays === 1) {
        return { days: 1, isPast: false, label: 'Tomorrow' };
      }
      return { days: diffDays, isPast: false, label: `In ${diffDays} days` };
    }

    if (diffDays < 0) {
      return { days: Math.abs(diffDays), isPast: true, label: `Finalizó hace ${Math.abs(diffDays)}d` };
    }
    if (diffDays === 0) {
      return { days: 0, isPast: false, label: '¡Hoy mismo!' };
    }
    if (diffDays === 1) {
      return { days: 1, isPast: false, label: 'Mañana' };
    }
    return { days: diffDays, isPast: false, label: `En ${diffDays} días` };
  } catch {
    return { days: 0, isPast: false, label: lang === 'en' ? 'Date pending' : 'Fecha pendiente' };
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
 * frontage, condominium status, and mortgage priority.
 */
export function detectPropertyCharacteristics(data: {
  address_description?: string | null;
  legal_summary?: string | null;
  raw_edict_text?: string | null;
  property_type?: PropertyType;
  property_category?: string;
  has_construction?: boolean;
  has_public_road_frontage?: boolean;
  is_condominio?: boolean;
  mortgage_priority?: MortgagePriority;
}) {
  const text = `${data.address_description || ''} ${data.legal_summary || ''} ${data.raw_edict_text || ''}`.toLowerCase();

  // 1. Property Type
  let propertyType: PropertyType = data.property_type || 'other';
  if (!data.property_type || data.property_type === 'other') {
    if (text.includes('condominio') || text.includes('filial') || text.includes('apartamento') || text.includes('penthouse')) {
      propertyType = 'condo_apartment';
    } else if (text.includes('comercial') || text.includes('oficina') || text.includes('bodega') || text.includes('local') || text.includes('industrial') || text.includes('plaza')) {
      propertyType = 'commercial_industrial';
    } else if (text.includes('finca') || text.includes('agrícola') || text.includes('agricola') || text.includes('ganadera') || text.includes('repasto') || text.includes('cultivo')) {
      propertyType = 'agricultural_land';
    } else if (text.includes('casa') || text.includes('habitación') || text.includes('habitacion') || text.includes('unifamiliar') || text.includes('residencial') || text.includes('villa') || text.includes('quinta') || text.includes('residencia')) {
      propertyType = 'single_family_home';
    } else if (text.includes('lote') || text.includes('terreno') || text.includes('solar') || text.includes('para construir') || text.includes('desarrollo')) {
      propertyType = 'building_lot';
    }
  }

  // 2. Has Construction
  let hasConstruction = data.has_construction;
  if (typeof hasConstruction !== 'boolean') {
    const constructionKeywords = [
      'casa', 'edificio', 'edificación', 'edificacion', 'construcción', 'construccion',
      'bodega', 'local', 'oficina', 'oficinas', 'filial', 'apartamento', 'penthouse',
      'villa', 'quinta', 'residencia', 'mejoras', 'planta', 'habitaciones', 'baños',
      'banos', 'cochera', 'garaje', 'piscina', 'mampostería', 'mamposteria', 'piso',
      'techada', 'seguridad', 'acabados'
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

  // 3. Public Road Frontage
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

  // 4. Is Condominio
  let isCondominio = data.is_condominio;
  if (typeof isCondominio !== 'boolean') {
    isCondominio = (
      propertyType === 'condo_apartment' ||
      text.includes('condominio') ||
      text.includes('finca filial') ||
      text.includes('filial') ||
      text.includes('7933')
    );
  }

  // 5. Mortgage Priority
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



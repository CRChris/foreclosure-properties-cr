import { 
  Auction, 
  CostaRicaProvince, 
  Currency, 
  PropertyCategory, 
  PropertyType, 
  MortgagePriority,
  AuctionCallStage,
  AuctionSaleStatus,
  AuctionLifecycleLog,
  IngestionLog,
  LocationType,
} from '@/lib/types/auction';
import { detectPropertyCharacteristics, getLiveAuctionProgressionState } from '@/lib/utils';
import { geocodePropertyLocation, extractCentroidFromGeometry } from '@/lib/services/snitGeocodeService';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from './client';

export interface WatchlistItem {
  id: string;
  user_id?: string;
  auction_id: string;
  notes?: string | null;
  target_bid?: number | null;
  created_at?: string;
  auction?: Auction;
}

function normalizeGeoKey(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COSTA_RICA_CENTROIDS: Record<string, [number, number]> = {
  // San José Province
  'san jose': [9.9281, -84.0907],
  'escazu': [9.9248, -84.1432],
  'desamparados': [9.8988, -84.0678],
  'puriscal': [9.8456, -84.3128],
  'tarrazu': [9.6601, -84.0272],
  'aserri': [9.8322, -84.1167],
  'mora': [9.9142, -84.2464],
  'goicoechea': [9.9482, -84.0489],
  'santa ana': [9.9326, -84.1825],
  'alajuelita': [9.8978, -84.0997],
  'coronado': [9.9753, -84.0086],
  'vazquez de coronado': [9.9753, -84.0086],
  'acosta': [9.7972, -84.1611],
  'tibas': [9.9575, -84.0817],
  'moravia': [9.9678, -84.0489],
  'montes de oca': [9.9372, -84.0514],
  'san pedro': [9.9372, -84.0514],
  'turrubares': [9.8000, -84.4833],
  'dota': [9.6542, -83.9278],
  'curridabat': [9.9156, -84.0353],
  'granadilla': [9.9285, -84.0241],
  'perez zeledon': [9.3739, -83.7058],
  'san isidro de el general': [9.3739, -83.7058],
  'san isidro': [9.3739, -83.7058],
  'daniel flores': [9.3500, -83.6833],
  'rivas': [9.4300, -83.6500],
  'platanares': [9.2800, -83.6100],
  'pejibaye': [9.2100, -83.6600],
  'cajon': [9.2600, -83.5600],
  'baru': [9.2700, -83.8200],
  'rio nuevo': [9.4500, -83.8300],
  'paramo': [9.4800, -83.7100],
  'la amistad': [9.2400, -83.4700],
  'leon cortes': [9.6806, -84.0806],

  // Puntarenas Province
  'puntarenas': [9.9763, -84.8384],
  'esparza': [9.9944, -84.6667],
  'buenos aires': [9.1667, -83.3333],
  'montes de oro': [10.1500, -84.7333],
  'osa': [8.8833, -83.5167],
  'palmar': [8.9500, -83.4500],
  'quepos': [9.4319, -84.1619],
  'aguirre': [9.4319, -84.1619],
  'manuel antonio': [9.3889, -84.1528],
  'golfito': [8.6333, -83.1667],
  'coto brus': [8.9000, -82.9500],
  'san vito': [8.8200, -82.9700],
  'parrita': [9.5167, -84.3333],
  'corredores': [8.6000, -82.9500],
  'ciudad neily': [8.6500, -82.9400],
  'garabito': [9.6152, -84.6298],
  'jaco': [9.6152, -84.6298],
  'herradura': [9.6450, -84.6380],
  'playa hermosa': [9.5780, -84.6050],
  'tarcoles': [9.7640, -84.6280],
  'puerto jimenez': [8.5333, -83.3000],
  'monteverde': [10.3000, -84.8167],

  // Alajuela Province
  'alajuela': [10.0163, -84.2116],
  'san ramon': [10.0872, -84.4700],
  'grecia': [10.0739, -84.3117],
  'san mateo': [9.9500, -84.5333],
  'atenas': [9.9792, -84.3778],
  'naranjo': [10.0989, -84.3789],
  'palmares': [10.0578, -84.4333],
  'poas': [10.1333, -84.2333],
  'orotina': [9.9114, -84.5217],
  'san carlos': [10.3238, -84.4271],
  'ciudad quesada': [10.3238, -84.4271],
  'zarcero': [10.1833, -84.3833],
  'valverde vega': [10.1333, -84.3167],
  'sarchi': [10.1333, -84.3167],
  'upala': [10.8989, -85.0167],
  'los chiles': [11.0333, -84.7167],
  'guatuso': [10.6667, -84.8333],
  'rio cuarto': [10.3456, -84.2167],
  'la guacima': [9.9722, -84.2889],

  // Cartago Province
  'cartago': [9.8644, -83.9194],
  'paraiso': [9.8389, -83.8667],
  'la union': [9.9076, -83.9875],
  'tres rios': [9.9076, -83.9875],
  'jimenez': [9.7833, -83.7333],
  'turrialba': [9.9047, -83.6833],
  'alvarado': [9.9667, -83.8167],
  'oreamuno': [9.8833, -83.9000],
  'el guarco': [9.8167, -83.9333],

  // Heredia Province
  'heredia': [9.9989, -84.1167],
  'barva': [10.0167, -84.1167],
  'santo domingo': [9.9833, -84.0833],
  'santa barbara': [10.0333, -84.1667],
  'san rafael': [10.0167, -84.1000],
  'belen': [9.9812, -84.1795],
  'flores': [10.0000, -84.1500],
  'san pablo': [9.9917, -84.0972],
  'sarapiqui': [10.4500, -84.0167],

  // Guanacaste Province
  'liberia': [10.6333, -85.4333],
  'nicoya': [10.1444, -85.4542],
  'santa cruz': [10.2625, -85.5853],
  'tamarindo': [10.2993, -85.8402],
  'bagaces': [10.5167, -85.2500],
  'carrillo': [10.4667, -85.5500],
  'playas del coco': [10.5500, -85.6967],
  'canas': [10.4333, -85.0833],
  'abangares': [10.2833, -84.9500],
  'tilaran': [10.4667, -84.9667],
  'nandayure': [9.9833, -85.2500],
  'la cruz': [11.0667, -85.6333],
  'hojancha': [10.0667, -85.4167],
  'guanacaste': [10.4667, -85.5500],

  // Limón Province
  'limon': [9.9907, -83.0360],
  'pococi': [10.2000, -83.7833],
  'guapiles': [10.2167, -83.7833],
  'siquirres': [10.1000, -83.5167],
  'talamanca': [9.6333, -82.8500],
  'puerto viejo': [9.6550, -82.7540],
  'matina': [10.0833, -83.3333],
  'guacimo': [10.2167, -83.6833],
};

const UNIQUE_REAL_ESTATE_GALLERIES: string[][] = [
  // 0: Escazú Los Laureles Condo
  [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 1: Jacó Beachfront Penthouse
  [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  // 2: Tamarindo Beach Luxury Villa
  [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 3: Santa Ana Valle del Sol Residence
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  // 4: Los Reyes Golf Country Estate
  [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  // 5: Belén Heredia Gated Residence
  [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
  // 6: Manuel Antonio Ocean View Parcel
  [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  ],
  // 7: Monterán Curridabat Estate
  [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  // 8: Playas del Coco Beach Condo
  [
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  // 9: Arenal Volcano San Carlos Eco-Estate
  [
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  // 10: Rohrmoser Commercial Plaza & Offices
  [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
  ],
  // 11: Grecia Quinta Campestre
  [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ],
];

/**
 * Decodes PostGIS Hex EWKB geometry point (e.g. '0101000020E6100000...') into WGS84 [lng, lat]
 */
function parseHexEWKBPoint(hex: string): { lng: number; lat: number } | null {
  if (typeof hex !== 'string' || hex.length < 42 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  try {
    const buf = Buffer.from(hex, 'hex');
    const isLittleEndian = buf.readUInt8(0) === 1;
    let offset = 5;
    const type = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
    // Check if SRID flag (0x20000000) is present
    if ((type & 0x20000000) !== 0) {
      offset = 9;
    }
    const x = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
    const y = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
    if (!isNaN(x) && !isNaN(y) && x >= -86.5 && x <= -82.0 && y >= 8.0 && y <= 12.0) {
      return { lng: x, lat: y };
    }
  } catch {
    // ignore
  }
  return null;
}

function mapRowToAuction(item: any): Auction {
  let lat = typeof item.latitude === 'number' 
    ? item.latitude 
    : (typeof item.lat === 'number' ? item.lat : (typeof item.coordinates_lat === 'number' ? item.coordinates_lat : null));
  let lng = typeof item.longitude === 'number' 
    ? item.longitude 
    : (typeof item.lng === 'number' ? item.lng : (typeof item.coordinates_lng === 'number' ? item.coordinates_lng : null));

  // Debug: log what the DB returned so we can trace coordinate source issues
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_COORDS === 'true') {
    console.log(`[mapRowToAuction] id=${item.id} folio=${item.folio_real}`, {
      latitude: item.latitude, longitude: item.longitude,
      lat: item.lat, lng: item.lng,
      location_type: typeof item.location, location_sample: typeof item.location === 'string' ? item.location.slice(0, 40) : item.location,
      resolvedLat: lat, resolvedLng: lng,
    });
  }


  let parcelPolygonObj: any = null;
  if (item.parcel_polygon) {
    if (typeof item.parcel_polygon === 'string') {
      try {
        parcelPolygonObj = JSON.parse(item.parcel_polygon);
      } catch {
        parcelPolygonObj = null;
      }
    } else if (typeof item.parcel_polygon === 'object') {
      parcelPolygonObj = item.parcel_polygon;
    }
  }

  // If coordinates are not yet resolved, try parsing item.location
  if ((lat === null || lng === null) && item.location) {
    if (typeof item.location === 'object' && Array.isArray(item.location.coordinates)) {
      lng = item.location.coordinates[0];
      lat = item.location.coordinates[1];
    } else if (typeof item.location === 'string') {
      // 1. Try WKT POINT(lng lat) or SRID=4326;POINT(lng lat)
      const match = item.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      } else {
        // 2. Try PostGIS Hex EWKB binary representation
        const hexPoint = parseHexEWKBPoint(item.location);
        if (hexPoint) {
          lng = hexPoint.lng;
          lat = hexPoint.lat;
        }
      }
    }
  }

  // If still missing coordinates but parcel_polygon exists, compute centroid from polygon
  if ((lat === null || lng === null) && parcelPolygonObj) {
    const centroid = extractCentroidFromGeometry(
      parcelPolygonObj.type === 'FeatureCollection'
        ? parcelPolygonObj.features?.[0]?.geometry
        : (parcelPolygonObj.type === 'Feature' ? parcelPolygonObj.geometry : parcelPolygonObj)
    );
    if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
      lat = centroid.lat;
      lng = centroid.lng;
    }
  }

  const isExactCadastral = item.location_type === 'exact_cadastral' || (parcelPolygonObj !== null);

  const normalizedDistrict = normalizeGeoKey(item.district);
  const normalizedCanton = normalizeGeoKey(item.canton);
  const normalizedProv = normalizeGeoKey(item.province || 'san jose');
  const fullText = `${item.canton || ''} ${item.district || ''} ${item.address_description || ''} ${item.legal_summary || ''}`.toLowerCase();

  // Safeguard: ONLY apply general town centroids if exact cadastral location is NOT present
  if (!isExactCadastral) {
    const isPerezZeledon = 
      normalizedCanton.includes('perez zeledon') ||
      normalizedDistrict.includes('perez zeledon') ||
      normalizedDistrict === 'daniel flores' ||
      normalizedDistrict === 'rivas' ||
      fullText.includes('perez zeledon') ||
      fullText.includes('pérez zeledón') ||
      fullText.includes('san isidro de el general');

    const isGarabitoOrJaco =
      normalizedCanton.includes('garabito') ||
      normalizedDistrict.includes('jaco') ||
      normalizedDistrict.includes('jacó') ||
      fullText.includes('garabito') ||
      fullText.includes('jaco') ||
      fullText.includes('jacó') ||
      fullText.includes('herradura');

    if (isPerezZeledon && !isGarabitoOrJaco) {
      // If coordinates are missing or mistakenly placed at Jacó / West Coast Puntarenas, override to Pérez Zeledón
      if (!lat || !lng || (lat > 9.55 && lat < 9.70 && lng < -84.50 && lng > -84.75)) {
        lat = 9.3739;
        lng = -83.7058;
      }
    } else if (isGarabitoOrJaco && !isPerezZeledon) {
      if (!lat || !lng || (lat < 9.45 && lng > -83.85)) {
        lat = 9.6152;
        lng = -84.6298;
      }
    } else if (!lat || !lng) {
      if (COSTA_RICA_CENTROIDS[normalizedDistrict]) {
        [lat, lng] = COSTA_RICA_CENTROIDS[normalizedDistrict];
      } else if (COSTA_RICA_CENTROIDS[normalizedCanton]) {
        [lat, lng] = COSTA_RICA_CENTROIDS[normalizedCanton];
      } else if (COSTA_RICA_CENTROIDS[normalizedProv]) {
        [lat, lng] = COSTA_RICA_CENTROIDS[normalizedProv];
      } else {
        lat = 9.9281;
        lng = -84.0907;
      }
    }
  } else if (!lat || !lng) {
    if (COSTA_RICA_CENTROIDS[normalizedDistrict]) {
      [lat, lng] = COSTA_RICA_CENTROIDS[normalizedDistrict];
    } else if (COSTA_RICA_CENTROIDS[normalizedCanton]) {
      [lat, lng] = COSTA_RICA_CENTROIDS[normalizedCanton];
    } else if (COSTA_RICA_CENTROIDS[normalizedProv]) {
      [lat, lng] = COSTA_RICA_CENTROIDS[normalizedProv];
    } else {
      lat = 9.9281;
      lng = -84.0907;
    }
  }

  // Derive smart property category from text if column not present in table
  let category: PropertyCategory = (item.property_category as PropertyCategory) || 'Residential';
  const textSearch = `${item.address_description || ''} ${item.legal_summary || ''} ${item.raw_edict_text || ''}`.toLowerCase();
  
  if (!item.property_category) {
    if (textSearch.includes('condominio') || textSearch.includes('penthouse') || textSearch.includes('filial') || textSearch.includes('apartamento')) {
      category = 'Condo';
    } else if (textSearch.includes('playa') || textSearch.includes('lujo') || textSearch.includes('villa') || textSearch.includes('quinta') || textSearch.includes('golf') || textSearch.includes('reyes') || textSearch.includes('langosta')) {
      category = 'Luxury Estate';
    } else if (textSearch.includes('comercial') || textSearch.includes('oficina') || textSearch.includes('local') || textSearch.includes('bodega')) {
      category = 'Commercial';
    } else if (textSearch.includes('finca') || textSearch.includes('agrícola') || textSearch.includes('agricola') || textSearch.includes('ganadera') || textSearch.includes('arenal') || textSearch.includes('fortuna')) {
      category = 'Agricultural';
    } else if (textSearch.includes('terreno') || textSearch.includes('lote') || textSearch.includes('solar') || textSearch.includes('desarrollo') || textSearch.includes('parque nacional')) {
      category = 'Land/Development';
    }
  }

  // Derive Property Characteristics using robust detector
  const {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority,
  } = detectPropertyCharacteristics(item);

  // Parse linderos if present or extract from text
  let nNorte = item.lindero_norte || null;
  let nSur = item.lindero_sur || null;
  let nEste = item.lindero_este || null;
  let nOeste = item.lindero_oeste || null;

  if (!nNorte && item.raw_edict_text) {
    const mNorte = item.raw_edict_text.match(/norte[:\s]+([^;,.\n]+)/i);
    if (mNorte) nNorte = mNorte[1].trim();
    const mSur = item.raw_edict_text.match(/sur[:\s]+([^;,.\n]+)/i);
    if (mSur) nSur = mSur[1].trim();
    const mEste = item.raw_edict_text.match(/este[:\s]+([^;,.\n]+)/i);
    if (mEste) nEste = mEste[1].trim();
    const mOeste = item.raw_edict_text.match(/oeste[:\s]+([^;,.\n]+)/i);
    if (mOeste) nOeste = mOeste[1].trim();
  }

  // Assign distinct deterministic gallery for each property based on expediente / ID
  const seedString = String(item.expediente_number || item.id || item.folio_real || '0');
  const hash = Math.abs(seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const galleryIndex = hash % UNIQUE_REAL_ESTATE_GALLERIES.length;
  const uniqueGallery = UNIQUE_REAL_ESTATE_GALLERIES[galleryIndex];

  const auctionObj: Auction = {
    id: String(item.id),
    expediente_number: item.expediente_number,
    court_name: item.court_name,
    folio_real: item.folio_real,
    plano_catastrado: item.plano_catastrado || null,
    province: item.province as CostaRicaProvince,
    canton: item.canton || 'Central',
    district: item.district || 'Central',
    address_description: item.address_description || null,
    area_m2: Number(item.area_m2) || 100,
    currency: (item.currency || 'USD') as Currency,
    property_category: category,
    property_type: propertyType,
    naturaleza_raw: item.naturaleza_raw || item.address_description || null,
    has_construction: hasConstruction,
    has_public_road_frontage: hasPublicRoad,
    is_condominio: isCondominio,
    lindero_norte: nNorte,
    lindero_sur: nSur,
    lindero_este: nEste,
    lindero_oeste: nOeste,
    servidumbres_notes: item.servidumbres_notes || null,
    mortgage_priority: mortgagePriority,
    base_price_call_1: Number(item.base_price_call_1),
    auction_date_call_1: item.auction_date_call_1,
    base_price_call_2: item.base_price_call_2 ? Number(item.base_price_call_2) : null,
    auction_date_call_2: item.auction_date_call_2 || null,
    base_price_call_3: item.base_price_call_3 ? Number(item.base_price_call_3) : null,
    auction_date_call_3: item.auction_date_call_3 || null,
    call_stage: item.call_stage || undefined,
    sale_status: item.sale_status || undefined,
    current_call_number: item.current_call_number !== undefined && item.current_call_number !== null ? Number(item.current_call_number) as (1 | 2 | 3) : undefined,
    current_base_price: item.current_base_price ? Number(item.current_base_price) : undefined,
    current_auction_date: item.current_auction_date || undefined,
    current_discount_pct: item.current_discount_pct !== undefined && item.current_discount_pct !== null ? Number(item.current_discount_pct) : undefined,
    last_status_sync_at: item.last_status_sync_at || undefined,
    estimated_market_value: item.estimated_market_value ? Number(item.estimated_market_value) : null,
    estimated_margin_pct: item.estimated_margin_pct ? Number(item.estimated_margin_pct) : null,
    plaintiff: item.plaintiff || 'Entidad Financiera',
    defendant: item.defendant || null,
    legal_summary: item.legal_summary || null,
    raw_edict_text: item.raw_edict_text || '',
    latitude: lat,
    longitude: lng,
    location_type: (item.location_type as any) || (parcelPolygonObj ? 'exact_cadastral' : 'approximate_town'),
    parcel_polygon: parcelPolygonObj,
    images: Array.isArray(item.images) && item.images.length > 0 ? item.images : uniqueGallery,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };

  // If live progression fields are not present in row, use live calculator fallback
  if (!auctionObj.call_stage || !auctionObj.sale_status || auctionObj.current_base_price === undefined) {
    const live = getLiveAuctionProgressionState(auctionObj);
    auctionObj.call_stage = auctionObj.call_stage || live.callStage;
    auctionObj.sale_status = auctionObj.sale_status || live.saleStatus;
    auctionObj.current_call_number = auctionObj.current_call_number !== undefined ? auctionObj.current_call_number : live.currentCallNumber;
    auctionObj.current_base_price = auctionObj.current_base_price || live.currentBasePrice;
    auctionObj.current_auction_date = auctionObj.current_auction_date || live.currentAuctionDate;
    auctionObj.current_discount_pct = auctionObj.current_discount_pct !== undefined ? auctionObj.current_discount_pct : live.currentDiscountPct;
  }

  return auctionObj;
}

/**
 * Fetch all auctions from Supabase or fallback to mock data
 */
export async function fetchAuctions(params?: {
  province?: string | null;
  canton?: string | null;
  currency?: string | null;
  query?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  callStage?: string | null;
  includePast?: boolean;
  minLng?: number | null;
  minLat?: number | null;
  maxLng?: number | null;
  maxLat?: number | null;
}): Promise<Auction[]> {
  if (!isSupabaseConfigured()) {
    // If no Supabase, return all mock data (API route will filter in memory as fallback)
    return MOCK_AUCTIONS;
  }

  try {
    const supabase = createClient();
    
    // If bounding box is provided, use the spatial RPC
    if (params?.minLng !== undefined && params?.minLng !== null && 
        params?.minLat !== undefined && params?.minLat !== null &&
        params?.maxLng !== undefined && params?.maxLng !== null &&
        params?.maxLat !== undefined && params?.maxLat !== null) {
      
      let rpcQuery = supabase.rpc('get_auctions_in_bounds', {
        min_lng: params.minLng,
        min_lat: params.minLat,
        max_lng: params.maxLng,
        max_lat: params.maxLat,
        target_currency: params.currency && params.currency !== 'all' ? params.currency.toUpperCase() : null,
        max_price: params.maxPrice !== undefined ? params.maxPrice : null
      });

      const { data, error } = await rpcQuery;
      if (error || !data) return MOCK_AUCTIONS;
      
      let results = data.map(mapRowToAuction);
      
      // Apply remaining filters in-memory for spatial results (RPC doesn't handle all filters yet)
      if (params.province && params.province !== 'all') {
        results = results.filter((a: Auction) => a.province.toLowerCase() === params.province!.toLowerCase());
      }
      if (params.canton) {
        results = results.filter((a: Auction) => a.canton.toLowerCase() === params.canton!.toLowerCase());
      }
      if (params.callStage && params.callStage !== 'all') {
        results = results.filter((a: Auction) => (a.call_stage || '') === params.callStage);
      } else if (!params.includePast) {
        results = results.filter((a: Auction) => {
          const live = getLiveAuctionProgressionState(a);
          return live.callStage !== 'passed_call_3' && live.saleStatus !== 'deserted';
        });
      }
      if (params.minPrice !== null && params.minPrice !== undefined) {
        results = results.filter((a: Auction) => a.base_price_call_1 >= params.minPrice!);
      }
      if (params.query) {
        const q = params.query.toLowerCase();
        results = results.filter(
          (a: Auction) =>
            a.canton.toLowerCase().includes(q) ||
            a.district.toLowerCase().includes(q) ||
            a.province.toLowerCase().includes(q) ||
            a.expediente_number.toLowerCase().includes(q) ||
            a.folio_real.toLowerCase().includes(q) ||
            a.plaintiff.toLowerCase().includes(q)
        );
      }
      
      return results;
    }

    // Standard Query without spatial bounds — uses view that exposes latitude/longitude as numeric columns
    let query = supabase.from('auctions_with_coords').select('*');

    if (params?.province && params.province !== 'all') {
      query = query.ilike('province', params.province);
    }
    if (params?.canton) {
      query = query.ilike('canton', params.canton);
    }
    if (params?.currency && params.currency !== 'all') {
      query = query.eq('currency', params.currency.toUpperCase());
    }
    if (params?.minPrice !== undefined && params.minPrice !== null) {
      query = query.gte('base_price_call_1', params.minPrice);
    }
    if (params?.maxPrice !== undefined && params.maxPrice !== null) {
      query = query.lte('base_price_call_1', params.maxPrice);
    }
    
    // Active / Call Stage filter
    if (params?.callStage && params.callStage !== 'all') {
      query = query.eq('call_stage', params.callStage);
    } else if (!params?.includePast) {
      query = query.neq('call_stage', 'passed_call_3').neq('sale_status', 'deserted');
    }

    // Text Search
    if (params?.query && params.query.trim()) {
      const sanitized = params.query.replace(/[,()"]/g, ' ').trim();
      if (sanitized) {
        const q = `%${sanitized}%`;
        query = query.or(`canton.ilike.${q},district.ilike.${q},province.ilike.${q},expediente_number.ilike.${q},folio_real.ilike.${q},plaintiff.ilike.${q}`);
      }
    }

    query = query.order('auction_date_call_1', { ascending: true });

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Error fetching from Supabase query, falling back:', error);
      return MOCK_AUCTIONS;
    }

    const mapped = data.map(mapRowToAuction);

    // If includePast is false (default), dynamically filter out any auctions that have elapsed all 3 calls
    if (!params?.includePast && (!params?.callStage || params.callStage === 'all')) {
      return mapped.filter((a) => {
        const live = getLiveAuctionProgressionState(a);
        return live.callStage !== 'passed_call_3' && live.saleStatus !== 'deserted';
      });
    }

    return mapped;
  } catch (err) {
    console.warn('Error fetching from Supabase, using mock dataset:', err);
    return MOCK_AUCTIONS;
  }
}

/**
 * Fetch single auction by ID
 */
export async function fetchAuctionById(id: string): Promise<Auction | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('auctions_with_coords')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return mapRowToAuction(data);
      }
    } catch {
      // ignore
    }
  }

  // Fallback to mock data by ID
  const mock = MOCK_AUCTIONS.find((a) => a.id === id);
  return mock || null;
}

/**
 * User Watchlist Operations
 */
export async function fetchUserWatchlist(userId?: string): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured() || !userId) {
    if (typeof window === 'undefined') return [];
    try {
      const items: WatchlistItem[] = [];
      const allAuctions = await fetchAuctions({ includePast: true });
      for (const auction of allAuctions) {
        const saved = localStorage.getItem(`saved_auction_${auction.id}`);
        if (saved === 'true') {
          const notes = localStorage.getItem(`notes_auction_${auction.id}`);
          const targetBid = localStorage.getItem(`target_bid_auction_${auction.id}`);
          items.push({
            id: `local_${auction.id}`,
            auction_id: auction.id,
            notes: notes || null,
            target_bid: targetBid ? Number(targetBid) : null,
            auction,
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('*, auctions(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      auction_id: item.auction_id,
      notes: item.notes,
      target_bid: item.target_bid,
      created_at: item.created_at,
      auction: item.auctions ? mapRowToAuction(item.auctions) : undefined,
    }));
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    return [];
  }
}

export async function saveToWatchlist(
  auctionId: string,
  userId?: string,
  notes?: string,
  targetBid?: number
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`saved_auction_${auctionId}`, 'true');
      if (notes !== undefined) localStorage.setItem(`notes_auction_${auctionId}`, notes);
      if (targetBid !== undefined) localStorage.setItem(`target_bid_auction_${auctionId}`, String(targetBid));
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured() || !userId) {
    return true;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('user_watchlists').upsert(
      {
        user_id: userId,
        auction_id: auctionId,
        notes: notes || null,
        target_bid: targetBid || null,
      },
      { onConflict: 'user_id,auction_id' }
    );
    return !error;
  } catch (err) {
    console.error('Error saving to watchlist in Supabase:', err);
    return false;
  }
}

export async function removeFromWatchlist(auctionId: string, userId?: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`saved_auction_${auctionId}`);
      localStorage.removeItem(`notes_auction_${auctionId}`);
      localStorage.removeItem(`target_bid_auction_${auctionId}`);
    } catch {
      // ignore
    }
  }

  if (!isSupabaseConfigured() || !userId) {
    return true;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('auction_id', auctionId);
    return !error;
  } catch (err) {
    console.error('Error removing from watchlist in Supabase:', err);
    return false;
  }
}

/**
 * Trigger batch lifecycle and call progression sync in Supabase via single PostgreSQL RPC
 */
export async function syncAuctionProgressionRPC(): Promise<{
  success: boolean;
  total_processed: number;
  total_updated: number;
  transitions: any[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      total_processed: 0,
      total_updated: 0,
      transitions: [],
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('sync_auction_lifecycle_statuses');
    if (error) {
      console.error('Error executing sync_auction_lifecycle_statuses RPC:', error);
      return {
        success: false,
        total_processed: 0,
        total_updated: 0,
        transitions: [],
        error: error.message,
      };
    }

    return (
      data || {
        success: true,
        total_processed: 0,
        total_updated: 0,
        transitions: [],
      }
    );
  } catch (err: any) {
    console.error('Exception calling sync_auction_lifecycle_statuses:', err);
    return {
      success: false,
      total_processed: 0,
      total_updated: 0,
      transitions: [],
      error: err.message || String(err),
    };
  }
}

/**
 * Fetch audit logs for an auction's progression history
 */
export async function fetchAuctionLifecycleLogs(auctionId?: string): Promise<AuctionLifecycleLog[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = createClient();
    let query = supabase
      .from('auction_lifecycle_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    }

    const { data, error } = await query.limit(50);
    if (error) {
      console.error('Error fetching auction lifecycle logs:', error);
      return [];
    }

    return (data || []) as AuctionLifecycleLog[];
  } catch (err) {
    console.error('Exception fetching auction lifecycle logs:', err);
    return [];
  }
}

/**
 * Fetch daily scraper & pipeline ingestion logs
 */
export async function fetchIngestionLogs(): Promise<IngestionLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ingestion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        return data as IngestionLog[];
      }
    } catch (err) {
      console.warn('Could not fetch ingestion_logs from Supabase, returning mock logs:', err);
    }
  }

  // Graceful fallback mock ingestion logs
  return [
    {
      id: 'log-today',
      run_date: new Date().toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'no_new_properties',
      total_edicts_found: 18,
      properties_added: 0,
      properties_skipped: 18,
      expedientes_added: [],
      error_message: null,
      duration_seconds: 4.35,
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'log-yesterday',
      run_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'success',
      total_edicts_found: 24,
      properties_added: 16,
      properties_skipped: 8,
      expedientes_added: ['24-000123-1158-CJ', '23-004589-1012-CJ', '24-001892-0994-CJ', '23-008912-1200-CJ'],
      error_message: null,
      duration_seconds: 14.82,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'log-prev',
      run_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'boletin_judicial',
      status: 'no_new_properties',
      total_edicts_found: 12,
      properties_added: 0,
      properties_skipped: 12,
      expedientes_added: [],
      error_message: null,
      duration_seconds: 3.90,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Updates an existing auction's coordinates, cadastral location type, and parcel polygon.
 */
export async function updateAuctionLocation(
  auctionId: string,
  locationData: {
    latitude: number;
    longitude: number;
    location_type: LocationType;
    parcel_polygon?: any | null;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = createClient();
    const locationWkt = `SRID=4326;POINT(${locationData.longitude} ${locationData.latitude})`;

    const { error } = await supabase
      .from('auctions')
      .update({
        location: locationWkt,
        location_type: locationData.location_type,
        parcel_polygon: locationData.parcel_polygon || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId);

    if (error) {
      console.error(`Error updating location for auction ${auctionId}:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Exception updating location for auction ${auctionId}:`, err);
    return false;
  }
}

/**
 * Ingests a new auction property into Supabase with automatic SNIT cadastral geocoding hook.
 * Calls snitGeocodeService to resolve exact cadastral coordinates/polygons,
 * falling back to town/district centroids if unindexed.
 */
export async function ingestAuctionWithCadastralGeocoding(
  auctionData: Partial<Auction> & {
    expediente_number: string;
    court_name: string;
    folio_real: string;
    province: CostaRicaProvince;
    area_m2: number;
    currency: Currency;
    base_price_call_1: number;
    auction_date_call_1: string;
    plaintiff: string;
    raw_edict_text: string;
  }
): Promise<Auction | null> {
  // 1. Perform SNIT Cadastral Geocoding with fallback
  const geocodeResult = await geocodePropertyLocation({
    plano: auctionData.plano_catastrado,
    province: auctionData.province,
    canton: auctionData.canton,
    district: auctionData.district,
  });

  const lat = geocodeResult.lat;
  const lng = geocodeResult.lng;
  const locationType = geocodeResult.location_type;
  const parcelPolygon = geocodeResult.parcel_polygon;
  const locationWkt = `SRID=4326;POINT(${lng} ${lat})`;

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning constructed auction entity');
    return mapRowToAuction({
      ...auctionData,
      id: auctionData.id || `mock-${Date.now()}`,
      latitude: lat,
      longitude: lng,
      location_type: locationType,
      parcel_polygon: parcelPolygon,
    });
  }

  try {
    const supabase = createClient();
    const payload = {
      ...auctionData,
      location: locationWkt,
      location_type: locationType,
      parcel_polygon: parcelPolygon || null,
      created_at: auctionData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('auctions')
      .upsert(payload, { onConflict: 'expediente_number' })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error ingesting auction with cadastral geocoding:', error);
      return null;
    }

    return mapRowToAuction(data);
  } catch (err) {
    console.error('Exception ingesting auction with cadastral geocoding:', err);
    return null;
  }
}




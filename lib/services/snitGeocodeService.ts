import proj4 from 'proj4';

// Define Costa Rica Transverse Mercator 2005 (CRTM05) Projection (EPSG:5367)
export const CRTM05_PROJ4_DEF =
  '+proj=tmerc +lat_0=0 +lon_0=-84 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs';
export const EPSG_5367 = 'EPSG:5367';
export const EPSG_4326 = 'EPSG:4326';

// Register projection definition with proj4
proj4.defs(EPSG_5367, CRTM05_PROJ4_DEF);

export interface NormalizedPlano {
  provincia: string; // '1' through '7'
  provinciaNombre: string; // e.g. 'Puntarenas', 'San José'
  numero: string; // e.g. '948699' (leading zeros stripped)
  anio: string; // e.g. '2004' (4 digits)
  raw: string;
}

export interface SnitGeocodeSuccessResult {
  success: true;
  lat: number;
  lng: number;
  polygonGeoJSON: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry;
  isExact: true;
  normalizedPlano: NormalizedPlano;
  properties?: Record<string, unknown>;
}

export interface SnitGeocodeFailureResult {
  success: false;
  isExact: false;
  error?: string;
  normalizedPlano?: NormalizedPlano | null;
}

export type SnitGeocodeResult = SnitGeocodeSuccessResult | SnitGeocodeFailureResult;

// Province lookup dictionary for Costa Rica
const PROVINCE_MAP: Record<string, { code: string; name: string }> = {
  // Province 1: San José
  '1': { code: '1', name: 'San José' },
  'SJ': { code: '1', name: 'San José' },
  'SAN JOSE': { code: '1', name: 'San José' },
  'SAN JOSÉ': { code: '1', name: 'San José' },

  // Province 2: Alajuela
  '2': { code: '2', name: 'Alajuela' },
  'A': { code: '2', name: 'Alajuela' },
  'AL': { code: '2', name: 'Alajuela' },
  'ALAJUELA': { code: '2', name: 'Alajuela' },

  // Province 3: Cartago
  '3': { code: '3', name: 'Cartago' },
  'C': { code: '3', name: 'Cartago' },
  'CAR': { code: '3', name: 'Cartago' },
  'CARTAGO': { code: '3', name: 'Cartago' },

  // Province 4: Heredia
  '4': { code: '4', name: 'Heredia' },
  'H': { code: '4', name: 'Heredia' },
  'HER': { code: '4', name: 'Heredia' },
  'HEREDIA': { code: '4', name: 'Heredia' },

  // Province 5: Guanacaste
  '5': { code: '5', name: 'Guanacaste' },
  'G': { code: '5', name: 'Guanacaste' },
  'GUA': { code: '5', name: 'Guanacaste' },
  'GUANACASTE': { code: '5', name: 'Guanacaste' },

  // Province 6: Puntarenas
  '6': { code: '6', name: 'Puntarenas' },
  'P': { code: '6', name: 'Puntarenas' },
  'PUN': { code: '6', name: 'Puntarenas' },
  'PUNTARENAS': { code: '6', name: 'Puntarenas' },

  // Province 7: Limón
  '7': { code: '7', name: 'Limón' },
  'L': { code: '7', name: 'Limón' },
  'LIM': { code: '7', name: 'Limón' },
  'LIMON': { code: '7', name: 'Limón' },
  'LIMÓN': { code: '7', name: 'Limón' },
};

/**
 * Normalizes a Costa Rican cadastral plano number.
 * Examples:
 * - "P-0948699-2004" -> { provincia: "6", provinciaNombre: "Puntarenas", numero: "948699", anio: "2004" }
 * - "6-948699-2004" -> { provincia: "6", provinciaNombre: "Puntarenas", numero: "948699", anio: "2004" }
 * - "SJ-12345-2010" -> { provincia: "1", provinciaNombre: "San José", numero: "12345", anio: "2010" }
 * - "A-005678-98"   -> { provincia: "2", provinciaNombre: "Alajuela", numero: "5678", anio: "1998" }
 */
export function normalizePlano(rawPlano?: string | null): NormalizedPlano | null {
  if (!rawPlano || typeof rawPlano !== 'string') {
    return null;
  }

  const cleaned = rawPlano.trim().toUpperCase();
  if (!cleaned) {
    return null;
  }

  // Split by common delimiters: hyphens, slashes, underscores, or spaces
  const parts = cleaned
    .replace(/[^A-Z0-9\u00C0-\u00FF]+/g, '-')
    .split('-')
    .filter(Boolean);

  if (parts.length < 3) {
    return null;
  }

  const rawProvincia = parts[0];
  const rawNumero = parts[1];
  const rawAnio = parts[2];

  const provMatch = PROVINCE_MAP[rawProvincia];
  if (!provMatch) {
    return null;
  }

  // Strip leading zeros from document number
  const numeroDigits = rawNumero.replace(/\D/g, '');
  const numero = numeroDigits.replace(/^0+/, '');
  if (!numero) {
    return null;
  }

  // Normalize year (2 digits to 4 digits if needed)
  let anio = rawAnio.replace(/\D/g, '');
  if (anio.length === 2) {
    const yr = parseInt(anio, 10);
    anio = yr >= 50 ? `19${anio}` : `20${anio}`;
  }

  if (anio.length !== 4) {
    return null;
  }

  return {
    provincia: provMatch.code,
    provinciaNombre: provMatch.name,
    numero,
    anio,
    raw: rawPlano,
  };
}

/**
 * Transforms a single [x, y] coordinate pair from CRTM05 (EPSG:5367) to WGS84 (EPSG:4326) [lng, lat].
 * If coordinates are already in WGS84 degrees range, returns them as-is.
 */
export function convertCrtm05ToWgs84(x: number, y: number): [number, number] {
  // CRTM05 coordinates in Costa Rica typically have Easting (X) 200k-700k and Northing (Y) 900k-1.3M
  const isLikelyCrtm05 = Math.abs(x) > 1000 || Math.abs(y) > 1000;
  if (!isLikelyCrtm05) {
    return [x, y];
  }

  const [lng, lat] = proj4(EPSG_5367, EPSG_4326, [x, y]);
  return [lng, lat];
}

/**
 * Recursively reprojects GeoJSON coordinates from CRTM05 to WGS84.
 */
function reprojectCoordinates(coords: any): any {
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  ) {
    return convertCrtm05ToWgs84(coords[0], coords[1]);
  }

  if (Array.isArray(coords)) {
    return coords.map((c) => reprojectCoordinates(c));
  }

  return coords;
}

/**
 * Computes the geometric centroid (lat, lng) of a 2D polygon ring [[lng, lat], ...].
 */
export function calculatePolygonCentroid(ring: number[][]): { lat: number; lng: number } {
  if (!ring || ring.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const p0 = ring[i];
    const p1 = ring[(i + 1) % n];

    const x0 = p0[0]; // lng
    const y0 = p0[1]; // lat
    const x1 = p1[0]; // lng
    const y1 = p1[1]; // lat

    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-10) {
    // Degenerate polygon / straight line fallback: calculate average of points
    let sumLng = 0;
    let sumLat = 0;
    for (const point of ring) {
      sumLng += point[0];
      sumLat += point[1];
    }
    return {
      lat: sumLat / ring.length,
      lng: sumLng / ring.length,
    };
  }

  const factor = 1 / (6 * signedArea);
  return {
    lng: cx * factor,
    lat: cy * factor,
  };
}

/**
 * Extracts the primary exterior polygon ring and computes its centroid.
 */
function extractCentroidFromGeometry(geometry: any): { lat: number; lng: number } | null {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return null;
  }

  if (geometry.type === 'Polygon') {
    const exteriorRing = geometry.coordinates[0];
    if (Array.isArray(exteriorRing) && exteriorRing.length > 0) {
      return calculatePolygonCentroid(exteriorRing);
    }
  }

  if (geometry.type === 'MultiPolygon') {
    let bestRing: number[][] | null = null;
    let maxLen = 0;

    for (const poly of geometry.coordinates) {
      if (Array.isArray(poly) && Array.isArray(poly[0])) {
        if (poly[0].length > maxLen) {
          maxLen = poly[0].length;
          bestRing = poly[0];
        }
      }
    }

    if (bestRing) {
      return calculatePolygonCentroid(bestRing);
    }
  }

  if (geometry.type === 'Point') {
    return {
      lng: geometry.coordinates[0],
      lat: geometry.coordinates[1],
    };
  }

  return null;
}

export interface SnitGeocodeOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Queries SNIT (Sistema Nacional de Información Territorial) WFS service
 * to locate the exact cadastral polygon for a given plano.
 */
export async function lookupCadastralPlano(
  rawPlano: string,
  options?: SnitGeocodeOptions
): Promise<SnitGeocodeResult> {
  const normalized = normalizePlano(rawPlano);
  if (!normalized) {
    return {
      success: false,
      isExact: false,
      error: `Invalid or unparseable plano format: "${rawPlano}"`,
      normalizedPlano: null,
    };
  }

  const { provincia, numero, anio } = normalized;
  const timeoutMs = options?.timeoutMs ?? 12000;
  const customFetch = options?.fetchFn ?? fetch;

  const baseUrl = 'https://geos.snitcr.go.cr/geoserver/wfs';
  const cqlFilter = `plano='${numero}' AND anio='${anio}' AND provincia='${provincia}'`;

  const url = new URL(baseUrl);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeName', 'registro_inmobiliario:catastro');
  url.searchParams.set('outputFormat', 'application/json');
  url.searchParams.set('cql_filter', cqlFilter);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await customFetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return {
        success: false,
        isExact: false,
        error: `SNIT WFS server returned status HTTP ${response.status}: ${response.statusText}`,
        normalizedPlano: normalized,
      };
    }

    const data = await response.json();

    if (
      !data ||
      data.type !== 'FeatureCollection' ||
      !Array.isArray(data.features) ||
      data.features.length === 0
    ) {
      return {
        success: false,
        isExact: false,
        error: `No cadastral records found for plano ${numero}-${anio} in province ${provincia}`,
        normalizedPlano: normalized,
      };
    }

    // Reproject all features in FeatureCollection from CRTM05 (EPSG:5367) to WGS84 (EPSG:4326)
    const reprojectedFeatures = data.features.map((feature: any) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: reprojectCoordinates(feature.geometry?.coordinates),
      },
    }));

    const primaryFeature = reprojectedFeatures[0];
    const centroid = extractCentroidFromGeometry(primaryFeature.geometry);

    if (!centroid || isNaN(centroid.lat) || isNaN(centroid.lng)) {
      return {
        success: false,
        isExact: false,
        error: 'Failed to compute centroid for cadastral polygon',
        normalizedPlano: normalized,
      };
    }

    const reprojectedGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: reprojectedFeatures,
    };

    return {
      success: true,
      lat: centroid.lat,
      lng: centroid.lng,
      polygonGeoJSON: reprojectedGeoJSON,
      isExact: true,
      normalizedPlano: normalized,
      properties: primaryFeature.properties,
    };
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError';
    return {
      success: false,
      isExact: false,
      error: isAbort
        ? `SNIT WFS request timed out after ${timeoutMs}ms`
        : error?.message || 'Unknown network or parsing error querying SNIT',
      normalizedPlano: normalized,
    };
  }
}

// Alias for convenience / backward-compatibility with requirements
export const lookupPlanoLocation = lookupCadastralPlano;

/**
 * Fallback Costa Rica Town/District Centroids lookup dictionary ($0 offline geocoding)
 */
export const COSTA_RICA_TOWN_CENTROIDS: Record<string, [number, number]> = {
  // San José
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

  // Puntarenas
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

  // Alajuela
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

  // Cartago
  'cartago': [9.8644, -83.9194],
  'paraiso': [9.8389, -83.8667],
  'la union': [9.9076, -83.9875],
  'tres rios': [9.9076, -83.9875],
  'jimenez': [9.7833, -83.7333],
  'turrialba': [9.9047, -83.6833],
  'alvarado': [9.9667, -83.8167],
  'oreamuno': [9.8833, -83.9000],
  'el guarco': [9.8167, -83.9333],

  // Heredia
  'heredia': [9.9989, -84.1167],
  'barva': [10.0167, -84.1167],
  'santo domingo': [9.9833, -84.0833],
  'santa barbara': [10.0333, -84.1667],
  'san rafael': [10.0167, -84.1000],
  'belen': [9.9812, -84.1795],
  'flores': [10.0000, -84.1500],
  'san pablo': [9.9917, -84.0972],
  'sarapiqui': [10.4500, -84.0167],

  // Guanacaste
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

  // Limón
  'limon': [9.9907, -83.0360],
  'pococi': [10.2000, -83.7833],
  'guapiles': [10.2167, -83.7833],
  'siquirres': [10.1000, -83.5167],
  'talamanca': [9.6333, -82.8500],
  'puerto viejo': [9.6550, -82.7540],
  'matina': [10.0833, -83.3333],
  'guacimo': [10.2167, -83.6833],
};

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

/**
 * Resolves approximate coordinates for Costa Rican province/canton/district.
 */
export function resolveTownCentroid(
  province?: string | null,
  canton?: string | null,
  district?: string | null
): { lat: number; lng: number } {
  const normDist = normalizeGeoKey(district);
  const normCant = normalizeGeoKey(canton);
  const normProv = normalizeGeoKey(province);

  if (normDist && COSTA_RICA_TOWN_CENTROIDS[normDist]) {
    const [lat, lng] = COSTA_RICA_TOWN_CENTROIDS[normDist];
    return { lat, lng };
  }

  if (normCant && COSTA_RICA_TOWN_CENTROIDS[normCant]) {
    const [lat, lng] = COSTA_RICA_TOWN_CENTROIDS[normCant];
    return { lat, lng };
  }

  if (normProv && COSTA_RICA_TOWN_CENTROIDS[normProv]) {
    const [lat, lng] = COSTA_RICA_TOWN_CENTROIDS[normProv];
    return { lat, lng };
  }

  // Default central San José
  return { lat: 9.9281, lng: -84.0907 };
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  location_type: 'exact_cadastral' | 'approximate_town';
  parcel_polygon: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | null;
  isExact: boolean;
  error?: string;
}

/**
 * Comprehensive geocoding helper for properties:
 * 1. Checks if plano/plano_catastrado is available.
 * 2. Attempts SNIT WFS exact cadastral lookup.
 * 3. Falls back gracefully to town/district centroid if lookup fails or plano is missing.
 */
export async function geocodePropertyLocation(property: {
  plano?: string | null;
  plano_catastrado?: string | null;
  province?: string | null;
  canton?: string | null;
  district?: string | null;
}): Promise<GeocodedLocation> {
  const plano = property.plano || property.plano_catastrado;

  if (plano && plano.trim()) {
    const cadastralResult = await lookupCadastralPlano(plano.trim());
    if (cadastralResult.success && cadastralResult.isExact) {
      return {
        lat: cadastralResult.lat,
        lng: cadastralResult.lng,
        location_type: 'exact_cadastral',
        parcel_polygon: cadastralResult.polygonGeoJSON,
        isExact: true,
      };
    }
  }

  // Fallback to approximate town / district centroid
  const fallback = resolveTownCentroid(property.province, property.canton, property.district);
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    location_type: 'approximate_town',
    parcel_polygon: null,
    isExact: false,
  };
}


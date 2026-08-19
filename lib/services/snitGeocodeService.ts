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
  plano12Digits: string; // e.g. '609486992004'
  raw: string;
}

export interface NormalizedFolioReal {
  provincia: string; // '1' through '7'
  provinciaNombre: string; // e.g. 'San José', 'Puntarenas'
  finca: string; // e.g. '123456' (leading zeros stripped)
  duplicado?: string; // e.g. '000' or '0'
  horizontal?: string; // e.g. '000' or '001'
  raw: string;
}

export interface SnitGeocodeSuccessResult {
  success: true;
  lat: number;
  lng: number;
  polygonGeoJSON: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry;
  isExact: true;
  normalizedPlano?: NormalizedPlano | null;
  normalizedFolio?: NormalizedFolioReal | null;
  resolutionSource?: 'plano' | 'folio_real';
  properties?: Record<string, unknown>;
}

export interface SnitGeocodeFailureResult {
  success: false;
  isExact: false;
  error?: string;
  normalizedPlano?: NormalizedPlano | null;
  normalizedFolio?: NormalizedFolioReal | null;
}

export type SnitGeocodeResult = SnitGeocodeSuccessResult | SnitGeocodeFailureResult;

export interface SnitGeocodeOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  fallbackProvince?: string | null;
}

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
 * - "P-0948699-2004" -> { provincia: "6", provinciaNombre: "Puntarenas", numero: "948699", anio: "2004", plano12Digits: "609486992004" }
 * - "6-948699-2004" -> { provincia: "6", provinciaNombre: "Puntarenas", numero: "948699", anio: "2004", plano12Digits: "609486992004" }
 * - "SJ-12345-2010" -> { provincia: "1", provinciaNombre: "San José", numero: "12345", anio: "2010", plano12Digits: "100123452010" }
 * - "A-005678-98"   -> { provincia: "2", provinciaNombre: "Alajuela", numero: "5678", anio: "1998", plano12Digits: "200056781998" }
 * - "Plano: 6-948699-2004" -> matches accurately
 */
export function normalizePlano(rawPlano?: string | null): NormalizedPlano | null {
  if (!rawPlano || typeof rawPlano !== 'string') {
    return null;
  }

  const cleaned = rawPlano.trim().toUpperCase();
  if (!cleaned) {
    return null;
  }

  // 1. Check if raw is already a pure 12-digit SNIT string, e.g. "609486992004"
  const pure12Match = cleaned.match(/^([1-7])(\d{7})(\d{4})$/);
  if (pure12Match) {
    const provCode = pure12Match[1];
    const provMatch = PROVINCE_MAP[provCode];
    const num = pure12Match[2].replace(/^0+/, '');
    const yr = pure12Match[3];
    return {
      provincia: provCode,
      provinciaNombre: provMatch ? provMatch.name : `Provincia ${provCode}`,
      numero: num || pure12Match[2],
      anio: yr,
      plano12Digits: `${provCode}${pure12Match[2]}${yr}`,
      raw: rawPlano,
    };
  }

  // 2. Try regex extraction to find province prefix/code, document number (1-8 digits), and year (2 or 4 digits)
  // Handles: "P-0948699-2004", "6-948699-2004", "SJ-12345-2010", "Plano catastrado 6-948699-2004", "No. 1-12345-2010"
  const regex = /(?:^|[^\w])(SJ|AL|A|CAR|C|HER|H|GUA|G|PUN|P|LIM|L|[1-7])[\s\-_/]+0*(\d{1,8})[\s\-_/]+(\d{2,4})(?:[^\w]|$)/i;
  const match = cleaned.match(regex);

  let rawProvincia = '';
  let rawNumero = '';
  let rawAnio = '';

  if (match) {
    rawProvincia = match[1];
    rawNumero = match[2];
    rawAnio = match[3];
  } else {
    // Fallback: split by delimiters
    const parts = cleaned
      .replace(/[^A-Z0-9\u00C0-\u00FF]+/g, '-')
      .split('-')
      .filter(Boolean);

    // Find the first part that is a valid province
    let provIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      if (PROVINCE_MAP[parts[i]]) {
        provIdx = i;
        break;
      }
    }

    if (provIdx !== -1 && parts.length >= provIdx + 3) {
      rawProvincia = parts[provIdx];
      rawNumero = parts[provIdx + 1];
      rawAnio = parts[provIdx + 2];
    } else {
      return null;
    }
  }

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

  const plano12Digits = `${provMatch.code}${numero.padStart(7, '0')}${anio}`;

  return {
    provincia: provMatch.code,
    provinciaNombre: provMatch.name,
    numero,
    anio,
    plano12Digits,
    raw: rawPlano,
  };
}

/**
 * Normalizes a Costa Rican Folio Real / Finca identifier.
 * Examples:
 * - "6-123456-000" -> { provincia: "6", provinciaNombre: "Puntarenas", finca: "123456", duplicado: "000", horizontal: "000", raw: ... }
 * - "6-123456"     -> { provincia: "6", provinciaNombre: "Puntarenas", finca: "123456", duplicado: "000", horizontal: "000", raw: ... }
 * - "P-123456-000" -> { provincia: "6", provinciaNombre: "Puntarenas", finca: "123456", duplicado: "000", horizontal: "000", raw: ... }
 * - "123456-000"   -> extracts finca "123456", uses fallback province if available
 * - "502241-000-000" -> extracts finca "502241", uses fallback province if available
 */
export function parseFolioReal(
  rawFolio?: string | null,
  fallbackProvince?: string | null
): NormalizedFolioReal | null {
  if (!rawFolio || typeof rawFolio !== 'string') {
    return null;
  }

  const cleaned = rawFolio
    .trim()
    .toUpperCase()
    .replace(/^(?:FOLIO\s*REAL|FINCA|MATR[IÍ]CULA)[:\s]*/i, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  // Resolve fallback province info
  let defaultProvCode = '1';
  let defaultProvName = 'San José';
  if (fallbackProvince) {
    const normP = normalizeGeoKey(fallbackProvince).toUpperCase();
    for (const [key, val] of Object.entries(PROVINCE_MAP)) {
      if (key === normP || val.name.toUpperCase() === normP || val.code === normP) {
        defaultProvCode = val.code;
        defaultProvName = val.name;
        break;
      }
    }
  }

  // Format 1: [Provincia]-[Finca]-[Duplicado]-[Horizontal]
  // e.g. "6-123456-000", "P-123456-000", "SJ-12345-000", "1-392841-000", "3-345-000"
  const mHyphen = cleaned.match(/^([0-9A-Z]{1,3})[-/](\d+)(?:[-/]([0-9A-Z]+))?(?:[-/]([0-9A-Z]+))?$/);
  if (mHyphen) {
    const provKey = mHyphen[1];
    const provMatch = PROVINCE_MAP[provKey];
    if (provMatch) {
      const fincaNum = mHyphen[2].replace(/^0+/, '');
      return {
        provincia: provMatch.code,
        provinciaNombre: provMatch.name,
        finca: fincaNum || mHyphen[2],
        duplicado: mHyphen[3] || '000',
        horizontal: mHyphen[4] || '000',
        raw: rawFolio,
      };
    }
  }

  // Format 2: [Finca]-[Duplicado]-[Horizontal] without explicit province prefix
  // e.g. "502241-000-000", "692660-000-000", "261945-000", "212023"
  const mDigits = cleaned.match(/^(\d+)(?:[-/]([0-9A-Z]+))?(?:[-/]([0-9A-Z]+))?$/);
  if (mDigits) {
    const fincaNum = mDigits[1].replace(/^0+/, '');
    return {
      provincia: defaultProvCode,
      provinciaNombre: defaultProvName,
      finca: fincaNum || mDigits[1],
      duplicado: mDigits[2] || '000',
      horizontal: mDigits[3] || '000',
      raw: rawFolio,
    };
  }

  return null;
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
export function reprojectCoordinates(coords: any): any {
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
export function extractCentroidFromGeometry(geometry: any): { lat: number; lng: number } | null {
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

/**
 * Queries SNIT (Sistema Nacional de Información Territorial) services
 * (SIRI Cadastral API and OGC GeoServer WFS endpoints)
 * to locate the exact cadastral polygon and GPS coordinates for a given plano.
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

  const { provincia, numero, anio, plano12Digits } = normalized;
  const timeoutMs = options?.timeoutMs ?? 10000;
  const customFetch = options?.fetchFn ?? fetch;

  // 1. Query official SNIT SIRI service (Visor Fincas / Planos backend)
  const siriUrls = [
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=plano&plano=${plano12Digits}`,
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=plano&plano=${encodeURIComponent(`${provincia}-${numero}-${anio}`)}`,
  ];

  for (const siriUrl of siriUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await customFetch(siriUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const siriData = await res.json();
        if (siriData && siriData.result && siriData.data) {
          const features = [
            ...(siriData.data.zona_1?.features || []),
            ...(siriData.data.zona_2?.features || []),
          ];

          if (features.length > 0) {
            const reprojectedFeatures = features.map((feature: any) => ({
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: reprojectCoordinates(feature.geometry?.coordinates),
              },
            }));

            const primaryFeature = reprojectedFeatures[0];
            const centroid = extractCentroidFromGeometry(primaryFeature.geometry);

            if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
              return {
                success: true,
                lat: centroid.lat,
                lng: centroid.lng,
                polygonGeoJSON: {
                  type: 'FeatureCollection',
                  features: reprojectedFeatures,
                },
                isExact: true,
                normalizedPlano: normalized,
                properties: primaryFeature.properties,
              };
            }
          }
        }
      }
    } catch {}
  }

  // 2. Query SNIT GeoServer WFS endpoints as fallback
  const wfsEndpoints = [
    'https://geos.snitcr.go.cr/geoserver/wfs',
    'https://siri.snitcr.go.cr/Geoservicios/wfs',
  ];

  for (const baseUrl of wfsEndpoints) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('service', 'WFS');
      url.searchParams.set('version', '1.1.0');
      url.searchParams.set('request', 'GetFeature');
      url.searchParams.set('typeName', 'catastro');
      url.searchParams.set('outputFormat', 'application/json');
      url.searchParams.set('cql_filter', `plano='${numero}' AND anio='${anio}' AND provincia='${provincia}'`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await customFetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (response.ok) {
        const data = await response.json();
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length > 0) {
          const reprojectedFeatures = data.features.map((feature: any) => ({
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: reprojectCoordinates(feature.geometry?.coordinates),
            },
          }));

          const primaryFeature = reprojectedFeatures[0];
          const centroid = extractCentroidFromGeometry(primaryFeature.geometry);

          if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
            return {
              success: true,
              lat: centroid.lat,
              lng: centroid.lng,
              polygonGeoJSON: {
                type: 'FeatureCollection',
                features: reprojectedFeatures,
              },
              isExact: true,
              normalizedPlano: normalized,
              properties: primaryFeature.properties,
            };
          }
        }
      }
    } catch {}
  }

  return {
    success: false,
    isExact: false,
    error: `No cadastral records found in SNIT for plano ${numero}-${anio} in province ${provincia}`,
    normalizedPlano: normalized,
  };
}

/**
 * Queries SNIT services (SIRI Finca API and OGC GeoServer WFS endpoints)
 * to locate the exact cadastral polygon and GPS coordinates for a given Folio Real / Finca number.
 */
export async function lookupByFolioReal(
  rawFolio: string,
  options?: SnitGeocodeOptions
): Promise<SnitGeocodeResult> {
  const normalized = parseFolioReal(rawFolio, options?.fallbackProvince);
  if (!normalized) {
    return {
      success: false,
      isExact: false,
      error: `Invalid or unparseable folio real format: "${rawFolio}"`,
      normalizedFolio: null,
    };
  }

  const { provincia, finca, duplicado } = normalized;
  const timeoutMs = options?.timeoutMs ?? 10000;
  const customFetch = options?.fetchFn ?? fetch;

  // 1. Query official SNIT SIRI service by finca number
  const siriUrls = [
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=finca&finca=${finca}&provincia=${provincia}`,
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=finca&finca=${encodeURIComponent(`${provincia}-${finca}`)}`,
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=finca&finca=${encodeURIComponent(`${provincia}-${finca}-${duplicado || '000'}`)}`,
    `https://www.snitcr.go.cr/Visor/services/siri?tipoquery=finca&finca=${finca}`,
  ];

  for (const siriUrl of siriUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await customFetch(siriUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const siriData = await res.json();
        if (siriData && siriData.result && siriData.data) {
          const features = [
            ...(siriData.data.zona_1?.features || []),
            ...(siriData.data.zona_2?.features || []),
          ];

          if (features.length > 0) {
            const reprojectedFeatures = features.map((feature: any) => ({
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: reprojectCoordinates(feature.geometry?.coordinates),
              },
            }));

            const primaryFeature = reprojectedFeatures[0];
            const centroid = extractCentroidFromGeometry(primaryFeature.geometry);

            if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
              return {
                success: true,
                lat: centroid.lat,
                lng: centroid.lng,
                polygonGeoJSON: {
                  type: 'FeatureCollection',
                  features: reprojectedFeatures,
                },
                isExact: true,
                normalizedFolio: normalized,
                resolutionSource: 'folio_real',
                properties: primaryFeature.properties,
              };
            }
          }
        }
      }
    } catch {}
  }

  // 2. Query SNIT GeoServer WFS with finca and provincia CQL filter
  const wfsEndpoints = [
    'https://geos.snitcr.go.cr/geoserver/wfs',
    'https://siri.snitcr.go.cr/Geoservicios/wfs',
  ];

  const typeNames = ['registro_inmobiliario:catastro', 'catastro', 'predio', 'limite_predial'];

  for (const baseUrl of wfsEndpoints) {
    for (const typeName of typeNames) {
      try {
        const url = new URL(baseUrl);
        url.searchParams.set('service', 'WFS');
        url.searchParams.set('version', '2.0.0');
        url.searchParams.set('request', 'GetFeature');
        url.searchParams.set('typeName', typeName);
        url.searchParams.set('outputFormat', 'application/json');
        url.searchParams.set('cql_filter', `finca='${finca}' AND provincia='${provincia}'`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await customFetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (response.ok) {
          const data = await response.json();
          if (data && data.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length > 0) {
            const reprojectedFeatures = data.features.map((feature: any) => ({
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: reprojectCoordinates(feature.geometry?.coordinates),
              },
            }));

            const primaryFeature = reprojectedFeatures[0];
            const centroid = extractCentroidFromGeometry(primaryFeature.geometry);

            if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
              return {
                success: true,
                lat: centroid.lat,
                lng: centroid.lng,
                polygonGeoJSON: {
                  type: 'FeatureCollection',
                  features: reprojectedFeatures,
                },
                isExact: true,
                normalizedFolio: normalized,
                resolutionSource: 'folio_real',
                properties: primaryFeature.properties,
              };
            }
          }
        }
      } catch {}
    }
  }

  return {
    success: false,
    isExact: false,
    error: `No cadastral records found in SNIT for finca ${finca} in province ${provincia}`,
    normalizedFolio: normalized,
  };
}

// Aliases for convenience and requirement compliance
export const lookupPlanoLocation = lookupCadastralPlano;
export const lookupPlanoGeometry = lookupCadastralPlano;

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

  // Extra High-Precision Districts & Neighborhoods
  'piedades': [9.9328, -84.2185],
  'pozos': [9.9442, -84.1882],
  'pavas': [9.9419, -84.1284],
  'san antonio': [9.9120, -84.1510],
  'colon': [9.9142, -84.2464],
  'ciudad colon': [9.9142, -84.2464],
  'la asuncion': [9.9744, -84.1685],
  'asuncion': [9.9744, -84.1685],
  'san juan': [9.9575, -84.0817],
  'alfaro': [10.1000, -84.4800],
  'la fortuna': [10.4678, -84.6427],
  'fortuna': [10.4678, -84.6427],
  'mata redonda': [9.9320, -84.1020],
  'coco': [10.5500, -85.6967],

  // Specific Canton + District disambiguation mappings
  'escazu san rafael': [9.9360, -84.1378],
  'escazu san antonio': [9.9120, -84.1510],
  'escazu central': [9.9248, -84.1432],
  'santa ana pozos': [9.9442, -84.1882],
  'santa ana piedades': [9.9328, -84.2185],
  'belen la asuncion': [9.9744, -84.1685],
  'belen san antonio': [9.9812, -84.1795],
  'alajuela la guacima': [9.9722, -84.2889],
  'san ramon alfaro': [10.1000, -84.4800],
  'grecia san isidro': [10.1147, -84.2980],
  'garabito tarcoles': [9.7640, -84.6280],
  'garabito jaco': [9.6152, -84.6298],
  'garabito herradura': [9.6450, -84.6380],
  'carrillo playas del coco': [10.5500, -85.6967],
  'santa cruz tamarindo': [10.2993, -85.8402],
  'quepos manuel antonio': [9.3889, -84.1528],
  'san carlos la fortuna': [10.4678, -84.6427],
  'perez zeledon cajon': [9.2600, -83.5600],
  'perez zeledon daniel flores': [9.3500, -83.6833],
  'perez zeledon san isidro': [9.3739, -83.7058],
  'tibas san juan': [9.9575, -84.0817],
  'curridabat granadilla': [9.9285, -84.0241],
  'mora colon': [9.9142, -84.2464],
  'naranjo san juan': [10.1080, -84.3880],
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
 * Extracts true property geographic location from Boletín Judicial edict text
 * (handles judicial notifications where the court/bank was in San José but the property is elsewhere).
 */
export function extractLocationFromEdictText(
  text?: string | null,
  fallbackProv?: string | null,
  fallbackCanton?: string | null,
  fallbackDist?: string | null
): { province: string; canton: string; district: string } {
  let province = (fallbackProv || 'San José').trim();
  let canton = (fallbackCanton || 'Central').trim();
  let district = (fallbackDist || 'Central').trim();

  if (!text || typeof text !== 'string') {
    return { province, canton, district };
  }

  // 1. Match Finca/Partido de la Provincia de [Provincia]
  const mProv = text.match(/(?:Finca|Partido|propiedad|terreno)\s+de\s+la\s+Provincia\s+de\s+([A-Za-z\u00C0-\u00FF\s]+?)(?:,|\.|;|\s+matr[íi]cula|\s+folio)/i)
    || text.match(/Partido\s+de\s+([A-Za-z\u00C0-\u00FF]+)/i);
  if (mProv) {
    const rawProv = mProv[1].trim();
    const norm = normalizeGeoKey(rawProv);
    if (norm.includes('alajuela')) province = 'Alajuela';
    else if (norm.includes('cartago')) province = 'Cartago';
    else if (norm.includes('heredia')) province = 'Heredia';
    else if (norm.includes('guanacaste')) province = 'Guanacaste';
    else if (norm.includes('puntarenas')) province = 'Puntarenas';
    else if (norm.includes('limon')) province = 'Limón';
    else if (norm.includes('san jose')) province = 'San José';
  }

  // 2. Match Distrito [Num/Nombre]: [Distrito], Cantón [Num/Nombre]: [Cantón]
  const mDistCant = text.match(/situad[ao]\s+en\s+el\s+Distrito(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?),\s*Cant[óo]n(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?)(?:,|\.|;|\s+de\s+la\s+Provincia)/i)
    || text.match(/Distrito(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?),\s*Cant[óo]n(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?)(?:,|\.|;|\s+de\s+la\s+Provincia)/i);

  if (mDistCant) {
    district = mDistCant[1]
      .replace(/^(?:primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|décimo|decimo|\d+)\s*[:-]?\s*/i, '')
      .replace(/^[\s\-–—:;,\.]+/g, '')
      .trim();
    canton = mDistCant[2]
      .replace(/^(?:primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|décimo|decimo|\d+)\s*[:-]?\s*/i, '')
      .replace(/^[\s\-–—:;,\.]+/g, '')
      .trim();
  } else {
    // Try inverted: Cantón: [Cantón], Distrito: [Distrito]
    const mCantDist = text.match(/Cant[óo]n(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?),\s*Distrito(?:\s+[a-z0-9\u00C0-\u00FF]+)?:?\s*([^,;.\n]+?)(?:,|\.|;|\s+de\s+la\s+Provincia)/i);
    if (mCantDist) {
      canton = mCantDist[1]
        .replace(/^(?:primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|décimo|decimo|\d+)\s*[:-]?\s*/i, '')
        .replace(/^[\s\-–—:;,\.]+/g, '')
        .trim();
      district = mCantDist[2]
        .replace(/^(?:primero|segundo|tercero|cuarto|quinto|sexto|septimo|séptimo|octavo|noveno|décimo|decimo|\d+)\s*[:-]?\s*/i, '')
        .replace(/^[\s\-–—:;,\.]+/g, '')
        .trim();
    }
  }

  // Capitalize neatly
  district = district.replace(/^[\s\-–—:;,\.]+/g, '').trim();
  canton = canton.replace(/^[\s\-–—:;,\.]+/g, '').trim();

  return { province, canton, district };
}

export const HIGH_PRECISION_LANDMARKS: Array<{
  pattern: RegExp;
  name: string;
  coords: [number, number];
}> = [
  { pattern: /(?:valle\s+del\s+sol|golf\s+santa\s+ana)/i, name: 'Valle del Sol, Santa Ana', coords: [9.9482, -84.2025] },
  { pattern: /(?:los\s+laureles|laureles\s+escaz[uú])/i, name: 'Los Laureles, Escazú', coords: [9.9385, -84.1480] },
  { pattern: /(?:hacienda\s+los\s+reyes|los\s+reyes\s+gu[aá]cima|golf\s+gu[aá]cima)/i, name: 'Los Reyes, La Guácima', coords: [9.9655, -84.2885] },
  { pattern: /(?:monter[aá]n|granadilla\s+curridabat)/i, name: 'Monterán, Curridabat', coords: [9.9235, -84.0095] },
  { pattern: /(?:rohrmoser|boulevard\s+rohrmoser|pavas\s+parque)/i, name: 'Rohrmoser Boulevard, Pavas', coords: [9.9445, -84.1165] },
  { pattern: /(?:playa\s+langosta|langosta\s+tamarindo)/i, name: 'Playa Langosta, Tamarindo', coords: [10.2855, -85.8450] },
  { pattern: /(?:las\s+palmas|palmas\s+coco|playas\s+del\s+coco)/i, name: 'Las Palmas, Playas del Coco', coords: [10.5565, -85.6980] },
  { pattern: /(?:manuel\s+antonio|parque\s+nacional\s+manuel\s+antonio)/i, name: 'Manuel Antonio, Quepos', coords: [9.3920, -84.1505] },
  { pattern: /(?:volc[aá]n\s+arenal|la\s+fortuna|arenal)/i, name: 'La Fortuna / Arenal', coords: [10.4720, -84.6480] },
  { pattern: /(?:frente\s+al\s+mar\s+playa\s+jac[oó]|playa\s+jac[oó]|penthouse\s+jac[oó])/i, name: 'Playa Jacó Beachfront', coords: [9.6125, -84.6295] },
  { pattern: /(?:cariari|asunci[oó]n\s+bel[eé]n)/i, name: 'Cariari / La Asunción Belén', coords: [9.9765, -84.1620] },
  { pattern: /(?:sabana\s+oeste|mata\s+redonda)/i, name: 'Sabana Oeste, San José', coords: [9.9335, -84.1080] },
  { pattern: /(?:quinta\s+campestre|san\s+isidro\s+de\s+grecia)/i, name: 'San Isidro de Grecia', coords: [10.1185, -84.2950] },
  { pattern: /(?:piedades\s+santa\s+ana|piedades)/i, name: 'Piedades, Santa Ana', coords: [9.9330, -84.2180] },
  { pattern: /(?:pozos\s+santa\s+ana|pozos)/i, name: 'Pozos, Santa Ana', coords: [9.9442, -84.1882] },
  { pattern: /(?:t[aá]rcoles|garabito\s+tarcoles)/i, name: 'Tárcoles, Garabito', coords: [9.7650, -84.6310] },
  { pattern: /(?:herradura|los\s+sue[nñ]os)/i, name: 'Herradura, Garabito', coords: [9.6480, -84.6420] },
  { pattern: /(?:caj[oó]n\s+p[eé]rez\s+zeled[oó]n|caj[oó]n)/i, name: 'Cajón, Pérez Zeledón', coords: [9.2620, -83.5620] },
  { pattern: /(?:san\s+juan\s+tib[aá]s|tib[aá]s)/i, name: 'San Juan, Tibás', coords: [9.9580, -84.0820] },
  { pattern: /(?:ciudad\s+col[oó]n|mora\s+col[oó]n)/i, name: 'Ciudad Colón, Mora', coords: [9.9150, -84.2470] },
  { pattern: /(?:alfaro\s+san\s+ram[oó]n|san\s+ram[oó]n)/i, name: 'Alfaro, San Ramón', coords: [10.1020, -84.4820] },
];

/**
 * Resolves high-accuracy coordinates for Costa Rican properties.
 * Checks for specific residential developments, condominiums, and landmarks first,
 * then resolves district/canton centroids with deterministic micro-jitter.
 */
export function resolveTownCentroid(
  province?: string | null,
  canton?: string | null,
  district?: string | null,
  seedId?: string | null,
  contextText?: string | null
): { lat: number; lng: number } {
  // 1. High-precision landmark / gated community / beach check
  if (contextText) {
    for (const lm of HIGH_PRECISION_LANDMARKS) {
      if (lm.pattern.test(contextText)) {
        let [lLat, lLng] = lm.coords;
        if (seedId) {
          const hash = Math.abs(
            seedId.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
          );
          const angle = (hash % 360) * (Math.PI / 180);
          const radiusMeters = 30 + (hash % 50); // Small 30m-80m radius for landmark
          const deltaLat = (radiusMeters / 111111) * Math.cos(angle);
          const deltaLng = (radiusMeters / (111111 * Math.cos(lLat * (Math.PI / 180)))) * Math.sin(angle);
          lLat = Number((lLat + deltaLat).toFixed(6));
          lLng = Number((lLng + deltaLng).toFixed(6));
        }
        return { lat: lLat, lng: lLng };
      }
    }
  }

  const normDist = normalizeGeoKey(district);
  const normCant = normalizeGeoKey(canton);
  const normProv = normalizeGeoKey(province);

  let baseCoord: [number, number] | null = null;

  const compoundCantDist = normCant && normDist ? `${normCant} ${normDist}` : '';
  const compoundProvDist = normProv && normDist ? `${normProv} ${normDist}` : '';

  if (compoundCantDist && COSTA_RICA_TOWN_CENTROIDS[compoundCantDist]) {
    baseCoord = COSTA_RICA_TOWN_CENTROIDS[compoundCantDist];
  } else if (compoundProvDist && COSTA_RICA_TOWN_CENTROIDS[compoundProvDist]) {
    baseCoord = COSTA_RICA_TOWN_CENTROIDS[compoundProvDist];
  } else if (normDist && COSTA_RICA_TOWN_CENTROIDS[normDist]) {
    baseCoord = COSTA_RICA_TOWN_CENTROIDS[normDist];
  } else if (normCant && COSTA_RICA_TOWN_CENTROIDS[normCant]) {
    baseCoord = COSTA_RICA_TOWN_CENTROIDS[normCant];
  } else if (normProv && COSTA_RICA_TOWN_CENTROIDS[normProv]) {
    baseCoord = COSTA_RICA_TOWN_CENTROIDS[normProv];
  } else {
    baseCoord = [9.9281, -84.0907];
  }

  let [lat, lng] = baseCoord;

  // Apply deterministic micro-jitter (60m to 160m) so multiple properties in the same town don't overlap
  if (seedId) {
    const hash = Math.abs(
      seedId.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    );
    const angle = (hash % 360) * (Math.PI / 180);
    const radiusMeters = 60 + (hash % 100);
    const deltaLat = (radiusMeters / 111111) * Math.cos(angle);
    const deltaLng = (radiusMeters / (111111 * Math.cos(lat * (Math.PI / 180)))) * Math.sin(angle);

    lat = Number((lat + deltaLat).toFixed(6));
    lng = Number((lng + deltaLng).toFixed(6));
  }

  return { lat, lng };
}

export interface PropertyGeocodeInput {
  id?: string | null;
  plano?: string | null;
  plano_catastrado?: string | null;
  folioReal?: string | null;
  folio_real?: string | null;
  finca?: string | null;
  province?: string | null;
  canton?: string | null;
  district?: string | null;
  raw_edict_text?: string | null;
  address_description?: string | null;
  legal_summary?: string | null;
  naturaleza_raw?: string | null;
}

export interface ResolvedPropertyLocation {
  lat: number;
  lng: number;
  location_type: 'exact_cadastral' | 'approximate_town';
  resolutionSource: 'plano' | 'folio_real' | 'town_fallback';
  polygonGeoJSON: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | null;
  isExact: boolean;
  error?: string;
  normalizedPlano?: NormalizedPlano | null;
  normalizedFolio?: NormalizedFolioReal | null;
  province?: string;
  canton?: string;
  district?: string;
}

/**
 * Master Geolocation Orchestrator:
 * Executes the full Costa Rican geolocation hierarchy:
 * 1. If property.plano is present -> lookupCadastralPlano(property.plano).
 * 2. If plano fails or is missing AND property.folioReal / finca is present -> lookupByFolioReal(property.folioReal).
 * 3. If both fail -> fallback to high-precision landmark / neighborhood / district center.
 */
export async function resolvePropertyLocation(
  property: PropertyGeocodeInput,
  options?: SnitGeocodeOptions
): Promise<ResolvedPropertyLocation> {
  const rawPlano = property.plano || property.plano_catastrado;
  const rawFolio = property.folioReal || property.folio_real || property.finca;

  // Extract true property administrative division from legal edict text
  const extracted = extractLocationFromEdictText(
    property.raw_edict_text,
    property.province,
    property.canton,
    property.district
  );

  const effectiveProvince = extracted.province || property.province || 'San José';
  const effectiveCanton = extracted.canton || property.canton || 'Central';
  const effectiveDistrict = extracted.district || property.district || 'Central';

  // 1. Try plano cadastral lookup first
  if (rawPlano && rawPlano.trim()) {
    const planoResult = await lookupCadastralPlano(rawPlano.trim(), options);
    if (planoResult.success && planoResult.isExact) {
      return {
        lat: planoResult.lat,
        lng: planoResult.lng,
        location_type: 'exact_cadastral',
        resolutionSource: 'plano',
        polygonGeoJSON: planoResult.polygonGeoJSON,
        isExact: true,
        normalizedPlano: planoResult.normalizedPlano,
        province: effectiveProvince,
        canton: effectiveCanton,
        district: effectiveDistrict,
      };
    }
  }

  // 2. If plano fails or is missing, try Folio Real / Finca lookup
  if (rawFolio && rawFolio.trim()) {
    const folioResult = await lookupByFolioReal(rawFolio.trim(), {
      ...options,
      fallbackProvince: effectiveProvince,
    });
    if (folioResult.success && folioResult.isExact) {
      return {
        lat: folioResult.lat,
        lng: folioResult.lng,
        location_type: 'exact_cadastral',
        resolutionSource: 'folio_real',
        polygonGeoJSON: folioResult.polygonGeoJSON,
        isExact: true,
        normalizedFolio: folioResult.normalizedFolio,
        province: effectiveProvince,
        canton: effectiveCanton,
        district: effectiveDistrict,
      };
    }
  }

  // 3. Fallback: High-precision landmark / neighborhood / district center
  const fullContext = `${property.address_description || ''} ${property.raw_edict_text || ''} ${property.legal_summary || ''} ${property.naturaleza_raw || ''}`.toLowerCase();

  const fallback = resolveTownCentroid(
    effectiveProvince,
    effectiveCanton,
    effectiveDistrict,
    String(property.id || rawFolio || rawPlano || ''),
    fullContext
  );

  return {
    lat: fallback.lat,
    lng: fallback.lng,
    location_type: 'approximate_town',
    resolutionSource: 'town_fallback',
    polygonGeoJSON: null,
    isExact: false,
    province: effectiveProvince,
    canton: effectiveCanton,
    district: effectiveDistrict,
  };
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
 * Comprehensive geocoding helper for properties (backward-compatible alias)
 */
export async function geocodePropertyLocation(property: PropertyGeocodeInput): Promise<GeocodedLocation> {
  const res = await resolvePropertyLocation(property);
  return {
    lat: res.lat,
    lng: res.lng,
    location_type: res.location_type,
    parcel_polygon: res.polygonGeoJSON,
    isExact: res.isExact,
  };
}


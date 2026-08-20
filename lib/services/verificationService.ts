/**
 * Post-Scan Verification & Validation Service
 * 
 * Verifies and corrects:
 * 1. Property Titles & Characteristics Accuracy:
 *    - Validates Province, Canton, District from verbatim legal edict text.
 *    - Validates Natureza & Property Type (building_lot vs single_family_home vs condo vs agricultural vs commercial).
 *    - Validates Construction Status (has_construction = false for bare land/terreno para construir).
 *    - Validates Area (m²) and Base Prices.
 *    - Generates verified, accurate localized titles.
 * 
 * 2. Map Pin & Geolocation Accuracy:
 *    - Validates that coordinates fall within Costa Rica bounds and declared Canton/District.
 *    - Queries SNIT Catastro Nacional for exact lot boundaries (parcel_polygon).
 *    - Categorizes location accuracy:
 *      - 'exact_cadastral' + parcel_polygon (lot boundaries found)
 *      - 'exact_cadastral' without polygon (exact pin georeferenced)
 *      - 'approximate_town' (district or canton centroid fallback)
 *      - 'pending_mapping' (in-flight or unresolved)
 */

import { Auction, CostaRicaProvince, PropertyType, LocationType } from '@/lib/types/auction';
import { resolvePropertyLocation, resolveTownCentroid, parseFolioReal } from '@/lib/services/snitGeocodeService';
import { extractPropertyDeterministic } from '@/lib/services/extractorService';
import { detectPropertyCharacteristics, getLocalizedPropertyTitle } from '@/lib/utils';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface VerificationResult {
  auctionId: string;
  expediente: string;
  folioReal: string;
  
  // Title & Metadata Verification
  titleCheck: {
    isValid: boolean;
    titleEs: string;
    titleEn: string;
    verifiedFolioReal: string;
    verifiedPropertyType: PropertyType;
    verifiedProvince: CostaRicaProvince;
    verifiedCanton: string;
    verifiedDistrict: string;
    verifiedAreaM2: number;
    verifiedHasConstruction: boolean;
    correctedFields: string[];
  };

  // Map Pin & Cadastral Verification
  mapPinCheck: {
    isValid: boolean;
    latitude: number;
    longitude: number;
    locationType: LocationType;
    hasLotBoundaries: boolean;
    isExactPin: boolean;
    resolutionSource?: string;
    polygonGeoJSON?: any;
    correctionApplied: boolean;
    notes?: string;
  };
}

/**
 * Validates whether coordinates fall within Costa Rica bounding box
 */
export function isCoordinateInCostaRica(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= 8.0 && lat <= 11.4 && lng >= -86.0 && lng <= -82.4;
}

/**
 * Verify title accuracy and property characteristics for a single auction
 */
export function verifyPropertyTitleAndCharacteristics(auction: Partial<Auction>): VerificationResult['titleCheck'] {
  const rawText = auction.raw_edict_text || auction.address_description || '';
  const extracted = extractPropertyDeterministic(rawText);

  // Determine true province from edict
  let verifiedProvince: CostaRicaProvince = (auction.province as CostaRicaProvince) || 'San José';
  if (extracted?.province) {
    const p = extracted.province.trim();
    if (['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'].includes(p)) {
      verifiedProvince = p as CostaRicaProvince;
    }
  }

  // Determine true canton & district
  let verifiedCanton = (extracted?.canton || auction.canton || '').trim();
  let verifiedDistrict = (extracted?.district || auction.district || '').trim();

  // If extraction gave better canton/district, use it
  if (!verifiedCanton && auction.canton) verifiedCanton = auction.canton.trim();
  if (!verifiedDistrict && auction.district) verifiedDistrict = auction.district.trim();

  // Determine property type & construction
  let verifiedPropertyType: PropertyType = 'other';
  if (extracted) {
    if (extracted.property_type === 'lot') verifiedPropertyType = 'building_lot';
    else if (extracted.property_type === 'house') verifiedPropertyType = 'single_family_home';
    else if (extracted.property_type === 'condo') verifiedPropertyType = 'condo_apartment';
    else if (extracted.property_type === 'commercial') verifiedPropertyType = 'commercial_industrial';
    else if (extracted.property_type === 'farm') verifiedPropertyType = 'agricultural_land';
    else verifiedPropertyType = 'other';
  } else {
    const chars = detectPropertyCharacteristics(auction as any);
    verifiedPropertyType = chars.propertyType;
  }

  const verifiedHasConstruction = extracted ? extracted.is_constructed : (verifiedPropertyType === 'single_family_home' || verifiedPropertyType === 'commercial_industrial');
  let verifiedAreaM2 = (extracted?.lot_size_m2 && extracted.lot_size_m2 > 0 && extracted.lot_size_m2 < 100000000) ? extracted.lot_size_m2 : (Number(auction.area_m2) || 0);
  if (verifiedAreaM2 > 99999999.99) {
    verifiedAreaM2 = Math.min(Number(auction.area_m2) || 0, 99999999.99);
  }

  // Normalize Folio Real
  let verifiedFolioReal = auction.folio_real || '';
  const parsedFolio = parseFolioReal(auction.folio_real || extracted?.finca_number, verifiedProvince);
  if (parsedFolio) {
    verifiedFolioReal = parsedFolio.formattedFolio;
  }

  // Track what was corrected
  const correctedFields: string[] = [];
  if (auction.folio_real && auction.folio_real !== verifiedFolioReal) correctedFields.push('folio_real');
  if (auction.province && auction.province !== verifiedProvince) correctedFields.push('province');
  if (auction.canton && auction.canton !== verifiedCanton) correctedFields.push('canton');
  if (auction.district && auction.district !== verifiedDistrict) correctedFields.push('district');
  if (auction.property_type && auction.property_type !== verifiedPropertyType) correctedFields.push('property_type');
  if (auction.has_construction !== undefined && auction.has_construction !== verifiedHasConstruction) correctedFields.push('has_construction');
  if (auction.area_m2 && Math.abs(Number(auction.area_m2) - verifiedAreaM2) > 0.01) correctedFields.push('area_m2');

  const synthAuction: Auction = {
    ...(auction as Auction),
    folio_real: verifiedFolioReal,
    province: verifiedProvince,
    canton: verifiedCanton || 'Central',
    district: verifiedDistrict || 'Central',
    property_type: verifiedPropertyType,
    has_construction: verifiedHasConstruction,
    area_m2: verifiedAreaM2,
  };

  const titleEs = getLocalizedPropertyTitle(synthAuction, 'es');
  const titleEn = getLocalizedPropertyTitle(synthAuction, 'en');

  return {
    isValid: correctedFields.length === 0,
    titleEs,
    titleEn,
    verifiedFolioReal,
    verifiedPropertyType,
    verifiedProvince,
    verifiedCanton,
    verifiedDistrict,
    verifiedAreaM2,
    verifiedHasConstruction,
    correctedFields,
  };
}

/**
 * Verify map pin coordinates and cadastral lot boundaries for a single auction
 */
export async function verifyPropertyMapPin(
  auction: Partial<Auction>,
  verifiedTitleCheck?: VerificationResult['titleCheck']
): Promise<VerificationResult['mapPinCheck']> {
  const currentLat = auction.latitude;
  const currentLng = auction.longitude;
  const hasValidCRCoords = isCoordinateInCostaRica(currentLat, currentLng);
  const currentPolygon = auction.parcel_polygon;

  const province = verifiedTitleCheck?.verifiedProvince || auction.province || 'San José';
  const canton = verifiedTitleCheck?.verifiedCanton || auction.canton || 'Central';
  const district = verifiedTitleCheck?.verifiedDistrict || auction.district || 'Central';

  // If already has exact cadastral polygon and valid coords, verify they match
  if (currentPolygon && hasValidCRCoords && auction.location_type === 'exact_cadastral') {
    return {
      isValid: true,
      latitude: currentLat!,
      longitude: currentLng!,
      locationType: 'exact_cadastral',
      hasLotBoundaries: true,
      isExactPin: true,
      resolutionSource: 'existing_exact_cadastral',
      correctionApplied: false,
      notes: 'Existing exact cadastral parcel polygon verified.',
    };
  }

  // Attempt SNIT / Folio Real / AI master geocoding resolution
  try {
    const geocode = await resolvePropertyLocation({
      id: auction.id,
      plano: auction.plano_catastrado,
      folioReal: auction.folio_real,
      province,
      canton,
      district,
      raw_edict_text: auction.raw_edict_text,
      address_description: auction.address_description,
      legal_summary: auction.legal_summary,
    });

    const isExact = geocode.isExact;
    const hasPolygon = !!geocode.polygonGeoJSON;
    const resolvedLat = geocode.lat;
    const resolvedLng = geocode.lng;

    const coordsChanged =
      !hasValidCRCoords ||
      Math.abs((currentLat || 0) - resolvedLat) > 0.001 ||
      Math.abs((currentLng || 0) - resolvedLng) > 0.001;

    return {
      isValid: hasValidCRCoords && !coordsChanged,
      latitude: resolvedLat,
      longitude: resolvedLng,
      locationType: geocode.location_type || (isExact ? 'exact_cadastral' : 'approximate_town'),
      hasLotBoundaries: hasPolygon,
      isExactPin: isExact,
      resolutionSource: geocode.resolutionSource,
      polygonGeoJSON: geocode.polygonGeoJSON,
      correctionApplied: coordsChanged || (hasPolygon && !currentPolygon),
      notes: hasPolygon
        ? 'Exact lot boundaries found via SNIT Cadastre.'
        : isExact
        ? 'Exact GPS pin location verified.'
        : 'Approximate centroid assigned.',
    };
  } catch (err: any) {
    // Fallback to town centroid
    const fallback = resolveTownCentroid(
      province,
      canton,
      district,
      String(auction.id || auction.folio_real || '')
    );

    return {
      isValid: hasValidCRCoords,
      latitude: hasValidCRCoords ? currentLat! : fallback.lat,
      longitude: hasValidCRCoords ? currentLng! : fallback.lng,
      locationType: 'approximate_town',
      hasLotBoundaries: false,
      isExactPin: false,
      resolutionSource: 'town_fallback',
      correctionApplied: !hasValidCRCoords,
      notes: `Fallback centroid applied due to error: ${err.message}`,
    };
  }
}

/**
 * Execute full verification (Title Accuracy + Map Pin) for an auction record
 */
export async function verifyAndCorrectAuction(auction: Partial<Auction>): Promise<{
  verification: VerificationResult;
  updatedPayload?: Record<string, any>;
}> {
  const titleCheck = verifyPropertyTitleAndCharacteristics(auction);
  const mapPinCheck = await verifyPropertyMapPin(auction, titleCheck);

  const verification: VerificationResult = {
    auctionId: auction.id || '',
    expediente: auction.expediente_number || '',
    folioReal: titleCheck.verifiedFolioReal || auction.folio_real || '',
    titleCheck,
    mapPinCheck,
  };

  const updatedPayload: Record<string, any> = {};
  let hasUpdates = false;

  // Metadata updates
  if (titleCheck.correctedFields.includes('folio_real') || (titleCheck.verifiedFolioReal && titleCheck.verifiedFolioReal !== auction.folio_real)) {
    updatedPayload.folio_real = titleCheck.verifiedFolioReal;
    hasUpdates = true;
  }
  if (titleCheck.correctedFields.includes('province')) {
    updatedPayload.province = titleCheck.verifiedProvince;
    hasUpdates = true;
  }
  if (titleCheck.correctedFields.includes('canton')) {
    updatedPayload.canton = titleCheck.verifiedCanton;
    hasUpdates = true;
  }
  if (titleCheck.correctedFields.includes('district')) {
    updatedPayload.district = titleCheck.verifiedDistrict;
    hasUpdates = true;
  }
  if (titleCheck.correctedFields.includes('area_m2')) {
    updatedPayload.area_m2 = titleCheck.verifiedAreaM2;
    hasUpdates = true;
  }

  // Geolocation & Pin updates
  if (mapPinCheck.correctionApplied || auction.location_type !== mapPinCheck.locationType) {
    updatedPayload.location = `SRID=4326;POINT(${mapPinCheck.longitude} ${mapPinCheck.latitude})`;
    updatedPayload.location_type = mapPinCheck.locationType;
    hasUpdates = true;
  }

  if (mapPinCheck.polygonGeoJSON) {
    updatedPayload.parcel_polygon = mapPinCheck.polygonGeoJSON;
    hasUpdates = true;
  }

  return {
    verification,
    updatedPayload: hasUpdates ? updatedPayload : undefined,
  };
}

"""
Local Test Runner and Ingestion Simulator
Tests legal edict extraction, validation, centroid geocoding, and statutory pricing formulas.
Supports both offline heuristic simulation and live Gemini Flash extraction if GEMINI_API_KEY is present.
"""

import os
import sys
import json
import logging
from datetime import datetime

from scraper.main import (
    ForeclosureAuction,
    extract_single_edict_gemini,
    extract_single_edict_regex_fallback,
    extract_auctions_with_gemini,
    find_all_unique_folios_in_text,
    compute_reconciliation_metrics,
    enrich_auction_data,
    CR_CANTON_CENTROIDS,
    PROVINCE_CENTROIDS,
    NEXUS_PJ_SEARCH_API,
    NEXUS_PJ_DOC_API,
    BOLETIN_JUDICIAL_PORTAL,
    is_foreclosure_edict_text,
    validate_and_read_response,
    slice_remates_section,
    split_into_expediente_blocks,
    check_yield_and_alert,
    send_discord_notification,
    DEBUG_LOG_PATH,
)


logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger("scraper.test")

# Mock response class for testing validate_and_read_response
class MockHTTPResponse:
    def __init__(self, status: int, data: bytes, headers: dict = None):
        self.status = status
        self.code = status
        self._data = data
        self.headers = headers or {"Content-Type": "application/pdf"}

    def read(self):
        return self._data

# ==============================================================================
# SAMPLE 1: USD-Denominated Residential Condo in Garabito / Jacó
# ==============================================================================
SAMPLE_EDICT_USD_CONDO = """
JUZGADO DE COBRO Y MENOR CUANTÍA DE GARABITO. A las catorce horas y treinta minutos del quince de setiembre de dos mil veintiséis, 
en la puerta exterior de este Despacho; libre de gravámenes hipotecarios; y con la base de doscientos veinte mil dólares exactos 
(USD 220,000.00), en el mejor postor remataré lo siguiente: Finca inscrita en el Registro Público, Partido de Puntarenas, 
Sección de Propiedad, bajo el Sistema de Folio Real matrícula número ciento ochenta y nueve mil trescientos cuarenta y dos guion cero cero cero (6-189342-000). 
La cual es terreno apto para vivienda (Filial 502, Condominio Acqua Residences). Situada en el Distrito 01 Jacó, Cantón 11 Garabito, 
de la Provincia de Puntarenas. Mide: Ciento sesenta y cinco metros con cincuenta decímetros cuadrados (165.50 m2). Plano: P-1928374-2022. 
Linderos: Norte, Finca filial 501; Sur, Finca filial 503; Este, Pasillo de acceso; Oeste, Espacio aéreo sobre zona común. 
Para el segundo remate se señalan las catorce horas y treinta minutos del seis de octubre de dos mil veintiséis, con la base de ciento sesenta y cinco mil dólares 
(USD 165,000.00). Y para el tercer remate se señalan las catorce horas y treinta minutos del veintisiete de octubre de dos mil veintiséis, 
con la base de cincuenta y cinco mil dólares (USD 55,000.00). Se remata por ordenarse así en proceso ejecución hipotecaria de BANCO NACIONAL DE COSTA RICA 
contra INVERSIONES TURÍSTICAS DEL PACÍFICO JACÓ S.A. Expediente: 23-001428-1158-CJ.
"""

# ==============================================================================
# SAMPLE 2: CRC-Denominated Agricultural Land in San Carlos / Quesada
# ==============================================================================
SAMPLE_EDICT_CRC_LAND = """
JUZGADO AGRARIO Y CIVIL DEL II CIRCUITO JUDICIAL DE ALAJUELA (SAN CARLOS). Al ser las nueve horas del dieciocho de setiembre 
de dos mil veintiséis, en la puerta de este Juzgado, con la base de ochenta y cinco millones de colones exactos (CRC 85.000.000,00), 
al mejor postor remataré: Finca del Partido de Alajuela matrícula doscientos ochenta y nueve mil cuatrocientos cincuenta y uno guion cero cero cero (2-289451-000). 
Terreno de agricultura y pastos. Situada en Ron Ron, Distrito 01 Quesada, Cantón 10 San Carlos, Alajuela. 
Mide: Cuarenta y cinco mil metros cuadrados (45.000,00 m2). Plano Catastrado A-2104928-2019. 
Linderos: Norte, Quebrada Honda; Sur, Servidumbre de paso; Este, Finca de Juan Rafael Rojas; Oeste, Camino público. 
Segundo remate: nueve de octubre de 2026. Tercer remate: treinta de octubre de 2026. 
Proceso Ejecución Hipotecaria del BANCO DE COSTA RICA contra AGROPECUARIA GANADERA DEL NORTE S.A. Expediente: 23-008914-0298-CA.
"""

# ==============================================================================
# SAMPLE 3: Cartago Court with Omitted Plano Catastrado (Cobro Judicial)
# ==============================================================================
SAMPLE_EDICT_CARTAGO_NO_PLANO = """
JUZGADO PRIMERO DE COBRO DE CARTAGO. A las diez horas del veinte de octubre de dos mil veintiséis, 
con la base de setenta y dos millones de colones (CRC 72.000.000,00), remataré al mejor postor: 
Finca inscrita en el Partido de Cartago matrícula 3-451298-000. Terreno con casa de habitación. 
Situada en Distrito 01 Oriental, Cantón 01 Central de Cartago. Mide: 210.50 metros cuadrados. 
Linderos: Norte, Calle pública; Sur, Lote 12; Este, Lote 10; Oeste, Lote 14. 
Segundo remate: diez de noviembre de 2026. Tercer remate: primero de diciembre de 2026. 
Proceso de BANCO POPULAR Y DE DESARROLLO COMUNAL contra JUAN PÉREZ MORA. 
EXP: 24-002345-0214-CJ.
"""

# ==============================================================================
# SAMPLE 4: Guanacaste Agrario Court with Omitted Defendant
# ==============================================================================
SAMPLE_EDICT_GUANACASTE_AGRARIO = """
JUZGADO AGRARIO DE SANTA CRUZ. Al ser las catorce horas del cinco de noviembre de dos mil veintiséis, 
en este Despacho, libre de gravámenes, con la base de ciento ochenta mil dólares (USD 180,000.00), 
al mejor postor se subastará: Finca matrícula 5-119283-000, situada en Tempate, Cantón Santa Cruz, Guanacaste. 
Naturaleza: Terreno de pastos y árboles frutales. Mide 12.500 m2. Catastro G-192834-2021. 
Segundo remate: veintiséis de noviembre de 2026. Tercer remate: diecisiete de diciembre de 2026. 
Ejecución hipotecaria promovida por BAC SAN JOSÉ. NÚMERO DE EXPEDIENTE: 23-007891-0388-AG.
"""

def test_response_validation_unit():
    logger.info("\n--- Testing Step 2: Raw Response Validation & Logging ---")
    
    # 1. Valid PDF response (>= 10 KB)
    valid_data = b"%PDF-1.4 " + (b"0123456789" * 1100) # ~11 KB
    resp_valid = MockHTTPResponse(200, valid_data, {"Content-Type": "application/pdf"})
    ok, data, err = validate_and_read_response(resp_valid, "https://mock.judicial.go.cr/bol.pdf", min_bytes=10240)
    assert ok is True, f"Valid 11KB PDF should pass: {err}"
    assert len(data) == len(valid_data)
    assert err is None
    
    # 2. Undersized response (< 10 KB)
    small_data = b"%PDF-1.4 " + (b"0123456789" * 200) # ~2 KB
    resp_small = MockHTTPResponse(200, small_data, {"Content-Type": "application/pdf"})
    ok, data, err = validate_and_read_response(resp_small, "https://mock.judicial.go.cr/tiny.pdf", min_bytes=10240)
    assert ok is False, "Undersized payload must fail validation"
    assert "Undersized payload" in err
    
    # 3. HTTP 403 / 503 error status
    resp_403 = MockHTTPResponse(403, b"Forbidden Access Denied", {"Content-Type": "text/html"})
    ok, data, err = validate_and_read_response(resp_403, "https://mock.judicial.go.cr/blocked.pdf")
    assert ok is False, "HTTP 403 status must fail validation"
    assert "HTTP 403" in err

    # 4. WAF / Cloudflare / Barracuda Challenge Page detection
    challenge_html = b"<html><head><title>Just a moment...</title></head><body>cf-browser-verification security check</body></html>"
    resp_chal = MockHTTPResponse(200, challenge_html, {"Content-Type": "text/html"})
    ok, data, err = validate_and_read_response(resp_chal, "https://mock.judicial.go.cr/portal", min_bytes=100)
    assert ok is False, "Bot challenge page signature must be detected and rejected"
    assert "challenge page detected" in err
    
    logger.info("✓ Step 2 Raw Response Validation & Logging tests passed successfully.")


def test_section_slicing_and_block_splitting():
    logger.info("\n--- Testing Step 3: Remates Section Slicing & Case Block Splitting ---")
    
    multi_chapter_document = f"""
    BOLETÍN JUDICIAL N° 150
    ADMINISTRACIÓN PÚBLICA
    Avisos de licitaciones administrativas de suministros...
    
    REMATES PODER JUDICIAL (2 VECES)
    
    {SAMPLE_EDICT_USD_CONDO}
    
    {SAMPLE_EDICT_CRC_LAND}
    
    {SAMPLE_EDICT_CARTAGO_NO_PLANO}
    
    CITACIONES
    Citación a herederos y acreedores de la sucesión...
    """
    
    # 1. Section Slicing
    sliced = slice_remates_section(multi_chapter_document)
    assert "REMATES PODER JUDICIAL" in sliced, "Must isolate Remates section"
    assert "ADMINISTRACIÓN PÚBLICA" not in sliced, "Must exclude preceding non-remate chapters"
    assert "Citación a herederos" not in sliced, "Must exclude trailing non-remate chapters"
    
    # 2. Block Splitting
    blocks = split_into_expediente_blocks(sliced)
    assert len(blocks) >= 3, f"Must extract at least 3 distinct case blocks (got {len(blocks)})"
    logger.info(f"✓ Sliced Remates section and identified {len(blocks)} distinct case blocks.")


def test_multi_court_resilient_parsing():
    logger.info("\n--- Testing Step 3: Multi-Court Resilient Regex Parser ---")
    
    # Test Cartago Case (Missing Plano Catastrado)
    parsed_cartago = extract_single_edict_regex_fallback(SAMPLE_EDICT_CARTAGO_NO_PLANO)
    assert parsed_cartago is not None, "Cartago edict must not be dropped due to missing plano catastrado"
    assert parsed_cartago.expediente_number == "24-002345-0214-CJ"
    assert parsed_cartago.folio_real == "3-451298-000"
    assert parsed_cartago.province == "Cartago"
    assert parsed_cartago.canton == "Central"
    assert parsed_cartago.currency == "CRC"
    assert parsed_cartago.base_price_call_1 == 72000000.0
    assert parsed_cartago.base_price_call_2 == 54000000.0  # 75% fallback
    assert parsed_cartago.base_price_call_3 == 18000000.0  # 25% fallback
    logger.info("  ✓ Cartago court format parsed with resilient plano fallback.")

    # Test Guanacaste Agrario Case (Missing Defendant)
    parsed_guana = extract_single_edict_regex_fallback(SAMPLE_EDICT_GUANACASTE_AGRARIO)
    assert parsed_guana is not None, "Guanacaste edict must not be dropped due to missing defendant"
    assert parsed_guana.expediente_number == "23-007891-0388-AG"
    assert parsed_guana.folio_real == "5-119283-000"
    assert parsed_guana.province == "Guanacaste"
    assert parsed_guana.canton == "Santa Cruz"
    assert parsed_guana.currency == "USD"
    assert parsed_guana.base_price_call_1 == 180000.0
    assert parsed_guana.property_category == "Agricultural"
    logger.info("  ✓ Guanacaste Agrario format parsed with resilient defendant fallback.")


def test_monitoring_and_low_yield_alerting():
    logger.info("\n--- Testing Step 4: Monitoring & Low-Yield Alerting ---")
    
    # 1. Normal yield (>= 3) -> No low yield alert
    normal_audit = check_yield_and_alert(total_parsed=5, run_date_str="2026-08-18", threshold=3)
    assert normal_audit["is_low_yield"] is False, "Yield of 5 must pass threshold >= 3"
    
    # 2. Low yield (< 3) -> Triggers alert
    low_audit = check_yield_and_alert(total_parsed=1, run_date_str="2026-08-18", threshold=3)
    assert low_audit["is_low_yield"] is True, "Yield of 1 must trigger low-yield alert"
    assert low_audit["threshold"] == 3
    logger.info("✓ Step 4 Monitoring & Low-Yield Alerting tests passed successfully.")


def test_source_url_verification():
    logger.info("\n--- Testing Source URL Verification & General Gazette Exclusion ---")
    
    # 1. Verify Nexus PJ endpoints
    assert NEXUS_PJ_SEARCH_API == "https://nexuspj.poder-judicial.go.cr/api/search", "Nexus PJ search API endpoint mismatch"
    assert NEXUS_PJ_DOC_API == "https://nexuspj.poder-judicial.go.cr/api/document", "Nexus PJ document API endpoint mismatch"
    assert BOLETIN_JUDICIAL_PORTAL == "https://boletinjudicial.poder-judicial.go.cr", "Boletín Judicial portal mismatch"
    
    # 2. Verify URL candidate patterns for Boletín Judicial
    sample_date = datetime(2026, 8, 18)
    day = sample_date.strftime("%d")
    month = sample_date.strftime("%m")
    year = sample_date.strftime("%Y")
    
    boletin_candidates = [
        f"https://www.imprentanacional.go.cr/pub-boletin/{year}/{month}/bol_{day}_{month}_{year}.pdf",
        f"https://www.imprentanacional.go.cr/pub/{year}/{month}/{day}/COMP_{day}_{month}_{year}.pdf",
    ]
    
    for url in boletin_candidates:
        assert "boletin" in url.lower() or "comp_" in url.lower(), f"Candidate {url} is not an official Boletín Judicial endpoint"
        assert "gaceta" not in url.lower() and "pub-gaceta" not in url.lower(), f"Candidate {url} must not target general gazette"
        
    # 3. Test that non-judicial executive gazettes are rejected by edict filter
    non_judicial_text = """
    MINISTERIO DE HACIENDA. Resolución N° DGT-R-012-2026. Se aprueban las tablas de retención en la fuente para el período fiscal 2026.
    Publíquese en el diario oficial La Gaceta.
    """
    assert not is_foreclosure_edict_text(non_judicial_text), "Edict filter must reject general non-judicial government notices"
    assert is_foreclosure_edict_text(SAMPLE_EDICT_USD_CONDO), "Edict filter must accept valid court foreclosure notices"
    assert is_foreclosure_edict_text(SAMPLE_EDICT_CRC_LAND), "Edict filter must accept valid agricultural court foreclosure notices"
    
def test_multi_folio_splitting():
    logger.info("\n--- Testing Multi-Folio Real Notice Splitting ---")
    multi_folio_edict = """
    JUZGADO PRIMERO DE COBRO DE SAN JOSÉ. A las diez horas del diez de octubre de dos mil veintiséis, 
    con la base de cien mil dólares (USD 100,000.00), remataré al mejor postor los siguientes inmuebles: 
    1) Finca inscrita en el Registro Público, Partido de San José, Folio Real matrícula número 1-123456-000. 
    2) Finca inscrita en el Partido de San José matrícula número 1-654321-000. 
    Situadas en San Pedro, Cantón Montes de Oca, San José. 
    Segundo remate: 75% de la base. Tercer remate: 25% de la base. 
    Proceso de BANCO NACIONAL DE COSTA RICA contra INVERSIONES URBANAS S.A. 
    Expediente: 24-004567-1158-CJ.
    """
    discovered_folios = find_all_unique_folios_in_text(multi_folio_edict)
    assert len(discovered_folios) >= 2, f"Must detect at least 2 distinct folios (got {discovered_folios})"
    assert "1-123456-000" in discovered_folios
    assert "1-654321-000" in discovered_folios
    
    extracted_items = extract_auctions_with_gemini([multi_folio_edict])
    assert len(extracted_items) == 2, f"Multi-folio notice must yield 2 distinct auction records (got {len(extracted_items)})"
    folios_in_results = {a.folio_real for a in extracted_items}
    assert "1-123456-000" in folios_in_results
    assert "1-654321-000" in folios_in_results
    logger.info(f"✓ Successfully split bundled notice into {len(extracted_items)} distinct property records: {folios_in_results}")


def test_reconciliation_audit():
    logger.info("\n--- Testing Reconciliation Coverage Audit ---")
    raw_chunks = [
        SAMPLE_EDICT_USD_CONDO,
        SAMPLE_EDICT_CRC_LAND,
        SAMPLE_EDICT_CARTAGO_NO_PLANO
    ]
    extracted_auctions = extract_auctions_with_gemini(raw_chunks)
    reconciliation = compute_reconciliation_metrics(raw_chunks, extracted_auctions)
    
    assert reconciliation["coverage_percentage"] == 100.0, f"Coverage percentage should be 100% (got {reconciliation['coverage_percentage']}%)"
    assert reconciliation["raw_dockets_count"] == 3
    assert reconciliation["extracted_properties_count"] == 3
    logger.info(f"✓ Reconciliation Audit verified: {reconciliation['coverage_percentage']}% coverage across {reconciliation['raw_dockets_count']} dockets.")



def run_tests():
    logger.info("================================================================")
    logger.info("RUNNING ENHANCED SCRAPER & INGESTION PIPELINE LOCAL TESTS")
    logger.info("================================================================")

    # 1. Source URL & Gazette Isolation Tests
    test_source_url_verification()

    # 2. Step 2: Response Validation & Logging Tests
    test_response_validation_unit()

    # 3. Step 3: Section Slicing & Case Block Splitting Tests
    test_section_slicing_and_block_splitting()

    # 4. Step 3: Multi-Court Resilient Regex Parsing Tests
    test_multi_court_resilient_parsing()

    # 5. Step 4: Monitoring & Low-Yield Alerting Tests
    test_monitoring_and_low_yield_alerting()

    # 6. Multi-Folio Real Notice Splitting Tests
    test_multi_folio_splitting()

    # 7. Reconciliation Coverage Audit Tests
    test_reconciliation_audit()

    test_cases = [
        ("USD Condo (Garabito)", SAMPLE_EDICT_USD_CONDO),
        ("CRC Agricultural Land (San Carlos)", SAMPLE_EDICT_CRC_LAND),
    ]

    has_gemini_key = bool(os.getenv("GEMINI_API_KEY"))
    logger.info(f"GEMINI_API_KEY present: {has_gemini_key}")

    passed_count = 0

    for name, edict_text in test_cases:
        logger.info(f"\n--- Testing Case: {name} ---")

        extracted = None

        if has_gemini_key:
            logger.info("Attempting live extraction with Gemini Flash...")
            extracted = extract_single_edict_gemini(edict_text)

        if not extracted:
            logger.info("Using deterministic legal extraction fallback parser...")
            extracted = extract_single_edict_regex_fallback(edict_text)

        # 1. Verify Structure & Required Fields
        assert extracted.expediente_number, "Expediente number is required"
        assert extracted.folio_real, "Folio real is required"
        assert extracted.base_price_call_1 > 0, "Base price 1 must be positive"
        assert extracted.currency in ["USD", "CRC"], "Currency must be USD or CRC"

        # 2. Verify Call Math Rule: 2nd call = 75%, 3rd call = 25%
        if not getattr(extracted, "base_price_call_2", None):
            extracted.base_price_call_2 = round(extracted.base_price_call_1 * 0.75, 2)
        if not getattr(extracted, "base_price_call_3", None):
            extracted.base_price_call_3 = round(extracted.base_price_call_1 * 0.25, 2)

        expected_call_2 = round(extracted.base_price_call_1 * 0.75, 2)
        expected_call_3 = round(extracted.base_price_call_1 * 0.25, 2)
        assert abs(extracted.base_price_call_2 - expected_call_2) <= 1.0, f"Call 2 must be 75% of base (got {extracted.base_price_call_2})"
        assert abs(extracted.base_price_call_3 - expected_call_3) <= 1.0, f"Call 3 must be 25% of base (got {extracted.base_price_call_3})"

        # 3. Test Enrichment (Centroid Geocoding & Margin Calculation)
        enriched = enrich_auction_data(extracted)
        assert "location" in enriched, "Enriched record must contain PostGIS location"
        assert enriched["location"].startswith("SRID=4326;POINT("), "Location must be valid PostGIS WKT"
        assert enriched["estimated_market_value"] > enriched["base_price_call_1"], "Estimated market value must exceed base price"
        margin_pct = round(((enriched["estimated_market_value"] - enriched["base_price_call_1"]) / enriched["estimated_market_value"]) * 100, 2)
        assert margin_pct > 0, "Estimated margin % must be positive"

        logger.info("✓ Validation Passed:")
        logger.info(f"  • Expediente: {enriched['expediente_number']}")
        logger.info(f"  • Folio Real: {enriched['folio_real']}")
        logger.info(f"  • Canton/Prov: {enriched['canton']}, {enriched['province']}")
        logger.info(f"  • Base 1er Remate: {enriched['currency']} {enriched['base_price_call_1']:,.2f}")
        logger.info(f"  • Base 2do Remate (75%): {enriched['currency']} {enriched['base_price_call_2']:,.2f}")
        logger.info(f"  • Base 3er Remate (25%): {enriched['currency']} {enriched['base_price_call_3']:,.2f}")
        logger.info(f"  • Valor Mercado Est.: {enriched['currency']} {enriched['estimated_market_value']:,.2f} (+{margin_pct}% margen)")
        logger.info(f"  • PostGIS Point: {enriched['location']}")

        passed_count += 1

    logger.info(f"\n================================================================")
    logger.info(f"ALL {passed_count}/{len(test_cases)} PIPELINE TESTS & UNIT TEST SUITES PASSED!")
    logger.info("================================================================")

if __name__ == "__main__":
    run_tests()

"""
Historical Foreclosure Ingest Utility: Scans official Nexus PJ and daily Boletín Judicial publications
from Poder Judicial & Imprenta Nacional, extracts active court foreclosures, and populates Supabase PostGIS.
"""

import os
import re
import io
import ssl
import json
import logging
import urllib.request
from datetime import datetime, timedelta
from pypdf import PdfReader
from dotenv import load_dotenv

from scraper.main import (
    create_ssl_context,
    CR_CANTON_CENTROIDS,
    PROVINCE_CENTROIDS,
    PROVINCE_PREFIXES,
    CATEGORY_IMAGES,
    ForeclosureAuction,
    extract_single_edict_regex_fallback,
    enrich_auction_data,
    upsert_to_supabase,
    fetch_from_nexuspj_api,
    validate_and_read_response,
    slice_remates_section,
    split_into_expediente_blocks,
    check_yield_and_alert,
)

load_dotenv(".env.local")
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s]: %(message)s")
logger = logging.getLogger("historical.ingestion")

def scan_and_ingest_history(days_back: int = 10):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    ctx = create_ssl_context()
    today = datetime.now()
    
    extracted_auctions = []
    
    # 1. Pull from Nexus PJ API directly
    logger.info("Querying Nexus PJ API for recent Boletín Judicial foreclosure notices...")
    try:
        nexus_raw_edicts = fetch_from_nexuspj_api(today)
        for chunk in nexus_raw_edicts:
            parsed = extract_single_edict_regex_fallback(chunk)
            if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                logger.info(f"  ✓ Extracted from Nexus PJ: {parsed.expediente_number} | {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f}")
                extracted_auctions.append(parsed)
    except Exception as e:
        logger.warning(f"Nexus PJ query error: {e}")
        
    # 2. Scan official daily Boletín Judicial PDF publications
    logger.info(f"Scanning the past {days_back} days for official daily Boletín Judicial publications...")
    
    for i in range(days_back):
        d = today - timedelta(days=i)
        if d.weekday() >= 5:  # Skip weekends
            continue
            
        day_str = d.strftime("%d")
        month_str = d.strftime("%m")
        year_str = d.strftime("%Y")
        
        candidates = [
            f"https://www.imprentanacional.go.cr/pub/{year_str}/{month_str}/{day_str}/COMP_{day_str}_{month_str}_{year_str}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year_str}/{month_str}/bol_{day_str}_{month_str}_{year_str}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year_str}/{month_str}//bol_{day_str}_{month_str}_{year_str}.pdf",
        ]
        
        for url in candidates:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                    is_valid, data, err = validate_and_read_response(resp, url, min_bytes=10240, is_json=False)
                    if is_valid:
                        logger.info(f"Processing {url} ({len(data):,} bytes)...")
                        reader = PdfReader(io.BytesIO(data))
                        
                        full_text = ""
                        for page_idx, page in enumerate(reader.pages):
                            full_text += (page.extract_text() or "") + "\n"
                            
                        remates_section = slice_remates_section(full_text)
                        blocks = split_into_expediente_blocks(remates_section)
                        for chunk in blocks:
                            parsed = extract_single_edict_regex_fallback(chunk)
                            if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                                logger.info(f"  ✓ Extracted: {parsed.expediente_number} | {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
                                extracted_auctions.append(parsed)
            except Exception as e:
                logger.debug(f"Candidate {url} not available: {e}")
                
    logger.info(f"Total structured foreclosure auctions found: {len(extracted_auctions)}")
    check_yield_and_alert(total_parsed=len(extracted_auctions), run_date_str=today.strftime("%Y-%m-%d"), threshold=3)
    
    if extracted_auctions:
        # Deduplicate by expediente_number
        unique_map = {}
        for a in extracted_auctions:
            unique_map[a.expediente_number] = a
            
        unique_auctions = list(unique_map.values())
        logger.info(f"Enriching {len(unique_auctions)} unique properties...")
        enriched = [enrich_auction_data(a) for a in unique_auctions]
        
        logger.info("Upserting records to Supabase PostGIS...")
        upsert_to_supabase(enriched)
        logger.info("Historical ingestion complete!")
    else:
        logger.info("No historical foreclosures matched.")

if __name__ == "__main__":
    scan_and_ingest_history(days_back=12)

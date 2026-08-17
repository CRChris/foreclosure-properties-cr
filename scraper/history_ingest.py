"""
Historical Foreclosure Ingest Utility: Scans past 5-10 business days of official publications
from La Imprenta Nacional, extracts active court foreclosures, and populates Supabase PostGIS.
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

from main import (
    create_ssl_context,
    CR_CANTON_CENTROIDS,
    PROVINCE_CENTROIDS,
    PROVINCE_PREFIXES,
    CATEGORY_IMAGES,
    ForeclosureAuction,
    extract_single_edict_regex_fallback,
    enrich_auction_data,
    upsert_to_supabase,
)

load_dotenv(".env.local")
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s]: %(message)s")
logger = logging.getLogger("historical.ingestion")

def scan_and_ingest_history(days_back: int = 10):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    ctx = create_ssl_context()
    today = datetime.now()
    
    extracted_auctions = []
    
    logger.info(f"Scanning the past {days_back} days for official publications...")
    
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
        ]
        
        for url in candidates:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        if len(data) < 5000:
                            continue
                        logger.info(f"Processing {url} ({len(data):,} bytes)...")
                        reader = PdfReader(io.BytesIO(data))
                        
                        pattern = re.compile(
                            r'(?=(?:En\s+(?:la\s+puerta|el\s+despacho)|Al\s+ser\s+las|A\s+las\s+\d+|Se\s+hace\s+saber|Por\s+disposición|JUZGADO|EDICTO|AVISO\s+DE\s+REMATE|SUB_ASTA|REMATE\s+JUDICIAL)\b)',
                            re.IGNORECASE
                        )
                        
                        for page_idx, page in enumerate(reader.pages):
                            text = page.extract_text() or ""
                            if "remate" in text.lower() or "subasta" in text.lower():
                                for chunk in pattern.split(text):
                                    chunk = chunk.strip()
                                    if len(chunk) > 100:
                                        parsed = extract_single_edict_regex_fallback(chunk)
                                        if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                                            logger.info(f"  ✓ Extracted: {parsed.expediente_number} | {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
                                            extracted_auctions.append(parsed)
            except Exception as e:
                logger.debug(f"Candidate {url} not available: {e}")
                
    logger.info(f"Total structured foreclosure auctions found: {len(extracted_auctions)}")
    
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

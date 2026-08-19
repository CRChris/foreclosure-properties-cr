"""
Historical Foreclosure Ingest Utility: Scans official Nexus PJ and daily Boletín Judicial publications
from Poder Judicial & Imprenta Nacional for 10 business days, extracts active court foreclosures,
populates Supabase PostGIS, and executes post-scrape catalog deduplication.
"""

import os
import re
import io
import ssl
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple, Any, Optional
from pypdf import PdfReader
from zoneinfo import ZoneInfo
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
from scraper.pull_30_days import fetch_existing_expedientes_and_folios
from scraper.auction_tracker import sync_auction_progression_via_rpc

load_dotenv(".env.local")
load_dotenv()

COSTA_RICA_TZ = ZoneInfo("America/Costa_Rica")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s]: %(message)s")
logger = logging.getLogger("historical.ingestion")


def deduplicate_supabase_catalog() -> Dict[str, Any]:
    """
    Post-scrape catalog deduplication engine:
    Scans the entire 'auctions' table in Supabase.
    Identifies any duplicate records by expediente_number or folio_real.
    Keeps the most recent record and deletes duplicate IDs.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase credentials missing. Skipping post-scrape deduplication.")
        return {"deleted": 0, "status": "no_credentials"}

    logger.info("\n🧹 POST-SCRAPE CATALOG DEDUPLICATION PASS...")
    ctx = create_ssl_context()
    fetch_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/auctions?select=id,expediente_number,folio_real,created_at&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    try:
        req = urllib.request.Request(fetch_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            if resp.status != 200:
                logger.warning(f"Supabase returned status {resp.status} on auction fetch.")
                return {"deleted": 0, "error": f"HTTP {resp.status}"}
            rows = json.loads(resp.read().decode("utf-8"))

        seen_expedientes: Set[str] = set()
        seen_folios: Set[str] = set()
        ids_to_delete: List[Any] = []

        for row in rows:
            r_id = row.get("id")
            exp = (row.get("expediente_number") or "").strip().upper()
            folio = (row.get("folio_real") or "").strip().upper()

            is_duplicate = False
            if exp and exp in seen_expedientes:
                is_duplicate = True
            if folio and folio in seen_folios:
                is_duplicate = True

            if is_duplicate:
                ids_to_delete.append(r_id)
            else:
                if exp:
                    seen_expedientes.add(exp)
                if folio:
                    seen_folios.add(folio)

        if ids_to_delete:
            logger.info(f"🗑️ Found {len(ids_to_delete)} duplicate records in Supabase catalog. Removing...")
            chunk_size = 50
            deleted_count = 0
            for i in range(0, len(ids_to_delete), chunk_size):
                chunk = ids_to_delete[i:i+chunk_size]
                id_list_str = ",".join(str(cid) for cid in chunk)
                del_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/auctions?id=in.({id_list_str})"
                del_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
                with urllib.request.urlopen(del_req, context=ctx, timeout=15) as del_resp:
                    if del_resp.status in (200, 204):
                        deleted_count += len(chunk)
            logger.info(f"✓ Successfully deleted {deleted_count} duplicate records from Supabase.")
            return {"deleted": deleted_count, "total_unique_remaining": len(rows) - deleted_count}
        else:
            logger.info(f"✓ Supabase catalog is 100% clean. {len(rows)} unique foreclosures, 0 duplicates.")
            return {"deleted": 0, "total_unique": len(rows)}

    except Exception as e:
        logger.warning(f"Error during catalog deduplication: {e}")
        return {"deleted": 0, "error": str(e)}


def scan_and_ingest_history(business_days: int = 10):
    now_cr = datetime.now(COSTA_RICA_TZ)
    logger.info("=================================================================")
    logger.info(f"🚀 INGESTION ENGINE: Scanning {business_days} Business Days of Nexus PJ / Boletín Judicial")
    logger.info(f"🕒 Current Costa Rica Time: {now_cr.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    logger.info("=================================================================")

    # 1. Fetch existing auctions to prevent inserting duplicates
    existing_expedientes, existing_folios, terminal_expedientes = fetch_existing_expedientes_and_folios()
    logger.info(f"✓ Found {len(existing_expedientes)} existing expedientes in Supabase.")

    all_extracted: Dict[str, ForeclosureAuction] = {}
    processed_urls: Set[str] = set()

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    }
    ctx = create_ssl_context()

    # 2. Iterate backwards by business days
    business_days_scanned = 0
    calendar_offset = 0

    while business_days_scanned < business_days and calendar_offset < 30:
        target_date = now_cr - timedelta(days=calendar_offset)
        calendar_offset += 1

        # Skip Saturday (5) and Sunday (6)
        if target_date.weekday() >= 5:
            continue

        business_days_scanned += 1
        day_str = target_date.strftime("%d")
        month_str = target_date.strftime("%m")
        year_str = target_date.strftime("%Y")
        date_iso = target_date.strftime("%Y-%m-%d")

        logger.info(f"\n📅 [Business Day {business_days_scanned}/{business_days}] Scanning {date_iso} ({target_date.strftime('%A')})...")

        # A. Query Nexus PJ API
        try:
            nexus_raw_edicts = fetch_from_nexuspj_api(target_date)
            for chunk in nexus_raw_edicts:
                parsed = extract_single_edict_regex_fallback(chunk)
                if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                    exp_norm = parsed.expediente_number.strip().upper()
                    folio_norm = parsed.folio_real.strip().upper()
                    if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                        all_extracted[exp_norm] = parsed
                        logger.info(f"    ✨ Nexus PJ Foreclosure: [{parsed.expediente_number}] Folio: {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
        except Exception as e:
            logger.debug(f"Nexus PJ query note for {date_iso}: {e}")

        # B. Query official daily Boletín Judicial PDF publications
        candidates = [
            f"https://www.imprentanacional.go.cr/pub/{year_str}/{month_str}/{day_str}/COMP_{day_str}_{month_str}_{year_str}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year_str}/{month_str}/bol_{day_str}_{month_str}_{year_str}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year_str}/{month_str}//bol_{day_str}_{month_str}_{year_str}.pdf",
        ]

        for url in candidates:
            if url in processed_urls:
                continue
            processed_urls.add(url)

            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                    is_valid, data, err = validate_and_read_response(resp, url, min_bytes=10240, is_json=False)
                    if is_valid:
                        logger.info(f"Processing {url} ({len(data):,} bytes)...")
                        reader = PdfReader(io.BytesIO(data))
                        
                        full_text = ""
                        for page in reader.pages:
                            try:
                                full_text += (page.extract_text() or "") + "\n"
                            except Exception:
                                continue
                                
                        remates_section = slice_remates_section(full_text)
                        blocks = split_into_expediente_blocks(remates_section)
                        for chunk in blocks:
                            parsed = extract_single_edict_regex_fallback(chunk)
                            if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                                exp_norm = parsed.expediente_number.strip().upper()
                                folio_norm = parsed.folio_real.strip().upper()
                                if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                                    all_extracted[exp_norm] = parsed
                                    logger.info(f"    ✨ New Boletín Foreclosure: [{parsed.expediente_number}] Folio: {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
            except Exception as e:
                logger.debug(f"Candidate {url} not available: {e}")

    # 3. Check local sample PDF if available
    for local_name in ["sample_boletin.pdf"]:
        if os.path.exists(local_name):
            try:
                with open(local_name, "rb") as f:
                    local_bytes = f.read()
                reader = PdfReader(io.BytesIO(local_bytes))
                full_text = ""
                for page in reader.pages:
                    full_text += (page.extract_text() or "") + "\n"
                remates_section = slice_remates_section(full_text)
                blocks = split_into_expediente_blocks(remates_section)
                for chunk in blocks:
                    parsed = extract_single_edict_regex_fallback(chunk)
                    if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                        exp_norm = parsed.expediente_number.strip().upper()
                        folio_norm = parsed.folio_real.strip().upper()
                        if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                            all_extracted[exp_norm] = parsed
                            logger.info(f"    ✨ New Local Foreclosure: [{parsed.expediente_number}] Folio: {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
            except Exception as e:
                logger.warning(f"Could not read local file {local_name}: {e}")

    unique_new = list(all_extracted.values())
    logger.info(f"\n📊 10-Business-Day Extraction Complete: Found {len(unique_new)} new unique foreclosures.")

    # 4. Check low yield & alert
    check_yield_and_alert(
        total_parsed=len(unique_new),
        run_date_str=now_cr.strftime("%Y-%m-%d"),
        threshold=3,
        extra_context="10-business-day ingestion run"
    )

    # 5. Enrich & Upsert to Supabase
    if unique_new:
        logger.info(f"🗺️  Enriching {len(unique_new)} unique properties with PostGIS coordinates and valuations...")
        enriched = [enrich_auction_data(a) for a in unique_new]

        logger.info(f"💾 Upserting {len(enriched)} unique records to Supabase PostGIS...")
        inserted_count = upsert_to_supabase(enriched)
        logger.info(f"✓ Successfully inserted {inserted_count} new unique foreclosures into Supabase!")
    else:
        logger.info("✓ All properties in these 10 business days are already up to date in Supabase.")

    # 6. Post-Scrape Catalog Deduplication
    dedup_results = deduplicate_supabase_catalog()
    logger.info(f"Deduplication summary: {dedup_results}")

    # 7. Lifecycle Progression RPC Sync
    logger.info("\n⚡ Synchronizing lifecycle statuses via PostgreSQL RPC...")
    progression_result = sync_auction_progression_via_rpc()
    logger.info(f"✓ Lifecycle Progression: {progression_result}")

    logger.info("\n🎉 10-Business-Day Historical Ingestion & Deduplication Finished Successfully!")


if __name__ == "__main__":
    scan_and_ingest_history(business_days=10)

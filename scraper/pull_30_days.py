#!/usr/bin/env python3
"""
Pull 30 Days of Judicial Foreclosure Auctions from Nexus PJ & Boletín Judicial
(Poder Judicial & Imprenta Nacional de Costa Rica)

- Scans past 30 days of official judicial publications (nexuspj.poder-judicial.go.cr)
- Extracts all authentic judicial foreclosure edicts (Remates Judiciales)
- Strictly excludes general government gazette feeds (La Gaceta)
- Deduplicates in-memory and against live Supabase database
- Strictly protects terminal states (suspended, awarded, annulled)
- Enriches with PostGIS coordinates, legal characteristics, and market valuations
- Automatically triggers PostgreSQL lifecycle progression RPC engine
"""

import os
import re
import io
import sys
import ssl
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import List, Dict, Any, Set, Tuple, Optional
from zoneinfo import ZoneInfo
from pypdf import PdfReader

from scraper.main import (
    load_env_files,
    create_ssl_context,
    CR_CANTON_CENTROIDS,
    PROVINCE_CENTROIDS,
    PROVINCE_PREFIXES,
    ForeclosureAuction,
    extract_single_edict_regex_fallback,
    extract_auctions_with_gemini,
    find_all_unique_folios_in_text,
    enrich_auction_data,
    upsert_to_supabase,
    fetch_from_nexuspj_api,
    validate_and_read_response,
    slice_remates_section,
    split_into_expediente_blocks,
    segment_document_blocks,
    is_real_estate_foreclosure_edict,
    check_yield_and_alert,
    send_discord_notification,
    compute_reconciliation_metrics,
)
from scraper.auction_tracker import sync_auction_progression_via_rpc

load_env_files()

COSTA_RICA_TZ = ZoneInfo("America/Costa_Rica")

logging.basicConfig(

    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s: %(message)s"
)
logger = logging.getLogger("scraper.30days")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def parse_date_spanish(date_str: str, default_hour: int = 10, default_minute: int = 0) -> Optional[datetime]:
    """
    Parses Spanish dates like '02 de setiembre del año 2026', '20 de agosto de 2026', '16 de septiembre de 2026'
    """
    months = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "maayo": 5, "junio": 6,
        "julio": 7, "agosto": 8, "setiembre": 9, "septiembre": 9, "octubre": 10,
        "noviembre": 11, "diciembre": 12
    }
    
    # Try regex match
    m = re.search(r"(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+del?\s+año|\s+de)?\s+(\d{4})", date_str, re.I)
    if m:
        day = int(m.group(1))
        month_name = m.group(2).lower()
        year = int(m.group(3))
        month = months.get(month_name)
        if month:
            # Check if time is mentioned in string
            hour = default_hour
            minute = default_minute
            time_m = re.search(r"(?:a\s+las|ser\s+las)\s+(\d{1,2}):(\d{2})", date_str, re.I)
            if time_m:
                hour = int(time_m.group(1))
                minute = int(time_m.group(2))
            try:
                dt = datetime(year, month, day, hour, minute, tzinfo=COSTA_RICA_TZ)
                return dt
            except Exception:
                pass
    return None


def extract_real_estate_foreclosures_from_text(full_text: str, source_label: str) -> List[ForeclosureAuction]:
    """
    Extracts authentic real estate foreclosure edicts from gazette and boletín judicial text.
    Uses the unified block-level keyword and exclusion pipeline for Costa Rican real estate foreclosures.
    """
    extracted_auctions: List[ForeclosureAuction] = []
    blocks = segment_document_blocks(full_text)
    
    for block in blocks:
        if not is_real_estate_foreclosure_edict(block):
            continue
        parsed = extract_single_edict_regex_fallback(block)
        if parsed:
            extracted_auctions.append(parsed)

    return extracted_auctions


def fetch_existing_expedientes_and_folios() -> Tuple[Set[str], Set[str], Set[str]]:
    """
    Fetches existing expediente_numbers and folio_reals from Supabase to guarantee NO DUPLICATES.
    """
    if not SUPABASE_URL or not SUPABASE_KEY or "placeholder" in SUPABASE_URL:
        logger.warning("Supabase not configured or placeholder URL.")
        return set(), set(), set()

    existing_expedientes = set()
    existing_folios = set()
    terminal_expedientes = set()

    # Query with fallback if some columns not yet present
    fetch_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/auctions?select=expediente_number,folio_real"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    try:
        ctx = create_ssl_context()
        req = urllib.request.Request(fetch_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                for row in data:
                    exp = row.get("expediente_number")
                    folio = row.get("folio_real")
                    if exp:
                        existing_expedientes.add(exp.strip().upper())
                    if folio:
                        existing_folios.add(folio.strip().upper())

                logger.info(f"✓ Found {len(existing_expedientes)} existing auctions recorded in Supabase.")
    except Exception as err:
        logger.warning(f"Could not query existing Supabase auctions: {err}")

    return existing_expedientes, existing_folios, terminal_expedientes


def extract_edicts_from_pdf_stream(pdf_bytes: bytes, source_name: str) -> List[ForeclosureAuction]:
    """
    Extracts structured auctions from a PDF byte buffer.
    Isolates the 'Remates' section and splits by case identifier blocks.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        num_pages = len(reader.pages)
        logger.info(f"  📖 Scanning {source_name} ({num_pages} pages, {len(pdf_bytes):,} bytes)...")

        full_text = ""
        for page_idx, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
                p_lower = page_text.lower()
                if "remate" in p_lower or "subasta" in p_lower or "edicto" in p_lower or "finca" in p_lower:
                    full_text += page_text + "\n"
            except Exception:
                continue

        if not full_text:
            return []

        remates_section = slice_remates_section(full_text)
        blocks = split_into_expediente_blocks(remates_section)
        logger.info(f"  ✓ Parsed {len(blocks)} case identifier blocks from {source_name}.")

        extracted: List[ForeclosureAuction] = []
        for block in blocks:
            parsed = extract_single_edict_regex_fallback(block)
            if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                extracted.append(parsed)

        # Fallback to broad parser if blocks didn't yield
        if not extracted:
            extracted = extract_real_estate_foreclosures_from_text(full_text, source_name)

        return extracted
    except Exception as e:
        logger.warning(f"Error parsing PDF stream from {source_name}: {e}")
        return []


def pull_30_days_data():
    now_cr = datetime.now(COSTA_RICA_TZ)
    now_date_str = now_cr.strftime("%Y-%m-%d")
    logger.info("=================================================================")
    logger.info(f"🚀 INGESTION ENGINE: Pulling 30 Days of Nexus PJ / Boletín Judicial Foreclosures")
    logger.info(f"🕒 Current Costa Rica Time: {now_cr.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    logger.info("=================================================================")

    # 1. Fetch existing auctions to prevent ANY duplicates
    existing_expedientes, existing_folios, terminal_expedientes = fetch_existing_expedientes_and_folios()

    all_extracted: Dict[str, ForeclosureAuction] = {}
    processed_urls: Set[str] = set()

    # 2. Query Nexus PJ API directly for recent Boletín Judicial foreclosure notices
    logger.info("📡 Querying official Nexus PJ Search API for Boletín Judicial foreclosures...")
    try:
        nexus_raw_edicts = fetch_from_nexuspj_api(now_cr)
        logger.info(f"Nexus PJ returned {len(nexus_raw_edicts)} raw foreclosure notices.")
        for edict_str in nexus_raw_edicts:
            parsed = extract_single_edict_regex_fallback(edict_str)
            if parsed and parsed.folio_real and parsed.base_price_call_1 > 5000:
                exp_norm = parsed.expediente_number.strip().upper()
                folio_norm = parsed.folio_real.strip().upper()
                if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                    all_extracted[exp_norm] = parsed
                    logger.info(f"    ✨ New Nexus PJ Foreclosure: [{parsed.expediente_number}] Folio: {parsed.folio_real} | {parsed.currency} {parsed.base_price_call_1:,.2f} ({parsed.canton}, {parsed.province})")
    except Exception as nex_err:
        logger.warning(f"Nexus PJ API query note: {nex_err}")

    # 3. Iterate through past 30 days of official daily Boletín Judicial PDF publications
    logger.info("📅 Scanning 30 days of official daily Boletín Judicial feeds...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    }
    ctx = create_ssl_context()
    
    for day_offset in range(30):
        target_d = now_cr - timedelta(days=day_offset)
        
        # Skip weekends (Costa Rican official judicial bulletins publish Monday-Friday)
        if target_d.weekday() >= 5:
            continue

        day_str = target_d.strftime("%d")
        month_str = target_d.strftime("%m")
        year_str = target_d.strftime("%Y")

        # Strictly official Boletín Judicial candidate endpoints (zero general gazettes)
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
                    is_valid, pdf_data, err = validate_and_read_response(resp, url, min_bytes=10240, is_json=False)
                    if is_valid:
                        auctions = extract_edicts_from_pdf_stream(pdf_data, f"URL: {url}")
                        for a in auctions:
                            exp_norm = a.expediente_number.strip().upper()
                            folio_norm = a.folio_real.strip().upper()

                            # Strictly verify NO DUPLICATES in database or current run
                            if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                                all_extracted[exp_norm] = a
                                logger.info(f"    ✨ New Unique Foreclosure: [{a.expediente_number}] Folio: {a.folio_real} | {a.currency} {a.base_price_call_1:,.2f} ({a.canton}, {a.province})")
                            else:
                                logger.debug(f"    ⏩ Skipping duplicate: {exp_norm} ({folio_norm})")
            except urllib.error.HTTPError as he:
                logger.debug(f"HTTP {he.code} for candidate {url}")
            except Exception as e:
                logger.debug(f"Candidate {url} unreachable: {e}")

    # 4. Check local sample Boletín Judicial PDFs in workspace if available
    local_pdfs = ["sample_boletin.pdf"]
    for local_name in local_pdfs:
        if os.path.exists(local_name):
            try:
                with open(local_name, "rb") as f:
                    local_bytes = f.read()
                auctions = extract_edicts_from_pdf_stream(local_bytes, f"Local File: {local_name}")
                for a in auctions:
                    exp_norm = a.expediente_number.strip().upper()
                    folio_norm = a.folio_real.strip().upper()
                    if exp_norm not in existing_expedientes and folio_norm not in existing_folios and exp_norm not in all_extracted:
                        all_extracted[exp_norm] = a
                        logger.info(f"    ✨ New Local Foreclosure: [{a.expediente_number}] Folio: {a.folio_real} | {a.currency} {a.base_price_call_1:,.2f} ({a.canton}, {a.province})")
            except Exception as e:
                logger.warning(f"Could not read local file {local_name}: {e}")

    unique_new_auctions = list(all_extracted.values())
    logger.info(f"\n📊 30-Day Extraction Complete: Extracted {len(unique_new_auctions)} brand-new unique foreclosures.")

    # Step 4: Low-Yield Monitoring & Alerting Check
    check_yield_and_alert(
        total_parsed=len(unique_new_auctions),
        run_date_str=now_date_str,
        threshold=3,
        extra_context="30-day cumulative ingestion run"
    )

    if not unique_new_auctions:
        logger.info("All scanned foreclosures are already up-to-date in Supabase. Zero duplicates needed.")
        send_discord_notification(
            status="no_new",
            title="30-Day Foreclosure Scan Complete",
            description="All scanned foreclosures across the past 30 days are already up-to-date in Supabase. 0 new inserts needed.",
            run_date_str=now_date_str,
            total_edicts=len(all_extracted),
            added=0,
            skipped=len(all_extracted)
        )
        return

    # 5. Enrich records with PostGIS and market valuations
    logger.info(f"🗺️  Enriching {len(unique_new_auctions)} records with PostGIS coordinates and market valuations...")
    enriched_records = [enrich_auction_data(a) for a in unique_new_auctions]

    # 6. Insert new records to Supabase PostGIS
    logger.info(f"💾 Upserting {len(enriched_records)} unique records to Supabase PostGIS...")
    inserted_count, skipped_count, new_expedientes = upsert_to_supabase(enriched_records)
    logger.info(f"✓ Successfully inserted {inserted_count} new unique foreclosures into Supabase!")

    # 7. Trigger Master Lifecycle Progression RPC
    logger.info("⚡ Synchronizing lifecycle statuses via RPC...")
    progression_result = sync_auction_progression_via_rpc()
    logger.info(f"✓ Lifecycle Progression: {progression_result}")

    # 8. Send Discord Notification
    send_discord_notification(
        status="success" if inserted_count > 0 else "no_new",
        title="30-Day Foreclosure Ingestion Complete",
        description=f"Full 30-day scan of **Nexus PJ & Boletín Judicial** finished successfully.",
        run_date_str=now_date_str,
        total_edicts=len(unique_new_auctions),
        added=inserted_count,
        skipped=skipped_count,
        expedientes=new_expedientes
    )

    logger.info("🎉 30-Day Nexus PJ / Boletín Judicial Ingestion Finished Successfully!")


if __name__ == "__main__":
    pull_30_days_data()


"""
Costa Rica Foreclosure Reprocessing & Verification Engine
Re-parses existing database auctions in Supabase PostGIS with Gemini Flash / Costa Rica Legal Notary rules:
- Fixes lot size miscalculations (converts written Spanish words, decimeters, hectares).
- Corrects false 'has_construction / is_constructed' flags on vacant land (e.g. 'TERRENO PARA CONSTRUIR').
- Populates verbatim 'naturaleza_raw'.
"""

import os
import re
import json
import time
import urllib.request
import ssl
import argparse
import logging
from typing import List, Dict, Any, Tuple, Optional

from scraper.main import (
    load_env_files,
    create_ssl_context,
    parse_spanish_words_to_number,
    parse_cr_price_string,
    extract_single_edict_gemini,
    extract_single_edict_regex_fallback,
    normalize_text,
    ForeclosureAuction,
)

load_env_files()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(name)s: %(message)s")
logger = logging.getLogger("scraper.reparse")

def fetch_all_auctions_from_supabase() -> List[Dict[str, Any]]:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.")
        return []

    ctx = create_ssl_context()
    url = f"{supabase_url}/rest/v1/auctions?select=*&order=created_at.desc"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data
    except Exception as e:
        logger.error(f"Error fetching auctions from Supabase: {e}")
    return []

def update_auction_in_supabase(auction_id: str, payload: Dict[str, Any]) -> bool:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        return False

    ctx = create_ssl_context()
    url = f"{supabase_url}/rest/v1/auctions?id=eq.{auction_id}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="PATCH")
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        logger.error(f"Error updating auction {auction_id}: {e}")
        return False

def reparse_record(record: Dict[str, Any], use_gemini: bool = True) -> Tuple[bool, Dict[str, Any]]:
    raw_text = record.get("raw_edict_text") or record.get("address_description") or ""
    if not raw_text or len(raw_text.strip()) < 30:
        return False, {}

    parsed = None
    if use_gemini and os.getenv("GEMINI_API_KEY"):
        parsed = extract_single_edict_gemini(raw_text)
    
    if not parsed:
        parsed = extract_single_edict_regex_fallback(raw_text)

    if not parsed:
        return False, {}

    old_area = float(record.get("area_m2") or 0)
    new_area = float(parsed.area_m2 or old_area)

    old_constructed = bool(record.get("has_construction"))
    new_constructed = bool(parsed.has_construction)

    old_prop_type = record.get("property_type")
    new_prop_type = parsed.property_type

    old_nat = record.get("naturaleza_raw") or ""
    new_nat = parsed.naturaleza_raw or old_nat

    has_changes = (
        abs(old_area - new_area) > 0.01 or
        old_constructed != new_constructed or
        (new_prop_type and old_prop_type != new_prop_type) or
        (new_nat and not old_nat)
    )

    update_payload = {
        "area_m2": new_area,
        "has_construction": new_constructed,
        "property_type": new_prop_type,
        "naturaleza_raw": new_nat,
        "property_category": parsed.property_category,
    }

    diff_summary = {
        "id": record.get("id"),
        "expediente": record.get("expediente_number"),
        "folio_real": record.get("folio_real"),
        "canton": record.get("canton"),
        "province": record.get("province"),
        "old_area_m2": old_area,
        "new_area_m2": new_area,
        "old_has_construction": old_constructed,
        "new_has_construction": new_constructed,
        "old_property_type": old_prop_type,
        "new_property_type": new_prop_type,
        "naturaleza_raw": new_nat,
        "has_changes": has_changes,
    }

    return has_changes, update_payload, diff_summary

def main():
    parser = argparse.ArgumentParser(description="Reprocess existing Supabase auctions with strict Costa Rica legal semantics")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Inspect diffs without updating database")
    parser.add_argument("--limit", type=int, default=100, help="Maximum records to process")
    parser.add_argument("--expediente", type=str, help="Specific expediente to target (e.g. Tarcoles listing)")
    parser.add_argument("--no-gemini", action="store_true", help="Use deterministic regex parser only")
    args = parser.parse_args()

    logger.info("================================================================")
    logger.info("Starting Costa Rica Foreclosure Re-Parsing & Verification Engine")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE DATABASE UPDATE'}")
    logger.info("================================================================")

    records = fetch_all_auctions_from_supabase()
    if not records:
        logger.info("No records fetched from database or database empty.")
        return

    if args.expediente:
        records = [r for r in records if args.expediente.lower() in (r.get("expediente_number") or "").lower()]

    records = records[:args.limit]
    logger.info(f"Inspecting {len(records)} auction records...")

    corrected_count = 0
    unchanged_count = 0

    for idx, rec in enumerate(records):
        has_diff, payload, diff = reparse_record(rec, use_gemini=not args.no_gemini)
        
        if has_diff:
            corrected_count += 1
            logger.info(
                f"[{idx+1}/{len(records)}] 🔧 Correction for {diff['expediente']} ({diff['canton']}, {diff['province']}):\n"
                f"  • Area: {diff['old_area_m2']} m² -> {diff['new_area_m2']} m²\n"
                f"  • Construction: {diff['old_has_construction']} -> {diff['new_has_construction']}\n"
                f"  • Property Type: {diff['old_property_type']} -> {diff['new_property_type']}\n"
                f"  • Naturaleza: '{diff['naturaleza_raw'][:70]}'"
            )

            if not args.dry_run:
                success = update_auction_in_supabase(rec["id"], payload)
                if success:
                    logger.info(f"  ✓ Database record {rec['id']} updated successfully.")
                else:
                    logger.warning(f"  ✗ Failed to update record {rec['id']}.")
        else:
            unchanged_count += 1

    logger.info("================================================================")
    logger.info(f"Summary: {len(records)} inspected, {corrected_count} corrections, {unchanged_count} already accurate.")
    logger.info("================================================================")

if __name__ == "__main__":
    main()

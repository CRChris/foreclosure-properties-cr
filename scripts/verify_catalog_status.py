#!/usr/bin/env python3
"""
Catalog Active Call Audit & Verification Engine
Audits every single property in the Supabase database.
Evaluates:
- Target Dates: auction_date_call_1, auction_date_call_2, auction_date_call_3
- Current America/Costa_Rica timestamp
- Dynamic active call rules:
  * Rule 1: now <= call_1 -> Active Call 1
  * Rule 2: now > call_1 and now <= call_2 -> Active Call 2
  * Rule 3: now > call_2 and now <= call_3 -> Active Call 3
  * Rule 4: now > call_3 -> Concluded (None / Expired)
"""

import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Dict, Any

from scraper.main import load_env_files

load_env_files()

COSTA_RICA_TZ = ZoneInfo("America/Costa_Rica")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")


def parse_date_cr(date_str: str) -> datetime | None:
    if not date_str:
        return None
    cleaned = date_str.strip()
    try:
        # Handle ISO strings with Z or offset
        if cleaned.endswith("Z"):
            dt = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
            return dt.astimezone(COSTA_RICA_TZ)
        if "+" in cleaned[10:] or "-" in cleaned[10:]:
            dt = datetime.fromisoformat(cleaned)
            return dt.astimezone(COSTA_RICA_TZ)
        
        # Handle format without timezone offset (e.g. YYYY-MM-DD HH:MM:SS)
        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"]:
            try:
                naive = datetime.strptime(cleaned, fmt)
                return naive.replace(tzinfo=COSTA_RICA_TZ)
            except ValueError:
                continue
        return None
    except Exception:
        return None


def fetch_all_auctions() -> List[Dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not set in environment.", file=sys.stderr)
        return []

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/auctions?select=*&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except Exception as e:
        print(f"❌ Error fetching auctions from Supabase: {e}", file=sys.stderr)
        return []


def audit_catalog():
    now_cr = datetime.now(COSTA_RICA_TZ)
    print("================================================================================")
    print(f"📊 COSTA RICA FORECLOSURE CATALOG - ACTIVE CALL AUDIT")
    print(f"🕒 Current Timestamp: {now_cr.strftime('%Y-%m-%d %H:%M:%S %Z (UTC%z)')}")
    print("================================================================================")

    auctions = fetch_all_auctions()
    if not auctions:
        print("ℹ️ No auction records found in database.")
        return

    print(f"Found {len(auctions)} properties in database. Evaluating call progression rules...\n")

    summary_counts = {
        "call_1_active": 0,
        "call_2_active": 0,
        "call_3_active": 0,
        "concluded_deserted": 0,
        "terminal_locked": 0,
    }

    rows = []

    for a in auctions:
        expediente = a.get("expediente_number", "N/A")
        folio = a.get("folio_real", "N/A")
        canton = a.get("canton", "N/A")
        currency = a.get("currency", "USD")
        sale_status = a.get("sale_status", "upcoming")

        d1 = parse_date_cr(a.get("auction_date_call_1"))
        d2 = parse_date_cr(a.get("auction_date_call_2"))
        d3 = parse_date_cr(a.get("auction_date_call_3"))

        # Fallbacks for call intervals (14 days) if not explicitly set in court notice
        if d1 and not d2:
            d2 = d1 + timedelta(days=14)
        if d2 and not d3:
            d3 = d2 + timedelta(days=14)

        expected_call = None
        expected_stage = "passed_call_3"
        expected_status = "deserted"

        if sale_status in ["suspended", "adjudicated_to_creditor", "adjudicated_to_bidder", "awarded", "annulled"]:
            expected_call = a.get("current_call_number")
            expected_stage = a.get("call_stage", "suspended")
            expected_status = sale_status
            summary_counts["terminal_locked"] += 1
        elif d1 and now_cr <= d1:
            expected_call = 1
            expected_stage = "call_1"
            expected_status = "upcoming"
            summary_counts["call_1_active"] += 1
        elif d1 and d2 and now_cr > d1 and now_cr <= d2:
            expected_call = 2
            expected_stage = "call_2"
            expected_status = "upcoming"
            summary_counts["call_2_active"] += 1
        elif d2 and d3 and now_cr > d2 and now_cr <= d3:
            expected_call = 3
            expected_stage = "call_3"
            expected_status = "upcoming"
            summary_counts["call_3_active"] += 1
        else:
            expected_call = None
            expected_stage = "passed_call_3"
            expected_status = "deserted"
            summary_counts["concluded_deserted"] += 1

        d1_str = d1.strftime("%Y-%m-%d %H:%M") if d1 else "N/A"
        d2_str = d2.strftime("%Y-%m-%d %H:%M") if d2 else "N/A"
        d3_str = d3.strftime("%Y-%m-%d %H:%M") if d3 else "N/A"

        status_tag = f"Call #{expected_call}" if expected_call else "Concluded"

        rows.append({
            "expediente": expediente,
            "folio": folio,
            "canton": canton,
            "active_call": expected_call,
            "stage": expected_stage,
            "d1": d1_str,
            "d2": d2_str,
            "d3": d3_str,
            "tag": status_tag
        })

    # Print table
    print(f"{'Expediente':<20} | {'Folio Real':<14} | {'Cantón':<14} | {'1st Call Date':<17} | {'2nd Call Date':<17} | {'3rd Call Date':<17} | {'Active Call Status'}")
    print("-" * 125)
    for r in rows:
        active_str = f"✅ Call #{r['active_call']} ACTIVE" if r['active_call'] else "🏁 CONCLUDED (Desierto)"
        print(f"{r['expediente']:<20} | {r['folio']:<14} | {r['canton']:<14} | {r['d1']:<17} | {r['d2']:<17} | {r['d3']:<17} | {active_str}")

    print("\n" + "=" * 80)
    print("📈 AUDIT SUMMARY BREAKDOWN:")
    print(f"   • Active in 1st Call (100% Base):       {summary_counts['call_1_active']} properties")
    print(f"   • Active in 2nd Call (-25% Rebaja):     {summary_counts['call_2_active']} properties")
    print(f"   • Active in 3rd Call (-75% Liquidación):{summary_counts['call_3_active']} properties")
    print(f"   • Concluded / Deserted (All Calls Past):{summary_counts['concluded_deserted']} properties")
    if summary_counts['terminal_locked'] > 0:
        print(f"   • Terminal Judicial State Locked:       {summary_counts['terminal_locked']} properties")
    print(f"   • Total Catalog Assets Evaluated:       {len(auctions)} properties")
    print("================================================================================")


if __name__ == "__main__":
    audit_catalog()

#!/usr/bin/env python3
"""
Automated Auction Call Progression & Status Tracker Engine
Remates Judiciales Costa Rica

Single Source of Truth: Executes PostgreSQL RPC 'sync_auction_lifecycle_statuses'
Timezone Pinned: America/Costa_Rica (UTC-6)
Terminal State Lock: Enforced directly inside PostgreSQL Engine
"""

import os
import sys
import time
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from zoneinfo import ZoneInfo

from scraper.main import load_env_files

load_env_files()

COSTA_RICA_TZ = ZoneInfo("America/Costa_Rica")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")



def sync_auction_progression_via_rpc():
    """
    Calls the master PostgreSQL RPC function public.sync_auction_lifecycle_statuses()
    Returns parsed JSON dictionary with execution stats and transitions.
    """
    if not SUPABASE_URL or not SUPABASE_KEY or "placeholder" in SUPABASE_URL:
        print("⚠️ Supabase credentials not configured in environment (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).", file=sys.stderr)
        return {
            "success": False,
            "error": "Supabase credentials missing",
            "timestamp_cr": datetime.now(COSTA_RICA_TZ).isoformat()
        }

    rpc_endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/sync_auction_lifecycle_statuses"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    req = urllib.request.Request(
        rpc_endpoint,
        data=b"{}",
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body) if res_body else {}
            return data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        print(f"❌ HTTP Error {e.code} executing sync_auction_lifecycle_statuses RPC: {err_msg}", file=sys.stderr)
        return {
            "success": False,
            "error": f"HTTP {e.code}: {err_msg}",
            "timestamp_cr": datetime.now(COSTA_RICA_TZ).isoformat()
        }
    except Exception as e:
        print(f"❌ Exception executing sync_auction_lifecycle_statuses RPC: {e}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "timestamp_cr": datetime.now(COSTA_RICA_TZ).isoformat()
        }


def run_tracker(interval_seconds: int = 300, daemon_mode: bool = False):
    """
    Executes the sync runner once or as a continuous background daemon.
    """
    now_cr = datetime.now(COSTA_RICA_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")
    print(f"🚀 [Costa Rica Auction Tracker Engine] Starting at {now_cr} (Timezone: America/Costa_Rica)")
    print(f"📡 Target Endpoint: {SUPABASE_URL}/rest/v1/rpc/sync_auction_lifecycle_statuses")

    while True:
        cycle_time = datetime.now(COSTA_RICA_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")
        print(f"\n🔄 [{cycle_time}] Evaluating auction call stages & sale statuses...")

        result = sync_auction_progression_via_rpc()

        if result.get("success"):
            total_processed = result.get("total_processed", 0)
            total_updated = result.get("total_updated", 0)
            transitions = result.get("transitions", [])

            print(f"✅ Sync complete: {total_processed} auctions evaluated, {total_updated} state transitions recorded.")

            if transitions:
                print("\n📋 State Transitions Log:")
                for t in transitions:
                    exp = t.get("expediente", "N/A")
                    from_st = t.get("from_stage", "N/A")
                    to_st = t.get("to_stage", "N/A")
                    from_stat = t.get("from_status", "N/A")
                    to_stat = t.get("to_status", "N/A")
                    call_num = t.get("call_number", "N/A")
                    price = t.get("current_base_price", "N/A")
                    print(f"   • [{exp}] Stage: {from_st} ➜ {to_st} | Status: {from_stat} ➜ {to_stat} | Call #{call_num} | Base: {price}")
        else:
            print(f"⚠️ Sync failed: {result.get('error')}")

        if not daemon_mode:
            break

        print(f"⏳ Sleeping {interval_seconds}s until next sync cycle...")
        time.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description="Automated Auction Call Progression & Status Tracker Engine")
    parser.add_argument("--sync-once", action="store_true", help="Run a single sync cycle and exit")
    parser.add_argument("--daemon", action="store_true", help="Run continuously as a background daemon")
    parser.add_argument("--interval", type=int, default=300, help="Interval in seconds between sync cycles in daemon mode (default: 300)")

    args = parser.parse_args()

    if args.daemon:
        run_tracker(interval_seconds=args.interval, daemon_mode=True)
    else:
        run_tracker(interval_seconds=args.interval, daemon_mode=False)


if __name__ == "__main__":
    main()

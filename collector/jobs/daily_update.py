"""Fetch SHPGX prices and update the static data used by GitHub Pages."""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "collector"))

from shpgx import fuel, lng  # noqa: E402
from shpgx.parser import Observation  # noqa: E402

UPDATES_PATH = ROOT / "public" / "data" / "updates.json"
SOURCE_NAME = "上海石油天然气交易中心"
FUEL_SERIES = {"GASOLINE_WHOLESALE_NATIONAL", "DIESEL_WHOLESALE_NATIONAL"}


def now_cst() -> str:
    return datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M")


def to_public_row(row: Observation, fetched_at: str) -> dict[str, object]:
    return {
        "seriesCode": row.series_code,
        "dataDate": row.data_date,
        "priceDate": row.price_date or row.data_date,
        "value": row.value,
        "unit": "元/吨",
        "sourceName": SOURCE_NAME,
        "sourceUrl": f"https://www.shpgx.com{row.source_url}",
        "fetchedAt": fetched_at,
    }


def validate_fuel_release(rows: list[Observation]) -> None:
    """Reject a combined fuel release unless petrol and diesel are both present."""
    fuel_rows = [row for row in rows if row.series_code in FUEL_SERIES]
    if not fuel_rows:
        raise ValueError("SHPGX fuel release is missing both petrol and diesel")
    dates = {row.data_date for row in fuel_rows}
    if len(dates) != 1:
        raise ValueError(f"SHPGX fuel release was split across dates: {sorted(dates)}")
    present = {row.series_code for row in fuel_rows}
    if present != FUEL_SERIES:
        missing = sorted(FUEL_SERIES - present)
        raise ValueError(f"SHPGX fuel release is incomplete; missing: {', '.join(missing)}")


def update_static_data(rows: list[Observation]) -> None:
    """Merge observations by series/release date while preserving history."""
    existing: list[dict[str, object]] = []
    if UPDATES_PATH.exists():
        existing = json.loads(UPDATES_PATH.read_text(encoding="utf-8")).get("observations", [])
    fetched_at = now_cst()
    merged = {(str(row["seriesCode"]), str(row["dataDate"])): row for row in existing}
    for row in rows:
        public_row = to_public_row(row, fetched_at)
        stale_keys = [
            key for key, old in merged.items()
            if key[0] == row.series_code
            and key[1] != row.data_date
            and old.get("value") == row.value
            and old.get("sourceUrl") == public_row["sourceUrl"]
        ]
        for key in stale_keys:
            del merged[key]
        merged[(str(public_row["seriesCode"]), str(public_row["dataDate"]))] = public_row
    observations = sorted(merged.values(), key=lambda row: (str(row["dataDate"]), str(row["seriesCode"])), reverse=True)
    UPDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    UPDATES_PATH.write_text(json.dumps({"checkedAt": fetched_at, "observations": observations}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def upsert_supabase(rows: list[Observation]) -> None:
    """Optional compatibility mirror for a separately configured Supabase database."""
    base_url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not key:
        return
    fetched_at = datetime.now(timezone.utc).isoformat()
    payload = [{
        "series_code": row.series_code,
        "data_date": row.data_date,
        "value": row.value,
        "unit": "元/吨",
        "source_name": SOURCE_NAME,
        "source_url": f"https://www.shpgx.com{row.source_url}",
        "fetched_at": fetched_at,
        "raw_hash": hashlib.sha256(row.raw_response.encode()).hexdigest(),
    } for row in rows]
    request = Request(
        f"{base_url.rstrip('/')}/rest/v1/price_observations?on_conflict=series_code,data_date",
        data=json.dumps(payload).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:  # nosec B310
        if response.status not in (200, 201):
            raise RuntimeError(f"Supabase upsert failed: {response.status}")


if __name__ == "__main__":
    latest_rows = [lng.latest(), *fuel.latest()]
    validate_fuel_release(latest_rows)
    update_static_data(latest_rows)
    upsert_supabase(latest_rows)
    print("static price data updated")

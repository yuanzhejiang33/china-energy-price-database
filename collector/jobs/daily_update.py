"""Fetch SHPGX prices and update the static data used by GitHub Pages."""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "collector"))

from shpgx import fuel, lng  # noqa: E402
from shpgx.parser import Observation  # noqa: E402

UPDATES_PATH = ROOT / "public" / "data" / "updates.json"
SOURCE_NAME = "上海石油天然气交易中心"


def now_cst() -> str:
    return datetime.now(ZoneInfo("Asia/Shanghai")).strftime("%Y-%m-%d %H:%M")


def to_public_row(row: Observation, fetched_at: str) -> dict[str, object]:
    return {
        "seriesCode": row.series_code,
        "dataDate": row.data_date,
        "value": row.value,
        "unit": "元/吨",
        "sourceName": SOURCE_NAME,
        "sourceUrl": f"https://www.shpgx.com{row.source_url}",
        "fetchedAt": fetched_at,
    }


def update_static_data(rows: list[Observation]) -> None:
    """Merge observations by series/date, preserving the initial historical set."""
    existing: list[dict[str, object]] = []
    if UPDATES_PATH.exists():
        existing = json.loads(UPDATES_PATH.read_text(encoding="utf-8")).get("observations", [])
    fetched_at = now_cst()
    merged = {
        (str(row["seriesCode"]), str(row["dataDate"])): row
        for row in existing
    }
    for row in rows:
        public_row = to_public_row(row, fetched_at)
        merged[(str(public_row["seriesCode"]), str(public_row["dataDate"]))] = public_row
    observations = sorted(merged.values(), key=lambda row: (str(row["dataDate"]), str(row["seriesCode"])), reverse=True)
    UPDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    UPDATES_PATH.write_text(json.dumps({"observations": observations}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
    with urlopen(request, timeout=30) as response:  # nosec B310 - controlled environment URL
        if response.status not in (200, 201):
            raise RuntimeError(f"Supabase upsert failed: {response.status}")


if __name__ == "__main__":
    latest_r…4331 tokens truncated…

  if (combined.includes("no such table") || combined.includes('from "notes"')) {
    return "The notes table is unavailable. Generate the migration locally with `npm run db:generate`, then deploy so the platform can apply the generated SQL to the real D1 database.";
  }

  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(notes)
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(20);

    return Response.json({ notes: rows });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      title?: string;
      content?: string;
    };
    const title = payload.title?.trim() ?? "";
    const content = payload.content?.trim() ?? "";

    if (!title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const db = getDb();
    const [note] = await db.insert(notes).values({ title, content }).returning();
    return Response.json({ note }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 }
    );
  }
}

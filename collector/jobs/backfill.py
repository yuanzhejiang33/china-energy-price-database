"""One-time import of every release currently exposed by SHPGX's public history endpoint."""
from daily_update import upsert
from shpgx import fuel, lng

if __name__ == "__main__":
    rows = [*lng.history(), *fuel.history("petrol"), *fuel.history("diesel")]
    upsert(rows)
    print(f"backfill completed: {len(rows)} observations")

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from collector.jobs import daily_update
from collector.jobs.daily_update import validate_fuel_release
from collector.shpgx import fuel
from collector.shpgx.parser import Observation


class FuelReleaseTests(unittest.TestCase):
    @patch("collector.shpgx.fuel.post_json")
    def test_combined_release_uses_one_official_date(self, post_json):
        payload = {"BASEPRICE_petrol": "8803", "BASEPRICE_diesel": "7702", "DATA_petrol": "2026-08-11", "DATA_diesel": "2026-08-12"}
        post_json.return_value = (payload, json.dumps(payload))
        rows = fuel.latest()
        self.assertEqual({row.data_date for row in rows}, {"2026-08-12"})
        self.assertEqual({row.price_date for row in rows}, {"2026-08-11", "2026-08-12"})
        validate_fuel_release(rows)

    def test_incomplete_release_is_rejected(self):
        rows = [Observation("GASOLINE_WHOLESALE_NATIONAL", "2026-08-12", 8803, "/marketzhishu/list2", "{}", "2026-08-11")]
        with self.assertRaisesRegex(ValueError, "incomplete"):
            validate_fuel_release(rows)

    def test_split_release_is_rejected(self):
        rows = [
            Observation("GASOLINE_WHOLESALE_NATIONAL", "2026-08-11", 8803, "/marketzhishu/list2", "{}"),
            Observation("DIESEL_WHOLESALE_NATIONAL", "2026-08-12", 7702, "/marketzhishu/list2", "{}"),
        ]
        with self.assertRaisesRegex(ValueError, "split across dates"):
            validate_fuel_release(rows)

    def test_backfill_moves_stale_petrol_record_to_release_date(self):
        existing = {"checkedAt": "2026-08-13 12:46", "observations": [{
            "seriesCode": "GASOLINE_WHOLESALE_NATIONAL", "dataDate": "2026-08-11", "value": 8803,
            "sourceUrl": "https://www.shpgx.com/marketzhishu/list2",
        }]}
        rows = [
            Observation("GASOLINE_WHOLESALE_NATIONAL", "2026-08-12", 8803, "/marketzhishu/list2", "{}", "2026-08-11"),
            Observation("DIESEL_WHOLESALE_NATIONAL", "2026-08-12", 7702, "/marketzhishu/list2", "{}", "2026-08-12"),
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "updates.json"
            path.write_text(json.dumps(existing), encoding="utf-8")
            with patch.object(daily_update, "UPDATES_PATH", path):
                daily_update.update_static_data(rows)
            observations = json.loads(path.read_text(encoding="utf-8"))["observations"]
        petrol = [row for row in observations if row["seriesCode"] == "GASOLINE_WHOLESALE_NATIONAL"]
        self.assertEqual([(row["dataDate"], row["value"]) for row in petrol], [("2026-08-12", 8803)])
        self.assertEqual(petrol[0]["priceDate"], "2026-08-11")


if __name__ == "__main__":
    unittest.main()

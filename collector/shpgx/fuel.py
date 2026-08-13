from __future__ import annotations

from .client import post_json
from .parser import Observation, observation

LATEST_PATH = "/marketzhishu/list2"
HISTORY_PATH = "/marketzhishu/dataList"
SERIES = {"petrol": "GASOLINE_WHOLESALE_NATIONAL", "diesel": "DIESEL_WHOLESALE_NATIONAL"}


def latest() -> list[Observation]:
    data, raw = post_json(LATEST_PATH)
    # This endpoint is one combined petrol/diesel announcement. DATA_* can
    # describe different price attribution dates, not separate release dates.
    release_date = max(data["DATA_petrol"], data["DATA_diesel"])
    return [
        observation(SERIES["petrol"], release_date, data["BASEPRICE_petrol"], LATEST_PATH, raw, price_date=data["DATA_petrol"]),
        observation(SERIES["diesel"], release_date, data["BASEPRICE_diesel"], LATEST_PATH, raw, price_date=data["DATA_diesel"]),
    ]


def history(kind: str) -> list[Observation]:
    code = "4" if kind == "petrol" else "5"
    data, raw = post_json(HISTORY_PATH, {"zhishukind": code, "area": "22", "start": "0", "length": "1000"})
    return [observation(SERIES[kind], row["strdate"], row["tradeprice"], HISTORY_PATH, raw) for row in data["root"]]

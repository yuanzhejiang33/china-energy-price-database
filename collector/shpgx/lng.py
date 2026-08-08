from __future__ import annotations

from .client import post_json
from .parser import Observation, observation

SERIES = "LNG_FACTORY_NATIONAL"
LATEST_PATH = "/marketzhishu/list/3/22"
HISTORY_PATH = "/marketzhishu/dataList"


def latest() -> Observation:
    data, raw = post_json(LATEST_PATH)
    return observation(SERIES, data["DATA"], data["BASEPRICE"], LATEST_PATH, raw)


def history() -> list[Observation]:
    data, raw = post_json(HISTORY_PATH, {"zhishukind": "3", "area": "22", "start": "0", "length": "1000"})
    return [observation(SERIES, row["strdate"], row["tradeprice"], HISTORY_PATH, raw) for row in data["root"]]

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Observation:
    series_code: str
    data_date: str
    value: int
    source_url: str
    raw_response: str
    price_date: str | None = None


def observation(series_code: str, data_date: str, value: object, source_url: str, raw_response: str, *, price_date: str | None = None) -> Observation:
    date.fromisoformat(data_date)
    if price_date is not None:
        date.fromisoformat(price_date)
    number = int(str(value))
    if not 500 <= number <= 20_000:
        raise ValueError(f"{series_code} value outside broad validation range: {number}")
    return Observation(series_code, data_date, number, source_url, raw_response, price_date)

"""Small, dependency-free client for SHPGX's public web endpoints."""
from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://www.shpgx.com"


def post_json(path: str, data: dict[str, str] | None = None) -> tuple[dict, str]:
    payload = urlencode(data or {}).encode()
    request = Request(
        f"{BASE_URL}{path}",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "energy-price-mvp/1.0"},
        method="POST",
    )
    with urlopen(request, timeout=20) as response:  # nosec B310 - fixed official HTTPS origin
        raw = response.read().decode("utf-8")
    return json.loads(raw), raw

"""GNews adapter — pulls 3 queries, maps to WorldSignal, bumps pressure.

GNews free tier: 100 req/day. We run 3 queries hourly = 72/day.

Queries (per the live-motion design doc §6):
- Macro: tariffs / inflation / groceries / fuel
- CA business: top headlines, business category, country=ca
- Local Ontario/Toronto household-impact news
"""
from __future__ import annotations

import asyncio
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from models import WorldSignal
from news_pressure import pressure
from news_rules import categorize, tickers_for

from ._cache import read_cache, write_cache

GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY", "").strip()
GNEWS_BASE = "https://gnews.io/api/v4"
GNEWS_TIMEOUT_S = 10
GNEWS_MAX_PER_QUERY = 10

GNEWS_QUERIES: list[tuple[str, str, dict[str, str]]] = [
    (
        "macro",
        "search",
        {
            "q": "tariff OR inflation OR groceries OR fuel",
            "lang": "en", "country": "ca", "max": str(GNEWS_MAX_PER_QUERY),
        },
    ),
    (
        "ca-business",
        "top-headlines",
        {
            "category": "business", "lang": "en", "country": "ca",
            "max": str(GNEWS_MAX_PER_QUERY),
        },
    ),
    (
        "ontario-household",
        "search",
        {
            "q": "(Ontario OR Toronto) AND (rent OR groceries OR fuel OR utilities)",
            "lang": "en", "country": "ca", "max": str(GNEWS_MAX_PER_QUERY),
        },
    ),
]


def _stable_id(url: str) -> str:
    # GNews articles don't carry IDs; we hash the URL for a stable signal id.
    import hashlib
    return "gn_" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def _to_signal(article: dict[str, Any], origin: str = "GLOBAL") -> WorldSignal | None:
    title = (article.get("title") or "").strip()
    url = (article.get("url") or "").strip()
    if not title or not url:
        return None
    snippet = (article.get("description") or "").strip() or None
    source = (article.get("source") or {}).get("name") or "GNews"
    published = article.get("publishedAt") or ""
    # Normalise to ISO 8601 with Z suffix
    try:
        ts = datetime.fromisoformat(published.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        ts = datetime.now(timezone.utc)
    text = f"{title}. {snippet or ''}"
    category, confidence, rationale = categorize(text)

    return WorldSignal(
        id=_stable_id(url),
        ts=ts.isoformat().replace("+00:00", "Z"),
        source=source,
        title=title,
        link=url,
        snippet=snippet,
        origin=origin,
        category=category,
        confidence=confidence,
        rationale=rationale,
    )


class GNewsAdapter:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or GNEWS_API_KEY).strip()
        self._inflight = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def fetch(self) -> list[WorldSignal]:
        # Serialize fetches so a manual /admin/refresh doesn't race the cron.
        async with self._inflight:
            return await self._fetch_locked()

    async def _fetch_locked(self) -> list[WorldSignal]:
        if not self.configured:
            return self._fallback_from_cache()

        signals: list[WorldSignal] = []
        seen_ids: set[str] = set()
        all_raw: dict[str, list[dict]] = {}

        async with httpx.AsyncClient(timeout=GNEWS_TIMEOUT_S) as client:
            for label, endpoint, params in GNEWS_QUERIES:
                params_with_key = {**params, "apikey": self.api_key}
                try:
                    r = await client.get(f"{GNEWS_BASE}/{endpoint}", params=params_with_key)
                    r.raise_for_status()
                    payload = r.json()
                    articles = payload.get("articles", []) or []
                    all_raw[label] = articles
                    for art in articles:
                        sig = _to_signal(art, origin="GLOBAL")
                        if sig is None or sig.id in seen_ids:
                            continue
                        seen_ids.add(sig.id)
                        signals.append(sig)
                        # Bump pressure for matched category + tickers (any matched)
                        await pressure.bump(sig.category)
                        for sym in tickers_for(f"{sig.title} {sig.snippet or ''}"):
                            await pressure.bump(f"TICKER:{sym}")
                except (httpx.HTTPError, ValueError) as e:
                    print(f"[gnews:{label}] error: {e}", flush=True)

        if signals:
            write_cache("gnews", {
                "fetched_at": time.time(),
                "raw_by_query": all_raw,
                "signals": [s.model_dump() for s in signals],
            })
            return signals

        return self._fallback_from_cache()

    def _fallback_from_cache(self) -> list[WorldSignal]:
        cached = read_cache("gnews")
        if not cached:
            return []
        return [WorldSignal.model_validate(s) for s in cached.get("signals", [])]


# Module-level singleton + functional shortcut
_singleton = GNewsAdapter()


async def fetch_gnews() -> list[WorldSignal]:
    return await _singleton.fetch()

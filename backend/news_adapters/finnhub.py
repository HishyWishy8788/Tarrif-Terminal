"""Finnhub adapter — pulls market news every 5 min.

Finnhub free tier: 60 req/min. Generous; we use the general news endpoint
plus a few company-news endpoints to enrich the Market screen.
"""
from __future__ import annotations

import asyncio
import os
import time
from datetime import datetime, timezone

import httpx

from models import WorldSignal
from news_pressure import pressure
from news_rules import categorize, tickers_for

from ._cache import read_cache, write_cache

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "").strip()
FINNHUB_BASE = "https://finnhub.io/api/v1"
FINNHUB_TIMEOUT_S = 10
FINNHUB_GENERAL_LIMIT = 25  # take top N from /news?category=general

# Companies whose moves narratively connect to household-cost stories.
# (Finnhub free tier serves company-news for any US ticker.)
FINNHUB_COMPANIES = ["XOM", "CVX", "WMT", "COST", "TGT"]


def _to_signal(item: dict, origin: str = "MARKET") -> WorldSignal | None:
    headline = (item.get("headline") or "").strip()
    url = (item.get("url") or "").strip()
    if not headline or not url:
        return None
    snippet = (item.get("summary") or "").strip() or None
    source = item.get("source") or "Finnhub"
    epoch = item.get("datetime") or 0
    try:
        ts = datetime.fromtimestamp(int(epoch), tz=timezone.utc)
    except (ValueError, TypeError, OSError):
        ts = datetime.now(timezone.utc)

    text = f"{headline}. {snippet or ''}"
    category, confidence, rationale = categorize(text)

    import hashlib
    sid = "fh_" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]

    return WorldSignal(
        id=sid,
        ts=ts.isoformat().replace("+00:00", "Z"),
        source=source,
        title=headline,
        link=url,
        snippet=snippet,
        origin=origin,
        category=category,
        confidence=confidence,
        rationale=rationale,
    )


class FinnhubAdapter:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or FINNHUB_API_KEY).strip()
        self._inflight = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def fetch(self) -> list[WorldSignal]:
        async with self._inflight:
            return await self._fetch_locked()

    async def _fetch_locked(self) -> list[WorldSignal]:
        if not self.configured:
            return self._fallback_from_cache()

        signals: list[WorldSignal] = []
        seen_ids: set[str] = set()
        all_raw: dict[str, list[dict]] = {}
        today = datetime.now(timezone.utc).date().isoformat()
        # Pull a 7-day window for company news so the demo always has content.
        from datetime import timedelta
        week_ago = (datetime.now(timezone.utc).date() - timedelta(days=7)).isoformat()

        async with httpx.AsyncClient(timeout=FINNHUB_TIMEOUT_S) as client:
            # General market news
            try:
                r = await client.get(
                    f"{FINNHUB_BASE}/news",
                    params={"category": "general", "token": self.api_key},
                )
                r.raise_for_status()
                items = r.json() or []
                items = items[:FINNHUB_GENERAL_LIMIT]
                all_raw["general"] = items
                for it in items:
                    sig = _to_signal(it, origin="MARKET")
                    if sig is None or sig.id in seen_ids:
                        continue
                    seen_ids.add(sig.id)
                    signals.append(sig)
                    await pressure.bump(sig.category)
                    for sym in tickers_for(f"{sig.title} {sig.snippet or ''}"):
                        await pressure.bump(f"TICKER:{sym}")
            except (httpx.HTTPError, ValueError) as e:
                print(f"[finnhub:general] error: {e}", flush=True)

            # Company news — concise, run sequentially to stay friendly to 60/min
            for sym in FINNHUB_COMPANIES:
                try:
                    r = await client.get(
                        f"{FINNHUB_BASE}/company-news",
                        params={"symbol": sym, "from": week_ago, "to": today, "token": self.api_key},
                    )
                    r.raise_for_status()
                    items = (r.json() or [])[:5]
                    all_raw[f"company:{sym}"] = items
                    for it in items:
                        sig = _to_signal(it, origin="MARKET")
                        if sig is None or sig.id in seen_ids:
                            continue
                        seen_ids.add(sig.id)
                        signals.append(sig)
                        await pressure.bump(sig.category)
                        for tsym in tickers_for(f"{sig.title} {sig.snippet or ''}"):
                            await pressure.bump(f"TICKER:{tsym}")
                except (httpx.HTTPError, ValueError) as e:
                    print(f"[finnhub:{sym}] error: {e}", flush=True)

        if signals:
            write_cache("finnhub", {
                "fetched_at": time.time(),
                "raw_by_query": all_raw,
                "signals": [s.model_dump() for s in signals],
            })
            return signals

        return self._fallback_from_cache()

    def _fallback_from_cache(self) -> list[WorldSignal]:
        cached = read_cache("finnhub")
        if not cached:
            return []
        return [WorldSignal.model_validate(s) for s in cached.get("signals", [])]


_singleton = FinnhubAdapter()


async def fetch_finnhub() -> list[WorldSignal]:
    return await _singleton.fetch()

"""Decaying-window news-pressure store.

Each `bump(key)` registers an event timestamp. The current `score(key)` is
the sum of `exp(-elapsed/half_life)` over all events. Older events fade.

`Sampler` snapshots the score every `interval_s` into a fixed-length deque,
giving the wave chart a smooth time series without re-computing on every
request.
"""
from __future__ import annotations

import asyncio
import math
import time
from collections import defaultdict, deque
from typing import Deque

# Half-life ≈ 30 minutes — articles still meaningfully push the score for
# the first hour, then taper off. Demo-paced.
HALF_LIFE_S = 30 * 60
PRUNE_AFTER_S = 4 * HALF_LIFE_S  # 2 hours of history is plenty
SAMPLE_INTERVAL_S = 30
SAMPLE_HISTORY = 60  # 60 samples * 30s = 30 min wave window


class PressureStore:
    def __init__(self, half_life_s: float = HALF_LIFE_S) -> None:
        self.half_life = half_life_s
        self._events: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def bump(self, key: str, ts: float | None = None) -> None:
        ts = ts if ts is not None else time.time()
        async with self._lock:
            bucket = self._events[key]
            bucket.append(ts)
            cutoff = time.time() - PRUNE_AFTER_S
            self._events[key] = [t for t in bucket if t > cutoff]

    def score(self, key: str, now: float | None = None) -> float:
        now = now if now is not None else time.time()
        events = self._events.get(key, ())
        if not events:
            return 0.0
        return sum(math.exp(-(now - t) / self.half_life) for t in events if t <= now)

    def all_scores(self) -> dict[str, float]:
        now = time.time()
        return {k: self.score(k, now) for k in self._events}

    def keys(self) -> list[str]:
        return list(self._events.keys())


class Sampler:
    """Periodically snapshots an aggregate score for the wave chart."""

    def __init__(
        self,
        store: PressureStore,
        keys: list[str],
        interval_s: float = SAMPLE_INTERVAL_S,
        history: int = SAMPLE_HISTORY,
    ) -> None:
        self.store = store
        self.keys = keys
        self.interval_s = interval_s
        self.samples: Deque[tuple[float, float]] = deque(maxlen=history)
        self._task: asyncio.Task | None = None

    def aggregate_score(self) -> float:
        # Sum of all category pressures — the wave shows total system activity.
        return sum(self.store.score(k) for k in self.keys)

    def take_sample(self) -> None:
        self.samples.append((time.time(), self.aggregate_score()))

    async def run(self) -> None:
        while True:
            try:
                self.take_sample()
            except Exception as e:  # pragma: no cover — background task
                print(f"[sampler] error: {e}", flush=True)
            await asyncio.sleep(self.interval_s)

    def start(self, loop: asyncio.AbstractEventLoop | None = None) -> None:
        if self._task is not None and not self._task.done():
            return
        # Seed one sample immediately so the wave isn't empty on first GET.
        self.take_sample()
        self._task = asyncio.create_task(self.run())

    def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None

    def export_samples(self) -> list[dict]:
        return [{"ts": ts, "value": round(v, 3)} for ts, v in self.samples]


# Module-level singletons. Keys list is the canonical category set; the
# adapters bump these by name. Tickers get their own keys (sym -> score).
CATEGORY_KEYS = [
    "FOOD_GROCERIES",
    "FUEL_COMMUTE",
    "TRADE_GOODS_REPAIRS",
    "LABOR_INCOME",
    "RENT_UTILITIES",
]

pressure = PressureStore()
sampler = Sampler(pressure, CATEGORY_KEYS)

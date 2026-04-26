"""Live news adapters — GNews + Finnhub.

Each adapter:
1. Hits its external API.
2. On success, persists a disk cache snapshot.
3. On failure, returns the cached snapshot.
4. If no cache exists, raises so the caller can decide (the Store falls back
   to its boot-time fixtures).

Both adapters return `list[WorldSignal]` ready to be merged into the Store.
"""
from .gnews import GNewsAdapter, fetch_gnews
from .finnhub import FinnhubAdapter, fetch_finnhub

__all__ = ["GNewsAdapter", "FinnhubAdapter", "fetch_gnews", "fetch_finnhub"]

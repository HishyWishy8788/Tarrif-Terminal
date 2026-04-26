"""Disk cache helper used by both adapters."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def write_cache(name: str, data: Any) -> None:
    path = CACHE_DIR / f"{name}.json"
    tmp = path.with_suffix(".tmp")
    with tmp.open("w") as f:
        json.dump(data, f, indent=2, default=str)
    tmp.replace(path)


def read_cache(name: str) -> Any | None:
    path = CACHE_DIR / f"{name}.json"
    if not path.exists():
        return None
    try:
        with path.open() as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def cache_path(name: str) -> Path:
    return CACHE_DIR / f"{name}.json"

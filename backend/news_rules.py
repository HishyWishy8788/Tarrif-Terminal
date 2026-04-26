"""Keyword-based categorization rules for incoming news articles.

Each article runs through CATEGORY_PATTERNS — every regex that matches
contributes one keyword hit. The category with the most hits wins (ties
broken by table order). Confidence is mapped from hit count.

TICKER_PATTERNS map articles to the 5 Market-tape symbols (drives the
news-pressure delta on tape prices). One article can move multiple tickers.
"""
from __future__ import annotations

import re
from typing import Final

from models import EventCategory

# Order matters — first category in the table wins ties.
CATEGORY_PATTERNS: Final[list[tuple[EventCategory, list[str]]]] = [
    (
        "FOOD_GROCERIES",
        [
            r"\btariff\b", r"\bproduce\b", r"\bgrocer", r"\bfood\b",
            r"\bdairy\b", r"\bwheat\b", r"\bbasket\b", r"\bcrop\b",
            r"\bsupermarket\b", r"\bmeat\b", r"\binflation\b", r"\bCPI\b",
            r"\bagricultur",
        ],
    ),
    (
        "FUEL_COMMUTE",
        [
            r"\bcrude\b", r"\boil\b", r"\bWTI\b", r"\bOPEC\b",
            r"\bgasoline\b", r"\bdiesel\b", r"\bpump price\b",
            r"\bfuel\b", r"\benergy price",
        ],
    ),
    (
        "RENT_UTILITIES",
        [
            r"\butility\b", r"\butilities\b", r"\belectricity\b",
            r"\bpower bill\b", r"\bnatural gas\b", r"\bheating\b",
            r"\bhydro\b", r"\brent\b", r"\brent control\b",
            r"\bhousing cost",
        ],
    ),
    (
        "TRADE_GOODS_REPAIRS",
        [
            r"\bappliance\b", r"\brepair\b", r"\bparts\b",
            r"\bauto parts\b", r"\bsupply chain\b", r"\bimport\b",
            r"\bduties\b", r"\btrade war\b",
        ],
    ),
    (
        "LABOR_INCOME",
        [
            r"\blayoff", r"\bunemploy", r"\bjobless\b", r"\bhiring freeze\b",
            r"\bsector\b", r"\bwages?\b", r"\bjob market\b", r"\bemployment\b",
            r"\bstrike\b", r"\bunion\b",
        ],
    ),
]

# Tickers (Market tape) — keyword matches bump that ticker's pressure.
TICKER_PATTERNS: Final[dict[str, list[str]]] = {
    "WTI":    [r"\boil\b", r"\bcrude\b", r"\bWTI\b", r"\bOPEC\b", r"\bbarrel\b"],
    "USDCAD": [r"\bUSD\b", r"\bdollar\b", r"\bforex\b", r"\bFX\b",
               r"\bcurrency\b", r"\bloonie\b", r"\bCAD\b"],
    "TSX":    [r"\bTSX\b", r"\bToronto Stock\b", r"\bCanadian banks\b",
               r"\bRBC\b", r"\bTD Bank\b", r"\bScotia\b", r"\bBMO\b"],
    "Wheat":  [r"\bwheat\b", r"\bgrain\b", r"\bcrop\b", r"\bharvest\b"],
    "Gold":   [r"\bgold\b", r"\bbullion\b", r"\bsafe[- ]haven\b"],
}


# Pre-compile for speed
_COMPILED_CATEGORIES: list[tuple[EventCategory, list[re.Pattern[str]]]] = [
    (cat, [re.compile(p, re.IGNORECASE) for p in patterns])
    for cat, patterns in CATEGORY_PATTERNS
]
_COMPILED_TICKERS: dict[str, list[re.Pattern[str]]] = {
    sym: [re.compile(p, re.IGNORECASE) for p in patterns]
    for sym, patterns in TICKER_PATTERNS.items()
}


def categorize(text: str) -> tuple[EventCategory, float, str]:
    """Return (category, confidence in [0,1], rationale).

    Confidence rises with keyword hit count: 1 hit -> 0.55, 2 -> 0.7, 3+ -> 0.85.
    Articles with no hits get UNCLASSIFIED at 0.30 confidence.
    """
    best_cat: EventCategory = "UNCLASSIFIED"
    best_hits = 0
    best_terms: list[str] = []

    for cat, patterns in _COMPILED_CATEGORIES:
        hits = 0
        terms: list[str] = []
        for p in patterns:
            m = p.search(text)
            if m:
                hits += 1
                terms.append(m.group(0).lower())
        if hits > best_hits:
            best_hits, best_cat, best_terms = hits, cat, terms

    if best_hits == 0:
        return "UNCLASSIFIED", 0.30, "No category keywords matched."

    if best_hits >= 3:
        confidence = 0.85
    elif best_hits == 2:
        confidence = 0.70
    else:
        confidence = 0.55

    rationale = f"Matched {best_hits} keyword(s): {', '.join(best_terms[:5])}"
    return best_cat, confidence, rationale


def tickers_for(text: str) -> list[str]:
    """Return list of ticker symbols whose keywords appear in `text`."""
    out: list[str] = []
    for sym, patterns in _COMPILED_TICKERS.items():
        if any(p.search(text) for p in patterns):
            out.append(sym)
    return out

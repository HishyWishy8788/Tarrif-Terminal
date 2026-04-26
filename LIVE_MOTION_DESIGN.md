# Tariff Live Motion — Design Doc

**Status:** Locked, pre-implementation
**Owner:** HishyWishy8788
**Last reviewed:** 2026-04-26
**Aesthetic direction:** Quiet Trading Floor (DFII 18 / 15)

---

## 1. Problem

The current Tariff dashboard is static. For the hackathon demo, judges should see real GNews + Finnhub data flowing in and visibly moving the existing numbers — without introducing new metrics, new screens, or random math. Dollar values stay deterministic (sourced from `impact_engine.py`).

## 2. Understanding Summary

- **What:** A live-motion layer over the existing dashboard. Three numeric surfaces — *Household Impact dollar*, *wave chart*, *5-cell Market tape* — visibly update on real news arrivals. One-time onboarding modal at demo start.
- **Why:** Static dashboard can't carry a 3-minute demo; judges need to see the data pipeline working without breaking the deterministic-numbers rule.
- **For whom:** Hackathon judges (single demo machine, single user).
- **Core algorithm:** News-pressure model — each new article in a category increments a decaying score (~30 min half-life). Pressure multiplies `impact_engine.compute_impact()` output, capped ±50%. Same pattern drives Market tape per-symbol.
- **APIs:** GNews (3 queries hourly cron + admin refresh) + Finnhub news (every 5 min). No quote endpoints. BoC/StatsCan deferred.
- **Non-goals:** New KPIs, real Bloomberg-grade prices, full income/expense ledger, Plaid, BoC/StatsCan integration this round.

## 3. Decision Log

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Motion = event-driven + calm baseline pulse + smooth value transitions | Pure ambient ticker; pure event-driven only; judge-triggered only | Honest motion (only when real events arrive) + always-visible baseline so demo never looks dead |
| 2 | No new KPIs — animate existing numbers only | Add Savings Runway; full income/expense ledger | YAGNI; user explicit "no new metrics" |
| 3 | Live surfaces = Household Impact $, wave chart, Market tape | Headline only; everything everywhere | Three is enough to read as "alive"; more = noise |
| 4 | Onboarding = 3 chip-pick questions, all skippable | 1-question slider; 5-field intake; replaces UserProfile | "Very vague" + zero typing; localStorage layer over existing Khan profile |
| 5 | News→number = decaying-window pressure × deterministic baseline, ±50% cap | Re-categorize only; per-article delta sum | Continuous visible motion + bounded + real-data-driven; coherent with existing impact engine |
| 6 | Market tape = same pressure-delta pattern (no real quotes) | Finnhub paid tier; yfinance dep; swap to US equities; drop tape | Coherent (one algorithm everywhere); free; no fragile deps |
| 7 | GNews polling = hourly cron + `POST /api/admin/refresh-news` | Pure cron; aggressive 15-min cron; folded single query | Quota-safe (72/day) with manual control for demo |

## 4. Assumptions

| # | Assumption |
|---|---|
| A1 | Categorization = keyword/regex rules in Python (not Ollama). Per-category rules table in `backend/news_rules.py`. |
| A2 | Failure mode = serve last cached articles per query when API fails; fall back to `signals.json` fixtures only if no cache exists. Demo never breaks. |
| A3 | Onboarding answers stored in `localStorage` only. Not persisted to backend. Re-shows on first load per browser; force-show via `?onboarding=1` URL param. |
| A4 | Frontend polls `GET /api/demo/live` every 5s. Returns `{pressureByCategory, tickerPrices, waveSamples[], updatedAt}`. |
| A5 | Wave chart plots active intent's pressure-score history (60 samples × 30s = 30 min window). Calm baseline pulse = client-side 4s sine-breath on the gradient stop opacity. |
| A6 | Per-article pressure increment = +1 unit. Equal weight, normalized. No per-article severity scoring. |
| A7 | Tape direction mapping = keyword rules. `oil/crude/OPEC` → WTI; `USD/dollar/forex` → USDCAD; `wheat/grain` → Wheat; `gold` → Gold; `TSX/Toronto/banks` → TSX. |
| A8 | Confidence-factor bars on AI Guardrail card stay static (out of scope per Decision #3). |

## 5. Aesthetic — Quiet Trading Floor

**Differentiation anchor:** persistent after-glow halo around just-changed numbers (mint for relief, rose for stress) that fades over 800ms. Numbers always lerp into their new value over 280ms — never fade-in/fade-out.

**Design tokens (additions):**
```css
--glow-mint: rgba(75, 224, 160, 0.45);
--glow-rose: rgba(244, 63, 94, 0.45);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--lerp-ms: 280ms;
--halo-ms: 800ms;
--breath-ms: 4000ms;
```

**Type rhythm:** existing Inter, used at extreme weight contrast — 200-weight 56px digits for live values, 700-weight 10px uppercase labels, JetBrains Mono only for delta indicators (`+$3` ticks).

**Motion philosophy:** one easing curve everywhere; no idle motion except the wave's 4s sine-breath; halos never overlap (queue if same element re-changes).

## 6. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Vite + React)                                  │
│  ┌──────────────────────────────────────────────┐       │
│  │  useLiveData() — polls /api/demo/live @ 5s   │       │
│  │  useLerp() — 280ms value transitions          │       │
│  │  useHalo() — 800ms after-glow class manager   │       │
│  └──────────────────────────────────────────────┘       │
│                       │                                   │
│  ┌──────────────────────────────────────────────┐       │
│  │  Onboarding drawer (localStorage)            │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP /api/demo/live
                       ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI backend                                          │
│  ┌────────────────┐  ┌────────────────────────────────┐ │
│  │ pressure_store │◄─│ news_adapters/                 │ │
│  │  - per cat     │  │  - gnews.py (hourly cron)      │ │
│  │  - per ticker  │  │  - finnhub.py (5min cron)      │ │
│  │  - decays 30m  │  │  - _categorize.py (keywords)   │ │
│  └────────────────┘  └────────────────────────────────┘ │
│         │                    ▲                            │
│         ▼                    │                            │
│  /api/demo/live      /api/admin/refresh-news (manual)    │
└──────────────────────────────────────────────────────────┘
```

**Data flow:**
1. Hourly cron task calls GNews adapter (3 queries) → categorize each article → bump pressure by +1 for matched categories.
2. 5-min cron calls Finnhub news adapter → categorize → bump pressure for matched tickers.
3. Pressure decays continuously (`exp(-elapsed/window)`). Sampled every 30s into a rolling 60-sample buffer for the wave.
4. Frontend polls `/api/demo/live` every 5s → reads pressure scores → applies multiplier to deterministic impact → animates numbers.

## 7. Backend

**New files:**
- `backend/news_pressure.py` — pressure store, decay logic, sampling
- `backend/news_rules.py` — category + ticker keyword rules table
- `backend/news_adapters/gnews.py` — fetch + map + categorize
- `backend/news_adapters/finnhub.py` — same
- `backend/news_adapters/_cache.py` — disk cache for fallback

**New routes:**
- `GET /api/demo/live` → `LiveSnapshot` (pressure per category, ticker prices, wave samples, updatedAt)
- `POST /api/admin/refresh-news` → triggers immediate re-fetch (admin-protected)

**Cron mechanism:** background `asyncio.create_task` loop on app startup (no Celery/RQ — keeps the stack at one process).

**Failure mode:** each adapter wraps API call in try/except → on failure reads last cached JSON from `backend/data/cache/{adapter}.json`. If cache empty → falls back to `signals.json` fixtures.

## 8. Frontend

**New files:**
- `frontend/src/hooks/useLiveData.ts` — TanStack Query polling `/api/demo/live` @ 5s
- `frontend/src/hooks/useLerp.ts` — animates a numeric value over 280ms
- `frontend/src/hooks/useHalo.ts` — applies `data-halo="mint"` for 800ms after change
- `frontend/src/hooks/useOnboarding.ts` — localStorage read/write for the 3 chip answers
- `frontend/src/components/OnboardingDrawer.tsx` — slide-in left drawer, 3 chip groups
- `frontend/src/components/LiveDigit.tsx` — wraps a number with lerp + halo

**Modified files:**
- `styles.css` — add motion tokens (§5), `.has-halo[data-halo="mint|rose"]::after` glow ring, `.wave-breath` keyframes
- `screens/DashboardScreen.tsx` — replace static impact value with `<LiveDigit>`, wave SVG fed from `waveSamples`
- `screens/MarketScreen.tsx` — tape cells use `<LiveDigit>` for prices
- `App.tsx` — mount `<OnboardingDrawer>` if not yet completed

**Onboarding answer effect:** answers are sent on each `/api/demo/live` poll as a `?onboarding=...` query string. Backend uses them to scale baseline (e.g. larger spending range → larger absolute impact). Defaults applied if onboarding skipped.

## 9. Implementation Plan (ordered)

| Phase | Task | Verify |
|---|---|---|
| 1 | Backend: `news_rules.py` + `news_pressure.py` + unit-style tests via REPL | Pressure decays correctly, rules categorize sample headlines |
| 2 | Backend: `gnews.py` + `finnhub.py` adapters + `_cache.py` | Hit endpoints with real keys; verify cache file written |
| 3 | Backend: cron loop on startup + `GET /api/demo/live` + `POST /api/admin/refresh-news` | curl `/api/demo/live` returns valid `LiveSnapshot`; admin route 401s without admin claim |
| 4 | Frontend: motion primitives (`useLerp`, `useHalo`, `LiveDigit`) + CSS tokens | Storybook-style isolated test in DashboardScreen; halo fades over 800ms |
| 5 | Frontend: wire Household Impact $ + wave chart to live data | Open dashboard → impact value lerps when admin refresh fires |
| 6 | Frontend: wire Market tape to live ticker prices | Same: tape cells lerp |
| 7 | Frontend: `OnboardingDrawer` + `useOnboarding` + answers piped to `/api/demo/live` query | Re-load with no localStorage → drawer slides in; pick 3 → drawer dismisses; baseline scales |
| 8 | Verify: `tsc -b` clean + manual demo dry-run + admin refresh smoke | All checks green |

**Estimate:** ~3-4 hours of focused work.

---

*End of design doc.*

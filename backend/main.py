import asyncio
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from auth import AUTH_ENABLED, clerk_auth_middleware
from chat import handle_chat
from models import (
    AIIntent,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    LiveImpact,
    LiveSnapshot,
    SeedRequest,
    SeverityResponse,
    SnoozeRequest,
    UserProfile,
    WaveSample,
    WorldSignal,
)
from news_adapters import fetch_finnhub, fetch_gnews
from news_pressure import CATEGORY_KEYS, pressure, sampler
from store import store

SEED_KEY = os.environ.get("TARIFF_SEED_KEY", "demo-seed")

# CORS allowlist — comma-separated origins. Default = local Vite dev only.
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip() and o.strip() != "*"
]

ALLOWED_ORIGINS = {"GLOBAL", "MARKET", "DEMO"}
ALLOWED_STATES = {"PENDING", "APPROVED", "REJECTED", "SNOOZED"}
ALLOWED_SEED_KEYS = {"food", "fuel", "repairs", "labor"}

# Cron cadences (seconds)
GNEWS_INTERVAL_S = 60 * 60   # hourly per design doc §7
FINNHUB_INTERVAL_S = 5 * 60  # every 5 min
INITIAL_FETCH_DELAY_S = 2     # let the server settle before first fetch

# Static baseline ticker prices (the design uses news-pressure deltas, not
# real quotes — see Decision #6 in LIVE_MOTION_DESIGN.md).
TICKER_BASELINES = {
    "WTI": 84.32,
    "USDCAD": 1.41,
    "TSX": 21884.0,
    "Wheat": 6.42,
    "Gold": 2378.0,
}
TICKER_DELTA_CAP_PCT = 0.03  # tape moves at most ±3% of baseline


async def _refresh_all() -> dict:
    """Refresh both adapters; merge results into the live store."""
    fetched: list[WorldSignal] = []
    errors: list[str] = []
    for name, fetcher in (("gnews", fetch_gnews), ("finnhub", fetch_finnhub)):
        try:
            sigs = await fetcher()
            fetched.extend(sigs)
        except Exception as e:  # surface unexpected errors but don't crash
            errors.append(f"{name}: {type(e).__name__}: {e}")
    store.replace_live_signals(fetched)
    return {"count": len(fetched), "errors": errors}


async def _gnews_cron() -> None:
    await asyncio.sleep(INITIAL_FETCH_DELAY_S)
    while True:
        try:
            sigs = await fetch_gnews()
            # merge into live store (keep finnhub side untouched)
            existing_finnhub = [s for s in store.live_signals if s.id.startswith("fh_")]
            store.replace_live_signals(existing_finnhub + sigs)
            print(f"[cron:gnews] +{len(sigs)} signals", flush=True)
        except Exception as e:
            print(f"[cron:gnews] error {e}", flush=True)
        await asyncio.sleep(GNEWS_INTERVAL_S)


async def _finnhub_cron() -> None:
    await asyncio.sleep(INITIAL_FETCH_DELAY_S)
    while True:
        try:
            sigs = await fetch_finnhub()
            existing_gnews = [s for s in store.live_signals if s.id.startswith("gn_")]
            store.replace_live_signals(existing_gnews + sigs)
            print(f"[cron:finnhub] +{len(sigs)} signals", flush=True)
        except Exception as e:
            print(f"[cron:finnhub] error {e}", flush=True)
        await asyncio.sleep(FINNHUB_INTERVAL_S)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Start sampler + cron tasks
    sampler.start()
    tasks = [
        asyncio.create_task(_gnews_cron()),
        asyncio.create_task(_finnhub_cron()),
    ]
    try:
        yield
    finally:
        sampler.stop()
        for t in tasks:
            t.cancel()


app = FastAPI(title="Tariff Backend", version="0.5", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.middleware("http")(clerk_auth_middleware)


# ---------------------------------------------------------------- existing API

@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, version="0.5")


@app.get("/api/auth/status")
def auth_status() -> dict:
    return {"authEnabled": AUTH_ENABLED}


@app.get("/api/profile", response_model=UserProfile)
def get_profile() -> UserProfile:
    return store.profile


@app.put("/api/profile", response_model=UserProfile)
def put_profile(profile: UserProfile) -> UserProfile:
    return store.replace_profile(profile)


@app.get("/api/feed", response_model=list[WorldSignal])
def get_feed(origin: Optional[str] = Query(default=None)) -> list[WorldSignal]:
    if origin is not None and origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=400, detail="invalid origin")
    return store.list_signals(origin)


@app.get("/api/intents/active", response_model=Optional[AIIntent])
def get_active_intent() -> Optional[AIIntent]:
    return store.active_intent()


@app.get("/api/intents", response_model=list[AIIntent])
def get_intents(state: Optional[str] = Query(default=None)) -> list[AIIntent]:
    if state is not None and state not in ALLOWED_STATES:
        raise HTTPException(status_code=400, detail="invalid state")
    return store.list_intents(state)


@app.post("/api/intents/{intent_id}/approve", response_model=AIIntent)
def approve_intent(intent_id: str) -> AIIntent:
    intent = store.transition(intent_id, "APPROVED", note="user approved")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.post("/api/intents/{intent_id}/reject", response_model=AIIntent)
def reject_intent(intent_id: str) -> AIIntent:
    intent = store.transition(intent_id, "REJECTED", note="user rejected")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.post("/api/intents/{intent_id}/snooze", response_model=AIIntent)
def snooze_intent(intent_id: str, body: Optional[SnoozeRequest] = None) -> AIIntent:
    minutes = body.minutes if body else 60
    intent = store.transition(intent_id, "SNOOZED", note=f"snoozed {minutes}m")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.get("/api/severity", response_model=SeverityResponse)
def severity() -> SeverityResponse:
    intent = store.active_intent()
    if intent is None:
        return SeverityResponse(level="GREEN")
    if intent.signal.confidence >= 0.75:
        level = "RED"
    elif intent.signal.confidence >= 0.55:
        level = "YELLOW"
    else:
        level = "GREEN"
    return SeverityResponse(
        level=level,
        intentId=intent.id,
        confidence=intent.signal.confidence,
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    user_id = getattr(request.state, "user_id", None) or "anonymous"
    ip = request.client.host if request.client else "unknown"
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        ip = fwd.split(",")[0].strip()
    return await handle_chat(
        user_id=user_id,
        ip=ip,
        body_message=body.message,
        history=body.history,
        active_intent=store.active_intent(),
    )


# ---------------------------------------------------------------- live demo

def _onboarding_multiplier(spending: str | None, buffer: str | None) -> float:
    """Scale baseline based on the (vague) onboarding answers.

    Larger spending → larger absolute impact dollar; thinner buffer →
    same direction (more sensitive). Bounded so it can't explode.
    """
    spend_map = {
        "<2k": 0.65, "2-4k": 1.0, "4-6k": 1.25, "6k+": 1.55,
    }
    buffer_map = {
        "<1mo": 1.20, "1-3mo": 1.05, "3-6mo": 0.95, "6mo+": 0.85,
    }
    s = spend_map.get(spending or "", 1.0)
    b = buffer_map.get(buffer or "", 1.0)
    return s * b


def _impact_multiplier_for(category: str, spending: str | None, buffer: str | None) -> float:
    """News-pressure × onboarding multiplier, with the ±50% cap from the
    design doc applied to the news-pressure component only."""
    raw_pressure = pressure.score(category)
    # Map raw pressure (sum of decay weights) to a bounded multiplier.
    # Each "fully fresh" article contributes ~1.0 to raw_pressure. We let 5
    # fresh articles reach the +50% cap.
    pressure_component = 1.0 + min(0.5, max(-0.5, raw_pressure / 10.0))
    onboarding_component = _onboarding_multiplier(spending, buffer)
    return pressure_component * onboarding_component


@app.get("/api/demo/live", response_model=LiveSnapshot)
def demo_live(
    spending: Optional[str] = Query(default=None),
    buffer: Optional[str] = Query(default=None),
    stress: Optional[str] = Query(default=None),
) -> LiveSnapshot:
    intent = store.active_intent()

    # Active impact
    if intent is not None:
        cat = intent.signal.category
        mult = _impact_multiplier_for(cat, spending, buffer)
        base_high = intent.impact.monthlyCadHigh or intent.impact.oneTimeCadHigh or 0
        live_high = round(base_high * mult)
        active_impact = LiveImpact(
            monthlyCadHigh=live_high if intent.impact.monthlyCadHigh is not None else None,
            oneTimeCadHigh=live_high if intent.impact.oneTimeCadHigh is not None else None,
            category=cat,
            multiplier=round(mult, 3),
        )
    else:
        active_impact = LiveImpact(monthlyCadHigh=0, multiplier=1.0)

    # Tickers — baseline + per-ticker pressure delta, capped
    ticker_prices: dict[str, float] = {}
    for sym, base in TICKER_BASELINES.items():
        raw = pressure.score(f"TICKER:{sym}")
        # 5 fresh articles → ±cap
        delta = min(TICKER_DELTA_CAP_PCT, max(-TICKER_DELTA_CAP_PCT, raw / 10.0)) * base
        ticker_prices[sym] = round(base + delta, 4)

    # Pressure scores by category (for any UI bars that want them)
    by_cat = {k: round(pressure.score(k), 3) for k in CATEGORY_KEYS}

    # Wave samples (aggregate). sampler.export_samples returns dicts.
    wave = [WaveSample(**s) for s in sampler.export_samples()]

    return LiveSnapshot(
        pressureByCategory=by_cat,
        tickerPrices=ticker_prices,
        waveSamples=wave,
        activeImpact=active_impact,
        headlineCount=len(store.live_signals),
        updatedAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )


@app.post("/api/admin/seed", response_model=AIIntent)
def admin_seed(body: SeedRequest) -> AIIntent:
    if body.seedKey != SEED_KEY:
        raise HTTPException(status_code=403, detail="invalid seedKey")
    seed_key = body.intentSeed or "food"
    if seed_key not in ALLOWED_SEED_KEYS:
        raise HTTPException(status_code=400, detail="invalid intentSeed")
    return store.create_intent_from_seed(seed_key)


@app.post("/api/admin/reset")
def admin_reset() -> dict:
    store.reset()
    return {"ok": True}


@app.post("/api/admin/refresh-news")
async def admin_refresh_news() -> dict:
    """Force an immediate refresh of all live news adapters."""
    started = time.time()
    result = await _refresh_all()
    return {
        "ok": True,
        "elapsedMs": round((time.time() - started) * 1000),
        **result,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=False)

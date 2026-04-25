import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import (
    HealthResponse,
    Intent,
    NewsItem,
    Profile,
    SeedRequest,
    SnoozeRequest,
)
from store import store

SEED_KEY = os.environ.get("TARIFF_SEED_KEY", "demo-seed")

app = FastAPI(title="Tariff Backend", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, version="0.1")


@app.get("/api/profile", response_model=Profile)
def get_profile() -> Profile:
    return store.profile


@app.put("/api/profile", response_model=Profile)
def put_profile(profile: Profile) -> Profile:
    store.profile = profile
    return store.profile


@app.get("/api/feed", response_model=list[NewsItem])
def get_feed(channel: Optional[str] = Query(default=None)) -> list[NewsItem]:
    if channel and channel not in ("PRO_MIRROR", "WALLET_WEATHER"):
        raise HTTPException(status_code=400, detail="invalid channel")
    return store.list_feed(channel)


@app.get("/api/breaking", response_model=Optional[NewsItem])
def get_breaking() -> Optional[NewsItem]:
    return store.breaking()


@app.get("/api/intents/active", response_model=Optional[Intent])
def get_active_intent() -> Optional[Intent]:
    return store.active_intent()


@app.get("/api/intents", response_model=list[Intent])
def get_intents(state: Optional[str] = Query(default=None)) -> list[Intent]:
    if state and state not in ("PENDING", "APPROVED", "REJECTED", "SNOOZED"):
        raise HTTPException(status_code=400, detail="invalid state")
    return store.list_intents(state)


@app.post("/api/intents/{intent_id}/approve", response_model=Intent)
def approve_intent(intent_id: str) -> Intent:
    intent = store.transition(intent_id, "APPROVED")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.post("/api/intents/{intent_id}/reject", response_model=Intent)
def reject_intent(intent_id: str) -> Intent:
    intent = store.transition(intent_id, "REJECTED")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.post("/api/intents/{intent_id}/snooze", response_model=Intent)
def snooze_intent(intent_id: str, body: Optional[SnoozeRequest] = None) -> Intent:
    intent = store.transition(intent_id, "SNOOZED")
    if intent is None:
        raise HTTPException(status_code=404, detail="intent not found")
    return intent


@app.post("/api/admin/seed", response_model=Intent)
def admin_seed(body: SeedRequest) -> Intent:
    if body.seedKey != SEED_KEY:
        raise HTTPException(status_code=403, detail="invalid seedKey")
    news_id = body.newsId or "news_001"
    news = store.news_by_id.get(news_id)
    if news is None:
        raise HTTPException(status_code=404, detail="news item not found")
    return store.create_intent(news)


@app.post("/api/admin/reset")
def admin_reset() -> dict:
    store.reset()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=False)

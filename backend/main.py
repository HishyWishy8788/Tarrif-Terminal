import os
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
    SeedRequest,
    SeverityResponse,
    SnoozeRequest,
    UserProfile,
    WorldSignal,
)
from store import store

SEED_KEY = os.environ.get("TARIFF_SEED_KEY", "demo-seed")

ALLOWED_ORIGINS = {"GLOBAL", "MARKET", "DEMO"}
ALLOWED_STATES = {"PENDING", "APPROVED", "REJECTED", "SNOOZED"}
ALLOWED_SEED_KEYS = {"food", "fuel", "repairs", "labor"}

app = FastAPI(title="Tariff Backend", version="0.3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.middleware("http")(clerk_auth_middleware)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, version="0.3")


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
def snooze_intent(
    intent_id: str, body: Optional[SnoozeRequest] = None
) -> AIIntent:
    minutes = body.minutes if body else 60
    intent = store.transition(
        intent_id, "SNOOZED", note=f"snoozed {minutes}m"
    )
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
def chat(body: ChatRequest, request: Request) -> ChatResponse:
    user_id = getattr(request.state, "user_id", None) or "anonymous"
    return handle_chat(
        user_id=user_id,
        body_message=body.message,
        history=body.history,
        active_intent=store.active_intent(),
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=False)

import asyncio
import json
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import HTTPException, Request

from models import AIIntent, ChatMessage, ChatResponse

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "60"))

CHAT_RATE_LIMIT = 10
CHAT_RATE_WINDOW_S = 60.0
HISTORY_CAP = 10

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

SYSTEM_PROMPT_TEMPLATE = """You are Tariff's household financial advisor. You speak in a measured, professional tone — like a Vanguard advisor. Use plain English. Keep replies to 2-3 sentences. Never use exclamation points. Never make jokes.

You only discuss:
- The user's currently active alert and its dollar impact
- Items on their Tariff dashboard (groceries, fuel, repairs, job risk, rent/utilities)
- Concrete, conservative budgeting suggestions tied to those items

If asked anything outside this scope (stocks, crypto, mortgages, taxes, relationship advice, weather, etc.), respond exactly:
"I can only help with what's on your Tariff dashboard right now."

Never invent dollar figures. Always reference figures from the dashboard context provided below. If a figure is not in the context, say so.

DASHBOARD CONTEXT:
{context_block}
"""

# Module-level shared state. The lock prevents the previous threadpool race
# where rapid concurrent requests could all read the bucket length before any
# of them appended.
_buckets: dict[str, list[float]] = defaultdict(list)
_buckets_lock = asyncio.Lock()


def _client_ip(request: Request) -> str:
    # Trust x-forwarded-for when behind a known proxy; otherwise fall back to
    # the direct peer. For local demos the peer is enough.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _bucket_key(user_id: str, ip: str) -> str:
    # Anonymous callers share a single user_id; partition them by IP so one
    # spammer can't lock everyone out of the demo.
    if user_id == "anonymous" or not user_id:
        return f"ip:{ip}"
    return f"u:{user_id}"


async def _enforce_rate_limit(user_id: str, ip: str) -> None:
    key = _bucket_key(user_id, ip)
    now = time.time()
    async with _buckets_lock:
        bucket = _buckets[key]
        bucket[:] = [t for t in bucket if now - t < CHAT_RATE_WINDOW_S]
        if len(bucket) >= CHAT_RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"rate limit exceeded; max {CHAT_RATE_LIMIT}/min",
            )
        bucket.append(now)


def _build_context_block(active_intent: Optional[AIIntent]) -> str:
    if active_intent is None:
        return "No active alert. Tell the user there is nothing to act on right now."
    return json.dumps(active_intent.model_dump(), indent=2)


def _log_turn(user_id: str, ip: str, message: str, reply: str) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = {
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "user_id": user_id,
        "ip": ip,
        "message": message,
        "reply": reply,
    }
    with (LOG_DIR / f"chat-{today}.jsonl").open("a") as f:
        f.write(json.dumps(entry) + "\n")


async def handle_chat(
    user_id: str,
    ip: str,
    body_message: str,
    history: list[ChatMessage],
    active_intent: Optional[AIIntent],
) -> ChatResponse:
    await _enforce_rate_limit(user_id, ip)

    system = SYSTEM_PROMPT_TEMPLATE.format(
        context_block=_build_context_block(active_intent),
    )

    messages: list[dict] = [{"role": "system", "content": system}]
    for h in history[-HISTORY_CAP:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": body_message})

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
            )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama not reachable. Run `ollama serve` and `ollama pull {OLLAMA_MODEL}`.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned {e.response.status_code}",
        )
    except (httpx.TimeoutException, KeyError, ValueError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama response error: {type(e).__name__}",
        )

    _log_turn(user_id, ip, body_message, reply)
    return ChatResponse(reply=reply)

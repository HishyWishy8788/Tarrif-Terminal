import json
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import HTTPException

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

_buckets: dict[str, list[float]] = defaultdict(list)


def _enforce_rate_limit(user_id: str) -> None:
    now = time.time()
    bucket = _buckets[user_id]
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


def _log_turn(user_id: str, message: str, reply: str) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = {
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "user_id": user_id,
        "message": message,
        "reply": reply,
    }
    with (LOG_DIR / f"chat-{today}.jsonl").open("a") as f:
        f.write(json.dumps(entry) + "\n")


def handle_chat(
    user_id: str,
    body_message: str,
    history: list[ChatMessage],
    active_intent: Optional[AIIntent],
) -> ChatResponse:
    _enforce_rate_limit(user_id)

    system = SYSTEM_PROMPT_TEMPLATE.format(
        context_block=_build_context_block(active_intent),
    )

    messages: list[dict] = [{"role": "system", "content": system}]
    for h in history[-HISTORY_CAP:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": body_message})

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama not reachable. Run `ollama serve` and `ollama pull " + OLLAMA_MODEL + "`.",
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

    _log_turn(user_id, body_message, reply)
    return ChatResponse(reply=reply)

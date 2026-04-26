# Tariff Terminal — Claude context

## What this project is

A hackathon-built household financial early-warning portal. Each "alert" connects a real-world headline (groceries, fuel, repairs, job risk, rent/utilities) to a deterministic CAD dollar impact for a Canadian household, then asks the user to **Approve / Later / Dismiss**. The user is always the gatekeeper.

Authoritative product spec: `PRD_v2.md`. Hackathon constraints: `HACKATHON_BRIEF.md`.

Active branch: `feat/react-frontend`. Pre-React backup tag: `pre-react-migration`.

## Hard rules (non-negotiable)

- **Every dollar shown to the user comes from `backend/impact_engine.py`. The LLM never invents dollars.** The chat system prompt enforces this; chat turns are logged for audit.
- **No real money movement, no mortgage math, no trading recommendations.** Out of scope by brief.
- **No production Plaid, no production banking integrations.** Demo-only.
- **Demo must never break.** Every external API has a JSON fixture fallback in `backend/data/`.
- **Intents stay PENDING until the user transitions them.** No auto-approve. Audit log is appended on every state change.

## Architecture

Four independent processes on the demo Mac:

```
Browser (Vite/React, :5173)
    ─JWT─▶ FastAPI backend (:3001)
              ├─▶ Ollama (:11434, gemma)         for /api/chat
              └─▶ store.py (in-memory + JSON)    for everything else
LED daemon (Python + pyserial)
    ─polls /api/severity─▶ backend
    ─USB serial─▶ Seeed D1 (firmware/d1_led_ring.ino)
```

Trust boundary is the FastAPI backend. Frontend never talks to Ollama directly; daemon never talks to anything but the backend.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React 18 + TypeScript, TanStack Query, Clerk (`@clerk/clerk-react`) |
| Backend | FastAPI + Pydantic v2, in-memory `Store` loaded from `backend/data/*.json` |
| Auth | Clerk OAuth (Google). Backend verifies JWTs via JWKS in `backend/auth.py`. If `CLERK_JWKS_URL` / `CLERK_ISSUER` are unset, auth is bypassed (Phase-1 fallback). |
| LLM | Local Gemma via Ollama. Default model env: `OLLAMA_MODEL` (currently `gemma4:e2b` in `chat.py`). |
| Hardware | Seeed Studio SenseCAP Indicator (ESP32-S3 + onboard WS2812). USB serial 115200 8N1, single-char protocol `G`/`Y`/`R`/`P`. |

## Run the stack (dev)

```bash
# Backend
cd backend && .venv/bin/python main.py            # → :3001

# Frontend
cd frontend && npm run dev                         # → :5173 (proxies /api → :3001)

# LLM
ollama serve                                       # → :11434
ollama pull gemma:latest                           # or whatever OLLAMA_MODEL is set to

# LED (optional, only if D1 plugged in)
cd backend && .venv/bin/python led_daemon.py
```

Health check: `curl -fsS http://127.0.0.1:3001/api/health`.

## Key files

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, all routes, CORS, Clerk middleware wiring |
| `backend/models.py` | Pydantic types — mirrors `frontend/src/types/api.ts` |
| `backend/store.py` | In-memory store, seed → intent factory, state transitions |
| `backend/impact_engine.py` | **Deterministic CAD math.** All dollar formulas live here. |
| `backend/chat.py` | Ollama chat handler, system prompt, rate limit, JSONL audit log |
| `backend/auth.py` | Clerk JWT verification middleware |
| `backend/led_daemon.py` | Polls `/api/severity` 1×/s, writes color byte to D1 |
| `backend/data/{profile,signals,seeds}.json` | Fixture data |
| `firmware/d1_led_ring/d1_led_ring.ino` | Arduino sketch for the LED ring |
| `frontend/src/components/Dashboard.tsx` | Single-screen layout, all card composition |
| `frontend/src/components/ActiveAlertCard.tsx` | Hero alert + Approve/Later/Dismiss buttons |
| `frontend/src/api/client.ts` | Typed fetch wrapper, attaches Clerk JWT |
| `frontend/src/styles/styles.css` | All styling. `clamp()`-heavy, dark "carbon/mint" theme. |

## API surface

Public: `GET /api/health`, `GET /api/auth/status`, `GET /api/severity`.
Admin (seedKey-protected, env `TARIFF_SEED_KEY`): `POST /api/admin/seed`, `POST /api/admin/reset`.
Authenticated (Clerk JWT when enabled): everything else.

Routes: `/api/profile` (GET/PUT), `/api/feed?origin=GLOBAL|MARKET|DEMO`, `/api/intents` (list), `/api/intents/active`, `/api/intents/{id}/{approve,reject,snooze}`, `/api/chat`.

Allowed values: `EventCategory ∈ {FOOD_GROCERIES, FUEL_COMMUTE, TRADE_GOODS_REPAIRS, LABOR_INCOME, RENT_UTILITIES, UNCLASSIFIED}`, `IntentState ∈ {PENDING, APPROVED, REJECTED, SNOOZED}`, `SeedKey ∈ {food, fuel, repairs, labor}`.

Severity mapping (`/api/severity`): no PENDING → GREEN; confidence ≥ 0.75 → RED; ≥ 0.55 → YELLOW; else GREEN.

## Demo flow (3 minutes)

1. Visit `:5173` → Clerk hosted sign-in (or skip if `VITE_CLERK_PUBLISHABLE_KEY` unset).
2. Dashboard renders Khan profile, GLOBAL + MARKET feeds, one PENDING active intent (FOOD_GROCERIES seeded on boot).
3. D1 LED reflects severity within 1s.
4. Open chat bubble → ask a budgeting question → Vanguard-voice reply within ~8s. Off-topic → canned redirect line.
5. Approve the active alert → audit log updates, LED turns GREEN.
6. Re-seed via the rail buttons (Groceries / Gas & commute / Repairs / Job risk) → LED flips back to RED/YELLOW.

## Conventions

- Ports are hardcoded: backend `3001`, frontend `5173`, Ollama `11434`. Vite proxies `/api/*` to `3001`.
- Backend runs from `backend/` cwd (paths in `store.py` are relative to `__file__`).
- Frontend uses TanStack Query everywhere — no raw `fetch` in components.
- Styling uses CSS custom properties + `clamp()` for fluid sizing. Mobile breakpoints at 1100px and 720px.
- Everything is dark-themed; the "paper" surfaces (impact console, guard visual) are intentional inversions for emphasis.

## What's not here yet

Per the PRD §10, these adapters were planned but not built: NewsAPI, Finnhub, Bank of Canada Valet, StatsCan WDS. Today the dashboard runs entirely off `backend/data/signals.json`. There is no `backend/adapters/` folder yet.

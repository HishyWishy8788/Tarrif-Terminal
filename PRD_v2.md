# Tariff v2 — Product Requirements Document

**Status:** Locked design, pre-implementation
**Audience:** Hackathon demo with path-to-launch credibility (A+C)
**Owner:** HishyWishy8788
**Last reviewed:** 2026-04-25

---

## 1. Product Summary

Tariff v2 is a household financial early-warning portal. It converts real-world news and market signals into plain-English household dollar impacts, gates every recommended action behind explicit user approval, and presents the experience through:

- A **secure OAuth-protected gateway** (no anonymous access)
- A **calm, conversational AI advisor** (local Gemma) scoped to dashboard topics
- A **physical LED status ring** (Seeed Studio D1) that mirrors urgency in ambient peripheral vision

It is not a banking app, trading app, mortgage app, or investment app. Every dollar value the user sees comes from deterministic backend formulas — never invented by the LLM.

---

## 2. Target Users & Demo Audience

| Audience | Notes |
|---|---|
| **Primary persona** | Khan-style Canadian household — renter, two dependents, commuter, sector exposure to logistics |
| **Demo audience** | Hackathon judges, non-technical, evaluating in 3 minutes |
| **Tone bar** | A user who has never opened a finance app should understand what's on screen in under 10 seconds |

---

## 3. Goals & Non-Goals

### Goals

1. Looks and feels like a path-to-launch consumer product, not a hackathon prototype.
2. Real authentication (Clerk OAuth) and a real local LLM (Gemma via Ollama) — both verifiable when judges look behind the curtain.
3. Tight 3-minute demo loop: sign in → see active alert → ask AI a question → approve → LED turns green.
4. Demo never breaks: every external API has a fixture fallback.

### Non-Goals (explicit)

- Multi-tenant scaling beyond single-judge demo
- Real money movement (Plaid production)
- Mortgage, trading, or investment advice (legal exposure)
- Pi + webcam integration (appendix only — out of scope for this PRD)
- Mobile-native apps (responsive web is enough)

---

## 4. Locked Decisions

See the Decision Log in §13 for the full reasoning. Summary of the 10 locked decisions:

| # | Decision |
|---|---|
| 1 | Audience: hackathon + path-to-launch wow |
| 2 | D1 LED reflects backend alert severity |
| 3 | LLM = Gemma on Mac via Ollama |
| 4 | LLM filtering = strict system prompt only |
| 5 | LLM personality = calm financial advisor |
| 6 | Hardware in scope = D1 only (USB to Mac); Pi + webcam → appendix |
| 7 | Auth = Clerk-managed OAuth (Google sign-in) |
| 8 | Chatbot UI = floating bubble + per-card "Ask Tariff" button |
| 9 | Frontend architecture = Vite + React + TypeScript |
| 10 | Backup = git tag `pre-react-migration` + branch `feat/react-frontend` |

---

## 5. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Mac (demo machine)                        │
│                                                                    │
│  ┌──────────────────┐      ┌─────────────────────────────────┐   │
│  │  Browser         │      │  FastAPI backend (port 3001)    │   │
│  │  Vite + React    │◀────▶│  ─ /api/profile, /api/feed      │   │
│  │  + Clerk widget  │ JWT  │  ─ /api/intents/*               │   │
│  │                  │      │  ─ /api/admin/seed              │   │
│  │                  │      │  ─ /api/chat (NEW)              │   │
│  │                  │      │  ─ /api/severity (NEW)          │   │
│  └──────────────────┘      │  ─ Clerk JWT middleware (NEW)   │   │
│                             └────────────┬────────────────────┘   │
│                                          │                         │
│                                          ▼                         │
│                             ┌─────────────────────┐                │
│                             │  Ollama (port 11434)│                │
│                             │  gemma:latest       │                │
│                             └─────────────────────┘                │
│                                                                    │
│  ┌─────────────────────┐                                           │
│  │  led_daemon.py      │──polls /api/severity every 1s             │
│  │  (Python + pyserial)│──writes color to /dev/cu.usbserial-XXXX   │
│  └─────────┬───────────┘                                           │
│            │ USB                                                   │
└────────────┼───────────────────────────────────────────────────────┘
             ▼
       ┌─────────┐
       │ Seeed D1│  RGB ring: green / yellow / red
       └─────────┘
```

### Key Properties

- **One trust boundary:** the FastAPI backend. It verifies Clerk JWTs, hides Ollama from the public, and is the only thing the frontend or daemon talk to.
- **Process independence:** browser, backend, Ollama, LED daemon are four separate processes. Any one can crash without taking the demo down (minus the affected feature).
- **Stateless frontend:** auth state lives in Clerk; data state lives in the backend. The React app holds only ephemeral chat state.

---

## 6. Frontend (Vite + React + TypeScript)

### 6.1 Layout (one screen, no scroll — preserved from v1)

| Region | Component | Source |
|---|---|---|
| Left rail | Brand, household mode, **renamed seed buttons** (§6.3), system status | Static + `/api/profile` |
| Topbar | Refresh button, "Approve next step" CTA, **user menu (Clerk `<UserButton/>`)** | Clerk |
| Active alert | Headline + chain + impact + suggested action + Approve/Later/Dismiss | `/api/intents/active` |
| Approval guard | Audit log of state transitions | `intent.auditLog` |
| KPIs (×4) | Signals count, $ impact, decision state, latency | derived |
| Global news | 2 latest GLOBAL signals | `/api/feed?origin=GLOBAL` |
| Market news | 2 latest MARKET signals | `/api/feed?origin=MARKET` |
| Profile | Rent / commute / dependents / watch tags | `/api/profile` |
| **Chat bubble** | Floating bottom-right, opens `<ChatPanel>` | `/api/chat` |
| **Per-card "Ask"** button | On the active alert card | passes intent context to `/api/chat` |

### 6.2 Sections moved to `/utilities` (off main dashboard)

- Impact engine (technical formulas)
- Data sources (readiness meters)

Rationale: non-tech users shouldn't see "Pump price × commute distance" formulas on the main screen. They live behind a "Settings / How it works" link in the user menu.

### 6.3 Seed-button rename (non-tech-friendly labels)

| Old | New |
|---|---|
| "Tariff pressure" | **Groceries** |
| "Oil shock" | **Gas & commute** |
| "Parts cost" | **Repairs** |
| "Sector watch" | **Job risk** |

### 6.4 Project structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx                # Clerk provider + router root
│   ├── App.tsx
│   ├── api/
│   │   └── client.ts           # typed fetch wrapper, attaches Clerk JWT
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── ActiveAlertCard.tsx
│   │   ├── ApprovalGuardCard.tsx
│   │   ├── KpiGrid.tsx
│   │   ├── FeedCard.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── SeedRail.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── ChatPanel.tsx
│   │   └── AskAboutThis.tsx    # the per-card button
│   ├── pages/
│   │   ├── SignIn.tsx          # Clerk hosted-style page
│   │   └── Utilities.tsx       # impact engine + data sources moved here
│   ├── types/
│   │   └── api.ts              # mirrors backend Pydantic models
│   └── styles/
│       └── (existing styles.css ported)
```

---

## 7. Authentication (Clerk)

### 7.1 Frontend

```tsx
// main.tsx
<ClerkProvider publishableKey={PK}>
  <SignedIn><Dashboard /></SignedIn>
  <SignedOut><RedirectToSignIn /></SignedOut>
</ClerkProvider>
```

- Sign-in page = Clerk hosted UI (zero custom code).
- Providers: Google + GitHub.
- After sign-in, Clerk issues a session JWT. Every backend call attaches it via `Authorization: Bearer <token>`.

### 7.2 Backend

```python
# new middleware in main.py
from clerk_backend_sdk import authenticate_request

@app.middleware("http")
async def verify_clerk_jwt(request, call_next):
    if request.url.path.startswith("/api/admin/"):
        return await call_next(request)  # admin uses seedKey instead
    if request.url.path == "/api/health":
        return await call_next(request)
    auth_state = authenticate_request(request)
    if not auth_state.is_signed_in:
        return JSONResponse({"detail": "unauthenticated"}, status_code=401)
    request.state.user_id = auth_state.user_id
    return await call_next(request)
```

- Public routes: `/api/health` only.
- Admin routes (`/api/admin/seed`, `/api/admin/reset`): authenticated by `seedKey` env, NOT JWT (presenter uses these from a dev tool).
- All other routes require Clerk JWT.

### 7.3 Demo-day workflow

1. Judge clicks "Sign in" → Clerk hosted page → "Continue with Google" → returns to dashboard signed-in.
2. Optional: pre-create a demo Google account whitelisted in Clerk's dashboard so judges don't need their own.

---

## 8. LLM (Gemma + Ollama)

### 8.1 Hosting

- **Process:** `ollama serve` running on the demo Mac, port 11434.
- **Model:** `ollama pull gemma:latest` — defaults to whichever Gemma is current. Falls back to `gemma:4b` or `gemma2:2b` if `gemma:latest` isn't available.
- **Performance target:** first token <2s, full reply <8s on M-series with 4B-Q4. Verified in dev before demo day.

### 8.2 Backend `/api/chat` endpoint

```python
@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request):
    # rate-limit: 10 req/min per user_id
    # build context: active intent (if any) + user's question
    system = SYSTEM_PROMPT.format(
        active_intent_json=json.dumps(store.active_intent().model_dump()) if store.active_intent() else "none",
    )
    response = httpx.post("http://localhost:11434/api/chat", json={
        "model": "gemma:latest",
        "messages": [
            {"role": "system", "content": system},
            *body.history,
            {"role": "user", "content": body.message},
        ],
        "stream": False,
    })
    return ChatResponse(reply=response.json()["message"]["content"])
```

### 8.3 System prompt (calm financial advisor + strict scope)

```
You are Tariff's household financial advisor. You speak in a measured,
professional tone — like a Vanguard advisor. Use plain English. Keep
replies to 2-3 sentences. Never use exclamation points. Never make jokes.

You only discuss:
- The user's currently active alert and its dollar impact
- Items on their Tariff dashboard (groceries, fuel, repairs, job risk, rent/utilities)
- Concrete, conservative budgeting suggestions tied to those items

If asked anything outside this scope (stocks, crypto, mortgages, taxes,
relationship advice, weather, etc.), respond exactly:
"I can only help with what's on your Tariff dashboard right now."

Never invent dollar figures. Always reference figures from the dashboard
context provided below. If a figure is not in the context, say so.

DASHBOARD CONTEXT:
Active alert: {active_intent_json}
```

### 8.4 Per-card "Ask Tariff" button

Pre-fills the chat input with: *"Tell me more about this alert."* and ensures the active intent is in context. User can then type freely.

### 8.5 Hard rule (from brief)

The LLM never produces a dollar figure that isn't already in the deterministic `MicroImpact`. The system prompt enforces this; backend logs every chat turn for post-demo audit.

---

## 9. D1 LED Ring

### 9.1 Backend `/api/severity` endpoint

```python
@app.get("/api/severity", response_model=SeverityResponse)
def severity():
    intent = store.active_intent()
    if intent is None:
        return SeverityResponse(level="GREEN")
    if intent.signal.confidence >= 0.75:
        return SeverityResponse(level="RED")
    if intent.signal.confidence >= 0.55:
        return SeverityResponse(level="YELLOW")
    return SeverityResponse(level="GREEN")
```

### 9.2 Mac-side `led_daemon.py`

```python
# ~30 lines: poll /api/severity every 1s, write RGB command to /dev/cu.usbserial-XXXX
import time, requests, serial
ser = serial.Serial("/dev/cu.usbserial-XXXX", 115200)
COLORS = {"GREEN": b"G\n", "YELLOW": b"Y\n", "RED": b"R\n"}
last = None
while True:
    try:
        level = requests.get("http://localhost:3001/api/severity", timeout=2).json()["level"]
        if level != last:
            ser.write(COLORS[level])
            last = level
    except Exception:
        pass
    time.sleep(1)
```

### 9.3 D1 firmware (Arduino sketch, ~30 lines)

Reads single character over serial, sets WS2812 RGB ring color. Source goes in `firmware/d1_led_ring.ino`.

### 9.4 Demo-day setup

- Plug D1 into Mac USB before demo.
- `python led_daemon.py &` runs in a terminal tab.
- LED initializes green (no PENDING intents on `/api/admin/reset`).

---

## 10. External APIs

### 10.1 v1 wired adapters

| API | Origin | Free tier | Auth | Cache |
|---|---|---|---|---|
| **NewsAPI** | GLOBAL | 100 req/day | API key | 10 min |
| **Finnhub** | MARKET | 60 req/min | API key | 10 min |
| **Bank of Canada Valet** | (RENT_UTILITIES calibration) | unlimited | none | 1 day |
| **StatsCan WDS** | (FOOD_GROCERIES calibration) | unlimited | none | 1 day |

### 10.2 Failure mode

Every adapter wraps its real-API call in a try-except. On any failure (network, rate limit, auth, parse) it returns the existing JSON fixture from `backend/data/`. The demo loop is **never** allowed to break because of an external service.

### 10.3 Deferred

- Plaid sandbox (out of scope per brief)
- Marketaux / GDELT / GNews (redundant to NewsAPI for v1)

### 10.4 Adapter file layout

```
backend/
└── adapters/
    ├── __init__.py
    ├── newsapi.py          # fetch + map to WorldSignal
    ├── finnhub.py          # fetch + map to WorldSignal
    ├── boc_valet.py        # rate moves
    ├── statscan.py         # CPI calibration
    └── _fallback.py        # shared "load-fixture" helper
```

---

## 11. Non-Functional Requirements

| Dimension | Target | Verification |
|---|---|---|
| API latency | p95 <200ms (excluding /api/chat) | curl benchmarks before demo |
| LLM first token | <2s on M-series Mac, Gemma 4B Q4 | manual stopwatch in dev |
| LLM full reply | <8s | manual stopwatch in dev |
| Concurrency | 1 user (demo); Clerk free tier supports 10K MAU for pilot | n/a |
| Rate limits | `/api/chat` 10/min/user; `/api/admin/seed` 60/min global | basic in-memory token bucket in middleware |
| Reliability | All external APIs have fixture fallback; demo path never errors | smoke test `bin/demo_check.sh` runs all happy paths |
| Security | Clerk JWT verified server-side; admin seedKey env-only; CORS origin whitelist (not `*`) once auth lands | curl with bad token returns 401 |
| Observability | All chat turns logged to `backend/logs/chat-YYYY-MM-DD.jsonl` | post-demo audit |

---

## 12. Implementation Plan

Ordered for early de-risking.

| Phase | Task | Verification | Est |
|---|---|---|---|
| **0** | Tag `pre-react-migration` + branch `feat/react-frontend` | `git tag` shows tag, `git branch` shows branch | 5 min |
| **1** | Vite + React + TS scaffold; port `styles.css`; render dashboard from existing API | Local screenshot matches v1 | 4 hr |
| **2** | Clerk integration; protect dashboard route; backend JWT middleware | Sign in via Google, dashboard renders, unauth call returns 401 | 2 hr |
| **3** | `/api/chat` endpoint + Ollama wired + system prompt | curl POST returns advisor-voiced reply within 8s | 2 hr |
| **4** | `<ChatBubble>` + `<ChatPanel>` + `<AskAboutThis>` UI | Bubble visible, opens panel, message round-trips | 3 hr |
| **5** | `/api/severity` endpoint + `led_daemon.py` + D1 firmware | LED reacts to seed/approve within 2s | 2 hr |
| **6** | NewsAPI + Finnhub adapters (with fixture fallback) | Set keys → real headlines appear; unset keys → fixtures load | 3 hr |
| **7** | `/utilities` page; move Impact Engine + Data Sources cards | Main dashboard cleaner; utilities accessible from user menu | 1 hr |
| **8** | Seed-button rename | UI shows new labels | 10 min |
| **9** | `bin/demo_check.sh` smoke test | Script exits 0 on green path | 1 hr |
| **10** | Merge `feat/react-frontend` to `main` after dry-run demo | Demo runs end-to-end on a clean clone | 30 min |

**Total estimate: ~18 hours** of focused work. Adjust by phases — phases 1, 2, 4, 5 are the demo-critical path. Phases 6, 7, 9 are polish.

---

## 13. Decision Log

| # | Decision | Alternatives | Why this won |
|---|---|---|---|
| 1 | Audience: A+C | (B) pilot only, (C) full launch | User pick — wants demo with prod-quality elements |
| 2 | LED reflects backend severity | (b) Plaid balance, (c) composite forecast, (d) decision queue depth | Zero new backend work; tightest demo arc |
| 3 | LLM on Mac via Ollama | (b) Pi, (c) browser/WebGPU, (d) Mac-LLM + Pi-kiosk | Speed (50 tok/s vs 5 tok/s on Pi); Pi unable to run 4B at usable speed |
| 4 | Strict prompt-only filter | (b) RAG, (c) tool-restricted, (d) hybrid + classifier | User pick; Gemma's tool support uncertain; demo audience won't jailbreak |
| 5 | Calm financial advisor voice | (b) witty, (c) warm coach, (d) Canadian, (e) sarcastic | User pick |
| 6 | D1 only on Mac USB | (a) Pi-driven, (b) presence, (c) QR, (d) Pi backend, (e2) all hardware out | User pick — hardware shrink to one wow piece |
| 7 | Clerk OAuth | (b) Supabase, (c) DIY Google, (d) magic link, (e) fake, (f) basic auth | Cheapest path to "real OAuth" judges can verify |
| 8 | Bubble + per-card Ask | (a) bubble only, (b) button only, (c) panel, (e) voice | Two affordances, one shared backend; familiar to non-tech users |
| 9 | Vite + React + TS | (1) vanilla + proxy, (3) frontend-direct + Web Serial | User pick; deliberately overrides brief's "no framework" for path-to-launch credibility |
| 10 | git tag + branch | folder copy, both, neither | Reversibility without disk clutter |

---

## 14. Open Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemma 4 not available in Ollama on demo day | Medium | Fallback to `gemma:4b` or `gemma2:2b`; tested in dev |
| Clerk free tier / Google OAuth quota hit during demo | Low | Pre-seed a demo Google account; cache JWT |
| LED daemon serial port name changes (`/dev/cu.usbserial-XXXX`) | High on first plug-in | Symlink in `setup.sh`; print device list on daemon start |
| React migration takes longer than 4hr (phase 1) | Medium | Tag-and-branch backup; revert to vanilla if phase 1 slips by >2hr |
| LLM responds with fabricated dollar figures despite system prompt | Medium | Post-demo audit log review; consider RAG (Approach 4b) as fast follow-up |
| `localhost` references break if demo machine isn't the dev machine | High if ported | Document hostnames in `.env.example`; verify on a clean clone |

---

## 15. Future Hardware Addon (Pi + Webcam) — Appendix

**Out of scope for this PRD.** Listed only so future work has a starting point.

Possible roles if added later:
- Pi runs the backend + LED daemon as a self-contained "Tariff appliance"
- Webcam → presence detection (wakes dashboard when user approaches)
- Webcam → QR sign-in for shared family dashboards

Effort estimate: 1–2 days for either presence detection or appliance migration. Defer until a real pilot user actually wants it.

---

## 16. Acceptance Criteria

The demo is "done" when, on a clean Mac:

- [ ] `git checkout pre-react-migration` reverts to a working vanilla site
- [ ] On `main` (post-merge), `npm run dev` + `python main.py` + `ollama serve` + `python led_daemon.py` start cleanly
- [ ] Visiting `localhost:5173` redirects to Clerk sign-in
- [ ] Signing in with Google lands on the dashboard
- [ ] Dashboard shows Khan profile, 6 signals (3 GLOBAL + 3 MARKET), 1 active intent
- [ ] D1 LED is RED (active intent is FOOD_GROCERIES Watch... let me re-check: confidence 0.78 → RED)
- [ ] Chat bubble visible, opens panel, "What should I do?" returns a Vanguard-voiced reply in <8s
- [ ] "Ask Tariff" button on active alert pre-fills "Tell me more about this alert"
- [ ] Approving the active intent → LED turns GREEN within 2s
- [ ] Re-seeding `food` from admin → LED turns RED within 2s
- [ ] LLM refuses "What stock should I buy?" with the canned redirect line
- [ ] No dollar figure in any chat reply that isn't already in the active intent's `MicroImpact`
- [ ] `bin/demo_check.sh` exits 0

---

*End of PRD.*

# Tariff Website Technical Description

Tariff is a static, one-screen, admin-style fintech dashboard implemented with plain HTML, CSS, and JavaScript. It is designed as a hackathon frontend prototype for a household financial early-warning product.

## Product Function

The interface visualizes a household financial risk monitoring system. It consumes simulated global news, market news, public data, profile data, and deterministic impact engine outputs, then presents a single active household alert with an approval-gated AI recommendation.

The dashboard is not a banking execution interface. It does not move money. It models a Route Guard / Root Guard approval layer where any AI-generated next step remains pending until the user explicitly approves, delays, or dismisses it.

## Runtime Architecture

- Entry point: `index.html`
- Styling: `styles.css`
- Client state and rendering: `app.js`
- Build system: none
- Framework: none
- External runtime dependency: Google Fonts only
- Data source behavior: local in-memory mock data in `app.js`
- Browser behavior: desktop layout is fixed to one viewport with no page scrolling

## Visual Architecture

The UI uses a fixed two-column shell:

- Left rail: brand, household mode, demo scenario selectors, system readiness
- Main dashboard: topbar, KPI cards, and one fixed dashboard board

The board is a 12-column CSS grid:

- Active alert card: primary decision card, spans the largest area
- Approval guard card: Route Guard state and transaction log
- World news card: global news monitor
- Market news card: market signal monitor
- Household profile card: relevance inputs
- Impact engine card: deterministic calculators
- Data sources card: adapter/source readiness

The design goal is a serious fintech command surface that avoids long reading. Each block prioritizes large numbers, clear status labels, short titles, and compact summaries.

## Data Model

`app.js` defines:

- `adapters.globalNews`: mocked global news feed entries
- `adapters.marketNews`: mocked stock/market news feed entries
- `adapters.sources`: mocked source readiness data
- `adapters.engineRows`: mocked deterministic calculator outputs
- `seeds`: demo alert scenarios keyed by `food`, `fuel`, `repairs`, and `labor`
- `transactions`: Route Guard log entries
- `activeSeed`: currently selected demo scenario
- `intentState`: current approval state

## User Interactions

The page supports:

- Selecting demo scenarios from the left rail
- Updating simulated dashboard metrics
- Approving the active next step
- Delaying the active next step
- Dismissing the active alert

All interactions are handled client-side with DOM updates. No network calls are currently made.

## Intended API Contract

The frontend is shaped to map to these backend routes later:

- `GET /api/feed?origin=GLOBAL`
- `GET /api/feed?origin=MARKET`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/intents/active`
- `POST /api/intents/:id/approve`
- `POST /api/intents/:id/snooze`
- `POST /api/intents/:id/reject`
- `POST /api/admin/seed`

Dollar values displayed in the UI are intended to come from deterministic `MicroImpact` data, not LLM-generated text.

## Core Domain Objects

The eventual backend should expose:

- `WorldSignal`: normalized news or market signal
- `MicroImpact`: deterministic CAD impact range and assumptions
- `AIIntent`: user-facing alert with signal, impact, narrative, and state
- `UserProfile`: household sensitivity profile

## Route Guard State Model

The UI models four intent states:

- `PENDING`
- `APPROVED`
- `SNOOZED`
- `REJECTED`

The active recommendation starts as `PENDING`. User action changes state and appends a log entry to the transaction list.

## Design Constraints

- One-page dashboard
- No desktop scrolling
- Low-reading, block-first interface
- Serious fintech tone
- Consumer-friendly labels
- Data sources and impact engine remain visible but secondary
- Mortgage, trading, portfolio, and copy-trade framing are out of scope


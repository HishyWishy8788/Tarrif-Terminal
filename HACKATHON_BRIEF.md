# Tariff Hackathon Brief

This is the simplified build brief for Tariff. It condenses:

- `/Users/murtadalakhdar/Downloads/fintech/prd.md`
- `/Users/murtadalakhdar/Downloads/fintech/spec.md`
- `/Users/murtadalakhdar/Downloads/fintech/workflow-prd.md`

Use this file as the working source during the hackathon.

## One-Line Product

Tariff turns news into a simple household money alert: what changed, why it matters, how much it might affect monthly cash flow, and what action the user can approve or dismiss.

## What We Are Building

A mobile-first web app for household financial early warnings.

The app shows one active alert at a time. Each alert connects a real or seeded headline to a practical household impact such as groceries, gas, rent, utilities, job/income risk, or everyday goods.

This is not a trading app, mortgage app, investment app, or bank automation app.

## What We Are Not Building

Avoid these for the hackathon:

- Mortgage-specific calculations
- Mortgage qualification, refinancing, amortization, or rate payment math
- Real money movement
- Real trading or portfolio recommendations
- Production Plaid
- Production auth
- Complex compliance workflows
- Snowflake/Vultr/blockchain unless absolutely needed for judging
- Google Home, live webcam, or hardware as blockers

Mortgage references from the original docs should be treated as generic housing-cost sensitivity. For this build, prefer rent or general household fixed costs.

## Core Demo Story

The user is a Canadian household with a tight monthly budget.

They open Tariff and see:

1. A headline that may affect household costs.
2. A plain-English explanation of the household channel.
3. A dollar range for the impact.
4. One recommended planning action.
5. Buttons to approve, snooze, or reject the suggestion.

The emotional center: "I understand the risk early, and I stay in control."

## MVP Screens

### Home

Main screen. Shows the single active alert.

Required:

- Headline
- Category badge
- Severity indicator: OK, Watch, Alert
- Monthly or one-time CAD impact range
- Short causal explanation
- Assumptions accordion
- Recommended action
- Approve, Snooze, Reject buttons
- Demo/simulated label where appropriate

### Feed

Secondary screen. Shows recent signals.

Required:

- Title
- Source
- Time
- Category
- Origin badge: Global, Market, or Demo

Keep it simple. This is not a Bloomberg terminal.

### Profile

Simple household profile.

Use these fields:

- Income band
- Housing type: Rent, Own outright, Other fixed housing cost
- Monthly housing cost
- Commute km per week
- Dependents
- Work sector
- Gig or variable income toggle
- Stress tags, such as groceries, fuel, rent, utilities, repairs, income stability

Do not include mortgage-specific fields in the hackathon MVP.

### Admin / Demo

Hidden or simple demo route.

Required:

- Seed button to trigger a reliable judge-friendly alert
- Seed key or simple admin token
- Clear simulated/demo state

## MVP Backend Concepts

The backend can be real, stubbed, or hybrid, depending on time.

Required data objects:

- `WorldSignal`: a news/demo event
- `MicroImpact`: deterministic dollar impact
- `AIIntent`: user-facing alert with lifecycle state
- `UserProfile`: household sensitivity profile

Required intent states:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `SNOOZED`

Hard rule: any dollar number shown to the user must come from the deterministic impact data, not from an LLM response.

## Event Categories

Use this smaller hackathon taxonomy:

- `FOOD_GROCERIES`
- `FUEL_COMMUTE`
- `TRADE_GOODS_REPAIRS`
- `LABOR_INCOME`
- `RENT_UTILITIES`
- `UNCLASSIFIED`

Skip `RATES_BORROWING` for MVP unless needed for a non-mortgage story.

## Demo Seed Alerts

Build at least three reliable seeded alerts:

### Fuel / Commute

Headline: Oil prices jump after supply disruption.

Household channel: gas prices may rise for commuters.

Impact: extra monthly fuel cost.

Action: move a small amount into buffer or reduce discretionary driving this week.

### Groceries

Headline: Food import costs rise after tariff announcement.

Household channel: imported grocery staples may become more expensive.

Impact: extra grocery spend over the next month.

Action: adjust grocery budget or swap affected items.

### Everyday Goods / Repairs

Headline: New tariffs affect household appliances and repair parts.

Household channel: repair or replacement costs may rise.

Impact: possible one-time cost range.

Action: delay non-urgent purchase or pre-price repair options.

Optional fourth:

### Labor / Income

Headline: Layoffs increase in a sector matching the user's work profile.

Household channel: income stability risk.

Impact: no fake dollar math unless based on profile. Use planning language.

Action: build a short-term cash buffer or review upcoming bills.

## Recommended Stack

Use the simplest stack that lets us demo quickly:

- Frontend: React / Next.js / Vite
- API: Node/TypeScript or lightweight mock API
- Shared types: TypeScript interfaces
- Styling: clean mobile-first UI
- Data: fixtures first, real ingest later if time

Do not block the build on live news APIs. Seeded demo data is acceptable and should be labeled.

## API Contract

Minimum endpoints:

- `GET /api/health`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/feed`
- `GET /api/intents/active`
- `GET /api/intents`
- `POST /api/intents/:id/approve`
- `POST /api/intents/:id/reject`
- `POST /api/intents/:id/snooze`
- `POST /api/admin/seed`

Optional:

- `GET /api/tts`
- `GET /api/stream`

## Type Shapes

```ts
type EventCategory =
  | "FOOD_GROCERIES"
  | "FUEL_COMMUTE"
  | "TRADE_GOODS_REPAIRS"
  | "LABOR_INCOME"
  | "RENT_UTILITIES"
  | "UNCLASSIFIED";

type SignalOrigin = "GLOBAL" | "MARKET" | "DEMO";

type IntentState = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";

interface WorldSignal {
  id: string;
  ts: string;
  source: string;
  title: string;
  link?: string;
  snippet?: string;
  origin: SignalOrigin;
  category: EventCategory;
  confidence: number;
  rationale: string;
}

interface MicroImpact {
  monthlyCadLow: number | null;
  monthlyCadHigh: number | null;
  oneTimeCadLow: number | null;
  oneTimeCadHigh: number | null;
  horizon: string;
  assumptions: string[];
  formulaId: string;
  formulaVersion: string;
}

interface UserProfile {
  id: string;
  incomeBand: string;
  housingType: "RENT" | "OWN_OUTRIGHT" | "OTHER_FIXED_COST";
  monthlyHousingCad: number;
  commuteKmPerWeek: number;
  dependents: number;
  sector: string;
  gigMode: boolean;
  stressTags: string[];
}

interface AIIntent {
  id: string;
  signal: WorldSignal;
  impact: MicroImpact;
  narrative: {
    causalChain: string;
    recommendedAction: string;
  };
  state: IntentState;
  createdAt: string;
  updatedAt: string;
  auditLog: { ts: string; event: string; note?: string }[];
}
```

## Build Priority

1. Create app shell and mobile-first UI.
2. Add fixture data for profile, feed, and active intent.
3. Render the active alert beautifully and clearly.
4. Wire approve, snooze, and reject state changes.
5. Add admin seed trigger.
6. Add profile editing.
7. Add feed.
8. Add live API/news/LLM only if time remains.

## Frontend Rules

- One primary alert on Home.
- Keep financial explanations calm and concrete.
- Make assumptions visible but not overwhelming.
- Use clear state changes after approve/snooze/reject.
- Do not calculate new financial numbers in the UI.
- Do not show mortgage-specific copy.

## Backend Rules

- Impact math is deterministic.
- LLM can write narrative, but cannot invent dollars.
- Demo seed must be reliable.
- Route Guard means every recommendation stays pending until user approves, snoozes, or rejects.
- Store or simulate an audit log for user actions.

## Hackathon Success Criteria

Judges should understand this in under 30 seconds:

- Tariff watches the world for household-relevant shocks.
- It translates a headline into a personal cash-flow signal.
- It shows assumptions and dollar ranges.
- The user remains in control.
- The demo is reliable even if live APIs fail.


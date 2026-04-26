// All mock content extracted from the Figma reference design.
// Backend wiring stays where it overlaps (active intent, /api/feed, /api/chat,
// /api/admin/seed) — everything else is client-only mock to mirror the design.

export type Tone = "mint" | "amber" | "rose" | "sky" | "muted";

// ---------- Scenarios ----------

export type ScenarioKey =
  | "none"
  | "grocery-spike"
  | "boc-cut"
  | "cad-weakens"
  | "heating-oil";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  tone: Tone;
  // Optional backend seed mapping. Only food/fuel exist on the backend today.
  backendSeed?: "food" | "fuel" | "repairs" | "labor";
  bannerText: string;
  cardTitle: string;
  cardBody: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: "grocery-spike",
    label: "Grocery price spike",
    tone: "mint",
    backendSeed: "food",
    bannerText:
      "Scenario active: Grocery price spike — produce basket modeled +9.2% over 4 weeks",
    cardTitle: "Scenario · Grocery price spike",
    cardBody:
      "Produce basket modeled at +9.2% over 4 weeks. Substitute plan would offset ~80%.",
  },
  {
    key: "boc-cut",
    label: "BoC rate cut",
    tone: "amber",
    bannerText: "Scenario active: BoC rate cut — variable mortgage modeled −$48/mo",
    cardTitle: "Scenario · BoC rate cut",
    cardBody:
      "25bps cut path priced in. Variable mortgage saves ≈ $48/mo at current balance.",
  },
  {
    key: "cad-weakens",
    label: "CAD weakens 5%",
    tone: "amber",
    bannerText:
      "Scenario active: CAD weakens 5% — USD-priced exposure modeled +$31/mo",
    cardTitle: "Scenario · CAD weakens 5%",
    cardBody:
      "USD subs and US-priced goods +$31/mo. Annual prepay locks today's rate.",
  },
  {
    key: "heating-oil",
    label: "Heating oil surge",
    tone: "rose",
    backendSeed: "fuel",
    bannerText:
      "Scenario active: Heating oil surge — winter fill modeled +$210",
    cardTitle: "Scenario · Heating oil surge",
    cardBody:
      "Winter fill modeled at +$210 vs last season. Pre-buy window closes in 9 days.",
  },
];

export const DEFAULT_ALERT_TEXT =
  "New 18% tariff on US produce — household grocery basket impact pending review";

// ---------- Dashboard ----------

export interface FeedCardData {
  source: string;
  chip: string;
  chipTone: Tone;
  title: string;
  impact: string;
  value: string;
  dir: "up" | "down";
  when: string;
}

export const DASHBOARD_FEED: FeedCardData[] = [
  {
    source: "Interest rates",
    chip: "Variable mortgage",
    chipTone: "sky",
    title: "BoC signals 25bps cut probable at June meeting",
    impact: "Variable mortgage",
    value: "−$48",
    dir: "down",
    when: "3m ago",
  },
  {
    source: "Energy",
    chip: "Fuel + heating",
    chipTone: "amber",
    title: "WTI crude jumps 6.4% on supply cut headline",
    impact: "Fuel + heating",
    value: "+$24",
    dir: "up",
    when: "11m ago",
  },
  {
    source: "FX",
    chip: "USD subscriptions",
    chipTone: "mint",
    title: "USD subscriptions",
    impact: "Streaming bundle",
    value: "+$7",
    dir: "up",
    when: "27m ago",
  },
];

export const EXPOSURE_VECTORS: { label: string; pct: number; tone: Tone }[] = [
  { label: "Utility", pct: 12.4, tone: "mint" },
  { label: "Transport", pct: 18.1, tone: "amber" },
  { label: "Goods", pct: 4.2, tone: "muted" },
];

export const GUARDRAIL_CONFIDENCE = [
  { label: "Receipt match", value: 92 },
  { label: "Substitute availability", value: 78 },
  { label: "Price-pass-through model", value: 85 },
];

// ---------- Economic News view ----------

export const ECON_FEED = [
  {
    headline: "BoC signals 25bps rate cut probable at June meeting",
    impact: "Variable mortgage −$48/mo",
    sentiment: "Dovish",
    tone: "mint" as Tone,
    when: "3m ago",
    region: "CA",
  },
  {
    headline: "White House extends 18% tariff to Mexican produce category",
    impact: "Grocery basket +$22/mo",
    sentiment: "Hawkish",
    tone: "rose" as Tone,
    when: "14m ago",
    region: "US",
  },
  {
    headline: "ECB minutes hint at slower policy easing path",
    impact: "EUR-priced subs +$3/mo",
    sentiment: "Hawkish",
    tone: "amber" as Tone,
    when: "1h ago",
    region: "EU",
  },
  {
    headline: "StatsCan CPI prints 2.7% YoY, shelter remains sticky",
    impact: "Rent guidance unchanged",
    sentiment: "Neutral",
    tone: "muted" as Tone,
    when: "2h ago",
    region: "CA",
  },
  {
    headline:
      "Powell: 'restrictive for longer' if services inflation holds",
    impact: "USD subs +$7/mo",
    sentiment: "Hawkish",
    tone: "amber" as Tone,
    when: "3h ago",
    region: "US",
  },
];

export const SIGNAL_WEIGHTS: { label: string; value: number; tone: Tone }[] = [
  { label: "Tariff & trade", value: 84, tone: "rose" },
  { label: "Central banks", value: 61, tone: "amber" },
  { label: "Inflation prints", value: 47, tone: "mint" },
  { label: "Geopolitics", value: 29, tone: "muted" },
];

export const ECON_CALENDAR = [
  { when: "Tue 09:30", what: "CA CPI release", weight: "high" },
  { when: "Wed 14:00", what: "FOMC minutes", weight: "high" },
  { when: "Thu 08:30", what: "US jobless claims", weight: "med" },
  { when: "Fri 10:00", what: "BoC Macklem speech", weight: "med" },
];

// ---------- Market News view ----------

export interface MarketTicker {
  sym: string;
  name: string;
  px: string;
  chg: string;
  dir: "up" | "down";
}

export const MARKET_TAPE: MarketTicker[] = [
  { sym: "WTI", name: "Crude Oil", px: "$84.32", chg: "+6.4%", dir: "up" },
  { sym: "USDCAD", name: "FX (USD)", px: "1.41", chg: "+0.8%", dir: "up" },
  { sym: "TSX", name: "Composite", px: "21,884", chg: "−0.3%", dir: "down" },
  { sym: "Wheat", name: "CBOT", px: "$6.42", chg: "+2.2%", dir: "up" },
  { sym: "Gold", name: "Spot", px: "$2,378", chg: "+0.4%", dir: "up" },
];

export const MARKET_CARDS = [
  {
    chip: "Energy",
    chipTone: "amber" as Tone,
    title: "WTI jumps 6.4% on OPEC+ supply cut headline",
    impact: "Fuel + heating +$24/mo",
  },
  {
    chip: "FX",
    chipTone: "sky" as Tone,
    title: "CAD weakens to 1.41 vs USD on trade headlines",
    impact: "USD subs +$7/mo",
  },
  {
    chip: "Agri",
    chipTone: "mint" as Tone,
    title: "Wheat futures climb on Black Sea export concerns",
    impact: "Bakery basket +$3/mo",
  },
  {
    chip: "Equities",
    chipTone: "mint" as Tone,
    title: "TSX banks rally on rate-cut repositioning",
    impact: "RRSP holdings +$112",
  },
];

// ---------- Household view ----------

export const ACCOUNTS = [
  { name: "RBC Chequing", kind: "Cash", value: "$4,820" },
  { name: "Tangerine Savings", kind: "Cash", value: "$11,340" },
  { name: "Amex Cobalt", kind: "Credit", value: "−$612" },
  { name: "Wealthsimple TFSA", kind: "Invest", value: "$38,902" },
];

export const ENVELOPES = [
  { cat: "Groceries", spent: 462, cap: 600 },
  { cat: "Transport", spent: 318, cap: 350 },
  { cat: "Utilities", spent: 184, cap: 240 },
  { cat: "Streaming & subs", spent: 71, cap: 80 },
  { cat: "Dining", spent: 245, cap: 300 },
];

export const SUBS = [
  { name: "Netflix", ccy: "USD", mo: 22.99 },
  { name: "Adobe CC", ccy: "USD", mo: 26.99 },
  { name: "Spotify", ccy: "CAD", mo: 12.99 },
  { name: "iCloud", ccy: "USD", mo: 3.99 },
  { name: "NYTimes", ccy: "USD", mo: 17.0 },
];

export const HEATING = [
  { kind: "Oil furnace", note: "Primary · 1985L tank" },
  { kind: "Heat pump", note: "Shoulder seasons" },
];

// ---------- Profile view ----------

export const PROFILE_USER = {
  name: "Avery Tremblay",
  region: "Toronto, ON · Household of 3",
  email: "avery@household.demo",
  currency: "CAD (default)",
  regionLabel: "Ontario, Canada",
  sustainability: "Moderate",
};

export const RISK_POSTURE = [
  { label: "Tariff & trade sensitivity", value: 78, tone: "rose" as Tone },
  { label: "Rate sensitivity (mortgage)", value: 64, tone: "amber" as Tone },
  { label: "FX exposure (USD subs)", value: 52, tone: "sky" as Tone },
  { label: "Energy / heating", value: 71, tone: "amber" as Tone },
];

export const TOGGLES = [
  { label: "Allow grocery substitutions", on: true, locked: false },
  { label: "Auto-flag USD subscriptions", on: true, locked: false },
  { label: "Heating-oil watch", on: true, locked: false },
  { label: "Auto-execute any action", on: false, locked: true },
];

export const ADVISORY_NOTE =
  "Tariff is advisory-only. Every action requires your manual confirmation. No brokerage, no order routing, no autonomous spending.";

// ---------- Right rail: insights, audit, chat suggestions ----------

export const ANALYSTS = [
  {
    name: "Eira Lindgren",
    role: "Macro Analyst",
    note:
      "Tariff pass-through to Canadian retail typically lands in week 3. Expect a brief dip in basket inflation before the full step-up.",
    confidence: 82,
    color: "from-emerald-400/40 to-emerald-600/40",
    avatarTone: "mint" as Tone,
  },
  {
    name: "Marcus Vane",
    role: "Household Strategy",
    note:
      "Approving the substitute plan will offset roughly 80% of the new produce cost without changing your shopping cadence.",
    confidence: 91,
    color: "from-sky-400/40 to-indigo-500/40",
    avatarTone: "sky" as Tone,
  },
  {
    name: "Priya Rao",
    role: "FX & Subscriptions",
    note:
      "USD subs are the quiet leak right now. A small annual prepay on Adobe locks today's CAD rate.",
    confidence: 76,
    color: "from-amber-400/40 to-rose-500/40",
    avatarTone: "amber" as Tone,
  },
];

export const AUDIT_HISTORY = [
  { who: "You", what: "Approved · Switch hydro to ULO plan", when: "2h ago", tone: "mint" as Tone },
  { who: "Tariff AI", what: "Flagged · US produce tariff impact", when: "3h ago", tone: "amber" as Tone },
  { who: "You", what: "Dismissed · Streaming bundle alert", when: "1d ago", tone: "muted" as Tone },
  { who: "System", what: "Synced · 4 accounts via Plaid", when: "1d ago", tone: "sky" as Tone },
];

export type ViewKey = "dashboard" | "economic" | "market" | "household" | "profile";

export const CHAT_SUGGESTIONS: Record<ViewKey, string[]> = {
  dashboard: [
    "Summarize this week's alerts",
    "Explain the current Guardrail",
    "What's the net household impact?",
  ],
  economic: [
    "Which macro events hit my budget?",
    "What does a BoC cut mean for me?",
    "Why is the tariff signal hawkish?",
  ],
  market: [
    "How do today's tickers affect me?",
    "Why did WTI move my fuel cost?",
    "USD/CAD impact on my subs?",
  ],
  household: [
    "Which envelope is closest to its cap?",
    "Total USD subscription exposure?",
    "Should I pre-buy heating oil?",
  ],
  profile: [
    "Explain my risk posture",
    "What permissions am I granting?",
    "Why is auto-execute disabled?",
  ],
};

export const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: "Dashboard",
  economic: "Economic News",
  market: "Market News",
  household: "Household",
  profile: "Profile",
};

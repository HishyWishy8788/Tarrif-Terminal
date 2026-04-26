export type EventCategory =
  | "FOOD_GROCERIES"
  | "FUEL_COMMUTE"
  | "TRADE_GOODS_REPAIRS"
  | "LABOR_INCOME"
  | "RENT_UTILITIES"
  | "UNCLASSIFIED";

export type SignalOrigin = "GLOBAL" | "MARKET" | "DEMO";
export type IntentState = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";
export type HousingType = "RENT" | "OWN_OUTRIGHT" | "OTHER_FIXED_COST";
export type SeedKey = "food" | "fuel" | "repairs" | "labor";

export interface WorldSignal {
  id: string;
  ts: string;
  source: string;
  title: string;
  link?: string | null;
  snippet?: string | null;
  origin: SignalOrigin;
  category: EventCategory;
  confidence: number;
  rationale: string;
}

export interface MicroImpact {
  monthlyCadLow: number | null;
  monthlyCadHigh: number | null;
  oneTimeCadLow: number | null;
  oneTimeCadHigh: number | null;
  horizon: string;
  assumptions: string[];
  formulaId: string;
  formulaVersion: string;
}

export interface IntentNarrative {
  causalChain: string;
  recommendedAction: string;
}

export interface AuditEntry {
  ts: string;
  event: string;
  note?: string | null;
}

export interface AIIntent {
  id: string;
  signal: WorldSignal;
  impact: MicroImpact;
  narrative: IntentNarrative;
  state: IntentState;
  createdAt: string;
  updatedAt: string;
  auditLog: AuditEntry[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
}

export interface UserProfile {
  id: string;
  incomeBand: string;
  housingType: HousingType;
  monthlyHousingCad: number;
  commuteKmPerWeek: number;
  dependents: number;
  sector: string;
  gigMode: boolean;
  stressTags: string[];
}

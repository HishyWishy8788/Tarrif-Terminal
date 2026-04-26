import type { EventCategory, IntentState } from "../types/api";
import type { Tone } from "../data/mocks";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  FOOD_GROCERIES: "Groceries",
  FUEL_COMMUTE: "Fuel & commute",
  TRADE_GOODS_REPAIRS: "Repairs",
  LABOR_INCOME: "Job risk",
  RENT_UTILITIES: "Rent & utilities",
  UNCLASSIFIED: "Macro",
};

export const CATEGORY_TONES: Record<EventCategory, Tone> = {
  FOOD_GROCERIES: "mint",
  FUEL_COMMUTE: "amber",
  TRADE_GOODS_REPAIRS: "sky",
  LABOR_INCOME: "rose",
  RENT_UTILITIES: "mint",
  UNCLASSIFIED: "muted",
};

export function sentimentLabel(category: EventCategory, confidence: number): string {
  const high = confidence >= 0.75;
  if (category === "LABOR_INCOME" || category === "TRADE_GOODS_REPAIRS")
    return high ? "Hawkish" : "Watch";
  if (category === "FOOD_GROCERIES" || category === "FUEL_COMMUTE" || category === "RENT_UTILITIES")
    return high ? "Hawkish" : "Neutral";
  return "Neutral";
}

export const STATE_LABELS: Record<IntentState, string> = {
  PENDING: "Needs review",
  APPROVED: "Approved",
  SNOOZED: "Delayed",
  REJECTED: "Dismissed",
};

export function severityFromConfidence(confidence: number): "Alert" | "Watch" | "Note" {
  if (confidence >= 0.75) return "Alert";
  if (confidence >= 0.55) return "Watch";
  return "Note";
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

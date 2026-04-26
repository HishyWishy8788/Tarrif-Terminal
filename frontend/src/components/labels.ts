import type { EventCategory, IntentState } from "../types/api";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  FOOD_GROCERIES: "Food groceries",
  FUEL_COMMUTE: "Fuel commute",
  TRADE_GOODS_REPAIRS: "Trade goods repairs",
  LABOR_INCOME: "Labor income",
  RENT_UTILITIES: "Rent utilities",
  UNCLASSIFIED: "Unclassified",
};

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

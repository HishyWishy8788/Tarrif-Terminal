import type { EventCategory, SeedKey } from "../types/api";

const SEED_BUTTONS: { key: SeedKey; label: string; subtitle: string }[] = [
  { key: "food", label: "Groceries", subtitle: "Food prices" },
  { key: "fuel", label: "Gas & commute", subtitle: "Fuel prices" },
  { key: "repairs", label: "Repairs", subtitle: "Parts & service" },
  { key: "labor", label: "Job risk", subtitle: "Sector watch" },
];

const CATEGORY_TO_SEED: Partial<Record<EventCategory, SeedKey>> = {
  FOOD_GROCERIES: "food",
  FUEL_COMMUTE: "fuel",
  TRADE_GOODS_REPAIRS: "repairs",
  LABOR_INCOME: "labor",
};

export function deriveActiveSeed(category: EventCategory | undefined): SeedKey {
  return (category && CATEGORY_TO_SEED[category]) || "food";
}

interface Props {
  activeSeed: SeedKey;
  onSelect: (seed: SeedKey) => void;
}

export function SeedRail({ activeSeed, onSelect }: Props) {
  return (
    <div className="seed-stack" aria-label="Demo scenarios">
      {SEED_BUTTONS.map((b) => {
        const isActive = b.key === activeSeed;
        return (
          <button
            key={b.key}
            type="button"
            className={`seed-card${isActive ? " active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onSelect(b.key)}
          >
            <span>{b.label}</span>
            <strong>{b.subtitle}</strong>
          </button>
        );
      })}
    </div>
  );
}

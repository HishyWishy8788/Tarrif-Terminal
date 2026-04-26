import { useEffect, useState } from "react";
import {
  type BufferBand,
  type SpendingBand,
  type StressTag,
  useOnboarding,
} from "../hooks/useOnboarding";

const SPENDING: { value: SpendingBand; label: string }[] = [
  { value: "<2k", label: "Under $2k" },
  { value: "2-4k", label: "$2 – $4k" },
  { value: "4-6k", label: "$4 – $6k" },
  { value: "6k+", label: "$6k+" },
];

const BUFFER: { value: BufferBand; label: string }[] = [
  { value: "<1mo", label: "< 1 month" },
  { value: "1-3mo", label: "1 – 3 months" },
  { value: "3-6mo", label: "3 – 6 months" },
  { value: "6mo+", label: "6+ months" },
];

const STRESS: { value: StressTag; label: string }[] = [
  { value: "groceries", label: "Groceries" },
  { value: "fuel", label: "Fuel & commute" },
  { value: "rent-utilities", label: "Rent & utilities" },
  { value: "job-risk", label: "Job risk" },
];

export function OnboardingDrawer() {
  const ob = useOnboarding();
  const [open, setOpen] = useState(false);

  // Show on first load if not completed
  useEffect(() => {
    if (!ob.completed) {
      // small delay so the dashboard renders behind it
      const t = window.setTimeout(() => setOpen(true), 220);
      return () => window.clearTimeout(t);
    }
  }, [ob.completed]);

  if (!open) return null;

  const allAnswered = !!ob.spending && !!ob.buffer && ob.stress.length > 0;

  const toggleStress = (s: StressTag) => {
    const next = ob.stress.includes(s)
      ? ob.stress.filter((x) => x !== s)
      : [...ob.stress, s];
    ob.update({ stress: next });
  };

  const finish = () => {
    ob.update({ completed: true });
    setOpen(false);
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-label="Calibrate Tariff">
      <div className="onboarding-card">
        <header className="onboarding-head">
          <p className="card-eyebrow">Calibrate · 5 seconds</p>
          <h2>Vague is fine. Pick what feels close.</h2>
          <p className="onboarding-sub">
            We use these to scale the dollar values you're about to see.
            Nothing is stored on a server.
          </p>
        </header>

        <section className="onboarding-section">
          <label>Roughly your monthly spending feels like</label>
          <div className="onboarding-chips">
            {SPENDING.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`onboarding-chip${ob.spending === s.value ? " active" : ""}`}
                onClick={() => ob.update({ spending: s.value })}
                aria-pressed={ob.spending === s.value}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="onboarding-section">
          <label>Your cash buffer covers</label>
          <div className="onboarding-chips">
            {BUFFER.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`onboarding-chip${ob.buffer === b.value ? " active" : ""}`}
                onClick={() => ob.update({ buffer: b.value })}
                aria-pressed={ob.buffer === b.value}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section className="onboarding-section">
          <label>Where do you feel pressure (pick any)</label>
          <div className="onboarding-chips">
            {STRESS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`onboarding-chip${ob.stress.includes(s.value) ? " active" : ""}`}
                onClick={() => toggleStress(s.value)}
                aria-pressed={ob.stress.includes(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <footer className="onboarding-foot">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              ob.update({ completed: true });
              setOpen(false);
            }}
          >
            Skip
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allAnswered}
            onClick={finish}
          >
            {allAnswered ? "Calibrate" : "Pick one in each"}
          </button>
        </footer>
      </div>
    </div>
  );
}

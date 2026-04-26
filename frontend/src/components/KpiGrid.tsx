import type { AIIntent, MicroImpact } from "../types/api";
import { STATE_LABELS } from "./labels";

interface Props {
  signalCount: number;
  intent: AIIntent | null;
  latencyMs: number;
}

function formatKpi(impact: MicroImpact | null): string {
  if (!impact) return "—";
  if (impact.monthlyCadLow != null && impact.monthlyCadHigh != null) {
    return `+$${impact.monthlyCadLow} - +$${impact.monthlyCadHigh}`;
  }
  if (impact.oneTimeCadLow != null && impact.oneTimeCadHigh != null) {
    return `+$${impact.oneTimeCadLow} - +$${impact.oneTimeCadHigh}`;
  }
  return "Plan";
}

export function KpiGrid({ signalCount, intent, latencyMs }: Props) {
  return (
    <section className="kpi-grid" aria-label="Top metrics">
      <article className="kpi-card">
        <span>Signals</span>
        <strong>{signalCount}</strong>
        <small>Reviewed now</small>
      </article>
      <article className="kpi-card">
        <span>Budget change</span>
        <strong>{formatKpi(intent?.impact ?? null)}</strong>
        <small>CAD estimate</small>
      </article>
      <article className="kpi-card">
        <span>Decision</span>
        <strong>{intent ? STATE_LABELS[intent.state] : "Idle"}</strong>
        <small>Human gate</small>
      </article>
      <article className="kpi-card">
        <span>Readiness</span>
        <strong>{latencyMs}ms</strong>
        <small>Adapter check</small>
      </article>
    </section>
  );
}

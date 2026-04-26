import type { AIIntent, MicroImpact } from "../types/api";
import { AskAboutThis } from "./AskAboutThis";
import { CATEGORY_LABELS, severityFromConfidence } from "./labels";

interface Props {
  intent: AIIntent | null;
  pending: boolean;
  onAction: (action: "approve" | "snooze" | "reject") => void;
  onAsk: (prefill: string) => void;
}

function formatImpact(impact: MicroImpact): string {
  if (impact.monthlyCadLow != null && impact.monthlyCadHigh != null) {
    return `+$${impact.monthlyCadLow} - +$${impact.monthlyCadHigh} / month`;
  }
  if (impact.oneTimeCadLow != null && impact.oneTimeCadHigh != null) {
    return `+$${impact.oneTimeCadLow} - +$${impact.oneTimeCadHigh} one-time`;
  }
  return "Planning alert";
}

export function ActiveAlertCard({ intent, pending, onAction, onAsk }: Props) {
  if (!intent) {
    return (
      <article id="active-intent" className="card alert-card" aria-live="polite">
        <div className="alert-body">
          <h2>No active alert</h2>
          <p>Approve or seed a scenario from the rail.</p>
        </div>
      </article>
    );
  }

  const severity = severityFromConfidence(intent.signal.confidence);
  const preview = (intent.impact.assumptions[0] || "")
    .replace("Calculator: ", "")
    .replace(/\.$/, "");

  return (
    <article id="active-intent" className="card alert-card" aria-live="polite">
      <div className="card-head">
        <div>
          <span className="badge">
            {intent.signal.source} ({intent.signal.origin})
          </span>
          <span className="badge badge-warning">
            {CATEGORY_LABELS[intent.signal.category] || intent.signal.category}
          </span>
        </div>
        <div
          className="severity"
          id="severity-chip"
          data-severity={severity.toLowerCase()}
        >
          <span></span>
          <strong>{severity}</strong>
        </div>
      </div>

      <div className="alert-body">
        <div>
          <h2>{intent.signal.title}</h2>
          <p>{intent.narrative.causalChain}</p>
        </div>
        <svg className="stock-arrow" viewBox="0 0 120 74" aria-hidden="true">
          <path d="M8 60 35 38l19 11 39-37" />
          <path d="M76 12h17v17" />
        </svg>
      </div>

      <div className="impact-console">
        <span>Estimated budget change</span>
        <strong>{formatImpact(intent.impact)}</strong>
      </div>

      <div className="mini-grid">
        <div className="mini-panel">
          <span>Suggested next step</span>
          <strong>{intent.narrative.recommendedAction}</strong>
        </div>
        <div className="mini-panel">
          <span>Calculation</span>
          <strong>{preview || "—"}</strong>
        </div>
      </div>

      <div className="action-row">
        <button
          className="button button-primary"
          type="button"
          disabled={pending}
          onClick={() => onAction("approve")}
        >
          Approve
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => onAction("snooze")}
        >
          Later
        </button>
        <button
          className="button button-quiet"
          type="button"
          disabled={pending}
          onClick={() => onAction("reject")}
        >
          Dismiss
        </button>
        <AskAboutThis prefill="Tell me more about this alert." onAsk={onAsk} />
      </div>
    </article>
  );
}

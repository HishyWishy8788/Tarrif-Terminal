import type { AuditEntry, IntentState } from "../types/api";
import { STATE_LABELS, relativeTime } from "./labels";

interface Props {
  auditLog: AuditEntry[];
}

export function ApprovalGuardCard({ auditLog }: Props) {
  const items = [...auditLog].slice(-5).reverse();
  return (
    <article id="route-guard" className="card guard-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Root Guard AI</p>
          <h2>Approval guard</h2>
        </div>
        <span className="api-status guard">Human gate</span>
      </div>
      <div className="guard-visual" aria-hidden="true">
        <span></span>
        <strong>No silent action</strong>
      </div>
      <ol className="transaction-list" id="transaction-list">
        {items.map((entry, idx) => {
          const state: IntentState =
            entry.event === "CREATED"
              ? "PENDING"
              : (entry.event.replace("STATE_", "") as IntentState);
          return (
            <li key={`${entry.ts}-${idx}`} data-state={state}>
              <div>
                <strong>{entry.event}</strong>
                <span>{entry.note || relativeTime(entry.ts)}</span>
              </div>
              <span className="api-status">{STATE_LABELS[state] || state}</span>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

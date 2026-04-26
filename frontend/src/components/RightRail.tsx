import { ANALYSTS, AUDIT_HISTORY, type ViewKey } from "../data/mocks";
import { InlineChat } from "./InlineChat";

interface Props {
  view: ViewKey;
}

export function RightRail({ view }: Props) {
  return (
    <aside className="rail" aria-label="Live signal insights">
      <div className="rail-section">
        <div className="rail-section-head">
          <h3>Live Signal Insights</h3>
          <small className="pill-live" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Live Hub</small>
        </div>
        <div className="rail-insights">
          {ANALYSTS.map((a) => (
            <article key={a.name} className="insight-item">
              <div className="insight-head">
                <span className={`insight-avatar tone-${a.avatarTone}`} aria-hidden="true">
                  {a.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
                <div className="insight-meta">
                  <strong>{a.name}</strong>
                  <small>{a.role}</small>
                </div>
              </div>
              <p className="insight-quote">"{a.note}"</p>
              <div className="insight-foot">
                <span>Confidence</span>
                <span className="insight-confidence">{a.confidence}%</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-section-head">
          <h3>Audit History</h3>
          <small>Read-only · no automated actions</small>
        </div>
        <div className="audit-list">
          {AUDIT_HISTORY.map((a, i) => (
            <div key={i} className="audit-item">
              <span className={`audit-who tone-${a.tone}`}>{a.who}</span>
              <span className="audit-what">{a.what}</span>
              <span className="audit-when">{a.when}</span>
            </div>
          ))}
        </div>
      </div>

      <InlineChat view={view} />
    </aside>
  );
}

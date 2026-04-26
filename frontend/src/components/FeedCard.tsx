import type { SignalOrigin, WorldSignal } from "../types/api";
import { CATEGORY_LABELS, relativeTime, severityFromConfidence } from "./labels";

interface Props {
  origin: SignalOrigin;
  title: string;
  eyebrow: string;
  apiBadge: string;
  cardId: string;
  signals: WorldSignal[];
}

export function FeedCard({ title, eyebrow, apiBadge, cardId, signals }: Props) {
  return (
    <article id={cardId} className="card feed-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="api-status live">{apiBadge}</span>
      </div>
      <div className="feed-list">
        {signals.slice(0, 2).map((signal) => (
          <article key={signal.id} className="feed-item">
            <div className="feed-meta">
              <span>{CATEGORY_LABELS[signal.category] || signal.category}</span>
              <span>
                {signal.source} / {relativeTime(signal.ts)}
              </span>
            </div>
            <h3>{signal.title}</h3>
            <p>{signal.snippet || ""}</p>
            <div className="feed-impact">
              <span>Signal</span>
              <strong>{severityFromConfidence(signal.confidence)}</strong>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

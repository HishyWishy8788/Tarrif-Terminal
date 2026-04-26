import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import {
  CATEGORY_LABELS,
  CATEGORY_TONES,
  relativeTime,
  sentimentLabel,
} from "../components/labels";
import { ECON_CALENDAR, SIGNAL_WEIGHTS } from "../data/mocks";

const NewsIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 3h18v6H3zM3 13h18v8H3z" />
    <path d="M7 6h.01M7 17h.01" />
  </svg>
);

export function EconomicScreen() {
  const globalQ = useQuery({
    queryKey: ["feed", "GLOBAL"],
    queryFn: () => api.feed("GLOBAL"),
  });

  const items = (globalQ.data ?? []).slice(0, 6);
  const count = globalQ.data?.length ?? 0;

  return (
    <div>
      <SectionHeader
        icon={NewsIcon}
        title="Economic News"
        subtitle="Macro signals translated into household budget impacts"
        pill={`${count} live signals`}
        pillLive
      />

      <div className="grid12">
        <article className="card col-8">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Live macro feed</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Headline tape · household-relevant
            </span>
          </div>
          {globalQ.isLoading ? (
            <p style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "var(--text-mute)", fontSize: 12 }}>
              No global signals on the feed.
            </p>
          ) : (
            <div className="econ-feed-list">
              {items.map((s) => {
                const tone = CATEGORY_TONES[s.category];
                const sentiment = sentimentLabel(s.category, s.confidence);
                return (
                  <article key={s.id} className={`econ-feed-item tone-${tone}`}>
                    <span className="econ-region">{s.source.slice(0, 3).toUpperCase()}</span>
                    <div className="econ-feed-body">
                      <strong>{s.title}</strong>
                      <small>
                        {CATEGORY_LABELS[s.category]} · {s.snippet || s.rationale}
                      </small>
                    </div>
                    <div className="econ-feed-meta">
                      <span className={`econ-sentiment tone-${tone}`}>{sentiment}</span>
                      <span className="econ-when">{relativeTime(s.ts)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <article className="card">
            <div className="card-row" style={{ marginBottom: 12 }}>
              <h2 className="card-title">Active signal weighting</h2>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Filtered by your exposure</span>
            </div>
            <div className="weights-list">
              {SIGNAL_WEIGHTS.map((w) => (
                <ProgressBar key={w.label} label={w.label} value={w.value} tone={w.tone} />
              ))}
            </div>
          </article>

          <article className="card">
            <div className="card-row" style={{ marginBottom: 12 }}>
              <h2 className="card-title">Upcoming calendar</h2>
            </div>
            <div className="calendar-list">
              {ECON_CALENDAR.map((c, i) => (
                <div key={i} className="calendar-item">
                  <small>{c.when}</small>
                  <strong>{c.what}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

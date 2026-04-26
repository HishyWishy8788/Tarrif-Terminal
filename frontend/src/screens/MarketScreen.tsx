import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { CATEGORY_LABELS, CATEGORY_TONES, relativeTime } from "../components/labels";
import { MARKET_TAPE } from "../data/mocks";

const TickerIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 3v18h18" />
    <path d="m7 14 4-4 4 4 5-6" />
  </svg>
);

export function MarketScreen() {
  const marketQ = useQuery({
    queryKey: ["feed", "MARKET"],
    queryFn: () => api.feed("MARKET"),
  });

  const items = marketQ.data ?? [];

  return (
    <div>
      <SectionHeader
        icon={TickerIcon}
        title="Market News"
        subtitle="Commodities, FX, and equities that move household line items"
        pill="Live tape"
        pillLive
      />

      <div className="tape">
        {MARKET_TAPE.map((t) => (
          <div key={t.sym} className="tape-cell">
            <div className="tape-sym">{t.sym}</div>
            <div className="tape-name">{t.name}</div>
            <div className="tape-px">{t.px}</div>
            <div className={`tape-chg ${t.dir}`}>
              {t.dir === "up" ? "▲" : "▼"} {t.chg}
            </div>
          </div>
        ))}
      </div>

      {marketQ.isLoading ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading market signals…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12 }}>
          No market signals on the feed.
        </p>
      ) : (
        <div className="market-cards">
          {items.map((s) => (
            <article key={s.id} className="card market-card hoverable">
              <span className={`tone-chip tone-${CATEGORY_TONES[s.category]}`}>
                {CATEGORY_LABELS[s.category]}
              </span>
              <h3>{s.title}</h3>
              <span className="market-card-impact">
                {s.snippet || s.rationale}
              </span>
              <div className="feed-card-foot" style={{ marginTop: "auto" }}>
                <span className="feed-card-impact">{s.source}</span>
                <span className="feed-card-value up">
                  {Math.round(s.confidence * 100)}% · {relativeTime(s.ts)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

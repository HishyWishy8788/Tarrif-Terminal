import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { LiveDigit } from "../components/LiveDigit";
import { SectionHeader } from "../components/SectionHeader";
import { CATEGORY_LABELS, CATEGORY_TONES, relativeTime } from "../components/labels";
import { useLiveData } from "../hooks/useLiveData";
import { MARKET_TAPE } from "../data/mocks";

const TickerIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 3v18h18" />
    <path d="m7 14 4-4 4 4 5-6" />
  </svg>
);

const TICKER_BASELINES: Record<string, number> = {
  WTI: 84.32,
  USDCAD: 1.41,
  TSX: 21884.0,
  Wheat: 6.42,
  Gold: 2378.0,
};

function formatPx(sym: string, n: number): string {
  if (sym === "TSX") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (sym === "USDCAD") return n.toFixed(4);
  return `$${n.toFixed(2)}`;
}

function pct(curr: number, base: number): { value: number; dir: "up" | "down" } {
  const v = ((curr - base) / base) * 100;
  return { value: v, dir: v >= 0 ? "up" : "down" };
}

export function MarketScreen() {
  const marketQ = useQuery({
    queryKey: ["feed", "MARKET"],
    queryFn: () => api.feed("MARKET"),
    refetchInterval: 30_000,
  });
  const liveQ = useLiveData();

  const items = marketQ.data ?? [];
  const live = liveQ.data;
  const livePrices = live?.tickerPrices ?? {};

  return (
    <div>
      <SectionHeader
        icon={TickerIcon}
        title="Market News"
        subtitle={
          live
            ? `${live.headlineCount} headlines tracked · tape moves on news pressure`
            : "Commodities, FX, and equities that move household line items"
        }
        pill="Live tape"
        pillLive
      />

      <div className="tape">
        {MARKET_TAPE.map((t) => {
          const curr = livePrices[t.sym] ?? TICKER_BASELINES[t.sym] ?? Number(t.px.replace(/[$,]/g, ""));
          const base = TICKER_BASELINES[t.sym] ?? curr;
          const change = pct(curr, base);
          return (
            <div key={t.sym} className="tape-cell">
              <div className="tape-sym">{t.sym}</div>
              <div className="tape-name">{t.name}</div>
              <div className="tape-px">
                <LiveDigit value={curr} format={(n) => formatPx(t.sym, n)} />
              </div>
              <div className={`tape-chg ${change.dir}`}>
                {change.dir === "up" ? "▲" : "▼"}{" "}
                <LiveDigit
                  value={change.value}
                  format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {marketQ.isLoading ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading market signals…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12 }}>
          No market signals on the feed.
        </p>
      ) : (
        <div className="market-cards">
          {items.slice(0, 12).map((s) => (
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

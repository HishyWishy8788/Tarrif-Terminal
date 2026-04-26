const SOURCES = [
  { name: "NewsAPI", role: "Global headlines", status: "Ready", health: 92 },
  { name: "GDELT", role: "World events at scale", status: "Dedupe", health: 87 },
  { name: "Finnhub", role: "Market news", status: "Ready", health: 95 },
  { name: "Alpha Vantage", role: "Macro and market feed", status: "Limited", health: 78 },
];

export function SourcesCard() {
  return (
    <article className="card sources-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Foundation</p>
          <h2>Data sources</h2>
        </div>
        <span className="api-status">Map</span>
      </div>
      <div className="source-grid">
        {SOURCES.map((source) => (
          <article key={source.name} className="source-card">
            <header>
              <div>
                <strong>{source.name}</strong>
                <small>{source.role}</small>
              </div>
              <span className="api-status">{source.status}</span>
            </header>
            <div
              className="source-meter"
              aria-label={`${source.name} readiness ${source.health}%`}
            >
              <span style={{ width: `${source.health}%` }}></span>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

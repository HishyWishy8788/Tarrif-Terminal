const ENGINE_ROWS = [
  { formula: "Groceries", channel: "Imported grocery basket", output: "$38 - $74/mo" },
  { formula: "Fuel", channel: "Pump price x commute distance", output: "$9 - $22/mo" },
  { formula: "Repairs", channel: "Parts tariff pass-through", output: "$120 - $270 once" },
];

export function EngineCard() {
  return (
    <article className="card engine-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Foundation</p>
          <h2>Impact engine</h2>
        </div>
        <span className="api-status live">Rules</span>
      </div>
      <div className="engine-stack">
        {ENGINE_ROWS.map((row) => (
          <div key={row.formula} className="engine-row">
            <div>
              <strong>{row.formula}</strong>
              <span>{row.channel}</span>
            </div>
            <strong>{row.output}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

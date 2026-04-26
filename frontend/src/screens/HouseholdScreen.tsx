import { SectionHeader } from "../components/SectionHeader";
import { ACCOUNTS, ENVELOPES, HEATING, SUBS } from "../data/mocks";

const HouseIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
  </svg>
);

export function HouseholdScreen() {
  const usdSubs = SUBS.filter((s) => s.ccy === "USD").reduce((a, b) => a + b.mo, 0);

  return (
    <div>
      <SectionHeader
        icon={HouseIcon}
        title="Household"
        subtitle="Accounts, budget envelopes, and recurring exposure"
        pill="4 accounts synced"
      />

      <div className="grid12">
        <article className="card col-6">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Linked accounts</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Plaid synced · 2m ago</span>
          </div>
          <div className="account-list">
            {ACCOUNTS.map((a) => (
              <div key={a.name} className="account-item">
                <small>{a.kind}</small>
                <strong>{a.name}</strong>
                <span className={`account-value${a.value.startsWith("−") ? " neg" : ""}`}>
                  {a.value}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="card col-6">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Budget envelopes · this month</h2>
          </div>
          <div className="envelope-list">
            {ENVELOPES.map((e) => {
              const pct = Math.min(100, Math.round((e.spent / e.cap) * 100));
              const tone = pct >= 90 ? "rose" : pct >= 75 ? "amber" : "mint";
              return (
                <div key={e.cat} className="envelope-item">
                  <div className="envelope-item-head">
                    <strong>{e.cat}</strong>
                    <span>
                      ${e.spent} <span className="cap">/ ${e.cap}</span>
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card col-7">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Recurring · USD subscription exposure</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>FX-sensitive</span>
          </div>
          <div className="subs-list">
            {SUBS.map((s) => (
              <div key={s.name} className="subs-item">
                <strong style={{ fontSize: 13 }}>{s.name}</strong>
                <span className="ccy">{s.ccy}</span>
                <span className="amt">${s.mo.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
          <div className="subs-foot">
            <span>FX-sensitive total</span>
            <strong>≈ CAD {usdSubs.toFixed(2)}/mo</strong>
          </div>
        </article>

        <article className="card col-5">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Heating profile</h2>
          </div>
          <div className="heating-list">
            {HEATING.map((h) => (
              <div key={h.kind} className="heating-item">
                <strong>{h.kind}</strong>
                <small>{h.note}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

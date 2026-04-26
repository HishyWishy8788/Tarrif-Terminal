import { DEFAULT_ALERT_TEXT, SCENARIOS, type ScenarioKey } from "../data/mocks";

interface Props {
  scenario: ScenarioKey;
}

export function ScenarioBanner({ scenario }: Props) {
  const active = SCENARIOS.find((s) => s.key === scenario);
  const tone = active?.tone ?? "amber";
  const text = active ? active.bannerText : `Alert: ${DEFAULT_ALERT_TEXT}`;
  const label = active ? "Scenario:" : "Alert:";

  return (
    <div className={`scenario-banner tone-${tone}`} role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <strong style={{ fontWeight: 700 }}>{label}</strong>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {text.replace(/^Scenario active:\s*/, "")}
      </span>
      <div className="scenario-banner-actions">
        <button type="button" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
        <button type="button" aria-label="Settings" title="Settings">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </button>
      </div>
    </div>
  );
}

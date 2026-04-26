import { SCENARIOS, type ScenarioKey, type ViewKey } from "../data/mocks";

interface NavDef {
  id: ViewKey;
  label: string;
  icon: JSX.Element;
}

const NAV: NavDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 12h7V3H3zM14 21h7v-9h-7zM14 10h7V3h-7zM3 21h7v-7H3z" />
      </svg>
    ),
  },
  {
    id: "economic",
    label: "Economic News API",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 3h18v6H3zM3 13h18v8H3z" />
        <path d="M7 6h.01M7 17h.01" />
      </svg>
    ),
  },
  {
    id: "market",
    label: "Market News API",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 4 5-6" />
      </svg>
    ),
  },
  {
    id: "household",
    label: "Household",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

interface Props {
  active: ViewKey;
  onNavigate: (id: ViewKey) => void;
  scenario: ScenarioKey;
  onScenario: (k: ScenarioKey) => void;
}

export function Sidebar({ active, onNavigate, scenario, onScenario }: Props) {
  return (
    <aside className="sidebar" aria-label="Tariff navigation">
      <div className="sidebar-brand">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">T</span>
          <h1>TARIFF</h1>
        </div>
        <small>Household Terminal</small>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Primary">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${item.id === active ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={item.id === active ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Demo scenarios</div>
        <div className="scenario-list" role="group" aria-label="Demo scenarios">
          {SCENARIOS.map((s) => {
            const isActive = s.key === scenario;
            return (
              <button
                key={s.key}
                type="button"
                className={`scenario-chip tone-${s.tone}${isActive ? " active" : ""}`}
                onClick={() => onScenario(isActive ? "none" : s.key)}
                aria-pressed={isActive}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-spacer" />

      <div className="user-card">
        <span className="user-avatar" aria-hidden="true">HU</span>
        <div className="user-card-meta">
          <strong>Household User</strong>
          <small>Demo Mode</small>
        </div>
      </div>
    </aside>
  );
}

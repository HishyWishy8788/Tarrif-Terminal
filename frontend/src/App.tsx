import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { OnboardingDrawer } from "./components/OnboardingDrawer";
import { RightRail } from "./components/RightRail";
import { ScenarioBanner } from "./components/ScenarioBanner";
import { Sidebar } from "./components/Sidebar";
import { SCENARIOS, type ScenarioKey, type ViewKey } from "./data/mocks";
import { DashboardScreen } from "./screens/DashboardScreen";
import { EconomicScreen } from "./screens/EconomicScreen";
import { HouseholdScreen } from "./screens/HouseholdScreen";
import { MarketScreen } from "./screens/MarketScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

export function App() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [scenario, setScenario] = useState<ScenarioKey>("none");

  const seedM = useMutation({
    mutationFn: (s: "food" | "fuel" | "repairs" | "labor") => api.seed(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activeIntent"] }),
  });

  const onScenario = (k: ScenarioKey) => {
    setScenario(k);
    if (k === "none") return;
    const meta = SCENARIOS.find((s) => s.key === k);
    if (meta?.backendSeed) seedM.mutate(meta.backendSeed);
  };

  return (
    <div className="app-shell">
      <Sidebar
        active={view}
        onNavigate={setView}
        scenario={scenario}
        onScenario={onScenario}
      />

      <main className="app-main">
        <ScenarioBanner scenario={scenario} />
        <div className="app-content">
          {view === "dashboard" && <DashboardScreen scenario={scenario} />}
          {view === "economic" && <EconomicScreen />}
          {view === "market" && <MarketScreen />}
          {view === "household" && <HouseholdScreen />}
          {view === "profile" && <ProfileScreen />}
        </div>
      </main>

      <RightRail view={view} />
      <OnboardingDrawer />
    </div>
  );
}

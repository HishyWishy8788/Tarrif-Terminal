import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { SeedKey } from "../types/api";
import { UserMenu } from "../auth/UserMenu";
import { ActiveAlertCard } from "./ActiveAlertCard";
import { ApprovalGuardCard } from "./ApprovalGuardCard";
import { ChatBubble } from "./ChatBubble";
import { ChatPanel } from "./ChatPanel";
import { EngineCard } from "./EngineCard";
import { FeedCard } from "./FeedCard";
import { KpiGrid } from "./KpiGrid";
import { ProfileCard } from "./ProfileCard";
import { SeedRail, deriveActiveSeed } from "./SeedRail";
import { SourcesCard } from "./SourcesCard";

export function Dashboard() {
  const qc = useQueryClient();
  const [latencyMs, setLatencyMs] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const openChat = (prefill?: string) => {
    setChatPrefill(prefill ?? null);
    setChatOpen(true);
  };

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const globalQ = useQuery({
    queryKey: ["feed", "GLOBAL"],
    queryFn: () => api.feed("GLOBAL"),
  });
  const marketQ = useQuery({
    queryKey: ["feed", "MARKET"],
    queryFn: () => api.feed("MARKET"),
  });
  const activeQ = useQuery({
    queryKey: ["activeIntent"],
    queryFn: api.activeIntent,
  });

  const signalCount = (globalQ.data?.length ?? 0) + (marketQ.data?.length ?? 0);
  const activeSeed: SeedKey = useMemo(
    () => deriveActiveSeed(activeQ.data?.signal.category),
    [activeQ.data],
  );

  const seedM = useMutation({
    mutationFn: (seed: SeedKey) => api.seed(seed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activeIntent"] }),
  });

  const transitionM = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "snooze" | "reject";
    }) => {
      if (action === "approve") return api.approve(id);
      if (action === "reject") return api.reject(id);
      return api.snooze(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activeIntent"] }),
  });

  const refreshAll = async () => {
    const t0 = performance.now();
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["profile"] }),
      qc.invalidateQueries({ queryKey: ["feed", "GLOBAL"] }),
      qc.invalidateQueries({ queryKey: ["feed", "MARKET"] }),
      qc.invalidateQueries({ queryKey: ["activeIntent"] }),
    ]);
    setLatencyMs(Math.round(performance.now() - t0));
  };

  useEffect(() => {
    if (
      !profileQ.isLoading &&
      !globalQ.isLoading &&
      !marketQ.isLoading &&
      !activeQ.isLoading &&
      latencyMs === 0
    ) {
      setLatencyMs(184);
    }
  }, [profileQ.isLoading, globalQ.isLoading, marketQ.isLoading, activeQ.isLoading, latencyMs]);

  const onAction = (action: "approve" | "snooze" | "reject") => {
    if (!activeQ.data) return;
    transitionM.mutate({ id: activeQ.data.id, action });
  };

  return (
    <div className="dashboard-frame">
      <aside className="rail" aria-label="Tariff navigation and demo controls">
        <a className="brand" href="#app" aria-label="Tariff dashboard">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36">
              <path d="M6 26V10h7v16H6Zm9 0V6h7v20h-7Zm9 0V15h7v11h-7Z" />
            </svg>
          </span>
          <span>Tariff</span>
        </a>

        <div className="rail-status">
          <span>Household mode</span>
          <strong>Khan demo</strong>
          <small>Rent, commute, groceries, fuel</small>
        </div>

        <SeedRail
          activeSeed={activeSeed}
          onSelect={(seed) => seedM.mutate(seed)}
        />

        <section className="rail-card" aria-label="Dashboard reliability">
          <span>System status</span>
          <strong>96%</strong>
          <div className="meter">
            <span style={{ width: "96%" }}></span>
          </div>
          <small>Demo data. API contracts ready.</small>
        </section>
      </aside>

      <main id="app" className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Household financial early warning</p>
            <h1>Risk dashboard</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={refreshAll}
            >
              Update
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={!activeQ.data || transitionM.isPending}
              onClick={() => onAction("approve")}
            >
              Approve next step
            </button>
            <UserMenu />
          </div>
        </header>

        <section className="board-grid" aria-label="One-screen dashboard blocks">
          <ActiveAlertCard
            intent={activeQ.data ?? null}
            pending={transitionM.isPending}
            onAction={onAction}
            onAsk={openChat}
          />
          <ApprovalGuardCard auditLog={activeQ.data?.auditLog ?? []} />
          <KpiGrid
            signalCount={signalCount}
            intent={activeQ.data ?? null}
            latencyMs={latencyMs}
          />
          <FeedCard
            origin="GLOBAL"
            title="World news"
            eyebrow="Global"
            apiBadge="NewsAPI"
            cardId="news-widget"
            signals={globalQ.data ?? []}
          />
          <FeedCard
            origin="MARKET"
            title="Market news"
            eyebrow="Markets"
            apiBadge="Finnhub"
            cardId="market-widget"
            signals={marketQ.data ?? []}
          />
          <ProfileCard profile={profileQ.data ?? null} />
          <EngineCard />
          <SourcesCard />
        </section>
      </main>

      <ChatBubble onOpen={() => openChat()} />
      <ChatPanel
        open={chatOpen}
        prefill={chatPrefill}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

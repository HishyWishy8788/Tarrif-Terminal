import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import {
  CATEGORY_LABELS,
  CATEGORY_TONES,
  relativeTime,
  sentimentLabel,
} from "../components/labels";
import { useLiveData } from "../hooks/useLiveData";
import { ECON_CALENDAR } from "../data/mocks";
import type { Tone } from "../data/mocks";

const NewsIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 3h18v6H3zM3 13h18v8H3z" />
    <path d="M7 6h.01M7 17h.01" />
  </svg>
);

function regionFromSource(source: string): string {
  const lower = source.toLowerCase();
  if (lower.includes("toronto") || lower.includes("cbc") || lower.includes("globe") || lower.includes("financial post") || lower.includes("bnn") || lower.includes("nugget") || lower.includes("cp24")) return "CA";
  if (lower.includes("bbc") || lower.includes("guardian") || lower.includes("reuters")) return "UK";
  return source.slice(0, 3).toUpperCase();
}

export function EconomicScreen() {
  const qc = useQueryClient();
  const liveQ = useLiveData();
  const globalQ = useQuery({
    queryKey: ["feed", "GLOBAL"],
    queryFn: () => api.feed("GLOBAL"),
    refetchInterval: 30_000,
  });
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const refreshM = useMutation({
    mutationFn: api.refreshNews,
    onSuccess: (r) => {
      setRefreshMsg(`Pulled ${r.count} signals in ${r.elapsedMs}ms`);
      qc.invalidateQueries({ queryKey: ["feed", "GLOBAL"] });
      qc.invalidateQueries({ queryKey: ["feed", "MARKET"] });
      qc.invalidateQueries({ queryKey: ["liveSnapshot"] });
      window.setTimeout(() => setRefreshMsg(null), 4000);
    },
    onError: (e) => setRefreshMsg(`Refresh failed: ${(e as Error).message}`),
  });

  const items = (globalQ.data ?? []).slice(0, 12);
  const count = globalQ.data?.length ?? 0;
  const live = liveQ.data;

  // Pressure-driven signal weighting: real backend pressure scores per category.
  const weights = live
    ? Object.entries(live.pressureByCategory)
        .map(([cat, raw]) => ({
          label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
          // Map raw pressure (0..N) to a 0..100 percent for the bar.
          value: Math.min(100, Math.round((raw / 20) * 100)),
          tone: (CATEGORY_TONES[cat as keyof typeof CATEGORY_TONES] ?? "muted") as Tone,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div>
      <SectionHeader
        icon={NewsIcon}
        title="Economic News"
        subtitle="Live macro signals from GNews · categorized into household impact"
        pill={`${count} live signals`}
        pillLive
      />

      <div className="grid12">
        <article className="card col-8">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Live macro feed</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {refreshMsg && (
                <span style={{ fontSize: 11, color: "var(--emerald-bright)" }}>{refreshMsg}</span>
              )}
              <button
                type="button"
                className="btn btn-quiet"
                disabled={refreshM.isPending}
                onClick={() => refreshM.mutate()}
              >
                {refreshM.isPending ? "Pulling…" : "Refresh now"}
              </button>
            </div>
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
                    <span className="econ-region">{regionFromSource(s.source)}</span>
                    <div className="econ-feed-body">
                      <strong>{s.title}</strong>
                      <small>
                        {CATEGORY_LABELS[s.category]} · {(s.snippet || s.rationale).slice(0, 140)}
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
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {live ? "Live pressure" : "Filtered by your exposure"}
              </span>
            </div>
            <div className="weights-list">
              {weights.length === 0 ? (
                <p style={{ color: "var(--text-mute)", fontSize: 12 }}>Warming up…</p>
              ) : (
                weights.map((w) => (
                  <ProgressBar key={w.label} label={w.label} value={w.value} tone={w.tone} />
                ))
              )}
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

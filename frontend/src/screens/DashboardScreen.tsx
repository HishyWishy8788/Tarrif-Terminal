import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { LiveDigit } from "../components/LiveDigit";
import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import { CATEGORY_LABELS, CATEGORY_TONES, relativeTime } from "../components/labels";
import { useLiveData } from "../hooks/useLiveData";
import {
  EXPOSURE_VECTORS,
  GUARDRAIL_CONFIDENCE,
  SCENARIOS,
  type ScenarioKey,
} from "../data/mocks";
import type { AIIntent, WaveSample, WorldSignal } from "../types/api";

interface Props {
  scenario: ScenarioKey;
}

const HouseholdIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
  </svg>
);

function impactNumeric(
  intent: AIIntent | null,
  scenario: ScenarioKey,
  liveHigh: number | null,
): number {
  if (scenario === "boc-cut") return -48;
  if (scenario === "cad-weakens") return 31;
  if (scenario === "heating-oil") return 210;
  if (liveHigh != null) return liveHigh;
  if (intent?.impact.monthlyCadHigh != null) return intent.impact.monthlyCadHigh;
  if (intent?.impact.oneTimeCadHigh != null) return intent.impact.oneTimeCadHigh;
  return 0;
}

function buildWavePath(samples: WaveSample[], width = 400, height = 200): string {
  if (samples.length === 0) {
    return "M0,140 C60,90 110,180 180,120 C240,70 300,150 400,100";
  }
  const xs = samples.map((_, i) => (i / Math.max(1, samples.length - 1)) * width);
  const values = samples.map((s) => s.value);
  const max = Math.max(1, ...values);
  // Map value high→low to y low→high (inverted, with 30% headroom on top)
  const ys = values.map((v) => height - (v / max) * (height * 0.7) - 16);
  // Smoothed Catmull-Rom-ish path via simple bezier control points
  const segments: string[] = [];
  for (let i = 1; i < xs.length; i++) {
    const prev = i === 0 ? 0 : i - 1;
    const cx1 = (xs[prev] + xs[i]) / 2;
    const cy1 = ys[prev];
    const cx2 = cx1;
    const cy2 = ys[i];
    segments.push(`C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`);
  }
  return `M${xs[0].toFixed(1)},${ys[0].toFixed(1)} ${segments.join(" ")}`;
}

function impactLabel(scenario: ScenarioKey): string {
  if (scenario === "boc-cut") return "Estimated Monthly Savings";
  if (scenario === "heating-oil") return "Estimated One-time Variance";
  return "Estimated Monthly Variance";
}

function impactSupport(intent: AIIntent | null, scenario: ScenarioKey): string {
  if (scenario === "boc-cut")
    return "Variable mortgage saves ≈ $48/mo if the median 25bps cut path holds.";
  if (scenario === "cad-weakens")
    return "USD-priced subscriptions and US-sourced goods absorb the FX move.";
  if (scenario === "heating-oil")
    return "Modeled winter fill cost vs last season. Pre-buy window closes in 9 days.";
  if (intent?.narrative.causalChain) return intent.narrative.causalChain;
  return "No active alert. Household exposure is currently neutral.";
}

function severityFoot(intent: AIIntent | null, scenario: ScenarioKey): string {
  if (scenario === "boc-cut") return "Low severity · Interest rates";
  if (scenario === "cad-weakens") return "Moderate severity · FX";
  if (scenario === "heating-oil") return "High severity · Energy";
  if (!intent) return "No active alert";
  const sev =
    intent.signal.confidence >= 0.75 ? "High" :
    intent.signal.confidence >= 0.55 ? "Moderate" : "Low";
  return `${sev} severity · ${CATEGORY_LABELS[intent.signal.category]}`;
}

function FeedCardFromSignal({ signal }: { signal: WorldSignal }) {
  return (
    <article className="card feed-card col-4 hoverable">
      <div className="feed-card-head">
        <span className="feed-card-source">{signal.source}</span>
        <span>{relativeTime(signal.ts)}</span>
      </div>
      <span className={`tone-chip tone-${CATEGORY_TONES[signal.category]}`}>
        {CATEGORY_LABELS[signal.category]}
      </span>
      <h3 className="feed-card-title">{signal.title}</h3>
      <div className="feed-card-foot">
        <span className="feed-card-impact">
          {signal.snippet || signal.rationale}
        </span>
        <span className="feed-card-value up">
          {Math.round(signal.confidence * 100)}%
        </span>
      </div>
    </article>
  );
}

export function DashboardScreen({ scenario }: Props) {
  const qc = useQueryClient();
  const activeQ = useQuery({
    queryKey: ["activeIntent"],
    queryFn: api.activeIntent,
  });
  const globalQ = useQuery({
    queryKey: ["feed", "GLOBAL"],
    queryFn: () => api.feed("GLOBAL"),
    refetchInterval: 30_000,
  });
  const marketQ = useQuery({
    queryKey: ["feed", "MARKET"],
    queryFn: () => api.feed("MARKET"),
    refetchInterval: 30_000,
  });
  const liveQ = useLiveData();

  const transitionM = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "reject" | "snooze";
    }) => {
      if (action === "approve") return api.approve(id);
      if (action === "reject") return api.reject(id);
      return api.snooze(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activeIntent"] }),
  });

  const onAction = (action: "approve" | "reject" | "snooze") => {
    if (!activeQ.data) return;
    transitionM.mutate({ id: activeQ.data.id, action });
  };

  const scenarioMeta = SCENARIOS.find((s) => s.key === scenario);
  const intent = activeQ.data ?? null;
  const live = liveQ.data ?? null;

  const liveHigh = live?.activeImpact.monthlyCadHigh
    ?? live?.activeImpact.oneTimeCadHigh
    ?? null;
  const wavePath = useMemo(
    () => buildWavePath(live?.waveSamples ?? []),
    [live?.waveSamples],
  );
  const impactNum = impactNumeric(intent, scenario, liveHigh);

  // Top 3 feed cards from real signals (mix global + market by recency).
  const feed = [...(globalQ.data ?? []), ...(marketQ.data ?? [])]
    .sort((a, b) => (a.ts > b.ts ? -1 : 1))
    .slice(0, 3);

  return (
    <div>
      <SectionHeader
        icon={HouseholdIcon}
        title="Household Impact"
        subtitle={
          live
            ? `${live.headlineCount} live headlines · pressure ×${live.activeImpact.multiplier.toFixed(2)}`
            : "Macro signals translated into household budget impacts"
        }
        pill={intent ? "Pending review" : "All clear"}
        pillLive
      />

      <div className="grid12">
        {/* Household Impact card */}
        <article className="card impact-card col-5">
          <div className="impact-head">
            <div>
              <p className="impact-eyebrow">Household Impact</p>
              <p className="impact-sub">{impactLabel(scenario)}</p>
            </div>
            <span className="impact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
              </svg>
            </span>
          </div>

          <div className="impact-value">
            <span aria-hidden>{impactNum < 0 ? "−" : "+"}$</span>
            <LiveDigit value={Math.abs(impactNum)} ariaLabel="Household impact in CAD" />
            <span className="impact-value-suffix">/mo</span>
          </div>

          <p className="impact-supporting">{impactSupport(intent, scenario)}</p>

          <div className="impact-foot">{severityFoot(intent, scenario)}</div>
        </article>

        {/* Exposure Vectors with wave */}
        <article className="card exposure-card col-7">
          <div className="exposure-head">
            <div>
              <p className="exposure-eyebrow">Exposure Vectors</p>
              <p className="exposure-title">90-day rolling window</p>
            </div>
            <span className="section-header-pill pill-live">Live</span>
          </div>

          <div className="exposure-wave" aria-hidden="true">
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="wave-breath">
              <defs>
                <linearGradient id="wave" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${wavePath} L400,200 L0,200 Z`} fill="url(#wave)" />
              <path d={wavePath} stroke="#34d399" strokeWidth="2" opacity="0.85" fill="none" />
            </svg>
          </div>

          <div className="exposure-grid">
            {EXPOSURE_VECTORS.map((v) => (
              <div key={v.label} className={`exposure-cell tone-${v.tone}`}>
                <small>{v.label}</small>
                <strong>+{v.pct.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </article>

        {/* AI Guardrail */}
        <article className="card guardrail-card col-12">
          <header className="guardrail-head">
            <div className="guardrail-head-left">
              <span className="guardrail-head-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 1 3 5v7c0 5 4 9 9 11 5-2 9-6 9-11V5z" />
                </svg>
              </span>
              <h2>AI Guardrail · Recommendation</h2>
            </div>
            <span className="guardrail-status">
              {intent ? "Pending your confirmation" : "No pending action"}
            </span>
          </header>

          <div className="guardrail-body">
            <div className="guardrail-recommendation">
              <h3>
                {scenarioMeta?.cardTitle ??
                  intent?.signal.title ??
                  "No active recommendation"}
              </h3>
              <p>
                {scenarioMeta?.cardBody ??
                  (intent
                    ? `${intent.narrative.causalChain} ${intent.narrative.recommendedAction}.`
                    : "Approve a scenario from the sidebar to populate a Route Guard recommendation.")}
              </p>
              <div className="guardrail-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!intent || transitionM.isPending}
                  onClick={() => onAction("approve")}
                >
                  Approve Action
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!intent || transitionM.isPending}
                  onClick={() => onAction("snooze")}
                >
                  Later
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  disabled={!intent || transitionM.isPending}
                  onClick={() => onAction("reject")}
                >
                  Dismiss
                </button>
              </div>
              <p style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)" }}>
                Nothing proceeds until you manually confirm
              </p>
            </div>

            <div className="guardrail-confidence">
              <div className="guardrail-confidence-eyebrow">Confidence factors</div>
              {GUARDRAIL_CONFIDENCE.map((c) => (
                <ProgressBar key={c.label} label={c.label} value={c.value} tone="mint" />
              ))}
            </div>
          </div>
        </article>

        {/* 3 mini feed cards from real signals */}
        {feed.length === 0 ? (
          <p className="card-subtle col-12" style={{ color: "var(--text-mute)" }}>
            Loading signals…
          </p>
        ) : (
          feed.map((s) => <FeedCardFromSignal key={s.id} signal={s} />)
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import { ADVISORY_NOTE, RISK_POSTURE, TOGGLES } from "../data/mocks";
import type { UserProfile } from "../types/api";

const UserIcon = (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

function housingLabel(p: UserProfile | undefined): string {
  if (!p) return "—";
  const t =
    p.housingType === "RENT"
      ? "Rent"
      : p.housingType === "OWN_OUTRIGHT"
      ? "Own outright"
      : "Other fixed cost";
  return `${t} · $${Math.round(p.monthlyHousingCad).toLocaleString()}/mo`;
}

export function ProfileScreen() {
  const [toggles, setToggles] = useState(TOGGLES);
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const p = profileQ.data;

  const flip = (idx: number) => {
    setToggles((prev) =>
      prev.map((t, i) => (i === idx && !t.locked ? { ...t, on: !t.on } : t)),
    );
  };

  return (
    <div>
      <SectionHeader
        icon={UserIcon}
        title="Profile"
        subtitle="Personal preferences, risk posture, and consent"
        pill={p ? `Profile · ${p.id}` : "Loading…"}
      />

      <div className="grid12">
        <article className="card col-7">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Household sensitivity</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Drives the impact engine
            </span>
          </div>
          {profileQ.isLoading ? (
            <p style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading profile…</p>
          ) : !p ? (
            <p style={{ color: "var(--rose-bright)", fontSize: 12 }}>
              Profile unavailable.
            </p>
          ) : (
            <div className="profile-meta">
              <div className="profile-row">
                <small>Income band</small>
                <strong>${p.incomeBand}</strong>
              </div>
              <div className="profile-row">
                <small>Housing</small>
                <strong>{housingLabel(p)}</strong>
              </div>
              <div className="profile-row">
                <small>Commute</small>
                <strong>{p.commuteKmPerWeek.toFixed(0)} km / week</strong>
              </div>
              <div className="profile-row">
                <small>Dependents</small>
                <strong>{p.dependents}</strong>
              </div>
              <div className="profile-row">
                <small>Sector</small>
                <strong>{p.sector}</strong>
              </div>
              <div className="profile-row">
                <small>Gig / variable income</small>
                <strong>{p.gigMode ? "Yes" : "No"}</strong>
              </div>
              <div className="profile-row" style={{ gridColumn: "span 2" }}>
                <small>Stress tags</small>
                <strong>{p.stressTags.join(" · ")}</strong>
              </div>
            </div>
          )}

          <div className="card-row" style={{ margin: "16px 0 12px" }}>
            <h2 className="card-title">Risk posture</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Modeled · not yet persisted
            </span>
          </div>
          <div className="weights-list">
            {RISK_POSTURE.map((r) => (
              <ProgressBar key={r.label} label={r.label} value={r.value} tone={r.tone} />
            ))}
          </div>
        </article>

        <article className="card col-5">
          <div className="card-row" style={{ marginBottom: 12 }}>
            <h2 className="card-title">Permissions</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              Manual confirm only
            </span>
          </div>
          <div className="toggle-list">
            {toggles.map((t, i) => (
              <div key={t.label} className="toggle-row">
                <span>{t.label}</span>
                <button
                  type="button"
                  className={`toggle${t.on ? " on" : ""}${t.locked ? " locked" : ""}`}
                  aria-pressed={t.on}
                  aria-label={t.label}
                  onClick={() => flip(i)}
                  disabled={t.locked}
                />
              </div>
            ))}
          </div>
          <p className="advisory-note">{ADVISORY_NOTE}</p>
        </article>
      </div>
    </div>
  );
}

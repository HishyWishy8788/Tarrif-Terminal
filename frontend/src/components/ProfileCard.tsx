import type { UserProfile } from "../types/api";

interface Props {
  profile: UserProfile | null;
}

export function ProfileCard({ profile }: Props) {
  return (
    <article className="card profile-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Khan household</h2>
        </div>
        <span className="api-status">Demo</span>
      </div>
      <div className="profile-grid">
        <div>
          <span>Rent</span>
          <strong>
            {profile ? `$${profile.monthlyHousingCad.toLocaleString()}` : "—"}
          </strong>
        </div>
        <div>
          <span>Commute</span>
          <strong>{profile ? `${profile.commuteKmPerWeek} km/wk` : "—"}</strong>
        </div>
        <div>
          <span>Dependents</span>
          <strong>{profile ? profile.dependents : "—"}</strong>
        </div>
        <div>
          <span>Watch</span>
          <strong>
            {profile && profile.stressTags.length
              ? profile.stressTags
                  .slice(0, 2)
                  .map((t) => t[0]!.toUpperCase() + t.slice(1))
                  .join(", ")
              : "—"}
          </strong>
        </div>
      </div>
    </article>
  );
}

import type { Tone } from "../data/mocks";

interface Props {
  label: string;
  value: number;
  tone: Tone;
}

export function ProgressBar({ label, value, tone }: Props) {
  return (
    <div className="bar-row">
      <div className="bar-row-head">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="bar-track">
        <div className={`bar-fill tone-${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

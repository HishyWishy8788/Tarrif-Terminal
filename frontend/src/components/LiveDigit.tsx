import { useHalo } from "../hooks/useHalo";
import { useLerp } from "../hooks/useLerp";

interface Props {
  value: number;
  format?: (n: number) => string;
  /** When true, falling values are *good* (mint) — flips halo polarity. */
  invertPolarity?: boolean;
  className?: string;
  ariaLabel?: string;
}

const defaultFormat = (n: number) => Math.round(n).toString();

export function LiveDigit({
  value,
  format = defaultFormat,
  invertPolarity = false,
  className = "",
  ariaLabel,
}: Props) {
  const lerped = useLerp(value);
  const halo = useHalo(value);
  // If polarity is inverted (e.g. savings going up = good), flip the tone.
  const tone = invertPolarity && halo.tone
    ? halo.tone === "rose" ? "mint" : "rose"
    : halo.tone;
  return (
    <span
      key={`d-${halo.haloKey}`}
      className={`live-digit ${className}`}
      data-halo={tone ?? undefined}
      aria-label={ariaLabel}
    >
      {format(lerped)}
    </span>
  );
}

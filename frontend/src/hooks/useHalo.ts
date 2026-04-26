import { useEffect, useRef, useState } from "react";

export type HaloTone = "mint" | "rose" | null;
const HALO_MS = 800;

/**
 * Returns a `tone` string (or null) and a key that re-triggers the CSS
 * animation. Apply both to the element via `data-halo={tone}` and a
 * `key={haloKey}` (so the after-glow re-runs even when consecutive
 * changes are the same direction).
 */
export function useHalo(value: number) {
  const prevRef = useRef<number>(value);
  const [tone, setTone] = useState<HaloTone>(null);
  const [haloKey, setHaloKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (value === prev) return;
    // For Tariff: rising costs = stress (rose); falling = relief (mint).
    // Adjust here if a metric uses inverted semantics.
    const nextTone: HaloTone = value > prev ? "rose" : "mint";
    setTone(nextTone);
    setHaloKey((k) => k + 1);
    prevRef.current = value;

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setTone(null), HALO_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [value]);

  return { tone, haloKey };
}

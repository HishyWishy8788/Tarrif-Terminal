import { useCallback, useEffect, useState } from "react";

export type SpendingBand = "<2k" | "2-4k" | "4-6k" | "6k+";
export type BufferBand = "<1mo" | "1-3mo" | "3-6mo" | "6mo+";
export type StressTag = "groceries" | "fuel" | "rent-utilities" | "job-risk";

export interface OnboardingAnswers {
  spending?: SpendingBand;
  buffer?: BufferBand;
  stress: StressTag[];
  completed: boolean;
}

const STORAGE_KEY = "tariff.onboarding.v1";

function load(): OnboardingAnswers {
  if (typeof window === "undefined") return { stress: [], completed: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stress: [], completed: false };
    const parsed = JSON.parse(raw);
    return {
      spending: parsed.spending,
      buffer: parsed.buffer,
      stress: Array.isArray(parsed.stress) ? parsed.stress : [],
      completed: !!parsed.completed,
    };
  } catch {
    return { stress: [], completed: false };
  }
}

function save(answers: OnboardingAnswers) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    /* no-op */
  }
}

export function useOnboarding() {
  const [answers, setAnswers] = useState<OnboardingAnswers>(load);

  // Cross-tab sync (in case the user has the dashboard open twice)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAnswers(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const blank: OnboardingAnswers = { stress: [], completed: false };
    save(blank);
    setAnswers(blank);
  }, []);

  // Force-show via ?onboarding=1 URL param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("onboarding") === "1" && answers.completed) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...answers, update, reset };
}

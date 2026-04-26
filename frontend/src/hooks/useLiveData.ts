import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { LiveSnapshot } from "../types/api";
import { useOnboarding } from "./useOnboarding";

export function useLiveData() {
  const onboarding = useOnboarding();
  const params = new URLSearchParams();
  if (onboarding.spending) params.set("spending", onboarding.spending);
  if (onboarding.buffer) params.set("buffer", onboarding.buffer);
  if (onboarding.stress.length) params.set("stress", onboarding.stress.join(","));
  const qs = params.toString();

  return useQuery<LiveSnapshot>({
    queryKey: ["liveSnapshot", qs],
    queryFn: () => api.live(qs),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    staleTime: 2_500,
  });
}

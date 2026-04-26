import type {
  AIIntent,
  ChatMessage,
  ChatResponse,
  IntentState,
  SeedKey,
  SignalOrigin,
  UserProfile,
  WorldSignal,
} from "../types/api";

const ADMIN_SEED_KEY = "demo-seed";

let getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
  getToken = provider;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (getToken) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method || "GET"} /api${path} → ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; version: string }>("/health"),
  profile: () => request<UserProfile>("/profile"),
  feed: (origin: SignalOrigin) =>
    request<WorldSignal[]>(`/feed?origin=${origin}`),
  activeIntent: () => request<AIIntent | null>("/intents/active"),
  intents: (state?: IntentState) =>
    request<AIIntent[]>(`/intents${state ? `?state=${state}` : ""}`),
  approve: (id: string) =>
    request<AIIntent>(`/intents/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    request<AIIntent>(`/intents/${id}/reject`, { method: "POST" }),
  snooze: (id: string, minutes = 60) =>
    request<AIIntent>(`/intents/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ minutes }),
    }),
  seed: (intentSeed: SeedKey) =>
    request<AIIntent>("/admin/seed", {
      method: "POST",
      body: JSON.stringify({ seedKey: ADMIN_SEED_KEY, intentSeed }),
    }),
  reset: () => request<{ ok: boolean }>("/admin/reset", { method: "POST" }),
  chat: (message: string, history: ChatMessage[]) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};

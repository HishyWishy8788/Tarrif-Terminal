const API_BASE = "http://localhost:3001/api";
const ADMIN_SEED_KEY = "demo-seed";

const staticAdapters = {
  sources: [
    { name: "NewsAPI", role: "Global headlines", status: "Ready", health: 92 },
    { name: "GDELT", role: "World events at scale", status: "Dedupe", health: 87 },
    { name: "Finnhub", role: "Market news", status: "Ready", health: 95 },
    { name: "Alpha Vantage", role: "Macro and market feed", status: "Limited", health: 78 },
    { name: "Bank of Canada", role: "Official public context", status: "Planned", health: 64 },
    { name: "Plaid sandbox", role: "Balances and spend", status: "Demo", health: 72 },
  ],
  engineRows: [
    { formula: "Groceries", channel: "Imported grocery basket", output: "$38 - $74/mo" },
    { formula: "Fuel", channel: "Pump price x commute distance", output: "$9 - $22/mo" },
    { formula: "Repairs", channel: "Parts tariff pass-through", output: "$120 - $270 once" },
    { formula: "Income", channel: "Sector match without fake dollars", output: "Planning alert" },
  ],
};

const CATEGORY_LABELS = {
  FOOD_GROCERIES: "Food groceries",
  FUEL_COMMUTE: "Fuel commute",
  TRADE_GOODS_REPAIRS: "Trade goods repairs",
  LABOR_INCOME: "Labor income",
  RENT_UTILITIES: "Rent utilities",
  UNCLASSIFIED: "Unclassified",
};

const CATEGORY_TO_SEED = {
  FOOD_GROCERIES: "food",
  FUEL_COMMUTE: "fuel",
  TRADE_GOODS_REPAIRS: "repairs",
  LABOR_INCOME: "labor",
};

let activeSeed = "food";
let profile = null;
let activeIntent = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} → ${res.status} ${text}`);
  }
  return res.json();
}

const apiClient = {
  profile: () => api("/profile"),
  feed: (origin) => api(`/feed?origin=${origin}`),
  activeIntent: () => api("/intents/active"),
  seed: (intentSeed) =>
    api("/admin/seed", {
      method: "POST",
      body: JSON.stringify({ seedKey: ADMIN_SEED_KEY, intentSeed }),
    }),
  transition: (intentId, action) =>
    api(`/intents/${intentId}/${action}`, { method: "POST" }),
  reset: () => api("/admin/reset", { method: "POST" }),
};

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function severityFromConfidence(confidence) {
  if (confidence >= 0.75) return "Alert";
  if (confidence >= 0.55) return "Watch";
  return "Note";
}

function formatImpact(impact) {
  if (impact.monthlyCadLow != null && impact.monthlyCadHigh != null) {
    return `+$${impact.monthlyCadLow} - +$${impact.monthlyCadHigh} / month`;
  }
  if (impact.oneTimeCadLow != null && impact.oneTimeCadHigh != null) {
    return `+$${impact.oneTimeCadLow} - +$${impact.oneTimeCadHigh} one-time`;
  }
  return "Planning alert";
}

function formatKpiImpact(impact) {
  if (impact.monthlyCadLow != null && impact.monthlyCadHigh != null) {
    return `+$${impact.monthlyCadLow} - +$${impact.monthlyCadHigh}`;
  }
  if (impact.oneTimeCadLow != null && impact.oneTimeCadHigh != null) {
    return `+$${impact.oneTimeCadLow} - +$${impact.oneTimeCadHigh}`;
  }
  return "Plan";
}

function stateLabel(value) {
  const labels = {
    PENDING: "Needs review",
    APPROVED: "Approved",
    SNOOZED: "Delayed",
    REJECTED: "Dismissed",
  };
  return labels[value] || value;
}

function renderFeedList(selector, signals) {
  const container = $(selector);
  container.innerHTML = "";
  signals.slice(0, 2).forEach((signal) => {
    const article = document.createElement("article");
    article.className = "feed-item";
    article.innerHTML = `
      <div class="feed-meta">
        <span>${CATEGORY_LABELS[signal.category] || signal.category}</span>
        <span>${signal.source} / ${relativeTime(signal.ts)}</span>
      </div>
      <h3>${signal.title}</h3>
      <p>${signal.snippet || ""}</p>
      <div class="feed-impact">
        <span>Signal</span>
        <strong>${severityFromConfidence(signal.confidence)}</strong>
      </div>
    `;
    container.appendChild(article);
  });
}

function renderSources() {
  $("#source-grid").innerHTML = staticAdapters.sources
    .slice(0, 4)
    .map(
      (source) => `
        <article class="source-card">
          <header>
            <div>
              <strong>${source.name}</strong>
              <small>${source.role}</small>
            </div>
            <span class="api-status">${source.status}</span>
          </header>
          <div class="source-meter" aria-label="${source.name} readiness ${source.health}%">
            <span style="width: ${source.health}%"></span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderEngineRows() {
  $("#engine-stack").innerHTML = staticAdapters.engineRows
    .slice(0, 3)
    .map(
      (row) => `
        <div class="engine-row">
          <div>
            <strong>${row.formula}</strong>
            <span>${row.channel}</span>
          </div>
          <strong>${row.output}</strong>
        </div>
      `,
    )
    .join("");
}

function renderProfile() {
  if (!profile) return;
  const cells = $$(".profile-grid > div");
  if (cells.length >= 4) {
    cells[0].querySelector("strong").textContent = `$${profile.monthlyHousingCad.toLocaleString()}`;
    cells[1].querySelector("strong").textContent = `${profile.commuteKmPerWeek} km/wk`;
    cells[2].querySelector("strong").textContent = String(profile.dependents);
    cells[3].querySelector("strong").textContent = profile.stressTags
      .slice(0, 2)
      .map((t) => t[0].toUpperCase() + t.slice(1))
      .join(", ") || "—";
  }
}

function renderActiveIntent() {
  if (!activeIntent) {
    $("#active-title").textContent = "No active alert";
    $("#active-chain").textContent = "Approve, snooze, or seed a new scenario.";
    $("#active-impact").textContent = "—";
    $("#kpi-impact").textContent = "—";
    $("#active-action").textContent = "—";
    $("#kpi-state").textContent = "Idle";
    $("#assumption-preview").textContent = "—";
    renderTransactions([]);
    return;
  }
  const { signal, impact, narrative, state, auditLog } = activeIntent;
  $("#active-origin").textContent = `${signal.source} (${signal.origin})`;
  $("#active-category").textContent = CATEGORY_LABELS[signal.category] || signal.category;
  $("#active-title").textContent = signal.title;
  $("#active-chain").textContent = narrative.causalChain;
  $("#active-impact").textContent = formatImpact(impact);
  $("#kpi-impact").textContent = formatKpiImpact(impact);
  $("#active-action").textContent = narrative.recommendedAction;
  $("#kpi-state").textContent = stateLabel(state);
  $("#assumption-preview").textContent = (impact.assumptions[0] || "")
    .replace("Calculator: ", "")
    .replace(/\.$/, "");

  const severityChip = $("#severity-chip");
  const severity = severityFromConfidence(signal.confidence);
  severityChip.dataset.severity = severity.toLowerCase();
  severityChip.querySelector("strong").textContent = severity;

  renderTransactions(auditLog || []);
}

function renderTransactions(auditLog) {
  $("#transaction-list").innerHTML = auditLog
    .slice(-5)
    .reverse()
    .map((entry) => {
      const stateForRow =
        entry.event === "CREATED"
          ? "PENDING"
          : entry.event.replace("STATE_", "");
      return `
        <li data-state="${stateForRow}">
          <div>
            <strong>${entry.event}</strong>
            <span>${entry.note || relativeTime(entry.ts)}</span>
          </div>
          <span class="api-status">${stateLabel(stateForRow)}</span>
        </li>
      `;
    })
    .join("");
}

function highlightSeed(seedName) {
  activeSeed = seedName;
  $$(".seed-card").forEach((button) => {
    const isActive = button.dataset.seed === seedName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

async function loadFeeds() {
  try {
    const [global, market] = await Promise.all([
      apiClient.feed("GLOBAL"),
      apiClient.feed("MARKET"),
    ]);
    renderFeedList("#global-news-list", global);
    renderFeedList("#market-news-list", market);
    $("#active-signal-count").textContent = String(global.length + market.length);
  } catch (err) {
    console.error("loadFeeds failed", err);
  }
}

async function loadActive() {
  try {
    activeIntent = await apiClient.activeIntent();
    if (activeIntent) {
      const seedKey = CATEGORY_TO_SEED[activeIntent.signal.category];
      if (seedKey) highlightSeed(seedKey);
    }
    renderActiveIntent();
  } catch (err) {
    console.error("loadActive failed", err);
  }
}

async function loadProfile() {
  try {
    profile = await apiClient.profile();
    renderProfile();
  } catch (err) {
    console.error("loadProfile failed", err);
  }
}

async function onSeedClick(seedName) {
  highlightSeed(seedName);
  try {
    activeIntent = await apiClient.seed(seedName);
    renderActiveIntent();
  } catch (err) {
    console.error("seed failed", err);
  }
}

async function onActionClick(action) {
  if (!activeIntent) return;
  try {
    activeIntent = await apiClient.transition(activeIntent.id, action);
    renderActiveIntent();
    await loadActive();
  } catch (err) {
    console.error("transition failed", err);
  }
}

async function onRefresh() {
  const t0 = performance.now();
  await Promise.all([loadProfile(), loadFeeds(), loadActive()]);
  const elapsed = Math.round(performance.now() - t0);
  $("#latency-ms").textContent = `${elapsed}ms`;
}

function bindEvents() {
  $$("[data-seed]").forEach((button) => {
    button.addEventListener("click", () => onSeedClick(button.dataset.seed));
  });

  $$("[data-action]").forEach((button) => {
    button.addEventListener("click", () => onActionClick(button.dataset.action));
  });

  $("#refresh-feeds").addEventListener("click", onRefresh);
}

renderSources();
renderEngineRows();
bindEvents();
onRefresh();

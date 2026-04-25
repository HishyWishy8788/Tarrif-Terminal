const adapters = {
  globalNews: [
    {
      source: "NewsAPI",
      time: "8m",
      category: "Groceries",
      title: "Food import costs rise after tariff announcement",
      body: "Imported staples may become more expensive over the next month as suppliers reprice.",
      impact: "+$38 - +$74",
    },
    {
      source: "GDELT",
      time: "19m",
      category: "Repairs",
      title: "Appliance repair parts face new import pressure",
      body: "Repair quotes may rise for mid-range appliances and replacement parts.",
      impact: "+$90 - +$240",
    },
    {
      source: "Global labor feed",
      time: "41m",
      category: "Income stability",
      title: "Logistics employers slow hiring in Ontario corridor",
      body: "The household work profile overlaps with the reported sector softness.",
      impact: "Plan",
    },
  ],
  marketNews: [
    {
      source: "Finnhub",
      time: "4m",
      category: "Fuel and commute",
      title: "WTI crude jumps after supply disruption",
      body: "Commute-heavy households face a higher pump-price exposure window.",
      impact: "+$24 - +$49",
    },
    {
      source: "Alpha Vantage",
      time: "14m",
      category: "Groceries",
      title: "Wheat and dairy futures climb on logistics constraints",
      body: "Staple baskets can move faster than headline CPI when transport stress persists.",
      impact: "+$18 - +$43",
    },
    {
      source: "Marketaux",
      time: "32m",
      category: "Rent and utilities",
      title: "Natural gas volatility lifts utility watch index",
      body: "Utility-sensitive households should watch the next billing cycle.",
      impact: "+$12 - +$31",
    },
  ],
  sources: [
    { name: "NewsAPI", role: "Global headlines", status: "Ready", health: 92 },
    { name: "GDELT", role: "World events at scale", status: "Dedupe", health: 87 },
    { name: "Finnhub", role: "Market news", status: "Ready", health: 95 },
    { name: "Alpha Vantage", role: "Macro and market feed", status: "Limited", health: 78 },
    { name: "Bank of Canada", role: "Official public context", status: "Planned", health: 64 },
    { name: "Plaid sandbox", role: "Balances and spend", status: "Demo", health: 72 },
  ],
  engineRows: [
    { formula: "Groceries", channel: "Imported grocery basket", output: "+$38 - +$74/mo" },
    { formula: "Fuel", channel: "Pump price x commute distance", output: "+$24 - +$49/mo" },
    { formula: "Repairs", channel: "Parts tariff pass-through", output: "+$90 - +$240 once" },
    { formula: "Income", channel: "Sector match without fake dollars", output: "Planning alert" },
  ],
};

const seeds = {
  food: {
    category: "Food groceries",
    origin: "NewsAPI + GDELT",
    title: "Food import costs rise after tariff announcement",
    chain:
      "Imported staples may lift next month’s grocery run.",
    impact: "+$38 - +$74 / month",
    kpiImpact: "+$38 - +$74",
    action: "Move $55 into buffer",
    severity: "Watch",
    assumptions: [
      "Calculator: imported grocery basket.",
      "Based on a $1,050 monthly grocery baseline.",
      "Uses a 3.6% to 7.0% sensitivity range for imported staples.",
      "Horizon: next 30 days.",
    ],
  },
  fuel: {
    category: "Fuel commute",
    origin: "Finnhub market news",
    title: "Oil prices jump after supply disruption",
    chain:
      "Fuel moves fast for a commute-heavy household.",
    impact: "+$24 - +$49 / month",
    kpiImpact: "+$24 - +$49",
    action: "Move $35 into buffer",
    severity: "Alert",
    assumptions: [
      "Calculator: fuel price x commute distance.",
      "Based on 185 km per week and blended urban fuel efficiency.",
      "Uses a $0.09 to $0.18 per litre retail movement range.",
      "Horizon: next 30 days.",
    ],
  },
  repairs: {
    category: "Trade goods repairs",
    origin: "Global policy feed",
    title: "Tariffs affect appliance repair parts",
    chain:
      "Imported parts may make repairs more expensive.",
    impact: "+$90 - +$240 one-time",
    kpiImpact: "+$90 - +$240",
    action: "Pre-price repair options",
    severity: "Watch",
    assumptions: [
      "Calculator: repair parts tariff pass-through.",
      "Uses common appliance repair basket estimates.",
      "Applies an 8% to 18% pass-through range.",
      "Horizon: next 90 days.",
    ],
  },
  labor: {
    category: "Labor income",
    origin: "Labor monitor",
    title: "Layoffs rise in logistics operations",
    chain:
      "The household work sector overlaps with this layoff cluster.",
    impact: "Planning alert",
    kpiImpact: "Plan",
    action: "Review next two bills",
    severity: "Watch",
    assumptions: [
      "Calculator: sector planning alert.",
      "Matched against profile sector: logistics operations.",
      "No dollar estimate shown without confirmed income details.",
      "Horizon: next 60 days.",
    ],
  },
};

let activeSeed = "food";
let intentState = "PENDING";
let transactions = [
  { state: "PENDING", title: "Alert prepared", note: "Signal, dollar range, and explanation are ready." },
  { state: "PENDING", title: "Waiting for your choice", note: "No action can continue before approval." },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function renderFeeds() {
  renderFeedList("#global-news-list", adapters.globalNews);
  renderFeedList("#market-news-list", adapters.marketNews);
}

function renderFeedList(selector, items) {
  const container = $(selector);
  container.innerHTML = "";
  items.slice(0, 2).forEach((item) => {
    const article = document.createElement("article");
    article.className = "feed-item";
    article.innerHTML = `
      <div class="feed-meta">
        <span>${item.category}</span>
        <span>${item.source} / ${item.time}</span>
      </div>
      <h3>${item.title}</h3>
      <p>${item.body}</p>
      <div class="feed-impact">
        <span>Budget impact</span>
        <strong>${item.impact}</strong>
      </div>
    `;
    container.appendChild(article);
  });
}

function renderSources() {
  $("#source-grid").innerHTML = adapters.sources
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
  $("#engine-stack").innerHTML = adapters.engineRows
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

function renderActiveIntent() {
  const seed = seeds[activeSeed];
  $("#active-origin").textContent = seed.origin;
  $("#active-category").textContent = seed.category;
  $("#active-title").textContent = seed.title;
  $("#active-chain").textContent = seed.chain;
  $("#active-impact").textContent = seed.impact;
  $("#kpi-impact").textContent = seed.kpiImpact;
  $("#active-action").textContent = seed.action;
  $("#kpi-state").textContent = stateLabel(intentState);
  $("#assumption-preview").textContent = seed.assumptions[0].replace("Calculator: ", "").replace(".", "");

  const severity = $("#severity-chip");
  severity.dataset.severity = seed.severity.toLowerCase();
  severity.querySelector("strong").textContent = seed.severity;

  renderTransactions();
}

function renderTransactions() {
  $("#transaction-list").innerHTML = transactions
    .slice(-5)
    .reverse()
    .map(
      (item) => `
        <li data-state="${item.state}">
          <div>
            <strong>${item.title}</strong>
            <span>${item.note}</span>
          </div>
          <span class="api-status">${stateLabel(item.state)}</span>
        </li>
      `,
    )
    .join("");
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

function setSeed(seedName) {
  activeSeed = seedName;
  intentState = "PENDING";
  $$(".seed-card").forEach((button) => {
    const isActive = button.dataset.seed === seedName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  transactions = [
    { state: "PENDING", title: "Scenario loaded", note: `${seeds[seedName].category} signal selected for the demo household.` },
    { state: "PENDING", title: "Budget range attached", note: seeds[seedName].assumptions[0] },
    { state: "PENDING", title: "Waiting for your choice", note: "Approve, delay, or dismiss before any next step." },
  ];
  renderActiveIntent();
}

function setIntentState(action) {
  const states = {
    approve: "APPROVED",
    snooze: "SNOOZED",
    reject: "REJECTED",
  };
  const titles = {
    approve: "Next step approved",
    snooze: "Reminder set",
    reject: "Alert dismissed",
  };

  intentState = states[action];
  transactions.push({
    state: intentState,
    title: titles[action],
    note: `Saved through Route Guard API: POST /api/intents/${activeSeed}/${action}.`,
  });
  renderActiveIntent();
}

function refreshFeeds() {
  const latency = Math.floor(120 + Math.random() * 180);
  const signals = Math.floor(16 + Math.random() * 8);
  $("#latency-ms").textContent = `${latency}ms`;
  $("#active-signal-count").textContent = String(signals);
  transactions.push({
    state: "PENDING",
    title: "Dashboard updated",
    note: "Global and market signals were re-scored for this household.",
  });
  renderTransactions();
}

function bindEvents() {
  $$("[data-seed]").forEach((button) => {
    button.addEventListener("click", () => setSeed(button.dataset.seed));
  });

  $$("[data-action]").forEach((button) => {
    button.addEventListener("click", () => setIntentState(button.dataset.action));
  });

  $("#refresh-feeds").addEventListener("click", refreshFeeds);
}

renderFeeds();
renderSources();
renderEngineRows();
renderActiveIntent();
bindEvents();

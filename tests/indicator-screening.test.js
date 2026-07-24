const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");
const listingDatesSource = fs.readFileSync(path.join(__dirname, "..", "assets", "listing-dates.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "assets", "styles.css"), "utf8");
const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(/<script src="assets\/app\.js\?v=[^"]+"><\/script>/.test(indexHtml), "screener page should version app.js so browsers do not keep stale chart code");
assert(/<script src="assets\/listing-dates\.js\?v=[^"]+"><\/script>/.test(indexHtml), "screener page should version listing-dates.js so browsers do not keep stale listing dates");

function makeNode() {
  const node = {
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    style: {},
    dataset: {},
    disabled: false,
    files: [],
    children: [],
    options: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    closest() { return null; },
  };
  return node;
}

const nodes = new Map();
const documentStub = {
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, makeNode());
    return nodes.get(id);
  },
  createElement() {
    return makeNode();
  },
  createElementNS() {
    return makeNode();
  },
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return makeNode();
  },
  addEventListener() {},
};

const sandbox = {
  window: { A_SHARE_LISTING_DATES: {} },
  document: documentStub,
  localStorage: {
    getItem() { return null; },
    setItem() {},
  },
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) { return callback(); },
  fetch() { throw new Error("fetch should not run in screening unit tests"); },
  FileReader: function FileReader() {},
  Date,
};
sandbox.window.window = sandbox.window;
sandbox.window.document = documentStub;
sandbox.window.localStorage = sandbox.localStorage;

vm.createContext(sandbox);
vm.runInContext(appSource, sandbox);

const { collectIndicatorMetrics, defaultIndicatorPlan, evaluateIndicatorPlan, parseTencentQuote, quoteMatches, removeSymbolFromCategoryGroup, renameCategoryGroup, summarizeBacktestTrades } = sandbox.window.aShareAnalyzer;

assert.strictEqual(typeof evaluateIndicatorPlan, "function", "evaluateIndicatorPlan should be exported");
assert.strictEqual(typeof parseTencentQuote, "function", "parseTencentQuote should be exported");
assert.strictEqual(typeof quoteMatches, "function", "quoteMatches should be exported");
assert.strictEqual(typeof summarizeBacktestTrades, "function", "summarizeBacktestTrades should be exported");
assert.strictEqual(typeof renameCategoryGroup, "function", "category management should export renameCategoryGroup");
assert.strictEqual(typeof removeSymbolFromCategoryGroup, "function", "category management should export removeSymbolFromCategoryGroup");

function quoteLine(symbol, name, code) {
  const fields = Array.from({ length: 50 }, () => "");
  fields[1] = name;
  fields[2] = code;
  fields[3] = "10.00";
  fields[30] = "202607101500";
  return `v_${symbol}="${fields.join("~")}";`;
}

const chinext301 = parseTencentQuote(quoteLine("sz301001", "凯淳股份", "301001"));
assert.strictEqual(chinext301.type, "创业板", "301-prefixed SZ stocks should be 创业板");
assert.strictEqual(
  quoteMatches(chinext301, {
    keyword: "",
    types: ["深市主板"],
    excludedTypes: ["创业板"],
    nonSt: false,
    minListingDays: null,
    maxListingDays: null,
    minFloatMarketCap: null,
    maxFloatMarketCap: null,
    minPctChange: null,
    maxPctChange: null,
    minTurnover: null,
    maxTurnover: null,
    minTurnoverRate: null,
    maxTurnoverRate: null,
    minVolumeRatio: null,
    maxVolumeRatio: null,
  }),
  false,
  "深市主板 + 非创业板 should exclude 301-prefixed stocks"
);

const metrics = { a: 2, b: "red", c: 3, d: "green" };

assert.strictEqual(
  evaluateIndicatorPlan(
    {
      conditions: [
        { metric: "a", operator: "gte", value: "2" },
        { metric: "b", operator: "eq", value: "red" },
      ],
    },
    metrics
  ).passed,
  true
);

assert.strictEqual(
  evaluateIndicatorPlan(
    {
      conditions: [
        { metric: "c", operator: "gt", value: "3" },
        { metric: "b", operator: "eq", value: "red" },
      ],
    },
    metrics
  ).passed,
  false
);

assert.strictEqual(
  evaluateIndicatorPlan(
    {
      conditions: [
        { indicator: "gold-chip", field: "mainChip", operator: "gt", value: "0" },
        { indicator: "gold-control", field: "barColor", operator: "contains", value: "红色,紫色" },
      ],
    },
    {
      "gold-chip": { mainChip: 12, controlLine: 10 },
      "gold-control": { barColor: "紫色" },
    }
  ).passed,
  true
);

assert.strictEqual(
  evaluateIndicatorPlan(
    {
      conditions: [{ indicator: "ma", field: "gapUp", operator: "eq", value: "是" }],
    },
    {
      ma: { gapUp: "是" },
    }
  ).passed,
  true
);

const defaultShortBuyDaysCondition = defaultIndicatorPlan.conditions.find((condition) => condition.indicator === "boll-short" && condition.field === "shortBuyDays");
assert.strictEqual(JSON.stringify(defaultShortBuyDaysCondition), JSON.stringify({ indicator: "boll-short", period: "day", field: "shortBuyDays", operator: "lte", value: "3" }));
assert.strictEqual(
  JSON.stringify(defaultIndicatorPlan.conditions.filter((condition) => condition.indicator === "boll-short" && ["pctChange", "ma5DistancePct", "volumeRatio5"].includes(condition.field))),
  JSON.stringify([
    { indicator: "boll-short", period: "day", field: "pctChange", operator: "lte", value: "6" },
    { indicator: "boll-short", period: "day", field: "ma5DistancePct", operator: "lte", value: "8" },
    { indicator: "boll-short", period: "day", field: "volumeRatio5", operator: "gte", value: "0.8" },
  ])
);

const bollSignalRows = [10, 9, 8, 8.5, 10, 9.8, 9.6].map((close, index) => ({
  date: `2026-07-${String(index + 1).padStart(2, "0")}`,
  open: close,
  close,
  high: close + 0.1,
  low: close - 0.1,
  volume: 1000,
}));
assert.strictEqual(collectIndicatorMetrics(bollSignalRows, [], {})["boll-short"].shortBuyDays, 2);
const guardrailRows = [10, 10.2, 10.4, 10.6, 10.8, 11].map((close, index) => ({
  date: `2026-08-${String(index + 1).padStart(2, "0")}`,
  open: close - 0.1,
  close,
  high: close + 0.2,
  low: close - 0.2,
  volume: [1000, 1100, 1200, 1300, 1400, 2000][index],
}));
const guardrailMetrics = collectIndicatorMetrics(guardrailRows, [], {})["boll-short"];
assert.strictEqual(Number(guardrailMetrics.pctChange.toFixed(2)), 1.85);
assert.strictEqual(Number(guardrailMetrics.ma5DistancePct.toFixed(2)), 3.77);
assert.strictEqual(Number(guardrailMetrics.volumeRatio5.toFixed(2)), 1.43);
assert.strictEqual(
  evaluateIndicatorPlan(
    {
      conditions: [
        { indicator: "boll-short", field: "shortBuyDays", operator: "lte", value: "3" },
        { indicator: "boll-short", field: "pctChange", operator: "lte", value: "6" },
        { indicator: "boll-short", field: "ma5DistancePct", operator: "lte", value: "8" },
        { indicator: "boll-short", field: "volumeRatio5", operator: "gte", value: "0.8" },
      ],
    },
    { "boll-short": { shortBuyDays: 2, pctChange: 1.85, ma5DistancePct: 3.77, volumeRatio5: 1.43 } }
  ).passed,
  true
);

const backtestSummary = summarizeBacktestTrades([
  {
    quote: { code: "000001", name: "平安银行" },
    trades: [
      {
        t1Pct: 2,
        t1HigherThanBuyClose: true,
        t2Pct: -1,
        t2HigherThanBuyClose: false,
        t3Pct: 3,
        t3HigherThanBuyClose: true,
      },
      {
        t1Pct: -2,
        t1HigherThanBuyClose: false,
        t2Pct: 4,
        t2HigherThanBuyClose: true,
        t3Pct: null,
        t3HigherThanBuyClose: false,
      },
    ],
  },
]);
assert.strictEqual(backtestSummary.stockCount, 1);
assert.strictEqual(backtestSummary.tradeCount, 2);
assert.strictEqual(backtestSummary.t1.winRate, 50);
assert.strictEqual(backtestSummary.t1.avgPct, 0);
assert.strictEqual(backtestSummary.t2.winRate, 50);
assert.strictEqual(backtestSummary.t2.avgPct, 1.5);
assert.strictEqual(backtestSummary.t3.winRate, 100);
assert.strictEqual(backtestSummary.t3.avgPct, 3);

const chartControlsRule = stylesSource.match(/\.chart-controls\s*\{[^}]*\}/);
assert(chartControlsRule, "chart controls CSS rule should exist");
assert(!/overflow:\s*hidden;/.test(chartControlsRule[0]), "main chart controls should not clip the MA multi-select menu");

const chartInfoDivRule = stylesSource.match(/\.chart-info div\s*\{[^}]*\}/);
assert(chartInfoDivRule, "chart info row CSS rule should exist");
assert(!/max-height:\s*18px;/.test(chartInfoDivRule[0]), "main chart MA values should not be clipped to one 18px row");

const chartInfoRule = stylesSource.match(/\.chart-info\s*\{[^}]*\}/);
assert(chartInfoRule, "chart info CSS rule should exist");
assert(/height:\s*52px;/.test(chartInfoRule[0]), "main chart info should keep a fixed height so indicator switching does not reflow the detail panel");
assert(/overflow:\s*auto;/.test(chartInfoRule[0]), "main chart info should scroll overflowing MA values instead of expanding during indicator switching");

const renderSelectedChartsSource = appSource.match(/function renderSelectedCharts\(\) \{[\s\S]*?\n  \}/);
assert(renderSelectedChartsSource, "renderSelectedCharts should exist");
assert(
  !renderSelectedChartsSource[0].includes("registerInitialHover"),
  "chart rerenders should not synchronously initialize all crosshairs and chart info; mouse movement can sync them on demand"
);
assert(
  renderSelectedChartsSource[0].includes("resetChartInfoToLatest()"),
  "chart rerenders should refresh chart info to the latest visible K-line"
);

assert(appSource.includes("function renderMainChartOnly()"), "main indicator changes should have a main-chart-only render path");
assert(appSource.includes("function renderSubChartsOnly()"), "subchart indicator changes should have a subchart-only render path");
assert(appSource.includes("function resetChartInfoToLatest()"), "chart info should have a latest-K reset helper");
assert(/svg\.onmouseleave = \(\) => \{[\s\S]*?resetChartInfoToLatest\(\);[\s\S]*?\};/.test(appSource), "leaving a chart should restore latest K-line info");
assert(
  /els\.mainIndicatorSelect\.addEventListener\("change", \(\) => \{[\s\S]*?renderMainChartOnly\(\);[\s\S]*?\}\);/.test(appSource),
  "main indicator changes should not rerender subcharts"
);
assert.strictEqual(JSON.stringify(renameCategoryGroup({ A: ["sh600519", "sz000001"], B: ["sh600519", "bj430047"] }, "A", "B")), JSON.stringify({
  B: ["sh600519", "bj430047", "sz000001"],
}));
assert.strictEqual(JSON.stringify(removeSymbolFromCategoryGroup({ A: ["sh600519", "sz000001"], B: ["bj430047"] }, "A", "sh600519")), JSON.stringify({
  A: ["sz000001"],
  B: ["bj430047"],
}));
assert(appSource.includes("<details"), "managed categories should render collapsible details for stock lists");
assert(appSource.includes("data-remove-category-symbol"), "managed category stock rows should include per-stock delete actions");
assert(appSource.includes("data-rename-category"), "managed category rows should include rename actions");
assert(/\.manage-category-row details\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s.test(stylesSource), "expanded managed category stock list should use the full dialog width");
const managedCategoryStockSpanRule = stylesSource.match(/\.manage-category-stock span\s*\{[^}]*\}/);
assert(managedCategoryStockSpanRule, "managed category stock label CSS rule should exist");
assert(!/text-overflow:\s*ellipsis;/.test(managedCategoryStockSpanRule[0]), "managed category stock label should not truncate names and codes");
assert(/white-space:\s*normal;/.test(managedCategoryStockSpanRule[0]), "managed category stock label should wrap full names and codes instead of showing only the first digit");

["bj920222", "sz301234", "sh688618", "sz301158", "bj920193"].forEach((symbol) => {
  assert(listingDatesSource.includes(`"${symbol}"`), `static listing dates should include ${symbol}`);
});

console.log("indicator-screening tests passed");

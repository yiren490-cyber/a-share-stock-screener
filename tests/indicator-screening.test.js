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

const { evaluateIndicatorPlan, parseTencentQuote, quoteMatches, summarizeBacktestTrades } = sandbox.window.aShareAnalyzer;

assert.strictEqual(typeof evaluateIndicatorPlan, "function", "evaluateIndicatorPlan should be exported");
assert.strictEqual(typeof parseTencentQuote, "function", "parseTencentQuote should be exported");
assert.strictEqual(typeof quoteMatches, "function", "quoteMatches should be exported");
assert.strictEqual(typeof summarizeBacktestTrades, "function", "summarizeBacktestTrades should be exported");

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

["bj920222", "sz301234", "sh688618", "sz301158", "bj920193"].forEach((symbol) => {
  assert(listingDatesSource.includes(`"${symbol}"`), `static listing dates should include ${symbol}`);
});

console.log("indicator-screening tests passed");

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "assets", "app.js"), "utf8");

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

const { evaluateIndicatorPlan, parseTencentQuote, quoteMatches } = sandbox.window.aShareAnalyzer;

assert.strictEqual(typeof evaluateIndicatorPlan, "function", "evaluateIndicatorPlan should be exported");
assert.strictEqual(typeof parseTencentQuote, "function", "parseTencentQuote should be exported");
assert.strictEqual(typeof quoteMatches, "function", "quoteMatches should be exported");

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

console.log("indicator-screening tests passed");

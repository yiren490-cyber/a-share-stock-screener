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

const { evaluateIndicatorPlan } = sandbox.window.aShareAnalyzer;

assert.strictEqual(typeof evaluateIndicatorPlan, "function", "evaluateIndicatorPlan should be exported");

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

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const watch = require("../assets/watch.js");
const watchHtml = fs.readFileSync(path.join(__dirname, "..", "watch.html"), "utf8");
const watchCss = fs.readFileSync(path.join(__dirname, "..", "assets", "styles.css"), "utf8");

assert(watchHtml.includes('id="watchReminderButton"'), "watch page should place reminder management where realtime refresh was");
assert(watchHtml.includes('id="watchReminderButton" class="watch-reminder-button" type="button">股票监督（0）</button>'), "watch reminder management button should be renamed to stock supervision");
assert(watchHtml.includes('id="watchDoTButton"'), "watch page should include a separate do-T reminder button");
assert(watchHtml.includes('id="watchDoTModal"'), "watch page should include a do-T reminder management modal");
assert(watchHtml.includes('id="watchDoTListTab"'), "do-T management should use a stock-list tab");
assert(watchHtml.includes('id="watchDoTHistoryTab"'), "do-T management should use a trigger-history tab");
assert(watchHtml.includes('id="watchDoTListPanel"'), "do-T stock-list tab should have its own panel");
assert(watchHtml.includes('id="watchDoTHistoryPanel"'), "do-T trigger-history tab should have its own panel");
assert(!watchHtml.includes('watch-dot-columns'), "do-T management should not show list and history side by side");
assert(!watchHtml.includes('id="watchRefreshButton"'), "watch page should remove the manual realtime refresh toggle");
assert(watchHtml.includes('id="watchReminderModal"'), "watch page should include a reminder management modal");
assert(watchHtml.includes('id="watchReminderRulesTab"'), "watch reminder management should use a rules tab");
assert(watchHtml.includes('id="watchReminderHistoryTab"'), "watch reminder management should use a trigger history tab");
assert(watchHtml.includes('id="watchOpenAddReminderButton"'), "watch reminder rules tab should expose an add reminder action");
assert(watchHtml.includes('id="watchAddReminderModal"'), "watch page should use a separate add reminder modal");
assert(watchHtml.includes('id="watchReminderToasts"'), "watch page should include a stacked reminder toast host");
assert(!watchHtml.includes('id="audioStatus"'), "watch audio bar should not duplicate the currently selected audio text");

assert.deepStrictEqual(watch.reminderFormConfigForType("price").fields, ["priceDirection", "targetPrice"]);
assert.deepStrictEqual(watch.reminderFormConfigForType("range").fields, ["priceRange"]);
assert.deepStrictEqual(watch.reminderFormConfigForType("ma").fields, ["maDirection", "maPeriod"]);
assert.deepStrictEqual(watch.reminderFormConfigForType("boll").fields, ["bollDirection", "bollLine"]);
assert(watchCss.includes(".watch-reminder-section[hidden]"), "hidden reminder tab panels must not be forced visible by grid styles");
assert(watchCss.includes("grid-template-columns: 1fr auto 1fr"), "watch reminder tabs should be centered with the add button on the right");
assert(!watchCss.includes(".watch-dot-modal"), "do-T management modal should keep the same neutral rule-management surface");
assert(watchCss.includes(".watch-reminder-toast.is-red-alert"), "red-light alert popup should use distinct blue styling");
assert.strictEqual(watch.normalizeSymbol("国睿科技 600562"), "sh600562", "reminder stock input should accept name plus code display text");
assert.strictEqual(
  watch.currentWatchSymbolInputText({ symbol: "sh600519", quote: { symbol: "sh600519", name: "贵州茅台" }, quoteNameCache: {} }),
  "贵州茅台 600519",
  "do-T add input should default to the currently displayed watch stock"
);
assert.strictEqual(watch.reminderToastTitle({ source: "doT", name: "贵州茅台" }), "贵州茅台 红灯做T提醒", "do-T red-light toast should use the unified red alert title");
assert.strictEqual(watch.reminderToastTitle({ source: "currentRed", name: "贵州茅台" }), "贵州茅台 红灯做T提醒", "current watch red-light toast should use the unified red alert title");
assert(watch.reminderToastClassName({ source: "doT" }).includes("is-red-alert"), "do-T red-light toast should use blue alert styling");
assert(watch.reminderToastClassName({ source: "currentRed" }).includes("is-red-alert"), "current watch red-light toast should use blue alert styling");
assert.strictEqual(watch.isRedAlertHistoryItem({ source: "doT" }), true, "do-T alerts should be grouped into do-T history");
assert.strictEqual(watch.isRedAlertHistoryItem({ source: "currentRed" }), true, "current watch red-light alerts should be grouped into do-T history");
assert.strictEqual(watch.isRedAlertHistoryItem({ source: "reminder" }), false, "custom stock-supervision reminders should stay out of do-T history");

const normalized = watch.normalizeReminderRules([
  { symbol: "600519", conditionType: "priceAbove", targetPrice: "10.5" },
  { symbol: "bad", conditionType: "priceAbove", targetPrice: 1 },
]);
assert.strictEqual(normalized.length, 1);
assert.strictEqual(normalized[0].symbol, "sh600519");
assert.strictEqual(normalized[0].enabled, true, "new reminder rules should default to enabled");
assert.strictEqual(normalized[0].targetPrice, 10.5);

const quote = { symbol: "sh600519", name: "贵州茅台", latestPrice: 10.5 };
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "priceAbove", targetPrice: 10 }, quote).triggered, true);
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "priceBelow", targetPrice: 11 }, quote).triggered, true);
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "priceRange", minPrice: 10, maxPrice: 11 }, quote).triggered, true);

const maRows = Array.from({ length: 20 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, "0")}`, close: 20, high: 21, low: 19, open: 20 }));
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "maAbove", maPeriod: 5 }, { ...quote, latestPrice: 21 }, maRows).triggered, true);
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "maBelow", maPeriod: 5 }, { ...quote, latestPrice: 19 }, maRows).triggered, true);
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "bollBreak", bollDirection: "above", bollLine: "upper" }, { ...quote, latestPrice: 21 }, maRows).triggered, true);
assert.strictEqual(watch.evaluateReminderRule({ conditionType: "bollBreak", bollDirection: "below", bollLine: "lower" }, { ...quote, latestPrice: 19 }, maRows).triggered, true);

const rules = [{ id: "r1", symbol: "sh600519", enabled: true, conditionType: "priceAbove", targetPrice: 10 }];
const first = watch.collectReminderTriggers(rules, { sh600519: quote }, {}, new Set(), 1000);
assert.strictEqual(first.triggered.length, 1, "first active condition should create a reminder trigger");
const second = watch.collectReminderTriggers(rules, { sh600519: quote }, {}, first.activeRuleIds, 2000);
assert.strictEqual(second.triggered.length, 0, "a continuously active condition should not create duplicate reminder triggers");
const reset = watch.collectReminderTriggers(rules, { sh600519: { ...quote, latestPrice: 9 } }, {}, second.activeRuleIds, 3000);
assert.strictEqual(reset.activeRuleIds.size, 0, "inactive condition should reset the trigger state");
const disabled = watch.collectReminderTriggers([{ ...rules[0], enabled: false }], { sh600519: quote }, {}, new Set(), 4000);
assert.strictEqual(disabled.triggered.length, 0, "disabled reminder rules should not trigger");

const doTItems = watch.normalizeDoTItems([{ symbol: "600519" }, { symbol: "贵州茅台 600519" }, { symbol: "bad" }]);
assert.deepStrictEqual(doTItems.map((item) => item.symbol), ["sh600519"], "do-T list should normalize and dedupe valid stock symbols");

const doTRows = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-07-17 ${String(9 + Math.floor(index / 60)).padStart(2, "0")}:${String(30 + (index % 30)).padStart(2, "0")}`,
  open: 10,
  close: 10 + index * 0.1,
  high: 10 + index * 0.1,
  low: 9.5,
  volume: 1000,
}));
const doTBollRows = Array.from({ length: 30 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, "0")}`, open: 10, close: 10, high: 10, low: 10, volume: 1000 }));
const doTBreakBollRows = doTBollRows.map((row, index) => (index === doTBollRows.length - 1 ? { ...row, close: 12, high: 12.5 } : row));
const doTFirst = watch.collectDoTTriggers(
  [{ id: "dt1", symbol: "sh600519", enabled: true }],
  { sh600519: { symbol: "sh600519", name: "贵州茅台", latestPrice: 12 } },
  {
    "sh600519:m1": doTRows,
    "sh600519:m5": doTBreakBollRows,
    "sh600519:day": doTBreakBollRows,
  },
  new Set(),
  5000
);
assert.strictEqual(doTFirst.triggered.length, 1, "do-T monitor should trigger when at least two red lights are active");
assert.strictEqual(doTFirst.triggered[0].source, "doT");
assert.strictEqual(doTFirst.triggered[0].conditionText, "1分钟 KDJ>80、5分钟 突破BOLL、日K 突破BOLL");
const incompleteDoT = watch.collectDoTTriggers(
  [{ id: "dt-incomplete", symbol: "sh600519", enabled: true }],
  { sh600519: { symbol: "sh600519", name: "贵州茅台", latestPrice: 12 } },
  {
    "sh600519:m1": [],
    "sh600519:m5": doTBreakBollRows,
    "sh600519:day": doTBreakBollRows,
  },
  new Set(),
  5500
);
assert.strictEqual(incompleteDoT.triggered.length, 0, "do-T monitor should not trigger while required red-light data is incomplete");
const doTNoClosedBollBreak = watch.collectDoTTriggers(
  [{ id: "dt-no-close-break", symbol: "sh600519", enabled: true }],
  { sh600519: { symbol: "sh600519", name: "贵州茅台", latestPrice: 12 } },
  {
    "sh600519:m1": doTBollRows.map((row, index) => ({ ...row, date: `2026-07-17 10:${String(index).padStart(2, "0")}`, high: 10.5, low: 9.5, close: 10 })),
    "sh600519:m5": doTBollRows,
    "sh600519:day": doTBollRows,
  },
  new Set(),
  5600
);
assert.strictEqual(doTNoClosedBollBreak.triggered.length, 0, "do-T monitor should not trigger BOLL red lights from realtime price when K-line close has not broken BOLL");
const doTSecond = watch.collectDoTTriggers(
  [{ id: "dt1", symbol: "sh600519", enabled: true }],
  { sh600519: { symbol: "sh600519", name: "贵州茅台", latestPrice: 12 } },
  {
    "sh600519:m1": doTRows,
    "sh600519:m5": doTBreakBollRows,
    "sh600519:day": doTBreakBollRows,
  },
  doTFirst.activeItemIds,
  6000
);
assert.strictEqual(doTSecond.triggered.length, 0, "do-T monitor should not duplicate a continuously active stock alert");

console.log("watch reminder tests passed");

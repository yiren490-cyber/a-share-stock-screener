const assert = require("assert");
const fs = require("fs");
const path = require("path");

const watch = require("../assets/watch.js");
const watchHtml = fs.readFileSync(path.join(__dirname, "..", "watch.html"), "utf8");

assert(watchHtml.includes('id="watchReminderButton"'), "watch page should place reminder management where realtime refresh was");
assert(!watchHtml.includes('id="watchRefreshButton"'), "watch page should remove the manual realtime refresh toggle");
assert(watchHtml.includes('id="watchReminderModal"'), "watch page should include a reminder management modal");
assert(watchHtml.includes('id="watchReminderToasts"'), "watch page should include a stacked reminder toast host");

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

console.log("watch reminder tests passed");

const assert = require("assert");

const watch = require("../assets/watch.js");

assert.strictEqual(watch.normalizeSymbol("600519"), "sh600519");
assert.strictEqual(watch.normalizeSymbol("000001"), "sz000001");
assert.strictEqual(watch.normalizeSymbol("430047"), "bj430047");
assert.strictEqual(watch.normalizeSymbol("SH600519"), "sh600519");
assert.strictEqual(watch.normalizeSymbol(" bad "), "");

function quoteLine(symbol, name, code) {
  const fields = Array.from({ length: 50 }, () => "");
  fields[1] = name;
  fields[2] = code;
  fields[3] = "10.00";
  fields[4] = "9.50";
  fields[6] = "123456";
  fields[30] = "202607171130";
  fields[32] = "5.26";
  return `v_${symbol}="${fields.join("~")}";`;
}

const parsedQuote = watch.parseQuoteLine(quoteLine("sh600519", "贵州茅台", "600519"));
assert.strictEqual(parsedQuote.latestPrice, 10);
assert.strictEqual(parsedQuote.volume, 12345600);
assert.strictEqual(parsedQuote.rawTime, "2026-07-17 11:30");

const storage = {
  getItem(key) {
    assert.strictEqual(key, "aShareCategories");
    return JSON.stringify({
      自选一: ["sh600519", "sz000001", "sh600519", "bad"],
      空组: [],
    });
  },
};
assert.deepStrictEqual(watch.readCategories(storage), {
  自选一: ["sh600519", "sz000001"],
  空组: [],
});

const nav = watch.makeCategoryNavigator({ 自选一: ["sh600519", "sz000001", "sz300750"] }, "自选一", "sz000001");
assert.strictEqual(nav.index, 1);
assert.strictEqual(nav.previous, "sh600519");
assert.strictEqual(nav.next, "sz300750");

const missingNav = watch.makeCategoryNavigator({ 自选一: ["sh600519"] }, "自选一", "sz000001");
assert.strictEqual(missingNav.index, -1);
assert.strictEqual(missingNav.previous, "");
assert.strictEqual(missingNav.next, "");

const defaults = watch.defaultPanelSettings();
assert.deepStrictEqual(Object.keys(defaults), ["m1", "m5", "m30", "day"]);
assert.strictEqual(defaults.m1.mainMode, "ma");
assert.deepStrictEqual(defaults.m5.subcharts, ["volume", "macd", "kdj"]);

const merged = watch.mergePanelSettings({
  m1: { mainMode: "boll", subcharts: ["kdj", "volume", "macd"] },
  m5: { mainMode: "unknown", subcharts: ["macd", "macd", "kdj"] },
});
assert.strictEqual(merged.m1.mainMode, "boll");
assert.deepStrictEqual(merged.m1.subcharts, ["kdj", "volume", "macd"]);
assert.strictEqual(merged.m5.mainMode, "ma");
assert.deepStrictEqual(merged.m5.subcharts, ["volume", "macd", "kdj"]);
assert.notStrictEqual(merged.m1, merged.m5, "period settings should be independent objects");

let alerts = watch.evaluateAlerts({
  previousCount: 1,
  minuteKdj: { k: 79, d: 80.1, j: 40 },
  fiveMinute: { price: 10.5, upper: 10.4 },
  day: { price: 9.9, upper: 10 },
});
assert.deepStrictEqual(alerts, {
  minuteKdj: true,
  fiveMinuteBoll: true,
  dayBoll: false,
  count: 2,
  shouldPlay: true,
});

alerts = watch.evaluateAlerts({
  previousCount: 2,
  minuteKdj: { k: 90, d: 40, j: 40 },
  fiveMinute: { price: 10.5, upper: 10.4 },
  day: { price: 11, upper: 10 },
});
assert.strictEqual(alerts.count, 3);
assert.strictEqual(alerts.shouldPlay, false, "sound should not repeat while already in alert state");

assert.deepStrictEqual(watch.tradingSessionTicks(), [
  { label: "9:30", minute: 570 },
  { label: "10:30", minute: 630 },
  { label: "11:30", minute: 690 },
  { label: "13:00", minute: 780 },
  { label: "14:00", minute: 840 },
  { label: "15:00", minute: 900 },
]);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 09:30"), 0);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 10:30"), 60);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 11:30"), 120);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 13:00"), 120);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 14:00"), 180);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 15:00"), 240);
assert.strictEqual(watch.minuteToTradingSlot("2026-07-17 12:15"), null);

assert.strictEqual(watch.adjustVisibleBars(120, "in"), 80);
assert.strictEqual(watch.adjustVisibleBars(80, "in"), 40);
assert.strictEqual(watch.adjustVisibleBars(40, "in"), 20);
assert.strictEqual(watch.adjustVisibleBars(20, "in"), 20);
assert.strictEqual(watch.adjustVisibleBars(80, "out"), 120);
assert.strictEqual(watch.adjustVisibleBars(240, "out"), 320);
assert.strictEqual(watch.adjustVisibleBars(320, "out"), 320);

const tradeRows = watch.recentTradeRows([
  { date: "2026-07-17 09:30", close: 10, volume: 100 },
  { date: "2026-07-17 09:31", close: 10.2, volume: 120 },
  { date: "2026-07-17 09:32", close: 10.1, volume: 90 },
], 2);
assert.deepStrictEqual(tradeRows, [
  { time: "09:32", price: 10.1, volume: 9000 },
  { time: "09:31", price: 10.2, volume: 12000 },
]);

const orderHtml = watch.renderOrderBookHtml(
  [
    { side: "buy", level: 1, price: 9.9, volume: 100 },
    { side: "sell", level: 1, price: 10.1, volume: 120 },
  ],
  [{ time: "09:32", price: 10.1, volume: 9000 }]
);
assert(orderHtml.includes("买1"));
assert(orderHtml.includes("卖1"));
assert(orderHtml.includes("分时成交明细"));
assert(!orderHtml.includes("五档盘口"));

const syncRows = [
  { date: "2026-07-17 09:30" },
  { date: "2026-07-17 10:30" },
  { date: "2026-07-17 11:30" },
];
assert.strictEqual(watch.nearestIndexForDate(syncRows, "2026-07-17 10:31"), 1);
assert.strictEqual(watch.nearestIndexForDate(syncRows, "2026-07-17 11:30"), 2);
assert.strictEqual(watch.nearestIndexForDate(syncRows, "2026-07-17 09:00"), 0);
assert.strictEqual(watch.nearestIndexForDate([], "2026-07-17 10:31"), -1);

assert.strictEqual(watch.slotToTradingTime(0), "09:30");
assert.strictEqual(watch.slotToTradingTime(24), "09:54");
assert.strictEqual(watch.slotToTradingTime(120), "11:30");
assert.strictEqual(watch.slotToTradingTime(121), "13:01");
assert.strictEqual(watch.slotToTradingTime(240), "15:00");

assert.strictEqual(watch.clampSlotToDataRange(-10, [{ slot: 24 }, { slot: 120 }]), 24);
assert.strictEqual(watch.clampSlotToDataRange(10, [{ slot: 24 }, { slot: 120 }]), 24);
assert.strictEqual(watch.clampSlotToDataRange(80, [{ slot: 24 }, { slot: 120 }]), 80);
assert.strictEqual(watch.clampSlotToDataRange(180, [{ slot: 24 }, { slot: 120 }]), 120);

assert.deepStrictEqual(watch.normalizeSearchHistory(["sh600519", { symbol: "sz000001", name: "平安银行" }, "bad"]), [
  { symbol: "sh600519", name: "sh600519" },
  { symbol: "sz000001", name: "平安银行" },
]);
assert.deepStrictEqual(watch.addSearchHistory([{ symbol: "sh600519", name: "贵州茅台" }], "600519", "贵州茅台"), [
  { symbol: "sh600519", name: "贵州茅台" },
]);
assert.deepStrictEqual(watch.addSearchHistory([{ symbol: "sh600519", name: "贵州茅台" }], "300750", "宁德时代"), [
  { symbol: "sz300750", name: "宁德时代" },
  { symbol: "sh600519", name: "贵州茅台" },
]);
assert.deepStrictEqual(watch.removeSearchHistory([{ symbol: "sz300750", name: "宁德时代" }, { symbol: "sh600519", name: "贵州茅台" }], "300750"), [
  { symbol: "sh600519", name: "贵州茅台" },
]);

const paddedDomain = watch.scaleDomain([10, 12], 0.1);
assert.strictEqual(paddedDomain.min, 9.8);
assert.strictEqual(paddedDomain.max, 12.2);
const flatDomain = watch.scaleDomain([10, 10], 0.1);
assert(flatDomain.min < 10 && flatDomain.max > 10, "flat chart domain should expand around the value");
const macdDomain = watch.scaleDomain([0.02, 0.03, -0.01, 0], 0.08);
assert(macdDomain.min < -0.01 && macdDomain.max > 0.03, "MACD domain should include zero with padding");

const intradayLayout = watch.intradayLayout();
assert(intradayLayout.pad.left <= 52, "intraday chart should keep only enough left padding for price labels");
assert(intradayLayout.pad.right <= 10, "intraday chart should not waste wide right padding");
assert(intradayLayout.volumeHeight >= 200, "intraday volume area should be tall enough to read");
assert(intradayLayout.volumeTop < intradayLayout.priceBottom, "intraday volume can overlap the price area");
assert.strictEqual(watch.intradaySlotMax([{ slot: 0 }, { slot: 60 }, { slot: 135 }]), 135);
assert.strictEqual(watch.intradaySlotMax([]), 240);

const intradayInfo = watch.renderIntradayInfoHtml({
  time: "2026-07-17 09:30",
  price: 10,
  pct: 1.25,
  average: 9.9,
  volume: 12000,
});
assert(intradayInfo.includes("2026-07-17 09:30"));
assert(intradayInfo.includes("价:10.00"));
assert(intradayInfo.includes('<span class="watch-pct is-up">涨幅:1.25%</span>'));
assert(intradayInfo.includes("均价:9.90"));

console.log("watch helper tests passed");

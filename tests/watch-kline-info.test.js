const assert = require("assert");

const watch = require("../assets/watch.js");

const rows = Array.from({ length: 60 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  const close = index + 1;
  return {
    date: `2026-07-${day}`,
    open: close - 0.2,
    close,
    low: close - 0.5,
    high: close + 0.5,
    volume: 1000 + index,
  };
});

const svg = {
  attrs: {},
  innerHTML: "",
  setAttribute(name, value) {
    this.attrs[name] = value;
  },
};
const info = { innerHTML: "", textContent: "", classList: { remove() {} } };

watch.drawKlineChart(svg, rows, "ma", info, "", 120);

assert(info.innerHTML.includes("2026-07-60"), "default K-line info should use the latest row when there is no hover date");
assert(!svg.innerHTML.includes("watch-crosshair"), "default K-line chart should not draw a crosshair before intraday hover");
assert(info.innerHTML.includes('style="color:#1d4ed8">MA5:58.00</span>'), "MA5 info should match the MA5 line color");
assert(info.innerHTML.includes('style="color:#f59e0b">MA10:55.50</span>'), "MA10 info should match the MA10 line color");
assert(info.innerHTML.includes('style="color:#7c3aed">MA17:52.00</span>'), "MA17 info should match the MA17 line color");
assert(info.innerHTML.includes('style="color:#0f766e">MA20:50.50</span>'), "MA20 info should match the MA20 line color");
assert(info.innerHTML.includes('style="color:#dc2626">MA60:30.50</span>'), "MA60 info should match the MA60 line color and show available latest data");
assert(!info.innerHTML.includes("MA60:--"), "MA60 should not be missing when the current panel has enough bars");

watch.drawKlineChart(svg, rows, "ma", info, "2026-07-30", 120);
assert(svg.innerHTML.includes("watch-crosshair"), "K-line chart should draw the synchronized crosshair while intraday hover is active");

const intradayRows = Array.from({ length: 5 }, (_, index) => ({
  date: `2026-07-30 09:${String(30 + index).padStart(2, "0")}`,
  open: 10 + index * 0.1,
  close: 10 + index * 0.1,
  low: 9.9 + index * 0.1,
  high: 10.1 + index * 0.1,
  volume: 1000 + index,
}));
watch.drawIntradayChart(svg, intradayRows, info, { prevClose: 10 }, "", () => {});
assert(!svg.innerHTML.includes("watch-crosshair"), "intraday chart should not draw a crosshair before pointer hover");
watch.drawIntradayChart(svg, intradayRows, info, { prevClose: 10 }, "2026-07-30 09:32", () => {});
assert(svg.innerHTML.includes("watch-crosshair"), "intraday chart should keep drawing the crosshair while pointer hover is active");

watch.drawVolumeChart(svg, rows, "", 120);
assert(!svg.innerHTML.includes("watch-crosshair"), "volume subchart should not draw a synchronized crosshair before intraday hover");
watch.drawVolumeChart(svg, rows, "2026-07-30", 120);
assert(svg.innerHTML.includes("watch-crosshair"), "volume subchart should draw a synchronized crosshair while intraday hover is active");

watch.drawMacdChart(svg, rows, "", 120);
assert(!svg.innerHTML.includes("watch-crosshair"), "MACD subchart should not draw a synchronized crosshair before intraday hover");
watch.drawMacdChart(svg, rows, "2026-07-30", 120);
assert(svg.innerHTML.includes("watch-crosshair"), "MACD subchart should draw a synchronized crosshair while intraday hover is active");

watch.drawKdjChart(svg, rows, "", 120);
assert(!svg.innerHTML.includes("watch-crosshair"), "KDJ subchart should not draw a synchronized crosshair before intraday hover");
watch.drawKdjChart(svg, rows, "2026-07-30", 120);
assert(svg.innerHTML.includes("watch-crosshair"), "KDJ subchart should draw a synchronized crosshair while intraday hover is active");

console.log("watch K-line info tests passed");

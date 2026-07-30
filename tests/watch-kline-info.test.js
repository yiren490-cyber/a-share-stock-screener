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
const info = { innerHTML: "", textContent: "" };

watch.drawKlineChart(svg, rows, "ma", info, "", 120);

assert(info.innerHTML.includes("2026-07-60"), "default K-line info should use the latest row when there is no hover date");
assert(info.innerHTML.includes('style="color:#1d4ed8">MA5:58.00</span>'), "MA5 info should match the MA5 line color");
assert(info.innerHTML.includes('style="color:#f59e0b">MA10:55.50</span>'), "MA10 info should match the MA10 line color");
assert(info.innerHTML.includes('style="color:#7c3aed">MA17:52.00</span>'), "MA17 info should match the MA17 line color");
assert(info.innerHTML.includes('style="color:#0f766e">MA20:50.50</span>'), "MA20 info should match the MA20 line color");
assert(info.innerHTML.includes('style="color:#dc2626">MA60:30.50</span>'), "MA60 info should match the MA60 line color and show available latest data");
assert(!info.innerHTML.includes("MA60:--"), "MA60 should not be missing when the current panel has enough bars");

console.log("watch K-line info tests passed");

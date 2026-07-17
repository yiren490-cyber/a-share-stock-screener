# Stock Watch Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate realtime stock watch page for one-stock monitoring with intraday volume, five-level order book, independent period panels, category navigation, and alert audio.

**Architecture:** Keep the existing screener stable and add a standalone `watch.html` page with a focused `assets/watch.js` script. Export pure helper functions from `watch.js` for Node-based tests, while browser-only rendering and polling stay inside the page controller.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, SVG charts, Tencent quote endpoint, existing Eastmoney K-line proxy, Node `assert` tests.

## Global Constraints

- Existing `index.html` remains the screener; add only a small navigation entry to `watch.html`.
- New page name is `watch.html`; new script name is `assets/watch.js`.
- Reuse saved categories from `localStorage` key `aShareCategories`.
- The top intraday chart must include volume bars at the bottom of the same chart.
- Period panels are exactly 1-minute, 5-minute, 30-minute, and daily K.
- Each period independently stores main-chart mode: `ma` or `boll`.
- Each period independently stores the order of three subcharts: `volume`, `macd`, and `kdj`.
- Alert lights: `1分钟 KDJ > 80`, `5分钟 价格 > BOLL上轨`, `日K 价格 > BOLL上轨`.
- The 1-minute KDJ alert is true if any of K, D, or J is greater than 80.
- Audio plays when alert count first reaches two or more, then arms again only after count drops below two.
- Do not fabricate missing quote, order book, K-line, or indicator values; display `--`.

---

### Task 1: Testable Watch Helpers

**Files:**
- Create: `tests/watch.test.js`
- Create: `assets/watch.js`

**Interfaces:**
- Produces: `normalizeSymbol(input: string) -> string`
- Produces: `readCategories(storage: StorageLike) -> Record<string, string[]>`
- Produces: `makeCategoryNavigator(categories: object, categoryName: string, symbol: string) -> { categoryName, symbols, index, previous, next }`
- Produces: `defaultPanelSettings() -> object`
- Produces: `mergePanelSettings(saved: object) -> object`
- Produces: `evaluateAlerts(data: object) -> { minuteKdj, fiveMinuteBoll, dayBoll, count, shouldPlay }`

- [ ] **Step 1: Write failing tests**

Create `tests/watch.test.js` with Node `assert` tests for symbol normalization, category navigation, panel independence, and alert evaluation.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node tests/watch.test.js`
Expected: FAIL because `assets/watch.js` does not exist or exported helpers are missing.

- [ ] **Step 3: Implement minimal helper exports**

Create `assets/watch.js` with an IIFE that attaches `window.stockWatch` in the browser and `module.exports` in Node. Implement only pure helpers in this task.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node tests/watch.test.js`
Expected: PASS and print `watch helper tests passed`.

### Task 2: Watch Page Shell And Screener Entry

**Files:**
- Create: `watch.html`
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `scripts/build-static.js`

**Interfaces:**
- Consumes: `assets/watch.js` loaded by `watch.html`
- Produces: DOM ids required by `initWatchPage()`: `watchSymbolInput`, `watchLoadButton`, `watchCategoryList`, `watchPrevButton`, `watchNextButton`, `watchStatus`, `intradayChart`, `orderBook`, `periodPanels`, `alertLights`

- [ ] **Step 1: Add page shell**

Create `watch.html` with top controls, alert area, intraday/order-book area, period panel host, and script tags for `assets/listing-dates.js` and `assets/watch.js`.

- [ ] **Step 2: Add screener navigation**

Add a `实时盯盘` link to the existing toolbar actions in `index.html`.

- [ ] **Step 3: Add watch styles**

Append focused watch-page CSS to `assets/styles.css`, preserving existing screener styles.

- [ ] **Step 4: Include watch page in static build**

Update `scripts/build-static.js` to copy and serve `/watch.html`.

- [ ] **Step 5: Verify static build**

Run: `npm run build`
Expected: exit 0 and `dist/watch.html` exists.

### Task 3: Data Loading, Category Selection, And Polling

**Files:**
- Modify: `assets/watch.js`

**Interfaces:**
- Consumes: helper functions from Task 1
- Produces: `initWatchPage(document: Document) -> void`
- Produces browser behavior: manual symbol load, category stock selection, previous/next navigation, quote refresh, K-line refresh

- [ ] **Step 1: Add DOM controller**

Implement `initWatchPage` to bind controls, read categories, render expandable category lists, restore last symbol/category, and start polling after a symbol loads.

- [ ] **Step 2: Add market data adapters**

Implement quote fetch through Tencent, K-line fetch through `/api/eastmoney-kline` with JSONP fallback if useful, and safe missing-data handling.

- [ ] **Step 3: Add polling lifecycle**

Refresh quote/order-book about every 10 seconds and K-lines about every 30 seconds. Clear old timers when switching symbols.

- [ ] **Step 4: Verify helper tests still pass**

Run: `node tests/watch.test.js`
Expected: PASS.

### Task 4: Charts, Independent Panels, And Alerts

**Files:**
- Modify: `assets/watch.js`
- Modify: `assets/styles.css`

**Interfaces:**
- Consumes: loaded quote and K-line rows
- Produces browser behavior: intraday chart with volume, order book display, four independent period panels, alert lights, default and uploaded audio

- [ ] **Step 1: Implement indicators**

Add moving average, BOLL, EMA/MACD, and KDJ helpers inside `assets/watch.js`.

- [ ] **Step 2: Render top realtime area**

Render SVG intraday price line with volume bars at the bottom, and render sell five to buy five order book rows.

- [ ] **Step 3: Render four period panels**

Render independent 1-minute, 5-minute, 30-minute, and daily panels. Each panel has its own main mode selector and three subchart selectors.

- [ ] **Step 4: Persist panel preferences**

Save each period's main mode and subchart order in `localStorage`.

- [ ] **Step 5: Implement alert lights and audio**

Update alert lights after indicator calculation. Play default Web Audio tone or uploaded audio when alert count transitions from below two to two or more.

- [ ] **Step 6: Verify helper tests and build**

Run: `node tests/watch.test.js`
Run: `node tests/indicator-screening.test.js`
Run: `npm run build`
Expected: all commands exit 0.

### Task 5: Browser Verification And Final Cleanup

**Files:**
- Verify: `watch.html`
- Verify: `index.html`

**Interfaces:**
- Consumes: built static app and local server
- Produces: verified local URL for the user

- [ ] **Step 1: Start local server**

Run: `npm start`
Expected: server prints `A股筛选器已启动: http://0.0.0.0:8787/`.

- [ ] **Step 2: Use browser automation or direct HTTP checks**

Verify `/index.html` and `/watch.html` load, scripts are reachable, and no obvious static errors occur.

- [ ] **Step 3: Manual feature checklist**

Check the screener entry link, manual symbol load, category rendering, previous/next state, independent panel controls, top intraday volume bars, order book `--` fallback, alert lights, and sound enable/upload controls.

- [ ] **Step 4: Final status**

Stop any long-running server started for verification, review `git diff`, and report changed files plus verification evidence.

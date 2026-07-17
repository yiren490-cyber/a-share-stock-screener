# Stock Watch Page Design

## Goal

Add a separate realtime stock watch page to the existing local A-share app. The current screener page should remain focused and visually unchanged except for a navigation entry to the watch page.

The watch page lets the user monitor one stock at a time, switch stocks by manual input or saved categories, inspect intraday and multi-period charts, and receive visual/audio alerts when selected short-term conditions are met.

## Scope

This design includes:

- A new standalone watch page in the same static app.
- Manual stock input and loading by code or market symbol.
- Selection from existing saved stock categories stored in `aShareCategories`.
- Previous/next navigation within the currently selected category.
- A top intraday chart with volume displayed at the bottom of the same chart area.
- A five-level bid/ask order book beside the top intraday chart.
- Four independent period panels for 1-minute, 5-minute, 30-minute, and daily K-line views.
- Independent main-chart mode per period panel: K-line plus moving averages, or K-line plus BOLL.
- Three configurable subcharts per period panel, defaulting to volume, MACD, and KDJ.
- Alert lights in the upper-right page area.
- Default generated alert sound and user-uploaded audio support.

This design does not include:

- Replacing the current screener page.
- A paid or exchange-authorized market-data integration.
- Server-side persistence for watch-page preferences.
- Push notifications outside the browser tab.
- Full trading/order-entry features.

## Page Structure

Add a new page named `watch.html`, with its own script named `assets/watch.js`. The existing `index.html` receives only a small navigation link or button named `实时盯盘`.

The watch page is organized into four main areas:

1. Top control bar
2. Main realtime area
3. Four period chart panels
4. Alert and audio controls

The layout should feel like a dense trading tool rather than a marketing page. It should prioritize readable charts, compact controls, and quick scanning.

## Top Control Bar

The top control bar contains:

- Stock code input.
- Load button.
- Saved category selector or expandable category list.
- Current stock name, code, latest price, change, and quote time.
- Previous and next buttons for the active category.
- Link back to the screener page.

Manual input accepts:

- Six-digit A-share codes such as `600519` or `000001`.
- Full symbols such as `sh600519`, `sz000001`, or `bj430047`.

When the user selects a category stock, the page records both the category name and the symbol index inside that category. Previous and next navigate only within that category. If a stock was loaded manually without an active category, previous and next are disabled.

## Category Source

The page reuses the existing browser-local category data:

- Storage key: `aShareCategories`
- Shape: `{ [categoryName]: string[] }`
- Symbol values: market-prefixed symbols such as `sh600519`

The watch page should read this data directly from `localStorage`. It does not need category editing controls in the first version because the screener page already owns category management.

The category UI should allow expanding a category and selecting a stock from it. If quote data is available, show stock names; otherwise show symbols and resolve names after loading quotes.

## Main Realtime Area

The main realtime area has two columns:

- Left: intraday time-share chart.
- Right: five-level order book.

The intraday chart shows the price line and, at the bottom of the same chart, volume bars. It should share crosshair behavior with the other charts where practical.

The order book shows:

- Sell 5 to Sell 1.
- Buy 1 to Buy 5.
- Price and volume for each level.

If the public quote source does not return complete five-level data for a symbol, the panel should show available values and mark missing levels as `--` rather than faking data.

## Period Panels

The lower area contains four period panels:

- 1-minute
- 5-minute
- 30-minute
- Daily K

Each panel contains:

- Header with period label and latest key values.
- Main-chart mode selector.
- Main K-line chart.
- Three subchart slots with selector controls.

Main-chart modes are independent per panel. Changing the 1-minute panel from moving averages to BOLL must not change the 5-minute, 30-minute, or daily panel. Store the selection with a per-period key.

The first version supports these main-chart modes:

- `ma`: K-line plus selected moving averages.
- `boll`: K-line plus BOLL upper, middle, and lower lines.

Each panel has exactly three subchart slots by default:

- Volume
- MACD
- KDJ

Each period panel stores its subchart order independently. For example, the 1-minute panel can display Volume, MACD, KDJ while the 5-minute panel displays KDJ, Volume, MACD.

## Alerts

The upper-right page area shows three alert lights:

1. `1分钟 KDJ > 80`
2. `5分钟 价格 > BOLL上轨`
3. `日K 价格 > BOLL上轨`

Each light has two states:

- Off: neutral gray.
- On: red.

For `1分钟 KDJ > 80`, use the latest 1-minute K-line KDJ values. Treat the condition as true if any of K, D, or J is greater than 80.

For the BOLL alerts, compare the latest close or realtime price against the latest BOLL upper band for that period. Prefer realtime price when available and fall back to the latest K-line close.

When two or more lights are red at the same time, the page plays an alert sound.

## Audio Behavior

The first version includes a default generated browser tone so no external audio file is required.

The page also includes:

- Enable sound button, required once because browsers block autoplay until user interaction.
- Upload audio input for a custom alert sound.
- Local browser persistence for the uploaded audio through IndexedDB. If IndexedDB storage fails, keep the uploaded sound for the current browser session only and show that status to the user.

Audio should not play repeatedly on every polling tick while the same alert set remains active. It should play when the alert count first reaches two or more, and may play again only after the alert count drops below two and then returns to two or more.

## Data Flow

The watch page reuses the existing public data strategy:

- Quote and order book: Tencent quote endpoint when possible.
- Minute and daily K-line data: existing Tencent/Eastmoney style K-line adapters.
- Indicators: existing MA, BOLL, MACD, and KDJ formulas.

Because the current app keeps many helper functions inside a single closure, implementation can either:

- Extract shared market-data and indicator helpers into a reusable file.
- Or duplicate the small required subset into `assets/watch.js` for a contained first version.

The preferred first implementation is conservative: keep the existing screener stable, reuse by extraction only if the resulting change is small and clear, and otherwise duplicate the minimum needed helpers for the watch page.

## Refresh Model

Use controllable polling:

- Quote and order book: about every 10 seconds.
- Minute K-lines: about every 30 seconds.
- Daily K-line: lower frequency, or refresh with the minute cycle if simple.

The page should expose a manual refresh action. Polling errors should be visible but should not clear the last valid chart immediately.

## Local Preferences

Persist these watch-page preferences in `localStorage`:

- Last loaded symbol.
- Last selected category.
- Per-period main-chart mode.
- Per-period subchart order.
- Uploaded alert audio through IndexedDB when storage succeeds.
- Sound enabled state only after user interaction in the current session; do not assume future autoplay permission.

## Error Handling

Show clear messages for:

- Invalid stock code.
- Missing quote data.
- Missing K-line data.
- Empty or missing saved categories.
- Public data-source request failures.

Do not fabricate missing prices, order book levels, or indicator values. Use `--` when data is unavailable.

## Verification

Manual verification should cover:

- Opening the existing screener page and confirming it still looks and behaves as before.
- Opening the new watch page from the screener entry.
- Loading a stock by manual input.
- Loading a stock from a saved category.
- Navigating previous and next within a category.
- Confirming each of the four period panels can independently switch between MA and BOLL.
- Confirming each period panel can independently reorder Volume, MACD, and KDJ subcharts.
- Confirming the top intraday chart includes bottom volume bars.
- Confirming order book missing values display as `--`.
- Confirming alert lights update from the latest indicator values.
- Confirming the default alert sound plays when two or more alert lights turn red after sound has been enabled.
- Confirming a custom uploaded sound can replace the default when supported by the browser.

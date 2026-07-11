# A Share Realtime MVP Design

## Goal

Build a local stock analysis app that can fetch realtime A-share quotes, show them in a table, and filter them by common quote fields. The first version uses a free public data source and keeps the data-source access isolated enough to replace later.

## Scope

This MVP includes:

- A zero-build local web app for browser use.
- A realtime A-share quote adapter backed by Eastmoney's public A-share spot endpoint.
- A normalized quote table with code, name, latest price, percent change, turnover, volume ratio, turnover rate, market cap, and source timestamp.
- Basic numeric filters for percent change, turnover, turnover rate, volume ratio, and price.
- CSV download of the filtered result.

This MVP does not include:

- Scheduled 14:30 screening.
- Push notifications.
- Tongdaxin-style formula parsing.
- Main-chart/sub-chart indicator rendering.
- Indicator-driven screening.

Those features should be added after the realtime quote and filter core is working.

## Architecture

The app keeps data access, filtering, and UI separated inside the static JavaScript:

- `fetchQuotes` requests Eastmoney quote data by JSONP.
- `normalizeQuote` converts provider fields to internal field names.
- `quoteMatches` applies pure filtering logic.
- Rendering functions update the table, summary, sorting, and CSV export.

The data source is intentionally isolated so a paid provider can replace Eastmoney later without changing the filtering and rendering logic.

## Data Source

Use free public A-share data first through Eastmoney. This is fast for prototyping but may be less stable than paid market-data APIs. The app displays a clear error when the source is unavailable.

## Verification

- Manual verification opens `index.html` in a browser, refreshes quotes, and checks filtering.
- The current machine has no Python or Node runtime available, so automated tests are deferred until a runtime is installed.

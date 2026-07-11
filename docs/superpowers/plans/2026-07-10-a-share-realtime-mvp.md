# A Share Realtime MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-build local web app that fetches realtime A-share quotes and filters them by common quote fields.

**Architecture:** Keep the data source, filtering logic, and UI clearly separated inside static JavaScript. Use Eastmoney JSONP for the first data adapter, with normalized internal field names so future providers can be swapped in.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Eastmoney public quote endpoint.

## Global Constraints

- Only A-share data is required.
- First version uses a free public data source and keeps the data-source access replaceable.
- Current MVP includes realtime quotes and basic filters only.
- Do not implement scheduled screening, notifications, Tongdaxin formula parsing, or indicator screening in this task.

---

### Task 1: Static App Shell And Core Logic

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/app.js`
- Create: `README.md`

**Interfaces:**
- Produces: `normalizeQuote(raw: object) -> object`
- Produces: `quoteMatches(quote: object, criteria: object) -> boolean`
- Produces: `fetchQuotes() -> Promise<object[]>`

- [x] **Step 1: Create the HTML app shell**
- [x] **Step 2: Add styling for filters, summary, and quote table**
- [x] **Step 3: Add quote normalization, filtering, sorting, and CSV export**
- [x] **Step 4: Add Eastmoney JSONP quote loading**

### Task 2: Manual Verification

**Files:**
- Verify: `index.html`

**Interfaces:**
- Consumes: browser support for JavaScript and JSONP script loading.

- [x] **Step 1: Open the app in a browser**
- [x] **Step 2: Click refresh and verify quote table or source error handling**
- [x] **Step 3: Change filters and verify the table updates**

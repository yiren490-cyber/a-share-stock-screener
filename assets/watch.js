(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.stockWatch = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const QUOTE_URL = "https://qt.gtimg.cn/q=";
  const EASTMONEY_KLINE_URL = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
  const TENCENT_DAY_KLINE_URLS = [
    "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
    "https://ifzq.gtimg.cn/appstock/app/fqkline/get",
  ];
  const TENCENT_MINUTE_KLINE_URL = "https://ifzq.gtimg.cn/appstock/app/kline/mkline";
  const PERIODS = ["m1", "m5", "m30", "m60"];
  const PERIOD_META = {
    m1: { label: "1分钟", klt: "1", bars: 120 },
    m5: { label: "5分钟", klt: "5", bars: 120 },
    m30: { label: "30分钟", klt: "30", bars: 120 },
    m60: { label: "60分钟", klt: "60", bars: 120 },
    day: { label: "日K", klt: "day", bars: 120 },
  };
  const ALERT_PERIODS = ["day"];
  const SUBCHARTS = ["volume", "macd", "kdj"];
  const SUBCHART_LABELS = { volume: "成交量", macd: "MACD", kdj: "KDJ" };
  const PANEL_STORAGE_KEY = "stockWatchPanelSettings";
  const LAST_SYMBOL_KEY = "stockWatchLastSymbol";
  const LAST_CATEGORY_KEY = "stockWatchLastCategory";
  const VISIBLE_BARS_KEY = "stockWatchVisibleBars";
  const SEARCH_HISTORY_KEY = "stockWatchSearchHistory";
  const BANNER_ITEMS_KEY = "stockWatchBannerItems";
  const SELECTED_BANNER_KEY = "stockWatchSelectedBanner";
  const QUOTE_NAME_CACHE_KEY = "stockWatchQuoteNames";
  const SELECTED_AUDIO_KEY = "stockWatchSelectedAudioId";
  const SOUND_ENABLED_KEY = "stockWatchSoundEnabled";
  const STOCK_NOTES_KEY = "stockWatchNotes";
  const NOTE_TYPES = [
    { key: "watch", label: "盯盘笔记" },
    { key: "trend", label: "K线趋势分析" },
    { key: "news", label: "消息面行情分析" },
  ];
  const NOTE_EDITOR_LABELS = { watch: "实时盯盘", trend: "K线趋势分析", news: "行情分析" };
  const QUOTE_REFRESH_MS = 500;
  const KLINE_REFRESH_MS = 1500;
  const AUDIO_DB = "stockWatchAudio";
  const TRADING_TICKS = [
    { label: "9:30", minute: 570 },
    { label: "10:30", minute: 630 },
    { label: "11:30", minute: 690 },
    { label: "13:00", minute: 780 },
    { label: "14:00", minute: 840 },
    { label: "15:00", minute: 900 },
  ];
  const VISIBLE_BAR_STEPS = [20, 40, 80, 120, 200, 320];

  function normalizeSymbol(input) {
    const text = String(input || "").trim().toLowerCase();
    const full = text.match(/^(sh|sz|bj)(\d{6})$/);
    if (full) return `${full[1]}${full[2]}`;
    if (!/^\d{6}$/.test(text)) return "";
    if (text.startsWith("6")) return `sh${text}`;
    if (text.startsWith("4") || text.startsWith("8") || text.startsWith("9")) return `bj${text}`;
    return `sz${text}`;
  }

  function readCategories(storage) {
    try {
      const parsed = JSON.parse((storage && storage.getItem("aShareCategories")) || "{}");
      return Object.fromEntries(
        Object.entries(parsed || {}).map(([name, symbols]) => [
          name,
          [...new Set((Array.isArray(symbols) ? symbols : []).map(normalizeSymbol).filter(Boolean))],
        ])
      );
    } catch (_) {
      return {};
    }
  }

  function makeCategoryNavigator(categories, categoryName, symbol) {
    const symbols = ((categories && categories[categoryName]) || []).map(normalizeSymbol).filter(Boolean);
    const normalized = normalizeSymbol(symbol);
    const index = symbols.indexOf(normalized);
    return {
      categoryName: index >= 0 ? categoryName : "",
      symbols,
      index,
      previous: index > 0 ? symbols[index - 1] : "",
      next: index >= 0 && index < symbols.length - 1 ? symbols[index + 1] : "",
    };
  }

  function defaultPanelSettings() {
    return Object.fromEntries(PERIODS.map((period) => [period, { mainMode: "ma", subcharts: [...SUBCHARTS] }]));
  }

  function normalizeSubcharts(value) {
    if (!Array.isArray(value)) return [...SUBCHARTS];
    const unique = value.filter((item, index) => SUBCHARTS.includes(item) && value.indexOf(item) === index);
    return unique.length === SUBCHARTS.length ? unique : [...SUBCHARTS];
  }

  function mergePanelSettings(saved) {
    const defaults = defaultPanelSettings();
    PERIODS.forEach((period) => {
      const item = saved && saved[period] ? saved[period] : {};
      defaults[period] = {
        mainMode: item.mainMode === "boll" ? "boll" : "ma",
        subcharts: normalizeSubcharts(item.subcharts),
      };
    });
    return defaults;
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function priceAboveUpper(item) {
    if (!item) return false;
    const price = finiteNumber(item.price);
    const upper = finiteNumber(item.upper);
    return price !== null && upper !== null && price > upper;
  }

  function evaluateAlerts(data) {
    const kdj = data && data.minuteKdj ? data.minuteKdj : {};
    const j = finiteNumber(kdj.j);
    const minuteKdj = j !== null && j > 80;
    const intradayBlue = data && data.intradayTrend && data.intradayTrend.color === "blue";
    const fiveMinuteBoll = priceAboveUpper(data && data.fiveMinute);
    const dayBoll = priceAboveUpper(data && data.day);
    const count = [minuteKdj, intradayBlue, fiveMinuteBoll, dayBoll].filter(Boolean).length;
    return {
      minuteKdj,
      intradayBlue,
      fiveMinuteBoll,
      dayBoll,
      count,
      shouldPlay: count >= 2 && Number(data && data.previousCount) < 2,
    };
  }

  function tradingSessionTicks() {
    return TRADING_TICKS.map((tick) => ({ ...tick }));
  }

  function minuteToTradingSlot(dateText) {
    const match = String(dateText || "").match(/(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const minute = Number(match[1]) * 60 + Number(match[2]);
    if (minute >= 570 && minute <= 690) return minute - 570;
    if (minute >= 780 && minute <= 900) return 120 + (minute - 780);
    return null;
  }

  function slotToTradingTime(slotValue) {
    const slot = Math.max(0, Math.min(240, Math.round(Number(slotValue) || 0)));
    const minute = slot <= 120 ? 570 + slot : 780 + (slot - 120);
    const hour = Math.floor(minute / 60);
    const min = minute % 60;
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  function clampSlotToDataRange(slotValue, plottedRows) {
    const rows = (plottedRows || []).filter((row) => Number.isFinite(row.slot));
    if (!rows.length) return 0;
    const min = Math.min(...rows.map((row) => row.slot));
    const max = Math.max(...rows.map((row) => row.slot));
    return Math.max(min, Math.min(max, Number(slotValue) || 0));
  }

  function adjustVisibleBars(current, direction) {
    const value = Number(current) || 120;
    if (direction === "in") return [...VISIBLE_BAR_STEPS].reverse().find((step) => step < value) || VISIBLE_BAR_STEPS[0];
    return VISIBLE_BAR_STEPS.find((step) => step > value) || VISIBLE_BAR_STEPS[VISIBLE_BAR_STEPS.length - 1];
  }

  function recentTradeRows(rows, count = 12) {
    return (rows || [])
      .slice(-count)
      .reverse()
      .map((row) => ({
        time: String(row.date || "").slice(-5),
        price: Number(row.close),
        volume: Number(row.volume || 0) * 100,
      }));
  }

  function latestTradingDayRows(rows) {
    const latestRow = [...(rows || [])].reverse().find((row) => row && typeof row.date === "string" && row.date.length >= 10);
    if (!latestRow) return [];
    const latestDate = latestRow.date.slice(0, 10);
    return rows.filter((row) => row && typeof row.date === "string" && row.date.slice(0, 10) === latestDate);
  }

  function readSoundEnabled(storage) {
    try {
      return storage && storage.getItem(SOUND_ENABLED_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function saveSoundEnabled(storage, enabled) {
    try {
      if (storage) storage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
    } catch (_) {
      // Storage can be unavailable in private contexts.
    }
  }

  function normalizeSearchHistory(history, limit = 12) {
    return (Array.isArray(history) ? history : [])
      .map((item) => {
        const symbol = normalizeSymbol(typeof item === "string" ? item : item && item.symbol);
        if (!symbol) return null;
        const name = String((item && item.name) || symbol).trim() || symbol;
        return { symbol, name };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  function readSearchHistory(storage) {
    try {
      return normalizeSearchHistory(JSON.parse((storage && storage.getItem(SEARCH_HISTORY_KEY)) || "[]"));
    } catch (_) {
      return [];
    }
  }

  function addSearchHistory(history, symbol, name = "", limit = 12) {
    const normalized = normalizeSymbol(symbol);
    const current = normalizeSearchHistory(history, limit);
    if (!normalized) return current;
    const label = String(name || normalized).trim() || normalized;
    const existing = current.filter((item) => item.symbol !== normalized);
    return [{ symbol: normalized, name: label }, ...existing].slice(0, limit);
  }

  function removeSearchHistory(history, symbol) {
    const normalized = normalizeSymbol(symbol);
    return normalizeSearchHistory(history).filter((item) => item.symbol !== normalized);
  }

  function saveSearchHistory(storage, history) {
    if (storage) storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify((history || []).slice(0, 12)));
  }

  function dateValue(dateText) {
    const text = String(dateText || "");
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return Number.NEGATIVE_INFINITY;
    return Number(`${match[1]}${match[2]}${match[3]}${match[4] || "00"}${match[5] || "00"}`);
  }

  function nearestIndexForDate(rows, dateText) {
    if (!rows || !rows.length) return -1;
    const target = dateValue(dateText);
    let bestIndex = 0;
    let bestDiff = Math.abs(dateValue(rows[0].date) - target);
    rows.forEach((row, index) => {
      const diff = Math.abs(dateValue(row.date) - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function clampVisibleBars(value) {
    const number = Number(value) || 120;
    return VISIBLE_BAR_STEPS.reduce((best, step) => (Math.abs(step - number) < Math.abs(best - number) ? step : best), 120);
  }

  function toNumber(value) {
    if (value === "" || value === "-" || value === undefined || value === null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, digits = 2) {
    const number = toNumber(value);
    return number === null ? "--" : number.toFixed(digits);
  }

  function formatVolume(value) {
    const number = toNumber(value);
    if (number === null) return "--";
    if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(2)}亿`;
    if (Math.abs(number) >= 10000) return `${(number / 10000).toFixed(2)}万`;
    return String(Math.round(number));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function eastmoneySecid(symbol) {
    return `${symbol.startsWith("sh") ? "1" : "0"}.${symbol.slice(2)}`;
  }

  function eastmoneyKlt(period) {
    if (period === "day") return "101";
    return PERIOD_META[period] ? PERIOD_META[period].klt : period;
  }

  function normalizeKlineDate(value) {
    const text = String(value || "");
    const minute = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (minute) return `${minute[1]}-${minute[2]}-${minute[3]} ${minute[4]}:${minute[5]}`;
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    return compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : text;
  }

  function normalizeEastmoneyKlines(klines) {
    return (klines || [])
      .map((item) => {
        const parts = String(item).split(",");
        return {
          date: normalizeKlineDate(parts[0]),
          open: Number(parts[1]),
          close: Number(parts[2]),
          high: Number(parts[3]),
          low: Number(parts[4]),
          volume: Number(parts[5]),
        };
      })
      .filter((row) => row.date && Number.isFinite(row.open) && Number.isFinite(row.close) && Number.isFinite(row.high) && Number.isFinite(row.low));
  }

  function normalizeTencentKlineRows(rows) {
    return (rows || [])
      .map((row) => ({
        date: normalizeKlineDate(row[0]),
        open: Number(row[1]),
        close: Number(row[2]),
        high: Number(row[3]),
        low: Number(row[4]),
        volume: Number(row[5]),
      }))
      .filter((row) => row.date && Number.isFinite(row.open) && Number.isFinite(row.close) && Number.isFinite(row.high) && Number.isFinite(row.low));
  }

  function parseQuoteLine(line) {
    const match = String(line || "").match(/^v_([a-z]{2}\d{6})="(.*)";?$/);
    if (!match) return null;
    const symbol = match[1];
    const fields = match[2].split("~");
    if (!fields[1] || !fields[2]) return null;
    const latestPrice = toNumber(fields[3]);
    const prevClose = toNumber(fields[4]);
    const pctChange = toNumber(fields[32]);
    const level = (side, index, priceField, volumeField) => ({
      side,
      level: index,
      price: toNumber(fields[priceField]),
      volume: toNumber(fields[volumeField]),
    });
    return {
      symbol,
      code: fields[2],
      name: fields[1],
      latestPrice,
      prevClose,
      open: toNumber(fields[5]),
      volume: toNumber(fields[6]) === null ? null : Number(fields[6]) * 100,
      pctChange,
      rawTime: formatQuoteTime(fields[30]),
      orderBook: [
        level("buy", 1, 9, 10),
        level("buy", 2, 11, 12),
        level("buy", 3, 13, 14),
        level("buy", 4, 15, 16),
        level("buy", 5, 17, 18),
        level("sell", 1, 19, 20),
        level("sell", 2, 21, 22),
        level("sell", 3, 23, 24),
        level("sell", 4, 25, 26),
        level("sell", 5, 27, 28),
      ],
    };
  }

  function formatQuoteTime(value) {
    const text = String(value || "");
    const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}` : text;
  }

  function movingAverage(rows, period, key = "close") {
    let sum = 0;
    return rows.map((row, index) => {
      sum += Number(row[key] || 0);
      if (index >= period) sum -= Number(rows[index - period][key] || 0);
      return index + 1 >= period ? sum / period : null;
    });
  }

  function calculateBoll(rows, period = 20) {
    const mid = movingAverage(rows, period, "close");
    return rows.map((row, index) => {
      if (index + 1 < period || mid[index] === null) return { boll: null, ub: null, lb: null };
      const start = index - period + 1;
      const variance = rows.slice(start, index + 1).reduce((sum, item) => sum + (item.close - mid[index]) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      return { boll: mid[index], ub: mid[index] + 2 * std, lb: mid[index] - 2 * std };
    });
  }

  function ema(values, period) {
    const alpha = 2 / (period + 1);
    const result = [];
    values.forEach((value, index) => {
      result[index] = index === 0 ? value : alpha * value + (1 - alpha) * result[index - 1];
    });
    return result;
  }

  function macd(rows) {
    const closes = rows.map((row) => row.close);
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const dif = ema12.map((value, index) => value - ema26[index]);
    const dea = ema(dif, 9);
    return dif.map((value, index) => ({ dif: value, dea: dea[index], hist: (value - dea[index]) * 2 }));
  }

  function sma(values, period, weight) {
    const result = [];
    values.forEach((value, index) => {
      result[index] = index === 0 ? value : (weight * value + (period - weight) * result[index - 1]) / period;
    });
    return result;
  }

  function calculateKdj(rows, period = 9) {
    const rsv = rows.map((row, index) => {
      const windowRows = rows.slice(Math.max(0, index - period + 1), index + 1);
      const low = Math.min(...windowRows.map((item) => item.low));
      const high = Math.max(...windowRows.map((item) => item.high));
      return high === low ? 50 : ((row.close - low) / (high - low)) * 100;
    });
    const kValues = sma(rsv, 3, 1);
    const dValues = sma(kValues, 3, 1);
    return rows.map((_, index) => ({ k: kValues[index], d: dValues[index], j: 3 * kValues[index] - 2 * dValues[index] }));
  }

  function intradayPriceLineColor({ trend, previousTrend }) {
    const current = finiteNumber(trend);
    const previous = finiteNumber(previousTrend);
    const v12 = current !== null && previous !== null && previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    if (current !== null && current <= 13 && v12 > 13) return "red";
    if (current !== null && current >= 90 && v12 !== 0) return "blue";
    if (current !== null && current <= 13) return "yellow";
    return "black";
  }

  function calculateIntradayTrendStates(rows) {
    const base = (rows || []).map((row, index) => {
      const windowRows = rows.slice(Math.max(0, index - 54), index + 1);
      const low = Math.min(...windowRows.map((item) => item.low));
      const high = Math.max(...windowRows.map((item) => item.high));
      return high === low ? 50 : ((row.close - low) / (high - low)) * 100;
    });
    const fast = sma(base, 5, 1);
    const slow = sma(fast, 3, 1);
    const v11 = fast.map((value, index) => 3 * value - 2 * slow[index]);
    const trend = ema(v11, 3);
    return trend.map((value, index) => ({
      trend: value,
      previousTrend: index > 0 ? trend[index - 1] : value,
      color: intradayPriceLineColor({ trend: value, previousTrend: index > 0 ? trend[index - 1] : value }),
    }));
  }

  function initWatchPage(doc) {
    if (!doc || !root || !root.document) return;
    const state = {
      doc,
      categories: readCategories(root.localStorage),
      categoryName: root.localStorage.getItem(LAST_CATEGORY_KEY) || "",
      symbol: "",
      quote: null,
      klineByPeriod: {},
      hoverDate: "",
      quoteTimer: null,
      klineTimer: null,
      realtimeEnabled: false,
      panelSettings: mergePanelSettings(JSON.parse(root.localStorage.getItem(PANEL_STORAGE_KEY) || "null")),
      visibleBars: clampVisibleBars(Number(root.localStorage.getItem(VISIBLE_BARS_KEY) || "120")),
      searchHistory: readSearchHistory(root.localStorage),
      openCategories: new Set(),
      previousAlertCount: 0,
      soundEnabled: readSoundEnabled(root.localStorage),
      uploadedAudioUrl: "",
      uploadedAudioObjectUrl: "",
      audioItems: [],
      selectedAudioId: root.localStorage.getItem(SELECTED_AUDIO_KEY) || "",
      audioReadyPromise: null,
      alertAudio: null,
      alertToneTimer: null,
      alertLoopActive: false,
      bannerItems: readBannerItems(root.localStorage),
      selectedBannerId: root.localStorage.getItem(SELECTED_BANNER_KEY) || "",
      notesBySymbol: readStockNotes(root.localStorage),
      activeNoteType: "watch",
      quoteLoading: false,
      klineLoading: false,
      lastStatusAt: 0,
      quoteNameCache: readQuoteNameCache(root.localStorage),
    };
    const els = collectEls(doc);
    renderEmptyOrderBook(els.orderBook);
    renderPeriodPanels(state, els);
    updateZoomStatus(state, els);
    renderCategories(state, els);
    hydrateCategoryNames(state, els);
    renderSearchHistory(state, els);
    renderBannerList(state, els);
    renderAudioPicker(state, els);
    renderSoundButton(state, els);
    bindWatchEvents(state, els);
    state.audioReadyPromise = loadStoredAudio(state, els);
    const lastSymbol = normalizeSymbol(root.localStorage.getItem(LAST_SYMBOL_KEY) || "");
    if (lastSymbol) loadSymbol(state, els, lastSymbol, state.categoryName);
  }

  function collectEls(doc) {
    return {
      status: doc.getElementById("watchStatus"),
      symbolInput: doc.getElementById("watchSymbolInput"),
      searchHistory: doc.getElementById("watchSearchHistory"),
      loadButton: doc.getElementById("watchLoadButton"),
      refreshButton: doc.getElementById("watchRefreshButton"),
      prevButton: doc.getElementById("watchPrevButton"),
      nextButton: doc.getElementById("watchNextButton"),
      categoryList: doc.getElementById("watchCategoryList"),
      stockTitle: doc.getElementById("watchStockTitle"),
      notesButton: doc.getElementById("watchNotesButton"),
      notesPreview: doc.getElementById("watchNotesPreview"),
      notesModal: doc.getElementById("watchNotesModal"),
      notesDialog: doc.querySelector(".watch-notes-dialog"),
      notesCloseButton: doc.getElementById("watchNotesCloseButton"),
      notesEditor: doc.getElementById("watchNotesEditor"),
      stockMeta: doc.getElementById("watchStockMeta"),
      priceBadge: doc.getElementById("watchPriceBadge"),
      intradayChart: doc.getElementById("intradayChart"),
      intradayInfo: doc.getElementById("intradayInfo"),
      orderBook: doc.getElementById("orderBook"),
      periodPanels: doc.getElementById("periodPanels"),
      alertLights: doc.getElementById("alertLights"),
      enableSoundButton: doc.getElementById("enableSoundButton"),
      alertAudioInput: doc.getElementById("alertAudioInput"),
      alertAudioSelect: doc.getElementById("alertAudioSelect"),
      deleteAudioButton: doc.getElementById("deleteAudioButton"),
      audioStatus: doc.getElementById("audioStatus"),
      bannerButton: doc.getElementById("watchBannerButton"),
      bannerModal: doc.getElementById("watchBannerModal"),
      bannerCloseButton: doc.getElementById("watchBannerCloseButton"),
      bannerInput: doc.getElementById("watchBannerInput"),
      bannerAddButton: doc.getElementById("watchBannerAddButton"),
      bannerList: doc.getElementById("watchBannerList"),
      alertBanner: doc.getElementById("watchAlertBanner"),
      zoomInButton: doc.getElementById("watchZoomInButton"),
      zoomOutButton: doc.getElementById("watchZoomOutButton"),
      zoomResetButton: doc.getElementById("watchZoomResetButton"),
      zoomStatus: doc.getElementById("watchZoomStatus"),
    };
  }

  function bindWatchEvents(state, els) {
    els.loadButton.addEventListener("click", () => loadFromInput(state, els));
    els.symbolInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadFromInput(state, els);
    });
    els.refreshButton.addEventListener("click", () => toggleRealtimeRefresh(state, els));
    els.prevButton.addEventListener("click", () => {
      const nav = makeCategoryNavigator(state.categories, state.categoryName, state.symbol);
      if (nav.previous) loadSymbol(state, els, nav.previous, state.categoryName);
    });
    els.nextButton.addEventListener("click", () => {
      const nav = makeCategoryNavigator(state.categories, state.categoryName, state.symbol);
      if (nav.next) loadSymbol(state, els, nav.next, state.categoryName);
    });
    els.enableSoundButton.addEventListener("click", async () => {
      await setSoundEnabled(state, els, !state.soundEnabled);
    });
    els.alertAudioInput.addEventListener("change", () => handleAudioUpload(state, els));
    els.alertAudioSelect.addEventListener("change", async () => {
      if (state.audioReadyPromise) await state.audioReadyPromise;
      selectAlertAudio(state, els, els.alertAudioSelect.value);
    });
    els.deleteAudioButton.addEventListener("click", async () => {
      if (state.audioReadyPromise) await state.audioReadyPromise;
      await deleteSelectedAudio(state, els);
    });
    els.bannerButton.addEventListener("click", () => openBannerModal(els));
    els.bannerCloseButton.addEventListener("click", () => closeBannerModal(els));
    els.bannerModal.addEventListener("click", (event) => {
      if (event.target === els.bannerModal) closeBannerModal(els);
    });
    els.bannerAddButton.addEventListener("click", () => addBannerFromInput(state, els));
    els.bannerInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) addBannerFromInput(state, els);
    });
    els.notesButton.addEventListener("mouseenter", () => showNotesPreview(state, els));
    els.notesButton.addEventListener("mouseleave", () => hideNotesPreview(els));
    els.notesButton.addEventListener("click", () => openNotesModal(state, els));
    els.notesCloseButton.addEventListener("click", () => closeNotesModal(els));
    els.notesModal.addEventListener("click", (event) => {
      if (event.target === els.notesModal) closeNotesModal(els);
    });
    enableNotesDialogDrag(els);
    els.zoomInButton.addEventListener("click", () => setVisibleBars(state, els, adjustVisibleBars(state.visibleBars, "in")));
    els.zoomOutButton.addEventListener("click", () => setVisibleBars(state, els, adjustVisibleBars(state.visibleBars, "out")));
    els.zoomResetButton.addEventListener("click", () => setVisibleBars(state, els, 120));
  }

  function renderSearchHistory(state, els) {
    if (!els.searchHistory) return;
    if (!state.searchHistory.length) {
      els.searchHistory.innerHTML = '<span class="watch-search-empty">暂无搜索记录</span>';
      return;
    }
    els.searchHistory.innerHTML =
      '<button class="watch-history-clear" type="button">全部删除</button>' +
      state.searchHistory
        .map(
          (item) =>
            `<span class="watch-history-item"><button type="button" data-history-symbol="${item.symbol}"><strong>${escapeHtml(item.name)}</strong><em>${item.symbol.slice(2)}</em></button><button class="watch-history-remove" type="button" aria-label="删除${escapeHtml(item.name)}" data-history-remove="${item.symbol}">×</button></span>`
        )
        .join("");
    const clearButton = els.searchHistory.querySelector(".watch-history-clear");
    if (clearButton) {
      clearButton.addEventListener("click", (event) => {
        event.preventDefault();
        state.searchHistory = [];
        saveSearchHistory(root.localStorage, state.searchHistory);
        renderSearchHistory(state, els);
      });
    }
    els.searchHistory.querySelectorAll("[data-history-symbol]").forEach((button) => {
      button.addEventListener("click", () => {
        els.symbolInput.value = button.dataset.historySymbol;
        els.symbolInput.focus();
      });
    });
    els.searchHistory.querySelectorAll("[data-history-remove]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.searchHistory = removeSearchHistory(state.searchHistory, button.dataset.historyRemove);
        saveSearchHistory(root.localStorage, state.searchHistory);
        renderSearchHistory(state, els);
      });
    });
  }

  function normalizeBannerItems(items) {
    const source = Array.isArray(items) ? items : [];
    const seen = new Set();
    return source
      .map((item) => {
        const text = String(item && item.text ? item.text : "").trim();
        const id = String(item && item.id ? item.id : "");
        return { id: id || makeBannerId(text), text };
      })
      .filter((item) => {
        if (!item.text || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 30);
  }

  function readBannerItems(storage) {
    try {
      return normalizeBannerItems(JSON.parse((storage && storage.getItem(BANNER_ITEMS_KEY)) || "[]"));
    } catch (_) {
      return [];
    }
  }

  function makeBannerId(text) {
    return `banner-${Date.now().toString(36)}-${Math.abs(hashText(text)).toString(36)}`;
  }

  function hashText(text) {
    return String(text || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  }

  function saveBannerSettings(state) {
    root.localStorage.setItem(BANNER_ITEMS_KEY, JSON.stringify(state.bannerItems));
    root.localStorage.setItem(SELECTED_BANNER_KEY, state.selectedBannerId || "");
  }

  function readQuoteNameCache(storage) {
    try {
      const parsed = JSON.parse((storage && storage.getItem(QUOTE_NAME_CACHE_KEY)) || "{}");
      return Object.fromEntries(
        Object.entries(parsed || {})
          .map(([symbol, name]) => [normalizeSymbol(symbol), String(name || "").trim()])
          .filter(([symbol, name]) => symbol && name)
      );
    } catch (_) {
      return {};
    }
  }

  function saveQuoteNameCache(storage, cache) {
    storage.setItem(QUOTE_NAME_CACHE_KEY, JSON.stringify(cache || {}));
  }

  function selectedBannerText(state) {
    const item = state.bannerItems.find((banner) => banner.id === state.selectedBannerId);
    return item ? item.text : "";
  }

  function renderBannerList(state, els) {
    if (!els.bannerList) return;
    if (!state.bannerItems.length) {
      els.bannerList.innerHTML = '<p class="watch-banner-empty">暂无横幅内容</p>';
      updateAlertBanner(state, els);
      return;
    }
    els.bannerList.innerHTML = state.bannerItems
      .map(
        (item) => `<div class="watch-banner-item">
          <input type="radio" name="watchBannerChoice" value="${item.id}" ${item.id === state.selectedBannerId ? "checked" : ""} />
          <textarea rows="2" data-banner-edit="${item.id}">${escapeHtml(item.text)}</textarea>
          <button type="button" data-banner-save="${item.id}">保存</button>
          <button type="button" data-banner-remove="${item.id}" aria-label="删除横幅">×</button>
        </div>`
      )
      .join("");
    els.bannerList.querySelectorAll('input[name="watchBannerChoice"]').forEach((input) => {
      input.addEventListener("change", () => {
        state.selectedBannerId = input.value;
        saveBannerSettings(state);
        updateAlertBanner(state, els);
      });
    });
    els.bannerList.querySelectorAll("[data-banner-save]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.bannerSave;
        const input = els.bannerList.querySelector(`[data-banner-edit="${id}"]`);
        const text = String((input && input.value) || "").trim();
        if (!text) return;
        state.bannerItems = state.bannerItems.map((item) => (item.id === id ? { ...item, text } : item));
        saveBannerSettings(state);
        renderBannerList(state, els);
      });
    });
    els.bannerList.querySelectorAll("[data-banner-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.bannerRemove;
        state.bannerItems = state.bannerItems.filter((item) => item.id !== id);
        if (state.selectedBannerId === id) state.selectedBannerId = state.bannerItems[0] ? state.bannerItems[0].id : "";
        saveBannerSettings(state);
        renderBannerList(state, els);
      });
    });
    updateAlertBanner(state, els);
  }

  function openBannerModal(els) {
    if (!els.bannerModal) return;
    els.bannerModal.hidden = false;
    if (els.bannerInput) els.bannerInput.focus();
  }

  function closeBannerModal(els) {
    if (els.bannerModal) els.bannerModal.hidden = true;
  }

  function addBannerFromInput(state, els) {
    const text = String((els.bannerInput && els.bannerInput.value) || "").trim();
    if (!text) return;
    const item = { id: makeBannerId(text), text };
    state.bannerItems = normalizeBannerItems([item, ...state.bannerItems]);
    state.selectedBannerId = item.id;
    saveBannerSettings(state);
    if (els.bannerInput) els.bannerInput.value = "";
    renderBannerList(state, els);
  }

  function updateAlertBanner(state, els) {
    if (!els.alertBanner) return;
    const text = selectedBannerText(state);
    const shouldShow = Boolean(state.soundEnabled && state.previousAlertCount >= 2 && text);
    els.alertBanner.classList.toggle("is-active", shouldShow);
    const content = els.alertBanner.querySelector("span");
    if (content) content.textContent = shouldShow ? text : "";
  }

  function normalizeStockNotes(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(
      Object.entries(source)
        .map(([symbol, groups]) => {
          const normalizedSymbol = normalizeSymbol(symbol);
          if (!normalizedSymbol || !groups || typeof groups !== "object") return null;
          const normalizedGroups = Object.fromEntries(
            NOTE_TYPES.map(({ key }) => [
              key,
              (Array.isArray(groups[key]) ? groups[key] : [])
                .map((note) => ({
                  id: String(note && note.id ? note.id : makeNoteId()),
                  text: String(note && note.text ? note.text : "").trim(),
                  createdAt: Number(note && note.createdAt) || Date.now(),
                }))
                .filter((note) => note.text)
                .sort((a, b) => b.createdAt - a.createdAt),
            ])
          );
          return [normalizedSymbol, normalizedGroups];
        })
        .filter(Boolean)
    );
  }

  function readStockNotes(storage) {
    try {
      return normalizeStockNotes(JSON.parse((storage && storage.getItem(STOCK_NOTES_KEY)) || "{}"));
    } catch (_) {
      return {};
    }
  }

  function saveStockNotes(storage, notesBySymbol) {
    storage.setItem(STOCK_NOTES_KEY, JSON.stringify(notesBySymbol || {}));
  }

  function defaultNoteGroups() {
    return Object.fromEntries(NOTE_TYPES.map(({ key }) => [key, []]));
  }

  function notesForSymbol(state) {
    const symbol = normalizeSymbol(state && state.symbol);
    if (!symbol) return defaultNoteGroups();
    if (!state.notesBySymbol[symbol]) state.notesBySymbol[symbol] = defaultNoteGroups();
    return state.notesBySymbol[symbol];
  }

  function makeNoteId() {
    return `note-${Date.now().toString(36)}-${Math.round(Math.random() * 100000).toString(36)}`;
  }

  function addStockNote(state, symbol, type, text) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const clean = String(text || "").trim();
    if (!normalizedSymbol || !NOTE_TYPES.some((item) => item.key === type) || !clean) return null;
    if (!state.notesBySymbol[normalizedSymbol]) state.notesBySymbol[normalizedSymbol] = defaultNoteGroups();
    const note = { id: makeNoteId(), text: clean, createdAt: Date.now() };
    state.notesBySymbol[normalizedSymbol][type] = [note, ...state.notesBySymbol[normalizedSymbol][type]].sort((a, b) => b.createdAt - a.createdAt);
    saveStockNotes(root.localStorage, state.notesBySymbol);
    return note;
  }

  function removeStockNote(state, symbol, type, id) {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!normalizedSymbol || !state.notesBySymbol[normalizedSymbol] || !state.notesBySymbol[normalizedSymbol][type]) return;
    state.notesBySymbol[normalizedSymbol][type] = state.notesBySymbol[normalizedSymbol][type].filter((note) => note.id !== id);
    saveStockNotes(root.localStorage, state.notesBySymbol);
  }

  function updateStockNote(state, symbol, type, id, text) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const clean = String(text || "").trim();
    if (!normalizedSymbol || !clean || !state.notesBySymbol[normalizedSymbol] || !state.notesBySymbol[normalizedSymbol][type]) return false;
    let changed = false;
    state.notesBySymbol[normalizedSymbol][type] = state.notesBySymbol[normalizedSymbol][type].map((note) => {
      if (note.id !== id) return note;
      changed = true;
      return { ...note, text: clean };
    });
    if (changed) saveStockNotes(root.localStorage, state.notesBySymbol);
    return changed;
  }

  function hasNotesForSymbol(state, symbol) {
    const normalizedSymbol = normalizeSymbol(symbol);
    const groups = normalizedSymbol && state.notesBySymbol[normalizedSymbol];
    return Boolean(groups && NOTE_TYPES.some(({ key }) => Array.isArray(groups[key]) && groups[key].length));
  }

  function updateNotesButtonState(state, els) {
    if (els.notesButton) els.notesButton.classList.toggle("has-notes", hasNotesForSymbol(state, state.symbol));
  }

  function noteTime(createdAt) {
    const date = new Date(Number(createdAt) || Date.now());
    return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function renderNoteItems(notes, limit = Infinity, editable = false) {
    const shown = (notes || []).slice(0, limit);
    if (!shown.length) return '<div class="watch-note-empty">暂无笔记</div>';
    const countClass = `count-${Math.min(shown.length, 3)}`;
    return `<div class="watch-note-items ${countClass}">${shown
      .map(
        (note) => `<article class="watch-note-item">
          <time>${escapeHtml(noteTime(note.createdAt))}</time>
          ${editable ? `<textarea rows="3" data-note-edit="${note.id}">${escapeHtml(note.text)}</textarea><div class="watch-note-actions"><button type="button" data-note-save="${note.id}">保存</button><button type="button" data-note-delete="${note.id}" aria-label="删除笔记">删除</button></div>` : `<p>${escapeHtml(note.text)}</p>`}
        </article>`
      )
      .join("")}</div>`;
  }

  function renderNotesPreview(state, els) {
    const groups = notesForSymbol(state);
    els.notesPreview.innerHTML = NOTE_TYPES.map(({ key, label }) => `<section class="watch-note-column"><h3>${label}</h3>${renderNoteItems(groups[key], 3, false)}</section>`).join("");
  }

  function showNotesPreview(state, els) {
    if (!els.notesPreview || els.notesModal.hidden === false) return;
    renderNotesPreview(state, els);
    els.notesPreview.hidden = false;
  }

  function hideNotesPreview(els) {
    if (els.notesPreview) els.notesPreview.hidden = true;
  }

  function renderNotesEditor(state, els) {
    const groups = notesForSymbol(state);
    const selectedType = NOTE_TYPES.some((item) => item.key === state.activeNoteType) ? state.activeNoteType : "watch";
    state.activeNoteType = selectedType;
    const selectedLabel = NOTE_EDITOR_LABELS[selectedType] || NOTE_TYPES.find((item) => item.key === selectedType).label;
    els.notesEditor.innerHTML = `<section class="watch-notes-single" data-note-type="${selectedType}">
      <label class="watch-note-type-field">
        <span>笔记分类</span>
        <select data-note-type-select>
          ${NOTE_TYPES.map(({ key, label }) => `<option value="${key}" ${key === selectedType ? "selected" : ""}>${NOTE_EDITOR_LABELS[key] || label}</option>`).join("")}
        </select>
      </label>
      <div class="watch-note-new">
        <h3>新笔记</h3>
        <textarea rows="4" data-note-input="${selectedType}"></textarea>
        <button type="button" data-note-add="${selectedType}">添加笔记</button>
      </div>
      <section class="watch-note-list-panel">
        <h3>${selectedLabel}</h3>
        ${renderNoteItems(groups[selectedType], Infinity, true)}
      </section>
    </section>`;
    const typeSelect = els.notesEditor.querySelector("[data-note-type-select]");
    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        state.activeNoteType = typeSelect.value;
        renderNotesEditor(state, els);
      });
    }
    els.notesEditor.querySelectorAll("[data-note-add]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.noteAdd;
        const input = els.notesEditor.querySelector(`[data-note-input="${type}"]`);
        if (addStockNote(state, state.symbol, type, input && input.value)) {
          updateNotesButtonState(state, els);
          renderNotesEditor(state, els);
        }
      });
    });
    els.notesEditor.querySelectorAll("[data-note-input]").forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          const type = input.dataset.noteInput;
          if (addStockNote(state, state.symbol, type, input.value)) {
            updateNotesButtonState(state, els);
            renderNotesEditor(state, els);
          }
        }
      });
    });
    els.notesEditor.querySelectorAll("[data-note-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.closest("[data-note-type]").dataset.noteType;
        removeStockNote(state, state.symbol, type, button.dataset.noteDelete);
        updateNotesButtonState(state, els);
        renderNotesEditor(state, els);
      });
    });
    els.notesEditor.querySelectorAll("[data-note-save]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.closest("[data-note-type]").dataset.noteType;
        const id = button.dataset.noteSave;
        const input = els.notesEditor.querySelector(`[data-note-edit="${id}"]`);
        if (updateStockNote(state, state.symbol, type, id, input && input.value)) renderNotesEditor(state, els);
      });
    });
  }

  function openNotesModal(state, els) {
    hideNotesPreview(els);
    renderNotesEditor(state, els);
    els.notesModal.hidden = false;
    centerNotesDialog(els);
  }

  function closeNotesModal(els) {
    if (els.notesModal) els.notesModal.hidden = true;
  }

  function centerNotesDialog(els) {
    const dialog = els.notesDialog;
    if (!dialog || dialog.dataset.moved === "true") return;
    dialog.style.left = "50%";
    dialog.style.top = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
  }

  function enableNotesDialogDrag(els) {
    const dialog = els.notesDialog;
    const handle = dialog && dialog.querySelector(".watch-notes-dialog-head");
    if (!dialog || !handle) return;
    handle.addEventListener("mousedown", (event) => {
      if (event.target.closest("button")) return;
      const rect = dialog.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      dialog.dataset.moved = "true";
      dialog.style.transform = "none";
      dialog.style.left = `${startLeft}px`;
      dialog.style.top = `${startTop}px`;
      const onMove = (moveEvent) => {
        const nextLeft = Math.max(8, Math.min(window.innerWidth - 80, startLeft + moveEvent.clientX - startX));
        const nextTop = Math.max(8, Math.min(window.innerHeight - 48, startTop + moveEvent.clientY - startY));
        dialog.style.left = `${nextLeft}px`;
        dialog.style.top = `${nextTop}px`;
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function loadFromInput(state, els) {
    const symbol = normalizeSymbol(els.symbolInput.value);
    if (!symbol) {
      setStatus(els, "股票代码格式不正确。");
      return;
    }
    loadSymbol(state, els, symbol, "");
  }

  function renderCategories(state, els) {
    const listScrollTop = els.categoryList ? els.categoryList.scrollTop : 0;
    const stockScrollTops = {};
    if (els.categoryList) {
      els.categoryList.querySelectorAll(".watch-category-stocks").forEach((node) => {
        const name = node.closest(".watch-category-group") && node.closest(".watch-category-group").dataset.categoryName;
        if (name) stockScrollTops[name] = node.scrollTop;
      });
      els.categoryList.querySelectorAll(".watch-category-group").forEach((group) => {
        const name = group.dataset.categoryName || "";
        if (!name) return;
        if (group.open) state.openCategories.add(name);
        else state.openCategories.delete(name);
      });
    }
    const names = Object.keys(state.categories).sort((a, b) => a.localeCompare(b, "zh-CN"));
    if (!names.length) {
      els.categoryList.innerHTML = '<p class="empty-note">暂无分组。请先在筛选器中收藏股票。</p>';
      return;
    }
    els.categoryList.innerHTML = names
      .map((name) => {
        const stocks = state.categories[name];
        const rows = stocks
          .map((symbol) => {
            const label = `${state.quoteNameCache[symbol] || "--"} ${symbol.slice(2)}`;
            return `<button class="watch-category-stock ${symbol === state.symbol ? "is-active" : ""}" type="button" data-category="${escapeHtml(name)}" data-symbol="${symbol}">${escapeHtml(label)}</button>`;
          })
          .join("");
        return `<details class="watch-category-group" data-category-name="${escapeHtml(name)}" ${name === state.categoryName || state.openCategories.has(name) ? "open" : ""}><summary>${escapeHtml(name)}（${stocks.length}）</summary><div class="watch-category-stocks">${rows || '<p class="empty-note">空分组</p>'}</div></details>`;
      })
      .join("");
    els.categoryList.querySelectorAll(".watch-category-group").forEach((group) => {
      const name = group.dataset.categoryName || "";
      group.addEventListener("toggle", () => {
        if (group.open) state.openCategories.add(name);
        else state.openCategories.delete(name);
      });
    });
    els.categoryList.querySelectorAll("[data-symbol]").forEach((button) => {
      button.addEventListener("click", () => loadSymbol(state, els, button.dataset.symbol, button.dataset.category));
    });
    els.categoryList.scrollTop = listScrollTop;
    els.categoryList.querySelectorAll(".watch-category-stocks").forEach((node) => {
      const name = node.closest(".watch-category-group") && node.closest(".watch-category-group").dataset.categoryName;
      if (name && stockScrollTops[name] !== undefined) node.scrollTop = stockScrollTops[name];
    });
  }

  async function hydrateCategoryNames(state, els) {
    const symbols = [...new Set(Object.values(state.categories).flat().map(normalizeSymbol).filter(Boolean))];
    const missing = symbols.filter((symbol) => !state.quoteNameCache[symbol]);
    if (!missing.length) return;
    try {
      const quotes = await fetchQuotes(missing);
      let changed = false;
      quotes.forEach((quote) => {
        if (quote && quote.symbol && quote.name && state.quoteNameCache[quote.symbol] !== quote.name) {
          state.quoteNameCache[quote.symbol] = quote.name;
          changed = true;
        }
      });
      if (changed) {
        saveQuoteNameCache(root.localStorage, state.quoteNameCache);
        renderCategories(state, els);
      }
    } catch (_) {
      // Names will be filled when individual quotes load.
    }
  }

  async function loadSymbol(state, els, symbol, categoryName) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;
    clearTimers(state);
    state.symbol = normalized;
    state.categoryName = categoryName || "";
    state.quote = null;
    state.klineByPeriod = {};
    state.previousAlertCount = 0;
    stopAlertLoop(state);
    updateAlertBanner(state, els);
    hideNotesPreview(els);
    if (els.notesModal) els.notesModal.hidden = true;
    updateNotesButtonState(state, els);
    els.symbolInput.value = normalized;
    root.localStorage.setItem(LAST_SYMBOL_KEY, normalized);
    root.localStorage.setItem(LAST_CATEGORY_KEY, state.categoryName);
    renderCategories(state, els);
    updateNavigator(state, els);
    setStatus(els, `正在载入 ${normalized} ...`);
    await refreshAll(state, els);
    if (state.quote && state.quote.name) {
      state.searchHistory = addSearchHistory(state.searchHistory, normalized, state.quote.name);
      saveSearchHistory(root.localStorage, state.searchHistory);
      renderSearchHistory(state, els);
    }
    setRealtimeRefresh(state, els, true);
  }

  async function refreshAll(state, els) {
    if (!state.symbol) return;
    await Promise.all([refreshQuote(state, els), refreshKlines(state, els)]);
  }

  function toggleRealtimeRefresh(state, els) {
    if (!state.symbol) {
      setStatus(els, "请先载入股票。");
      return;
    }
    setRealtimeRefresh(state, els, !state.realtimeEnabled);
    if (state.realtimeEnabled) refreshAll(state, els);
  }

  function setRealtimeRefresh(state, els, enabled) {
    clearTimers(state);
    state.realtimeEnabled = enabled;
    if (els.refreshButton) {
      els.refreshButton.textContent = enabled ? "停止刷新" : "实时刷新";
      els.refreshButton.classList.toggle("is-paused", !enabled);
    }
    if (enabled) {
      state.quoteTimer = root.setInterval(() => refreshQuote(state, els), QUOTE_REFRESH_MS);
      state.klineTimer = root.setInterval(() => refreshKlines(state, els), KLINE_REFRESH_MS);
    }
  }

  async function refreshQuote(state, els) {
    if (state.quoteLoading) return;
    state.quoteLoading = true;
    try {
      state.quote = await fetchQuote(state.symbol);
      const previousName = state.quoteNameCache[state.symbol];
      if (state.quote && state.quote.name) {
        state.quoteNameCache[state.symbol] = state.quote.name;
        saveQuoteNameCache(root.localStorage, state.quoteNameCache);
      }
      renderQuote(state, els);
      if (state.quote && state.quote.name && state.quote.name !== previousName) renderCategories(state, els);
      const now = Date.now();
      if (now - state.lastStatusAt > 5000) {
        state.lastStatusAt = now;
        setStatus(els, `行情已更新：${new Date().toLocaleTimeString("zh-CN")}`);
      }
    } catch (error) {
      renderQuote(state, els);
    } finally {
      state.quoteLoading = false;
    }
  }

  async function refreshKlines(state, els) {
    if (state.klineLoading) return;
    state.klineLoading = true;
    try {
      const periods = [...PERIODS, ...ALERT_PERIODS];
      const results = await Promise.allSettled(periods.map(async (period) => [period, await fetchKline(state.symbol, period)]));
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const [period, rows] = result.value;
          state.klineByPeriod[period] = rows;
        }
      });
      renderQuote(state, els);
      renderIntraday(state, els);
      updatePeriodPanelCharts(state, els);
      updateAlerts(state, els);
    } catch (error) {
      updatePeriodPanelCharts(state, els);
    } finally {
      state.klineLoading = false;
    }
  }

  async function fetchQuote(symbol) {
    const response = await fetch(`${QUOTE_URL}${symbol}`);
    if (!response.ok) throw new Error(`腾讯行情接口返回 ${response.status}`);
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buffer);
    const quote = text.split(/\n+/).map((line) => parseQuoteLine(line.trim())).find(Boolean);
    if (!quote) throw new Error("无可用行情数据");
    return quote;
  }

  async function fetchQuotes(symbols) {
    const normalized = [...new Set((symbols || []).map(normalizeSymbol).filter(Boolean))];
    if (!normalized.length) return [];
    const response = await fetch(`${QUOTE_URL}${normalized.join(",")}`);
    if (!response.ok) throw new Error(`腾讯行情接口返回 ${response.status}`);
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buffer);
    return text
      .split(/\n+/)
      .map((line) => parseQuoteLine(line.trim()))
      .filter(Boolean);
  }

  async function fetchKline(symbol, period) {
    try {
      const rows = await fetchTencentKline(symbol, period);
      if (rows.length) return rows;
    } catch (_) {
      // Fall back to local proxy or Eastmoney below.
    }
    const query = new URLSearchParams({ symbol, period: eastmoneyKlt(period) }).toString();
    try {
      const response = await fetch(`/api/eastmoney-kline?${query}`);
      if (response.ok) {
        const payload = await response.json();
        const rows = normalizeEastmoneyKlines((payload.data && payload.data.klines) || []);
        if (rows.length) return rows;
      }
    } catch (_) {
      // Fall back to JSONP below.
    }
    const varName = `sw_em_${symbol}_${period}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const url = `${EASTMONEY_KLINE_URL}?${new URLSearchParams({
      cb: varName,
      secid: eastmoneySecid(symbol),
      fields1: "f1,f2,f3,f4,f5,f6",
      fields2: "f51,f52,f53,f54,f55,f56,f57",
      klt: eastmoneyKlt(period),
      fqt: "0",
      beg: "19900101",
      end: "20500101",
      lmt: "520",
    }).toString()}`;
    const payload = await jsonp(url, varName);
    const rows = normalizeEastmoneyKlines((payload.data && payload.data.klines) || []);
    if (!rows.length) throw new Error(`${PERIOD_META[period].label}数据不足`);
    return rows;
  }

  async function fetchTencentKline(symbol, period) {
    if (period === "m1" || period === "m5" || period === "m30" || period === "m60") return fetchTencentMinuteKline(symbol, period);
    return fetchTencentDayKline(symbol);
  }

  async function fetchTencentMinuteKline(symbol, period) {
    const key = period;
    const varName = `sw_tq_${symbol}_${key}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const url = `${TENCENT_MINUTE_KLINE_URL}?${new URLSearchParams({
      _var: varName,
      param: `${symbol},${key},,520`,
      r: String(Math.random()),
    }).toString()}`;
    const payload = await jsonp(url, varName);
    const data = payload.data && payload.data[symbol];
    return normalizeTencentKlineRows((data && data[key]) || []);
  }

  async function fetchTencentDayKline(symbol) {
    let lastError = null;
    for (const endpoint of TENCENT_DAY_KLINE_URLS) {
      try {
        const varName = `sw_tq_${symbol}_day_${Date.now()}_${Math.round(Math.random() * 100000)}`;
        const url = `${endpoint}?${new URLSearchParams({
          _var: varName,
          param: `${symbol},day,,,520,qfq`,
        }).toString()}`;
        const payload = await jsonp(url, varName);
        const data = payload.data && payload.data[symbol];
        const rows = normalizeTencentKlineRows((data && (data.qfqday || data.day)) || []);
        if (rows.length) return rows;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return [];
  }

  function jsonp(url, varName) {
    return new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      let callbackPayload = null;
      const timeout = root.setTimeout(() => {
        cleanup();
        reject(new Error("数据源请求超时"));
      }, 12000);
      function cleanup() {
        root.clearTimeout(timeout);
        delete root[varName];
        script.remove();
      }
      root[varName] = (payload) => {
        callbackPayload = payload;
      };
      script.onload = () => {
        const result = callbackPayload || (typeof root[varName] === "function" ? null : root[varName]);
        cleanup();
        result ? resolve(result) : reject(new Error("数据源返回为空"));
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("数据源请求失败"));
      };
      script.src = url;
      root.document.body.appendChild(script);
    });
  }

  function renderQuote(state, els) {
    const quote = state.quote;
    const title = quote ? `${quote.name} ${quote.code}` : state.symbol || "未选择股票";
    const price = quote ? quote.latestPrice : null;
    const change = quote && quote.pctChange !== null ? quote.pctChange : null;
    els.stockTitle.textContent = title;
    els.stockMeta.textContent = quote ? `${quote.rawTime || "--"}  昨收 ${formatNumber(quote.prevClose)}  今开 ${formatNumber(quote.open)}` : "--";
    renderPriceBadge(els.priceBadge, price, change);
    renderOrderBook(els.orderBook, quote ? quote.orderBook : [], quote, latestTradingDayRows(state.klineByPeriod.m1 || []));
    updateNavigator(state, els);
    updateNotesButtonState(state, els);
  }

  function renderPriceBadge(node, price, change) {
    if (!node) return;
    const changeText = change === null || change === undefined ? "" : `<span class="watch-price-change ${change > 0 ? "is-up" : change < 0 ? "is-down" : ""}">${Number(change).toFixed(2)}%</span>`;
    node.innerHTML = `<span class="watch-price-value">${formatNumber(price)}</span>${changeText}`;
  }

  function renderIntradayInfoHtml({ time, price, pct, average, volume }) {
    const pctClass = pct > 0 ? "is-up" : pct < 0 ? "is-down" : "";
    const pctText = pct === null || pct === undefined ? "--" : `${Number(pct).toFixed(2)}%`;
    return `${escapeHtml(time || "--")}  价:${formatNumber(price)}  <span class="watch-pct ${pctClass}">涨幅:${pctText}</span>  均价:${formatNumber(average)}  量:${formatVolume(volume)}`;
  }

  function updateNavigator(state, els) {
    const nav = makeCategoryNavigator(state.categories, state.categoryName, state.symbol);
    els.prevButton.disabled = !nav.previous;
    els.nextButton.disabled = !nav.next;
  }

  function renderOrderBook(node, rows, quote, minuteRows = []) {
    if (!node) return;
    node.innerHTML = renderOrderBookHtml(rows || [], recentTradeRows(minuteRows, 16));
  }

  function renderEmptyOrderBook(node) {
    renderOrderBook(node, [], null);
  }

  function orderRow(side, level, item) {
    return `<div class="watch-order-row is-${side}"><span>${side === "sell" ? "卖" : "买"}${level}</span><strong>${formatNumber(item && item.price)}</strong><span>${formatVolume(item && item.volume)}</span></div>`;
  }

  function renderOrderBookHtml(rows, tradeRows) {
    const byKey = new Map((rows || []).map((row) => [`${row.side}${row.level}`, row]));
    const html = ['<div class="watch-order-levels">'];
    for (let level = 5; level >= 1; level -= 1) html.push(orderRow("sell", level, byKey.get(`sell${level}`)));
    for (let level = 1; level <= 5; level += 1) html.push(orderRow("buy", level, byKey.get(`buy${level}`)));
    html.push("</div>", renderTradeList(tradeRows || []));
    return html.join("");
  }

  function renderTradeList(rows) {
    const body = rows.length
      ? rows.map((row) => `<div class="watch-trade-row"><span>${escapeHtml(row.time)}</span><strong>${formatNumber(row.price)}</strong><span>${formatVolume(row.volume)}</span></div>`).join("")
      : `<div class="watch-trade-empty">等待成交数据</div>`;
    return `<div class="watch-trade-list"><div class="watch-trade-head"><span>时间</span><span>价格</span><span>成交量</span></div>${body}</div>`;
  }

  function renderIntraday(state, els) {
    const rows = latestTradingDayRows(state.klineByPeriod.m1 || []);
    drawIntradayChart(els.intradayChart, rows, els.intradayInfo, state.quote, state.hoverDate, (row) => {
      state.hoverDate = row.date;
      renderIntraday(state, els);
      updatePeriodPanelCharts(state, els);
    });
  }

  function renderPeriodPanels(state, els) {
    els.periodPanels.className = `watch-period-grid is-zoom-${state.visibleBars}`;
    els.periodPanels.innerHTML = PERIODS.map((period) => panelMarkup(period, state.panelSettings[period])).join("");
    els.periodPanels.querySelectorAll("[data-main-mode]").forEach((select) => {
      select.addEventListener("change", () => {
        state.panelSettings[select.dataset.period].mainMode = select.value;
        savePanelSettings(state);
        renderPeriodPanels(state, els);
        updateAlerts(state, els);
      });
    });
    els.periodPanels.querySelectorAll("[data-subchart-index]").forEach((select) => {
      select.addEventListener("change", () => {
        const period = select.dataset.period;
        const index = Number(select.dataset.subchartIndex);
        const current = [...state.panelSettings[period].subcharts];
        const oldValue = current[index];
        const duplicateIndex = current.indexOf(select.value);
        if (duplicateIndex >= 0 && duplicateIndex !== index) current[duplicateIndex] = oldValue;
        current[index] = select.value;
        state.panelSettings[period].subcharts = normalizeSubcharts(current);
        savePanelSettings(state);
        renderPeriodPanels(state, els);
      });
    });
    PERIODS.forEach((period) => {
      const panel = els.periodPanels.querySelector(`[data-period-panel="${period}"]`);
      const rows = state.klineByPeriod[period] || [];
      renderPeriodPanelCharts(panel, rows, state.panelSettings[period], state.visibleBars, state.hoverDate);
    });
  }

  function updatePeriodPanelCharts(state, els) {
    if (!els.periodPanels || !els.periodPanels.querySelector("[data-period-panel]")) {
      renderPeriodPanels(state, els);
      return;
    }
    els.periodPanels.className = `watch-period-grid is-zoom-${state.visibleBars}`;
    PERIODS.forEach((period) => {
      const panel = els.periodPanels.querySelector(`[data-period-panel="${period}"]`);
      const rows = state.klineByPeriod[period] || [];
      renderPeriodPanelCharts(panel, rows, state.panelSettings[period], state.visibleBars, state.hoverDate);
    });
  }

  function panelMarkup(period, settings) {
    const meta = PERIOD_META[period];
    const subcharts = settings.subcharts
      .map((type, index) => `<div class="watch-subchart"><select data-period="${period}" data-subchart-index="${index}">${SUBCHARTS.map((item) => `<option value="${item}" ${item === type ? "selected" : ""}>${SUBCHART_LABELS[item]}</option>`).join("")}</select><svg data-subchart-svg="${index}" role="img" aria-label="${SUBCHART_LABELS[type]}"></svg></div>`)
      .join("");
    return `<section class="watch-period-panel" data-period-panel="${period}">
      <div class="watch-period-header">
        <h3>${meta.label}</h3>
        <select data-main-mode data-period="${period}">
          <option value="ma" ${settings.mainMode === "ma" ? "selected" : ""}>K线+均线</option>
          <option value="boll" ${settings.mainMode === "boll" ? "selected" : ""}>K线+BOLL</option>
        </select>
      </div>
      <div class="watch-chart-info" data-main-info>等待数据</div>
      <svg class="watch-main-svg" data-main-svg role="img" aria-label="${meta.label}主图"></svg>
      <div class="watch-subchart-grid">${subcharts}</div>
    </section>`;
  }

  function renderPeriodPanelCharts(panel, allRows, settings, visibleBars, hoverDate) {
    if (!panel) return;
    const rows = allRows.slice(-clampVisibleBars(visibleBars));
    const info = panel.querySelector("[data-main-info]");
    const mainSvg = panel.querySelector("[data-main-svg]");
    drawKlineChart(mainSvg, rows, settings.mainMode, info, hoverDate, visibleBars);
    panel.querySelectorAll("[data-subchart-svg]").forEach((svg, index) => {
      const type = settings.subcharts[index] || SUBCHARTS[index];
      if (type === "volume") drawVolumeChart(svg, rows, hoverDate, visibleBars);
      if (type === "macd") drawMacdChart(svg, rows, hoverDate, visibleBars);
      if (type === "kdj") drawKdjChart(svg, rows, hoverDate, visibleBars);
    });
  }

  function setVisibleBars(state, els, value) {
    state.visibleBars = clampVisibleBars(value);
    root.localStorage.setItem(VISIBLE_BARS_KEY, String(state.visibleBars));
    updateZoomStatus(state, els);
    updatePeriodPanelCharts(state, els);
  }

  function updateZoomStatus(state, els) {
    if (els.zoomStatus) els.zoomStatus.textContent = `K线数量：${state.visibleBars}`;
  }

  function savePanelSettings(state) {
    root.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(state.panelSettings));
  }

  function scaleDomain(values, paddingRatio = 0.06) {
    const valid = values.filter((value) => value !== null && value !== undefined && Number.isFinite(value));
    if (!valid.length) return { min: 0, max: 1 };
    let max = Math.max(...valid);
    let min = Math.min(...valid);
    if (max === min) {
      const base = Math.max(Math.abs(max), 1);
      min -= base * paddingRatio;
      max += base * paddingRatio;
      return { min, max };
    }
    const pad = (max - min) * paddingRatio;
    return { min: min - pad, max: max + pad };
  }

  function chartScale(values, top, bottom, paddingRatio = 0.06) {
    const { min, max } = scaleDomain(values, paddingRatio);
    const span = max - min || 1;
    return { max, min, y: (value) => top + ((max - value) / span) * (bottom - top) };
  }

  function xAt(index, length, left, right) {
    return length <= 1 ? left : left + (index / (length - 1)) * (right - left);
  }

  function seriesPath(values, y, left, right) {
    const points = values
      .map((value, index) => (value === null || value === undefined || !Number.isFinite(value) ? "" : `${xAt(index, values.length, left, right).toFixed(2)},${y(value).toFixed(2)}`))
      .filter(Boolean);
    return points.length ? `M ${points.join(" L ")}` : "";
  }

  function intradayLayout() {
    const w = 900;
    const h = 360;
    const pad = { left: 46, right: 2, top: 16, bottom: 30 };
    const priceBottom = h - pad.bottom - 8;
    const volumeHeight = 205;
    const volumeTop = h - pad.bottom - volumeHeight;
    return { w, h, pad, priceBottom, volumeTop, volumeHeight };
  }

  function intradaySlotMax(plottedRows) {
    const slots = (plottedRows || []).map((row) => Number(row.slot)).filter(Number.isFinite);
    return slots.length ? Math.max(1, ...slots) : 240;
  }

  function intradayAxisSlotMax() {
    return 240;
  }

  function intradayPriceValues(rows, quote, average) {
    return (rows || [])
      .flatMap((row) => [row.open, row.high, row.low, row.close, quote && quote.prevClose, average])
      .filter((value) => value !== null && Number.isFinite(Number(value)))
      .map(Number);
  }

  function drawIntradayChart(svg, rows, info, quote, hoverDate, onHover) {
    if (!svg) return;
    const { w, h, pad, priceBottom, volumeTop, volumeHeight } = intradayLayout();
    if (!rows.length) {
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" /><text x="24" y="42" fill="#64748b">等待分时数据</text>`;
      if (info) info.textContent = "--";
      return;
    }
    const plotted = rows.map((row) => ({ ...row, slot: minuteToTradingSlot(row.date) })).filter((row) => row.slot !== null);
    const averageRows = [];
    let weightedTotal = 0;
    let volumeTotal = 0;
    plotted.forEach((row) => {
      const volume = Number(row.volume || 0);
      weightedTotal += row.close * volume;
      volumeTotal += volume;
      averageRows.push({ slot: row.slot, value: volumeTotal > 0 ? weightedTotal / volumeTotal : row.close });
    });
    const lastAverage = averageRows.length ? averageRows[averageRows.length - 1].value : null;
    const priceScale = chartScale(intradayPriceValues(plotted, quote, lastAverage), pad.top, priceBottom);
    const slotMax = intradayAxisSlotMax();
    const maxVolume = Math.max(...rows.map((row) => row.volume || 0), 1);
    const barW = Math.max(2, (w - pad.left - pad.right) / slotMax - 1);
    const xForSlot = (slot) => pad.left + (Math.min(slot, slotMax) / slotMax) * (w - pad.left - pad.right);
    const sessionLine = (items) => {
      const points = items.map((item) => `${xForSlot(item.slot).toFixed(2)},${priceScale.y(item.value).toFixed(2)}`);
      return points.length ? `M ${points.join(" L ")}` : "";
    };
    const segmentLines = (states, colorKey, halo = false) =>
      states
        .map((state, index) => {
          if (index === 0 || state.color !== colorKey) return "";
          const previous = plotted[index - 1];
          const current = plotted[index];
          if (!previous || !current) return "";
          return `<path ${halo ? 'class="watch-price-halo" ' : ""}d="M ${xForSlot(previous.slot).toFixed(2)},${priceScale.y(previous.close).toFixed(2)} L ${xForSlot(current.slot).toFixed(2)},${priceScale.y(current.close).toFixed(2)}" fill="none" stroke="${halo ? "#ffffff" : colorKey === "yellow" ? "#facc15" : colorKey === "blue" ? "#1e40af" : "#dc2626"}" stroke-width="${halo ? "5" : "2.4"}" stroke-linecap="round" stroke-linejoin="round" opacity="${halo ? "0.9" : "1"}" />`;
        })
        .join("");
    const trendStates = calculateIntradayTrendStates(plotted);
    const priceLine = sessionLine(plotted.map((row) => ({ slot: row.slot, value: row.close })));
    const coloredPriceHalos = `${segmentLines(trendStates, "yellow", true)}${segmentLines(trendStates, "blue", true)}${segmentLines(trendStates, "red", true)}`;
    const coloredPriceLines = `${segmentLines(trendStates, "yellow")}${segmentLines(trendStates, "blue")}${segmentLines(trendStates, "red")}`;
    const averageLine = sessionLine(averageRows);
    const volumeBars = plotted
      .map((row, index) => {
        const x = xForSlot(row.slot);
        const barH = ((row.volume || 0) / maxVolume) * volumeHeight;
        const color = row.close >= row.open ? "#b91c1c" : "#047857";
        return `<rect x="${x - barW / 2}" y="${h - pad.bottom - barH}" width="${barW}" height="${barH}" fill="${color}" opacity="0.72" />`;
      })
      .join("");
    const prevY = quote && quote.prevClose ? priceScale.y(quote.prevClose) : null;
    const tickLines = [
      { label: "9:30", slot: 0 },
      { label: "10:30", slot: 60 },
      { label: "11:30 / 13:00", slot: 120 },
      { label: "14:00", slot: 180 },
      { label: "15:00", slot: 240 },
    ]
      .filter((tick) => tick.slot <= slotMax)
      .map((tick) => {
        const x = xForSlot(tick.slot);
        const anchor = tick.slot === 240 ? "end" : "middle";
        const textX = tick.slot === 240 ? x - 2 : x;
        return `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${h - pad.bottom}" stroke="#eef2f7" />
          <text x="${textX}" y="${h - 8}" fill="#64748b" font-size="11" text-anchor="${anchor}">${tick.label}</text>`;
      })
      .join("");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const explicitHoverSlotRaw = minuteToTradingSlot(hoverDate);
    const explicitHoverSlot = explicitHoverSlotRaw === null ? null : clampSlotToDataRange(explicitHoverSlotRaw, plotted);
    const hoverIndex = hoverDate ? nearestIndexForDate(plotted, hoverDate) : plotted.length - 1;
    const hoverRow = hoverIndex >= 0 ? plotted[hoverIndex] : plotted[plotted.length - 1];
    const hoverSlot = explicitHoverSlot !== null ? explicitHoverSlot : hoverRow && hoverRow.slot;
    const hoverAverage = hoverIndex >= 0 && averageRows[hoverIndex] ? averageRows[hoverIndex].value : lastAverage;
    const hoverPct = quote && quote.prevClose && hoverRow ? ((hoverRow.close - quote.prevClose) / quote.prevClose) * 100 : null;
    const crosshair =
      hoverRow && hoverSlot !== null
        ? `<line class="watch-crosshair" x1="${xForSlot(hoverSlot)}" y1="${pad.top}" x2="${xForSlot(hoverSlot)}" y2="${h - pad.bottom}" />
           <line class="watch-crosshair" x1="${pad.left}" y1="${priceScale.y(hoverRow.close)}" x2="${w - pad.right}" y2="${priceScale.y(hoverRow.close)}" />
           <circle cx="${xForSlot(hoverSlot)}" cy="${priceScale.y(hoverRow.close)}" r="3" fill="#1d4ed8" />`
        : "";
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" />
      ${tickLines}
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <rect x="${pad.left}" y="${volumeTop}" width="${w - pad.left - pad.right}" height="${volumeHeight}" fill="#f8fafc" opacity="0.46" />
      <line x1="${pad.left}" y1="${volumeTop}" x2="${w - pad.right}" y2="${volumeTop}" stroke="#dfe5ec" stroke-dasharray="4 4" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${prevY ? `<line x1="${pad.left}" y1="${prevY}" x2="${w - pad.right}" y2="${prevY}" stroke="#dc2626" stroke-dasharray="4 4" />
      <text x="${pad.left - 4}" y="${prevY + 4}" fill="#dc2626" font-size="11" text-anchor="end">${formatNumber(quote.prevClose)}</text>` : ""}
      ${volumeBars}
      <path class="watch-price-halo" d="${priceLine}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
      ${coloredPriceHalos}
      <path d="${priceLine}" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${coloredPriceLines}
      <path d="${averageLine}" fill="none" stroke="#f59e0b" stroke-width="1.3" />
      ${crosshair}
      <text x="${pad.left - 4}" y="${pad.top + 10}" fill="#64748b" font-size="11" text-anchor="end">${priceScale.max.toFixed(2)}</text>
      <text x="${pad.left - 4}" y="${priceBottom - 2}" fill="#64748b" font-size="11" text-anchor="end">${priceScale.min.toFixed(2)}</text>
      <rect data-hit-area="intraday" x="${pad.left}" y="${pad.top}" width="${w - pad.left - pad.right}" height="${h - pad.top - pad.bottom}" fill="transparent" />`;
    const displayTime = hoverSlot !== null ? `${hoverRow.date.slice(0, 10)} ${slotToTradingTime(hoverSlot)}` : hoverRow && hoverRow.date;
    if (info && hoverRow) {
      info.classList.remove("is-up", "is-down");
      info.innerHTML = renderIntradayInfoHtml({
        time: displayTime,
        price: hoverRow.close,
        pct: hoverPct,
        average: hoverAverage,
        volume: hoverRow.volume,
      });
    }
    if (typeof onHover === "function") {
      svg.onmousemove = (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * w;
        const rawSlot = Math.max(0, Math.min(slotMax, ((x - pad.left) / (w - pad.left - pad.right)) * slotMax));
        const slot = clampSlotToDataRange(rawSlot, plotted);
        const nearest = plotted.reduce((best, row) => (Math.abs(row.slot - slot) < Math.abs(best.slot - slot) ? row : best), plotted[0]);
        if (nearest) onHover({ ...nearest, date: `${nearest.date.slice(0, 10)} ${slotToTradingTime(slot)}` });
      };
    }
  }

  function panelMainHeight(visibleBars) {
    return panelSubHeight(visibleBars);
  }

  function panelSubHeight(visibleBars) {
    return 132;
  }

  function renderKlineInfo(row) {
    if (!row) return "等待数据";
    return `${row.date}  收:${formatNumber(row.close)}  开:${formatNumber(row.open)}  低:${formatNumber(row.low)}  高:${formatNumber(row.high)}`;
  }

  function drawKlineChart(svg, rows, mode, info, hoverDate, visibleBars) {
    if (!svg) return;
    const w = 560;
    const h = panelMainHeight(visibleBars);
    const pad = { left: 14, right: 3, top: 3, bottom: 3 };
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    if (!rows.length) {
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" /><text x="18" y="38" fill="#64748b">等待K线数据</text>`;
      if (info) info.textContent = "等待数据";
      return;
    }
    const boll = calculateBoll(rows);
    const ma5 = movingAverage(rows, 5);
    const ma10 = movingAverage(rows, 10);
    const extras = mode === "boll" ? boll.flatMap((item) => [item.ub, item.boll, item.lb]) : [...ma5, ...ma10];
    const scale = chartScale(rows.flatMap((row) => [row.high, row.low]).concat(extras), pad.top, h - pad.bottom);
    const candleW = Math.max(2, (w - pad.left - pad.right) / rows.length - 2);
    const candles = rows
      .map((row, index) => {
        const x = xAt(index, rows.length, pad.left, w - pad.right);
        const up = row.close >= row.open;
        const color = up ? "#d93025" : "#0f9d58";
        const yOpen = scale.y(row.open);
        const yClose = scale.y(row.close);
        return `<line x1="${x}" y1="${scale.y(row.high)}" x2="${x}" y2="${scale.y(row.low)}" stroke="${color}" />
          <rect x="${x - candleW / 2}" y="${Math.min(yOpen, yClose)}" width="${candleW}" height="${Math.max(1, Math.abs(yOpen - yClose))}" fill="${up ? "transparent" : color}" stroke="${color}" />`;
      })
      .join("");
    const overlays =
      mode === "boll"
        ? `<path d="${seriesPath(boll.map((item) => item.ub), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#7c3aed" stroke-width="1.1" />
           <path d="${seriesPath(boll.map((item) => item.boll), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#111827" stroke-width="1" />
           <path d="${seriesPath(boll.map((item) => item.lb), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#7c3aed" stroke-width="1.1" />`
        : `<path d="${seriesPath(ma5, scale.y, pad.left, w - pad.right)}" fill="none" stroke="#1d4ed8" stroke-width="1.2" />
           <path d="${seriesPath(ma10, scale.y, pad.left, w - pad.right)}" fill="none" stroke="#f59e0b" stroke-width="1.2" />`;
    const hoverIndex = nearestIndexForDate(rows, hoverDate);
    const hoverRow = hoverIndex >= 0 ? rows[hoverIndex] : rows[rows.length - 1];
    const hoverX = hoverIndex >= 0 ? xAt(hoverIndex, rows.length, pad.left, w - pad.right) : null;
    const crosshair =
      hoverX !== null
        ? `<line class="watch-crosshair" x1="${hoverX}" y1="${pad.top}" x2="${hoverX}" y2="${h - pad.bottom}" />
           <line class="watch-crosshair" x1="${pad.left}" y1="${scale.y(hoverRow.close)}" x2="${w - pad.right}" y2="${scale.y(hoverRow.close)}" />`
        : "";
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${candles}${overlays}${crosshair}
      <text x="2" y="${pad.top + 8}" fill="#64748b" font-size="9">${scale.max.toFixed(2)}</text>
      <text x="2" y="${h - pad.bottom}" fill="#64748b" font-size="9">${scale.min.toFixed(2)}</text>`;
    if (info) info.textContent = renderKlineInfo(hoverRow || rows[rows.length - 1]);
  }

  function drawVolumeChart(svg, rows, hoverDate, visibleBars) {
    drawVolumeBars(svg, rows, hoverDate, visibleBars);
  }

  function drawMacdChart(svg, rows, hoverDate, visibleBars) {
    const values = macd(rows);
    drawBarChart(svg, values.map((item) => item.hist), values.map((item) => (item.hist >= 0 ? "#d93025" : "#0f9d58")), rows, hoverDate, {
      lines: [
        { values: values.map((item) => item.dif), color: "#1d4ed8" },
        { values: values.map((item) => item.dea), color: "#f59e0b" },
      ],
      label: "DIF/DEA/MACD",
    }, visibleBars);
  }

  function drawKdjChart(svg, rows, hoverDate, visibleBars) {
    if (!svg) return;
    const values = calculateKdj(rows);
    const w = 360;
    const h = panelSubHeight(visibleBars);
    const pad = { left: 10, right: 2, top: 2, bottom: 2 };
    const scale = chartScale(values.flatMap((item) => [item.k, item.d, item.j, 20, 80]), pad.top, h - pad.bottom);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const hoverIndex = nearestIndexForDate(rows, hoverDate);
    const hoverX = hoverIndex >= 0 ? xAt(hoverIndex, rows.length, pad.left, w - pad.right) : null;
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" />
      <line x1="${pad.left}" y1="${scale.y(80)}" x2="${w - pad.right}" y2="${scale.y(80)}" stroke="#fecaca" />
      <line x1="${pad.left}" y1="${scale.y(20)}" x2="${w - pad.right}" y2="${scale.y(20)}" stroke="#bbf7d0" />
      <text x="0" y="${scale.y(80) + 3}" fill="#dc2626" font-size="7">80</text>
      <text x="0" y="${scale.y(20) + 3}" fill="#16a34a" font-size="7">20</text>
      <path d="${seriesPath(values.map((item) => item.k), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#1d4ed8" stroke-width="1" />
      <path d="${seriesPath(values.map((item) => item.d), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#f59e0b" stroke-width="1" />
      <path d="${seriesPath(values.map((item) => item.j), scale.y, pad.left, w - pad.right)}" fill="none" stroke="#7c3aed" stroke-width="1" />
      ${hoverX !== null ? `<line class="watch-crosshair" x1="${hoverX}" y1="${pad.top}" x2="${hoverX}" y2="${h - pad.bottom}" />` : ""}`;
  }

  function drawVolumeBars(svg, rows, hoverDate = "", visibleBars = 120) {
    if (!svg) return;
    const w = 360;
    const h = panelSubHeight(visibleBars);
    const pad = { left: 10, right: 2, top: 2, bottom: 2 };
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    if (!rows.length) {
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" /><text x="10" y="28" fill="#64748b">--</text>`;
      return;
    }
    const values = rows.map((row) => row.volume || 0);
    const max = Math.max(...values, 1);
    const barW = Math.max(1, (w - pad.left - pad.right) / values.length - 1);
    const bars = values
      .map((value, index) => {
        const row = rows[index];
        const x = xAt(index, values.length, pad.left, w - pad.right);
        const barH = (value / max) * (h - pad.top - pad.bottom);
        const color = row.close >= row.open ? "#d93025" : "#0f9d58";
        return `<rect x="${x - barW / 2}" y="${h - pad.bottom - barH}" width="${barW}" height="${barH}" fill="${color}" opacity="0.7" />`;
      })
      .join("");
    const hoverIndex = nearestIndexForDate(rows, hoverDate);
    const hoverX = hoverIndex >= 0 ? xAt(hoverIndex, rows.length, pad.left, w - pad.right) : null;
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" />${bars}${hoverX !== null ? `<line class="watch-crosshair" x1="${hoverX}" y1="${pad.top}" x2="${hoverX}" y2="${h - pad.bottom}" />` : ""}`;
  }

  function drawBarChart(svg, values, colors, rows = [], hoverDate = "", options = {}, visibleBars = 120) {
    if (!svg) return;
    const w = 360;
    const h = panelSubHeight(visibleBars);
    const pad = { left: 10, right: 2, top: 2, bottom: 2 };
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    if (!values.length) {
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" /><text x="10" y="28" fill="#64748b">--</text>`;
      return;
    }
    const barW = Math.max(1, (w - pad.left - pad.right) / values.length - 1);
    const lineValues = (options.lines || []).flatMap((line) => line.values || []);
    const scale = chartScale(values.concat(lineValues, [0]), pad.top, h - pad.bottom, 0.08);
    const zero = scale.y(0);
    const bars = values
      .map((value, index) => {
        const number = Number.isFinite(value) ? value : 0;
        const x = xAt(index, values.length, pad.left, w - pad.right);
        const yValue = scale.y(number);
        const y = Math.min(zero, yValue);
        const barH = Math.max(1, Math.abs(yValue - zero));
        return `<rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${barH}" fill="${colors[index] || "#64748b"}" opacity="0.65" />`;
      })
      .join("");
    const lines = (options.lines || [])
      .map((line) => `<path d="${seriesPath(line.values || [], scale.y, pad.left, w - pad.right)}" fill="none" stroke="${line.color}" stroke-width="1" />`)
      .join("");
    const hoverIndex = nearestIndexForDate(rows, hoverDate);
    const hoverX = hoverIndex >= 0 ? xAt(hoverIndex, values.length, pad.left, w - pad.right) : null;
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#fff" /><line x1="${pad.left}" y1="${zero}" x2="${w - pad.right}" y2="${zero}" stroke="#dfe5ec" />${bars}${lines}${hoverX !== null ? `<line class="watch-crosshair" x1="${hoverX}" y1="${pad.top}" x2="${hoverX}" y2="${h - pad.bottom}" />` : ""}`;
  }

  function updateAlerts(state, els) {
    const m1 = latestTradingDayRows(state.klineByPeriod.m1 || []);
    const m5 = state.klineByPeriod.m5 || [];
    const day = state.klineByPeriod.day || [];
    const m1Kdj = calculateKdj(m1).at(-1) || {};
    const intradayTrend = calculateIntradayTrendStates(m1).at(-1) || {};
    const m5Boll = calculateBoll(m5).at(-1) || {};
    const dayBoll = calculateBoll(day).at(-1) || {};
    const realtimePrice = state.quote && state.quote.latestPrice;
    const result = evaluateAlerts({
      previousCount: state.previousAlertCount,
      minuteKdj: m1Kdj,
      intradayTrend,
      fiveMinute: { price: realtimePrice || (m5.at(-1) && m5.at(-1).close), upper: m5Boll.ub },
      day: { price: realtimePrice || (day.at(-1) && day.at(-1).close), upper: dayBoll.ub },
    });
    Object.entries({ minuteKdj: result.minuteKdj, intradayBlue: result.intradayBlue, fiveMinuteBoll: result.fiveMinuteBoll, dayBoll: result.dayBoll }).forEach(([key, active]) => {
      const node = els.alertLights.querySelector(`[data-alert="${key}"]`);
      if (node) node.classList.toggle("is-on", active);
    });
    if (result.count >= 2) {
      startAlertLoop(state);
    } else {
      stopAlertLoop(state);
    }
    state.previousAlertCount = result.count;
    updateAlertBanner(state, els);
  }

  async function setSoundEnabled(state, els, enabled) {
    if (enabled && state.audioReadyPromise) await state.audioReadyPromise;
    state.soundEnabled = Boolean(enabled);
    saveSoundEnabled(root.localStorage, state.soundEnabled);
    renderSoundButton(state, els);
    if (!state.soundEnabled) {
      stopAlertLoop(state);
      updateAlertBanner(state, els);
      return;
    }
    if (state.previousAlertCount >= 2) startAlertLoop(state);
    updateAlertBanner(state, els);
  }

  function renderSoundButton(state, els) {
    if (!els || !els.enableSoundButton) return;
    els.enableSoundButton.textContent = state.soundEnabled ? "关闭预警音频" : "启用预警音频";
    els.enableSoundButton.classList.toggle("is-on", state.soundEnabled);
  }

  function startAlertLoop(state) {
    if (!state.soundEnabled) return;
    if (state.alertLoopActive) return;
    state.alertLoopActive = true;
    if (state.uploadedAudioUrl) {
      stopDefaultToneLoop(state);
      if (!root.Audio) return;
      state.alertAudio = new root.Audio(state.uploadedAudioUrl);
      state.alertAudio.loop = true;
      state.alertAudio.play().catch(() => {});
      return;
    }
    playDefaultAlertTone();
    state.alertToneTimer = root.setInterval(playDefaultAlertTone, 1100);
  }

  function stopAlertLoop(state) {
    state.alertLoopActive = false;
    if (state.alertAudio) {
      state.alertAudio.pause();
      state.alertAudio.currentTime = 0;
      state.alertAudio = null;
    }
    stopDefaultToneLoop(state);
  }

  function stopDefaultToneLoop(state) {
    if (state.alertToneTimer) root.clearInterval(state.alertToneTimer);
    state.alertToneTimer = null;
  }

  function playDefaultAlertTone() {
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.28);
    oscillator.onended = () => context.close && context.close();
  }

  async function handleAudioUpload(state, els) {
    const files = Array.from((els.alertAudioInput && els.alertAudioInput.files) || []);
    if (!files.length) return;
    if (state.audioReadyPromise) await state.audioReadyPromise;
    const wasLooping = state.alertLoopActive;
    stopAlertLoop(state);
    const savedItems = [];
    try {
      for (const file of files) savedItems.push(await saveAudioToDb(file));
      state.audioReadyPromise = Promise.resolve();
    } catch (_) {
      try {
        const file = files[0];
        const dataUrl = await readFileAsDataUrl(file);
        savedItems.push({ id: makeAudioId(file.name), name: file.name || "本会话音频", type: file.type || "audio/mpeg", dataUrl });
        root.sessionStorage.setItem("stockWatchSessionAudio", dataUrl);
      } catch (error) {}
    }
    if (savedItems.length) {
      state.audioItems = mergeAudioItems([...state.audioItems, ...savedItems]);
      selectAlertAudio(state, els, savedItems[savedItems.length - 1].id);
    }
    if (wasLooping || (state.soundEnabled && state.previousAlertCount >= 2)) startAlertLoop(state);
    updateStoredAudioMarker(state, els);
  }

  function setUploadedAudioUrl(state, url) {
    if (state.uploadedAudioObjectUrl && root.URL && root.URL.revokeObjectURL) root.URL.revokeObjectURL(state.uploadedAudioObjectUrl);
    state.uploadedAudioUrl = url || "";
    state.uploadedAudioObjectUrl = state.uploadedAudioUrl.startsWith("blob:") ? state.uploadedAudioUrl : "";
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("音频读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function openAudioDb() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const request = root.indexedDB.open(AUDIO_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("files")) request.result.createObjectStore("files");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function makeAudioId(name) {
    return `audio-${Date.now().toString(36)}-${Math.abs(hashText(name || "audio")).toString(36)}-${Math.round(Math.random() * 100000).toString(36)}`;
  }

  function mergeAudioItems(items) {
    const byId = new Map();
    (items || []).forEach((item) => {
      if (item && item.id) byId.set(item.id, item);
    });
    return [...byId.values()].sort((a, b) => Number(a.savedAt || 0) - Number(b.savedAt || 0));
  }

  async function saveAudioToDb(file) {
    const db = await openAudioDb();
    const buffer = await file.arrayBuffer();
    const item = { id: makeAudioId(file.name), name: file.name || "预警音频", type: file.type || "audio/mpeg", buffer, savedAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(item, `audio:${item.id}`);
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadStoredAudio(state, els) {
    try {
      state.audioItems = mergeAudioItems(await readAudioLibraryFromDb());
      const selectedId = state.audioItems.some((item) => item.id === state.selectedAudioId) ? state.selectedAudioId : (state.audioItems[0] && state.audioItems[0].id) || "";
      if (selectedId) {
        selectAlertAudio(state, els, selectedId);
        return;
      }
    } catch (_) {
      // Default tone remains available.
    }
    if (!state.uploadedAudioUrl) {
      const sessionAudio = root.sessionStorage && root.sessionStorage.getItem("stockWatchSessionAudio");
      if (sessionAudio) {
        const item = { id: "session-audio", name: "本会话音频", dataUrl: sessionAudio, savedAt: Date.now() };
        state.audioItems = mergeAudioItems([...state.audioItems, item]);
        selectAlertAudio(state, els, item.id);
      }
    }
    renderAudioPicker(state, els);
    updateStoredAudioMarker(state, els);
  }

  function audioItemUrl(item) {
    if (!item) return "";
    if (item.dataUrl) return item.dataUrl;
    if (item.buffer && root.Blob && root.URL && root.URL.createObjectURL) {
      return root.URL.createObjectURL(new root.Blob([item.buffer], { type: item.type || "audio/mpeg" }));
    }
    if (item.blob && root.URL && root.URL.createObjectURL) return root.URL.createObjectURL(item.blob);
    return "";
  }

  function selectAlertAudio(state, els, id) {
    const item = state.audioItems.find((audio) => audio.id === id);
    state.selectedAudioId = item ? item.id : "";
    root.localStorage.setItem(SELECTED_AUDIO_KEY, state.selectedAudioId);
    setUploadedAudioUrl(state, item ? audioItemUrl(item) : "");
    renderAudioPicker(state, els);
    updateStoredAudioMarker(state, els);
  }

  async function deleteSelectedAudio(state, els) {
    const id = state.selectedAudioId || (els.alertAudioSelect && els.alertAudioSelect.value);
    if (!id) return;
    const wasLooping = state.alertLoopActive;
    stopAlertLoop(state);
    await deleteAudioFromDb(id);
    state.audioItems = state.audioItems.filter((item) => item.id !== id);
    const nextId = (state.audioItems[0] && state.audioItems[0].id) || "";
    selectAlertAudio(state, els, nextId);
    if (wasLooping || (state.soundEnabled && state.previousAlertCount >= 2)) startAlertLoop(state);
  }

  function renderAudioPicker(state, els) {
    const items = state.audioItems || [];
    if (els.alertAudioSelect) {
      els.alertAudioSelect.innerHTML = items.length
        ? items.map((item) => `<option value="${item.id}" ${item.id === state.selectedAudioId ? "selected" : ""}>${escapeHtml(item.name || "预警音频")}</option>`).join("")
        : '<option value="">默认提示音</option>';
      els.alertAudioSelect.disabled = !items.length;
    }
    if (els.deleteAudioButton) els.deleteAudioButton.disabled = !items.length || !state.selectedAudioId;
    if (els.audioStatus) {
      const item = items.find((audio) => audio.id === state.selectedAudioId);
      els.audioStatus.textContent = item ? `当前音频：${item.name || "预警音频"}` : "当前音频：默认提示音";
    }
  }

  function updateStoredAudioMarker(state, els) {
    if (els && els.audioStatus) els.audioStatus.dataset.savedAudio = hasStoredAlertAudio(state) ? "true" : "false";
  }

  function hasStoredAlertAudio(state) {
    return Boolean(state && state.uploadedAudioUrl);
  }

  async function readAudioLibraryFromDb() {
    const db = await openAudioDb();
    return new Promise((resolve, reject) => {
      const items = [];
      const tx = db.transaction("files", "readonly");
      const request = tx.objectStore("files").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value = cursor.value;
        const key = String(cursor.key || "");
        if (key.startsWith("audio:") && value && value.id) {
          items.push(value);
        } else if (key === "alert" && value) {
          if (typeof value === "string") items.push({ id: "legacy-alert", name: "已保存音频", dataUrl: value, savedAt: 0 });
          else items.push({ id: "legacy-alert", name: value.name || "已保存音频", type: value.type || "audio/mpeg", buffer: value.buffer, blob: value.blob, savedAt: value.savedAt || 0 });
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve(items);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteAudioFromDb(id) {
    const db = await openAudioDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      store.delete(`audio:${id}`);
      if (id === "legacy-alert") store.delete("alert");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function clearTimers(state) {
    if (state.quoteTimer) root.clearInterval(state.quoteTimer);
    if (state.klineTimer) root.clearInterval(state.klineTimer);
    state.quoteTimer = null;
    state.klineTimer = null;
  }

  function setStatus(els, message) {
    if (els.status) els.status.textContent = message;
  }

  return {
    normalizeSymbol,
    readCategories,
    makeCategoryNavigator,
    defaultPanelSettings,
    mergePanelSettings,
    evaluateAlerts,
    tradingSessionTicks,
    minuteToTradingSlot,
    slotToTradingTime,
    clampSlotToDataRange,
    adjustVisibleBars,
    nearestIndexForDate,
    parseQuoteLine,
    fetchQuotes,
    recentTradeRows,
    latestTradingDayRows,
    renderOrderBookHtml,
    renderIntradayInfoHtml,
    renderKlineInfo,
    readSoundEnabled,
    saveSoundEnabled,
    normalizeSearchHistory,
    readSearchHistory,
    addSearchHistory,
    removeSearchHistory,
    normalizeBannerItems,
    readQuoteNameCache,
    normalizeStockNotes,
    updateStockNote,
    hasNotesForSymbol,
    scaleDomain,
    intradayLayout,
    intradaySlotMax,
    intradayAxisSlotMax,
    intradayPriceValues,
    intradayPriceLineColor,
    calculateIntradayTrendStates,
    drawIntradayChart,
    mergeAudioItems,
    hasStoredAlertAudio,
    deleteAudioFromDb,
    initWatchPage,
  };
});

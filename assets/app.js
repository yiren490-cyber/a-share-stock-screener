(function () {
  const QUOTE_URL = "https://qt.gtimg.cn/q=";
  const EASTMONEY_LIST_URL = "https://48.push2.eastmoney.com/api/qt/clist/get";
  const DAY_KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";
  const TENCENT_KLINE_URLS = [
    "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
    "https://ifzq.gtimg.cn/appstock/app/fqkline/get",
  ];
  const MIN_KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/kline/mkline";
  const TODAY = new Date();
  const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  const STATIC_LISTING_DATES = window.A_SHARE_LISTING_DATES || {};
  const DEFAULT_POOL = [
    ["sh600000", "1999-11-10"],
    ["sh600519", "2001-08-27"],
    ["sh601318", "2007-03-01"],
    ["sh603259", "2018-05-08"],
    ["sh605499", "2021-01-19"],
    ["sz000001", "1991-04-03"],
    ["sz000024", "1993-06-07"],
    ["sz000333", "2013-09-18"],
    ["sz000858", "1998-04-27"],
    ["sz002415", "2010-05-28"],
    ["sz003816", "2019-11-28"],
    ["sz300059", "2010-03-19"],
    ["sz300750", "2018-06-11"],
    ["sz301269", "2022-04-12"],
    ["sh688111", "2019-07-22"],
    ["sh688981", "2020-07-16"],
    ["sh688256", "2019-07-22"],
    ["bj920002", "2024-05-30"],
    ["bj430047", "2020-07-27"],
    ["bj835185", "2021-11-15"],
    ["bj832000", "2020-12-23"],
  ];
  const FIELD_DEFS = [
    ["code", "代码", "text"],
    ["symbol", "市场代码", "text"],
    ["name", "名称", "text"],
    ["type", "类型", "text"],
    ["listingDate", "上市日期", "text"],
    ["listingDays", "上市天数", "integer"],
    ["latestPrice", "最新价", "number"],
    ["prevClose", "昨收", "number"],
    ["open", "今开", "number"],
    ["pctChange", "涨跌幅", "percent"],
    ["turnover", "成交额", "money"],
    ["turnoverRate", "换手率", "percent"],
    ["volumeRatio", "量比", "number"],
    ["amplitude", "振幅", "percent"],
    ["pe", "市盈率", "number"],
    ["floatMarketCap", "流通市值", "money"],
    ["totalMarketCap", "总市值", "money"],
    ["rawTime", "行情时间", "text"],
    ["source", "数据源", "text"],
  ];
  const DEFAULT_COLUMNS = ["code", "name", "type", "listingDays", "latestPrice", "pctChange", "turnover", "turnoverRate", "volumeRatio", "floatMarketCap"];
  const KNOWN_LISTING_DATES = new Map(DEFAULT_POOL);
  const BUILTIN_SUB_INDICATORS = [
    { name: "黄金筹码副图", kind: "gold-chip", source: "builtin" },
    { name: "黄金庄家控盘", kind: "gold-control", source: "builtin" },
    { name: "三龙聚首副图", kind: "three-dragon", source: "builtin" },
  ];
  const PERIOD_OPTIONS = [
    ["5", "5分钟"],
    ["30", "30分钟"],
    ["60", "60分钟"],
    ["120", "120分钟"],
    ["day", "日K"],
    ["week", "周K"],
    ["month", "月K"],
  ];
  const INDICATOR_DEFS = [
    {
      key: "ma",
      label: "均线",
      fields: [
        ["close", "当前K线收盘价", "number"],
        ["ma5", "MA5", "number"],
        ["ma10", "MA10", "number"],
        ["ma17", "MA17", "number"],
        ["ma20", "MA20", "number"],
        ["ma30", "MA30", "number"],
        ["ma60", "MA60", "number"],
        ["ma120", "MA120", "number"],
        ["ma250", "MA250", "number"],
      ],
    },
    {
      key: "boll",
      label: "BOLL线",
      fields: [
        ["boll", "BOLL中轨数值", "number"],
        ["ub", "BOLL上轨数值", "number"],
        ["lb", "BOLL下轨数值", "number"],
        ["close", "当前K线收盘价", "number"],
        ["ma5", "MA5", "number"],
      ],
    },
    {
      key: "boll-ma",
      label: "BOLL均线结合",
      fields: [
        ["state", "短买/持股状态", "select", ["短买", "红色持股", "绿色观望", "离场"]],
        ["midColor", "中轨颜色", "select", ["红色", "绿色"]],
        ["upperColor", "上轨颜色", "select", ["红色", "绿色"]],
        ["lowerColor", "下轨颜色", "select", ["红色", "绿色"]],
        ["boll", "BOLL中轨数值", "number"],
        ["ub", "BOLL上轨数值", "number"],
        ["lb", "BOLL下轨数值", "number"],
        ["close", "当前K线收盘价", "number"],
        ["ma5", "MA5", "number"],
        ["ma17", "MA17", "number"],
        ["ma60", "MA60", "number"],
      ],
    },
    {
      key: "boll-short",
      label: "BOLL短买信号",
      fields: [
        ["state", "短买/持股状态", "select", ["短买", "红色持股", "绿色观望", "离场"]],
        ["midColor", "中轨颜色", "select", ["红色", "绿色"]],
        ["upperColor", "上轨颜色", "select", ["红色", "绿色"]],
        ["lowerColor", "下轨颜色", "select", ["红色", "绿色"]],
        ["boll", "BOLL中轨数值", "number"],
        ["ub", "BOLL上轨数值", "number"],
        ["lb", "BOLL下轨数值", "number"],
        ["close", "当前K线收盘价", "number"],
        ["ma5", "5日均线", "number"],
        ["ma17", "MA17", "number"],
        ["ma60", "MA60", "number"],
      ],
    },
    { key: "volume", label: "成交量", fields: [["volume", "成交量", "number"], ["barColor", "量柱颜色", "select", ["红色", "绿色"]]] },
    { key: "macd", label: "MACD", fields: [["dif", "DIF", "number"], ["dea", "DEA", "number"], ["hist", "MACD柱", "number"], ["barColor", "MACD柱颜色", "select", ["红色", "绿色"]], ["goldenCross", "金叉", "select", ["是", "否"]], ["deadCross", "死叉", "select", ["是", "否"]]] },
    { key: "kdj", label: "KDJ", fields: [["k", "K值", "number"], ["d", "D值", "number"], ["j", "J值", "number"], ["goldenCross", "金叉", "select", ["是", "否"]], ["deadCross", "死叉", "select", ["是", "否"]]] },
    { key: "rsi", label: "RSI", fields: [["rsi6", "RSI6", "number"], ["rsi12", "RSI12", "number"], ["rsi24", "RSI24", "number"], ["rsi6CrossUp20", "RSI6上穿20", "select", ["是", "否"]], ["rsi6CrossDown80", "RSI6下穿80", "select", ["是", "否"]]] },
    { key: "main-force", label: "主力状态", fields: [["shortAttack", "短线上攻", "number"], ["midStrong", "中线强势", "number"], ["midControl", "中线控盘", "number"], ["midOversold", "中线超跌", "number"], ["retailMoney", "散户资金", "number"]] },
    { key: "gold-chip", label: "黄金筹码峰副图", fields: [["mainChip", "主力筹码", "number"], ["retailChip", "散户筹码", "number"], ["lockChip", "锁定筹码", "number"], ["floatChip", "浮动筹码", "number"], ["controlLine", "控盘线", "number"], ["barColor", "最后量柱颜色", "select", ["红色", "蓝色"]]] },
    { key: "gold-control", label: "黄金庄家控盘", fields: [["control", "控盘值", "number"], ["noControl", "无控盘", "number"], ["start", "开始控盘", "number"], ["hasControl", "有控盘", "number"], ["highControl", "高度控盘", "number"], ["exit", "出货", "number"], ["barColor", "最后量柱颜色", "select", ["红色", "紫色", "绿色", "灰色"]]] },
    { key: "three-dragon", label: "三龙聚首副图", fields: [["redCount", "最后一列红格数量", "number"], ["trendColor", "趋势格颜色", "select", ["红色", "绿色"]], ["energyColor", "量能格颜色", "select", ["红色", "绿色"]], ["midColor", "中期格颜色", "select", ["红色", "绿色"]], ["shortColor", "短期格颜色", "select", ["红色", "绿色"]], ["controlDegree", "控盘程度", "number"], ["longTrend", "长线趋势", "select", ["是", "否"]]] },
  ];
  const CONDITION_OPERATORS = [
    ["eq", "等于"],
    ["neq", "不等于"],
    ["gt", ">"],
    ["gte", "≥"],
    ["lt", "<"],
    ["lte", "≤"],
    ["contains", "包含"],
  ];
  const DEFAULT_INDICATOR_PLAN = {
    name: "BOLL短买主力共振测试",
    conditions: [
      { indicator: "boll-short", period: "day", field: "state", operator: "contains", value: "短买,红色持股" },
      { indicator: "boll-short", period: "day", field: "midColor", operator: "eq", value: "红色" },
      { indicator: "boll-short", period: "day", field: "lowerColor", operator: "eq", value: "红色" },
      { indicator: "boll-short", period: "day", field: "close", operator: "gt", value: "ma5" },
      { indicator: "boll-short", period: "day", field: "close", operator: "lt", value: "ub" },
      { indicator: "main-force", period: "day", field: "shortAttack", operator: "gt", value: "0" },
      { indicator: "gold-chip", period: "day", field: "mainChip", operator: "gt", value: "0" },
      { indicator: "gold-control", period: "day", field: "barColor", operator: "contains", value: "红色,紫色" },
      { indicator: "three-dragon", period: "day", field: "redCount", operator: "gte", value: "3" },
    ],
  };
  const MAIN_FORCE_FORMULA = `
N:=35;
M:=35;
N1:=1;
NX:=42;
N1X:=21;
VAR1:=IF(CLOSE < OPEN,(CLOSE-OPEN)/OPEN,0);
VAR2:=IF(CLOSE > OPEN,(CLOSE-OPEN)/OPEN,0);
VAR3:=IF(CLOSE > OPEN,(OPEN-LOW)/OPEN,(CLOSE-LOW)/OPEN);
VAR4:=IF(CLOSE > OPEN,(HIGH-CLOSE)/OPEN,(HIGH-OPEN)/OPEN);
VAR5:=IF(BARSLAST(CLOSE > MA(CLOSE,20)) > 34,34,BARSLAST(CLOSE > MA(CLOSE,20)));
VAR6:=IF(BARSLAST(CLOSE > MA(CLOSE,60)) > 120,120,BARSLAST(CLOSE > MA(CLOSE,60)));
VAR7:=IF(COUNT(CLOSE > 0,250) < 240,CAPITAL,SUM(VOL,480)/8);
VAR8:=MA(LOW,20)*1.2;
VAR9:=MA(LOW,20)*1.1;
VAR10:=MA(HIGH,20)*0.9;
VAR11:=MA(HIGH,20)*0.8;
VAR12:=CLOSE/(1+(CLOSE/MA(CLOSE,240)-1)-MA(INDEXC/MA(INDEXC,240)-1,3));
短线上攻:IF(BARSLAST(CLOSE > VAR9) < 4 AND CLOSE > MA(CLOSE,5) AND BARSLAST(CLOSE=HHV(CLOSE,21)) < 4,(MA(CLOSE,5)-REF(MA(CLOSE,5),1))/REF(MA(CLOSE,5),1)*300,0),COLORMAGENTA;
中线强势:(CLOSE/VAR12-1)*50,COLORRED,LINETHICK2;
中线控盘:MA(IF(CLOSE > MA(CLOSE,240) AND (CLOSE-MA(CLOSE,240))/MA(CLOSE,240)+SUM(VAR1,20) > 0,((CLOSE-MA(CLOSE,240))/MA(CLOSE,240)+SUM(VAR1,20))/MA(VOL/VAR7,20)/2.5,0),10),COLORYELLOW,LINETHICK2;
散户资金:IF(CLOSE < MA(CLOSE,20),((REF(CLOSE,VAR5)-CLOSE)/REF(CLOSE,VAR5)+SUM(VAR3,VAR5)-SUM(VAR4,VAR5))*20,0),COLORBLUE,LINETHICK2;
中线超跌:(REF(CLOSE,VAR6)-CLOSE)/CLOSE*2,COLORGREEN,LINETHICK2;
`;

  const state = {
    stockPool: DEFAULT_POOL.map(([symbol, listingDate]) => ({ symbol, listingDate })),
    quotes: [],
    filtered: [],
    selected: null,
    selectedRows: [],
    selectedIndexRows: [],
    selectionToken: 0,
    zoomBars: 30,
    hoverIndex: null,
    chartMetas: new Map(),
    subChartIndicators: ["volume", "main-force", "builtin-sub-1", "builtin-sub-0", "builtin-sub-2"],
    columnKeys: (JSON.parse(localStorage.getItem("aShareColumns") || "null") || DEFAULT_COLUMNS).filter((key) => FIELD_DEFS.some(([fieldKey]) => fieldKey === key)),
    importedMainIndicators: JSON.parse(localStorage.getItem("aShareMainIndicators") || "[]"),
    importedSubIndicators: JSON.parse(localStorage.getItem("aShareSubIndicators") || "[]"),
    listingDateCache: { ...STATIC_LISTING_DATES, ...JSON.parse(localStorage.getItem("aShareListingDates") || "{}") },
    enrichingListingDates: false,
    listingDateMisses: new Set(),
    fullListingDateRun: 0,
    sortKey: "pctChange",
    sortDirection: "desc",
    pageSize: Number(localStorage.getItem("aSharePageSize") || "20"),
    currentPage: 1,
    selectedCategorySymbols: new Set(),
    categorySelectionMode: false,
    activeCategory: "",
    categories: JSON.parse(localStorage.getItem("aShareCategories") || "{}"),
    indicatorPlans: JSON.parse(localStorage.getItem("aShareIndicatorPlans") || "[]"),
    indicatorScreenBase: null,
    indicatorRunToken: 0,
    klineCache: new Map(),
    indexKlineCache: new Map(),
  };
  if (state.columnKeys.length === 0) state.columnKeys = DEFAULT_COLUMNS;
  state.indicatorPlans = state.indicatorPlans.map(normalizeIndicatorPlan);

  const els = {
    statusText: document.getElementById("statusText"),
    refreshButton: document.getElementById("refreshButton"),
    downloadButton: document.getElementById("downloadButton"),
    quoteRows: document.getElementById("quoteRows"),
    totalCount: document.getElementById("totalCount"),
    filteredCount: document.getElementById("filteredCount"),
    topPctChange: document.getElementById("topPctChange"),
    detailTitle: document.getElementById("detailTitle"),
    detailMeta: document.getElementById("detailMeta"),
    typeFilterButton: document.getElementById("typeFilterButton"),
    maPeriodsButton: document.getElementById("maPeriodsButton"),
    columnSettingsButton: document.getElementById("columnSettingsButton"),
    columnSettingsMenu: document.getElementById("columnSettingsMenu"),
    categoryNameInput: document.getElementById("categoryNameInput"),
    toggleCategoryModeButton: document.getElementById("toggleCategoryModeButton"),
    manageCategoryButton: document.getElementById("manageCategoryButton"),
    selectPageButton: document.getElementById("selectPageButton"),
    confirmFavoriteButton: document.getElementById("confirmFavoriteButton"),
    saveCategoryButton: document.getElementById("saveCategoryButton"),
    saveCategorySelect: document.getElementById("saveCategorySelect"),
    categorySelect: document.getElementById("categorySelect"),
    clearCategoryButton: document.getElementById("clearCategoryButton"),
    categoryModal: document.getElementById("categoryModal"),
    closeCategoryModalButton: document.getElementById("closeCategoryModalButton"),
    showNewCategoryButton: document.getElementById("showNewCategoryButton"),
    createCategoryButton: document.getElementById("createCategoryButton"),
    manageCategoryModal: document.getElementById("manageCategoryModal"),
    closeManageCategoryButton: document.getElementById("closeManageCategoryButton"),
    manageCategoryList: document.getElementById("manageCategoryList"),
    managedCategoryNameInput: document.getElementById("managedCategoryNameInput"),
    addManagedCategoryButton: document.getElementById("addManagedCategoryButton"),
    saveManagedCategoryButton: document.getElementById("saveManagedCategoryButton"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    prevPageButton: document.getElementById("prevPageButton"),
    nextPageButton: document.getElementById("nextPageButton"),
    pageInfo: document.getElementById("pageInfo"),
    quoteHead: document.getElementById("quoteHead"),
    maPeriodsInput: document.getElementById("maPeriodsInput"),
    mainIndicatorSelect: document.getElementById("mainIndicatorSelect"),
    periodSelect: document.getElementById("periodSelect"),
    subChartCountSelect: document.getElementById("subChartCountSelect"),
    importMainIndicatorButton: document.getElementById("importMainIndicatorButton"),
    importSubIndicatorButton: document.getElementById("importSubIndicatorButton"),
    mainIndicatorFile: document.getElementById("mainIndicatorFile"),
    subIndicatorFile: document.getElementById("subIndicatorFile"),
    zoomOutButton: document.getElementById("zoomOutButton"),
    zoomInButton: document.getElementById("zoomInButton"),
    zoomResetButton: document.getElementById("zoomResetButton"),
    mainChartTitle: document.getElementById("mainChartTitle"),
    mainChartInfo: document.getElementById("mainChartInfo"),
    mainChart: document.getElementById("mainChart"),
    subCharts: document.getElementById("subCharts"),
    indicatorScreenStatus: document.getElementById("indicatorScreenStatus"),
    indicatorScreener: document.getElementById("indicatorScreener"),
    toggleIndicatorScreenerButton: document.getElementById("toggleIndicatorScreenerButton"),
    loadDefaultIndicatorPlanButton: document.getElementById("loadDefaultIndicatorPlanButton"),
    addIndicatorConditionButton: document.getElementById("addIndicatorConditionButton"),
    saveIndicatorPlanButton: document.getElementById("saveIndicatorPlanButton"),
    runIndicatorScreenButton: document.getElementById("runIndicatorScreenButton"),
    deleteIndicatorPlanButton: document.getElementById("deleteIndicatorPlanButton"),
    indicatorPlanName: document.getElementById("indicatorPlanName"),
    indicatorPlanSelect: document.getElementById("indicatorPlanSelect"),
    indicatorConditionList: document.getElementById("indicatorConditionList"),
    filters: {
      keyword: document.getElementById("keywordFilter"),
      type: document.getElementById("typeFilter"),
      minListingDays: document.getElementById("minListingDays"),
      maxListingDays: document.getElementById("maxListingDays"),
      minFloatMarketCapYi: document.getElementById("minFloatMarketCapYi"),
      maxFloatMarketCapYi: document.getElementById("maxFloatMarketCapYi"),
      minPctChange: document.getElementById("minPctChange"),
      maxPctChange: document.getElementById("maxPctChange"),
      minTurnoverYi: document.getElementById("minTurnoverYi"),
      maxTurnoverYi: document.getElementById("maxTurnoverYi"),
      minTurnoverRate: document.getElementById("minTurnoverRate"),
      maxTurnoverRate: document.getElementById("maxTurnoverRate"),
      minVolumeRatio: document.getElementById("minVolumeRatio"),
      maxVolumeRatio: document.getElementById("maxVolumeRatio"),
    },
  };

  function toNumber(value) {
    if (value === "-" || value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function detectType(symbol) {
    const code = symbol.slice(2);
    if (symbol.startsWith("bj")) return "北交所";
    if (symbol.startsWith("sh") && code.startsWith("688")) return "科创板";
    if (symbol.startsWith("sz") && code.startsWith("300")) return "创业板";
    if (symbol.startsWith("sz")) return "深市主板";
    return "沪市主板";
  }

  function daysSince(dateText) {
    if (!dateText) return null;
    const start = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    return Math.max(0, Math.floor((TODAY - start) / 86400000));
  }

  function normalizeListingDate(value) {
    const text = String(value || "").trim();
    const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dashed) return text;
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    return compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : "";
  }

  function parseTencentQuote(line) {
    const match = line.match(/^v_([a-z]{2}\d{6})="(.*)";?$/);
    if (!match) return null;
    const symbol = match[1];
    const fields = match[2].split("~");
    if (!fields[1] || !fields[2] || fields[3] === "0.00") return null;
    const poolItem = state.stockPool.find((item) => item.symbol === symbol);
    const listingDate = (poolItem && poolItem.listingDate) || state.listingDateCache[symbol] || STATIC_LISTING_DATES[symbol] || KNOWN_LISTING_DATES.get(symbol) || "";
    return {
      symbol,
      code: fields[2],
      name: fields[1],
      type: detectType(symbol),
      listingDate,
      listingDays: daysSince(listingDate),
      latestPrice: toNumber(fields[3]),
      prevClose: toNumber(fields[4]),
      open: toNumber(fields[5]),
      pctChange: toNumber(fields[32]),
      turnover: toNumber(fields[37]) === null ? null : Number(fields[37]) * 10000,
      turnoverRate: toNumber(fields[38]),
      pe: toNumber(fields[39]),
      amplitude: toNumber(fields[43]),
      floatMarketCap: toNumber(fields[44]) === null ? null : Number(fields[44]) * 100000000,
      totalMarketCap: toNumber(fields[45]) === null ? null : Number(fields[45]) * 100000000,
      volumeRatio: toNumber(fields[49]),
      rawTime: formatQuoteTime(fields[30]),
      source: "腾讯",
    };
  }

  function formatQuoteTime(value) {
    const text = String(value || "");
    const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}` : text;
  }

  function eastmoneySymbol(item) {
    const code = item.f12;
    if (!/^\d{6}$/.test(code)) return null;
    if (code.startsWith("6")) return `sh${code}`;
    if (code.startsWith("8") || code.startsWith("4") || code.startsWith("9")) return `bj${code}`;
    return `sz${code}`;
  }

  function generateAStockUniverse() {
    const ranges = [
      ["sh", 600000, 605999],
      ["sh", 688000, 688999],
      ["sz", 1, 3999],
      ["sz", 300000, 301999],
    ];
    const result = [];
    ranges.forEach(([prefix, start, end]) => {
      for (let code = start; code <= end; code += 1) {
        const symbol = `${prefix}${String(code).padStart(6, "0")}`;
        result.push({ symbol, listingDate: state.listingDateCache[symbol] || STATIC_LISTING_DATES[symbol] || "" });
      }
    });
    return result;
  }

  async function fetchAllStockPool() {
    const officialPool = await fetchOfficialStockPool();
    const hosts = [
      "https://82.push2.eastmoney.com/api/qt/clist/get",
      "https://48.push2.eastmoney.com/api/qt/clist/get",
      EASTMONEY_LIST_URL,
    ];
    for (const host of hosts) {
      try {
        const pool = [];
        for (let page = 1; page <= 40; page += 1) {
          const varName = `em_all_a_${Date.now()}_${page}`;
          const url = `${host}?${new URLSearchParams({
            cb: varName,
            pn: String(page),
            pz: "200",
            po: "1",
            np: "1",
            fltt: "2",
            invt: "2",
            ut: "bd1d9ddb04089700cf9c27f6f7426281",
            wbp2u: "|0|0|0|web",
            fid: "f3",
            fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048",
            fields: "f12,f14,f26",
            _: String(Date.now()),
          }).toString()}`;
          const payload = await jsonp(url, varName);
          const diff = payload.data && payload.data.diff ? payload.data.diff : [];
          if (!diff.length) break;
          pool.push(
            ...diff
              .map((item) => {
                const symbol = eastmoneySymbol(item);
                const listingDate = normalizeListingDate(item.f26) || (symbol ? state.listingDateCache[symbol] || STATIC_LISTING_DATES[symbol] || "" : "");
                return { symbol, listingDate };
              })
              .filter((item) => item.symbol)
          );
          if (!payload.data || pool.length >= Number(payload.data.total || 0)) break;
        }
        if (pool.length) return mergeStockPools(pool, officialPool);
      } catch (_) {
        // Try the next Eastmoney host, then fall back to code-space enumeration.
      }
    }
    return mergeStockPools(generateAStockUniverse(), officialPool);
  }

  async function fetchOfficialStockPool() {
    const result = localListingPool();
    try {
      const varName = `sse_list_${Date.now()}`;
      const url = `https://query.sse.com.cn/security/stock/getStockListData2.do?${new URLSearchParams({
        jsonCallBack: varName,
        isPagination: "true",
        stockCode: "",
        csrcCode: "",
        areaName: "",
        stockType: "1",
        "pageHelp.cacheSize": "1",
        "pageHelp.beginPage": "1",
        "pageHelp.pageSize": "3000",
        "pageHelp.pageNo": "1",
        _: String(Date.now()),
      }).toString()}`;
      const payload = await jsonp(url, varName);
      const rows = (payload.pageHelp && payload.pageHelp.data) || payload.result || [];
      result.push(
        ...rows
          .map((item) => ({
            symbol: item.SECURITY_CODE_A ? `sh${item.SECURITY_CODE_A}` : "",
            listingDate: normalizeListingDate(item.LISTING_DATE),
          }))
          .filter((item) => item.symbol)
      );
    } catch (_) {
      // Official exchange endpoint can be blocked by network policy; keep other sources alive.
    }
    try {
      result.push(...(await fetchSzseStockPool()));
    } catch (_) {
      // Keep local/Shanghai data when SZSE blocks cross-origin requests.
    }
    return mergeStockPools(result, []);
  }

  function localListingPool() {
    const dates = window.A_SHARE_LISTING_DATES || {};
    return Object.entries(dates).map(([symbol, listingDate]) => ({ symbol, listingDate }));
  }

  async function fetchSzseStockPool() {
    const result = [];
    const url = `https://www.szse.cn/api/report/ShowReport/data?${new URLSearchParams({
      SHOWTYPE: "JSON",
      CATALOGID: "1110x",
      TABKEY: "tab1",
      PAGENO: "1",
      PAGESIZE: "5000",
      random: String(Math.random()),
    }).toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`深交所列表接口返回 ${response.status}`);
    const payload = await response.json();
    const rows = payload && payload[0] && payload[0].data ? payload[0].data : [];
    rows.forEach((item) => {
      if (/^\d{6}$/.test(item.zqdm || "")) result.push({ symbol: `sz${item.zqdm}`, listingDate: normalizeListingDate(item.agssrq) || state.listingDateCache[`sz${item.zqdm}`] || "" });
    });
    return result;
  }

  function mergeStockPools(basePool, extraPool) {
    const bySymbol = new Map(basePool.map((item) => [item.symbol, item]));
    extraPool.forEach((item) => {
      const existing = bySymbol.get(item.symbol);
      if (existing) {
        if (!existing.listingDate && item.listingDate) existing.listingDate = item.listingDate;
      } else {
        bySymbol.set(item.symbol, item);
      }
      if (item.listingDate) state.listingDateCache[item.symbol] = item.listingDate;
    });
    localStorage.setItem("aShareListingDates", JSON.stringify(state.listingDateCache));
    return Array.from(bySymbol.values());
  }

  async function fetchQuotes() {
    const result = [];
    const batchSize = IS_MOBILE ? 300 : 500;
    for (let index = 0; index < state.stockPool.length; index += batchSize) {
      const symbols = state.stockPool.slice(index, index + batchSize).map((item) => item.symbol).join(",");
      const text = await retryAsync(async () => {
        const response = await fetch(`${QUOTE_URL}${symbols}`);
        if (!response.ok) throw new Error(`腾讯行情接口返回 ${response.status}`);
        const buffer = await response.arrayBuffer();
        return new TextDecoder("gbk").decode(buffer);
      }, 2, IS_MOBILE ? 900 : 300);
      result.push(
        ...text
          .split(/\n+/)
          .map((line) => parseTencentQuote(line.trim()))
          .filter(Boolean)
      );
      if (IS_MOBILE) {
        els.statusText.textContent = `正在分批拉取实时行情：${Math.min(index + batchSize, state.stockPool.length)}/${state.stockPool.length}`;
        await sleep(120);
      }
    }
    return result;
  }

  function normalizeKlineRows(rows) {
    return rows
      .map((row) => ({
        date: formatKlineDate(row[0]),
        open: Number(row[1]),
        close: Number(row[2]),
        high: Number(row[3]),
        low: Number(row[4]),
        volume: Number(row[5]),
      }))
      .filter((row) => row.date && Number.isFinite(row.open) && Number.isFinite(row.close));
  }

  function formatKlineDate(value) {
    const text = String(value || "");
    const compactMinute = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (compactMinute) return `${compactMinute[1]}-${compactMinute[2]}-${compactMinute[3]} ${compactMinute[4]}:${compactMinute[5]}`;
    const compactDay = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactDay) return `${compactDay[1]}-${compactDay[2]}-${compactDay[3]}`;
    return text;
  }

  async function requestPeriodKline(symbol, period, qfq, count = 520) {
    const param = qfq ? `${symbol},${period},,,${count},qfq` : `${symbol},${period},,,${count}`;
    const url = `${DAY_KLINE_URL}?${new URLSearchParams({ param }).toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`K线接口返回 ${response.status}`);
    return response.json();
  }

  async function requestDayKline(symbol, qfq) {
    return requestPeriodKline(symbol, "day", qfq);
  }

  async function requestListingDate(symbol) {
    if (symbol.startsWith("sz")) {
      const szDate = await requestSzseListingDate(symbol);
      if (szDate) return szDate;
    }
    const payload = await requestPeriodKline(symbol, "day", false, 10000);
    const rows = payload.data && payload.data[symbol] && payload.data[symbol].day;
    const normalized = normalizeKlineRows(rows || []);
    return normalized.length ? normalized[0].date.slice(0, 10) : "";
  }

  async function requestSzseListingDate(symbol) {
    const code = symbol.slice(2);
    const response = await fetch(`https://www.szse.cn/api/report/index/companyGeneralization?${new URLSearchParams({
      random: String(Math.random()),
      secCode: code,
    }).toString()}`);
    if (!response.ok) return "";
    const payload = await response.json();
    const date = payload && payload.data && payload.data.agssrq;
    return normalizeListingDate(date);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isGithubPages() {
    return location.hostname.endsWith("github.io");
  }

  function preferEastmoneyKline() {
    return IS_MOBILE || isGithubPages();
  }

  function jsonp(url, varName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let payload = null;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("接口请求超时"));
      }, IS_MOBILE ? 20000 : 12000);
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try {
          delete window[varName];
        } catch (_) {
          window[varName] = undefined;
        }
      };
      window[varName] = (data) => {
        payload = data;
      };
      script.src = url;
      script.onload = () => {
        const result = payload || (typeof window[varName] === "function" ? null : window[varName]);
        cleanup();
        result ? resolve(result) : reject(new Error("接口返回为空"));
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("K线接口加载失败"));
      };
      document.head.appendChild(script);
    });
  }

  async function retryAsync(task, attempts = 2, delayMs = IS_MOBILE ? 650 : 250) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(delayMs * attempt);
      }
    }
    throw lastError;
  }

  function mergeRows(rows, size) {
    const result = [];
    for (let i = 0; i < rows.length; i += size) {
      const group = rows.slice(i, i + size);
      if (group.length < size) continue;
      result.push({
        date: group[group.length - 1].date,
        open: group[0].open,
        close: group[group.length - 1].close,
        high: Math.max(...group.map((row) => row.high)),
        low: Math.min(...group.map((row) => row.low)),
        volume: group.reduce((sum, row) => sum + row.volume, 0),
      });
    }
    return result;
  }

  async function requestMinuteKline(symbol, period) {
    if (period === "120") return mergeRows(await requestMinuteKline(symbol, "60"), 2);
    const key = `m${period}`;
    const varName = `${key}_today_${Date.now()}`;
    const url = `https://ifzq.gtimg.cn/appstock/app/kline/mkline?${new URLSearchParams({
      param: `${symbol},${key},,520`,
      _var: varName,
      r: String(Math.random()),
    }).toString()}`;
    const payload = await jsonp(url, varName);
    const data = payload.data && payload.data[symbol];
    return normalizeKlineRows((data && data[key]) || []);
  }

  async function requestPeriodKlineJsonp(symbol, period, qfq, count = 520, endpoint = DAY_KLINE_URL) {
    const varName = `tq_kline_${symbol}_${period}_${qfq ? "qfq" : "plain"}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const param = qfq ? `${symbol},${period},,,${count},qfq` : `${symbol},${period},,,${count}`;
    const url = `${endpoint}?${new URLSearchParams({ _var: varName, param }).toString()}`;
    const payload = await jsonp(url, varName);
    const data = payload.data && payload.data[symbol];
    const key = qfq ? `qfq${period}` : period;
    return normalizeKlineRows((data && (data[key] || data[period])) || []);
  }

  async function requestTencentAdjustedKline(symbol, period) {
    let lastError = null;
    for (const endpoint of TENCENT_KLINE_URLS) {
      try {
        const rows = await retryAsync(() => requestPeriodKlineJsonp(symbol, period, true, 520, endpoint), 2);
        if (rows.length) return rows;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return [];
  }

  function eastmoneySecid(symbol) {
    const market = symbol.startsWith("sh") ? "1" : "0";
    return `${market}.${symbol.slice(2)}`;
  }

  function eastmoneyKlt(period) {
    if (period === "day") return "101";
    if (period === "week") return "102";
    if (period === "month") return "103";
    return period;
  }

  async function requestEastmoneyKline(symbol, period) {
    if ((location.protocol === "http:" || location.protocol === "https:") && !isGithubPages()) {
      const proxyUrl = `/api/eastmoney-kline?${new URLSearchParams({ symbol, period }).toString()}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const payload = await response.json();
        const klines = payload.data && payload.data.klines;
        return normalizeEastmoneyKlines(klines || []);
      }
    }
    const varName = `em_kline_${symbol}_${period}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${new URLSearchParams({
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
    const klines = payload.data && payload.data.klines;
    return normalizeEastmoneyKlines(klines || []);
  }

  function normalizeEastmoneyKlines(klines) {
    return (klines || [])
      .map((line) => {
        const parts = String(line).split(",");
        return {
          date: formatKlineDate(parts[0]),
          open: Number(parts[1]),
          close: Number(parts[2]),
          high: Number(parts[3]),
          low: Number(parts[4]),
          volume: Number(parts[5]),
        };
      })
      .filter((row) => row.date && Number.isFinite(row.open) && Number.isFinite(row.close));
  }

  async function fetchKline(symbol) {
    const period = els.periodSelect.value;
    return fetchKlineForPeriod(symbol, period);
  }

  async function fetchKlineForPeriod(symbol, period) {
    const cacheKey = `${symbol}:${period}`;
    if (state.klineCache.has(cacheKey)) return state.klineCache.get(cacheKey);
    let rows = [];
    let triedEastmoney = false;
    if ((location.protocol === "http:" || location.protocol === "https:") && !isGithubPages()) {
      try {
        triedEastmoney = true;
        rows = applyRealtimeQuoteToRows(symbol, await retryAsync(() => requestEastmoneyKline(symbol, period)), period === "day");
      } catch (_) {
        rows = [];
      }
    } else if (preferEastmoneyKline() && !["5", "30", "60", "120"].includes(period)) {
      try {
        triedEastmoney = true;
        rows = applyRealtimeQuoteToRows(symbol, await retryAsync(() => requestEastmoneyKline(symbol, period)), period === "day");
      } catch (_) {
        rows = [];
      }
    }
    try {
      if (rows.length) {
        // Prefer the local proxy result when available.
      } else if (["5", "30", "60", "120"].includes(period)) {
        rows = applyRealtimeQuoteToRows(symbol, await retryAsync(() => requestMinuteKline(symbol, period)), false);
      } else {
        rows = await requestTencentAdjustedKline(symbol, period === "week" || period === "month" ? period : "day");
        if (period === "day") rows = applyRealtimeQuoteToRows(symbol, rows, true);
      }
    } catch (_) {
      rows = [];
    }
    if (!rows.length && !triedEastmoney) {
      rows = applyRealtimeQuoteToRows(symbol, await retryAsync(() => requestEastmoneyKline(symbol, period)), period === "day");
    }
    if (!rows.length) throw new Error(`无${period}K线数据`);
    const quote = state.quotes.find((item) => item.symbol === symbol);
    if (period === "day" && quote && quote.rawTime && rows[rows.length - 1] && rows[rows.length - 1].date) {
      const quoteDate = quote.rawTime.slice(0, 10);
      const rowDate = rows[rows.length - 1].date.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(quoteDate) && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) {
        const lagDays = (new Date(`${quoteDate}T00:00:00`) - new Date(`${rowDate}T00:00:00`)) / 86400000;
        if (lagDays > 10) throw new Error(`日K陈旧:${rowDate}`);
      }
    }
    state.klineCache.set(cacheKey, rows);
    return rows;
  }

  async function fetchIndexKlineForQuotePeriod(quote, period) {
    let symbol = "sh000001";
    if (quote.type === "创业板") symbol = "sz399006";
    if (quote.type === "深市主板") symbol = "sz399001";
    const cacheKey = `${symbol}:${period}`;
    if (state.indexKlineCache.has(cacheKey)) return state.indexKlineCache.get(cacheKey);
    let rows = [];
    if (["5", "30", "60", "120"].includes(period)) {
      rows = await retryAsync(() => requestMinuteKline(symbol, period));
      state.indexKlineCache.set(cacheKey, rows);
      return rows;
    }
    rows = await requestTencentAdjustedKline(symbol, period === "week" || period === "month" ? period : "day");
    state.indexKlineCache.set(cacheKey, rows);
    return rows;
  }

  function applyRealtimeQuoteToRows(symbol, rows, useDailyOpen) {
    const quote = state.quotes.find((item) => item.symbol === symbol);
    if (!quote || !rows.length || quote.latestPrice === null) return rows;
    const last = rows[rows.length - 1];
    const nextClose = quote.latestPrice;
    const nextOpen = useDailyOpen ? quote.open || last.open : last.open;
    rows[rows.length - 1] = {
      ...last,
      open: nextOpen,
      close: nextClose,
      high: Math.max(last.high, nextClose, nextOpen),
      low: Math.min(last.low, nextClose, nextOpen),
    };
    return rows;
  }

  async function fetchIndexKlineForQuote(quote) {
    const period = els.periodSelect.value;
    return fetchIndexKlineForQuotePeriod(quote, period);
  }

  function readCriteria() {
    const minFloatMarketCapYi = toNumber(els.filters.minFloatMarketCapYi.value);
    const maxFloatMarketCapYi = toNumber(els.filters.maxFloatMarketCapYi.value);
    const minTurnoverYi = toNumber(els.filters.minTurnoverYi.value);
    const maxTurnoverYi = toNumber(els.filters.maxTurnoverYi.value);
    const selectedTypes = Array.from(els.filters.type.querySelectorAll("input:checked")).map((input) => input.value);
    return {
      keyword: els.filters.keyword.value.trim().toLowerCase(),
      types: selectedTypes.filter((type) => !type.startsWith("__")),
      excludedTypes: [
        selectedTypes.includes("__exclude_chinext") ? "创业板" : "",
        selectedTypes.includes("__exclude_star") ? "科创板" : "",
      ].filter(Boolean),
      nonSt: selectedTypes.includes("__non_st"),
      minListingDays: toNumber(els.filters.minListingDays.value),
      maxListingDays: toNumber(els.filters.maxListingDays.value),
      minFloatMarketCap: minFloatMarketCapYi === null ? null : minFloatMarketCapYi * 100000000,
      maxFloatMarketCap: maxFloatMarketCapYi === null ? null : maxFloatMarketCapYi * 100000000,
      minPctChange: toNumber(els.filters.minPctChange.value),
      maxPctChange: toNumber(els.filters.maxPctChange.value),
      minTurnover: minTurnoverYi === null ? null : minTurnoverYi * 100000000,
      maxTurnover: maxTurnoverYi === null ? null : maxTurnoverYi * 100000000,
      minTurnoverRate: toNumber(els.filters.minTurnoverRate.value),
      maxTurnoverRate: toNumber(els.filters.maxTurnoverRate.value),
      minVolumeRatio: toNumber(els.filters.minVolumeRatio.value),
      maxVolumeRatio: toNumber(els.filters.maxVolumeRatio.value),
    };
  }

  function updateTypeFilterLabel() {
    const labelMap = {
      __non_st: "非ST",
      __exclude_chinext: "非创业板",
      __exclude_star: "非科创板",
    };
    const selected = Array.from(els.filters.type.querySelectorAll("input:checked")).map((input) => labelMap[input.value] || input.value);
    els.typeFilterButton.textContent = selected.length ? selected.join("，") : "全部类型";
    els.typeFilterButton.title = selected.join("，");
  }

  function updateMaFilterLabel() {
    const selected = Array.from(els.maPeriodsInput.querySelectorAll("input:checked")).map((input) => `MA${input.value}`);
    els.maPeriodsButton.textContent = selected.length ? selected.join("，") : "不显示均线";
    els.maPeriodsButton.title = selected.join("，");
  }

  function updateMainControlVisibility() {
    const maField = els.maPeriodsInput.closest(".filter-field");
    const controls = els.mainIndicatorSelect.closest(".chart-controls");
    const isMa = els.mainIndicatorSelect.value === "ma";
    if (maField) maField.style.display = isMa ? "" : "none";
    if (controls) controls.classList.toggle("main-no-ma", !isMa);
  }

  function insideRange(value, min, max) {
    if (value === null || value === undefined) return min === null && max === null;
    return (min === null || value >= min) && (max === null || value <= max);
  }

  function quoteMatches(quote, criteria) {
    const keywordMatch =
      !criteria.keyword ||
      quote.code.includes(criteria.keyword) ||
      quote.symbol.includes(criteria.keyword) ||
      quote.name.toLowerCase().includes(criteria.keyword);
    return (
      keywordMatch &&
      (criteria.types.length === 0 || criteria.types.includes(quote.type)) &&
      !(criteria.excludedTypes || []).includes(quote.type) &&
      (!criteria.nonSt || !/^\*?ST|退市|退$/.test(quote.name.toUpperCase())) &&
      insideRange(quote.listingDays, criteria.minListingDays, criteria.maxListingDays) &&
      insideRange(quote.floatMarketCap, criteria.minFloatMarketCap, criteria.maxFloatMarketCap) &&
      insideRange(quote.pctChange, criteria.minPctChange, criteria.maxPctChange) &&
      insideRange(quote.turnover, criteria.minTurnover, criteria.maxTurnover) &&
      insideRange(quote.turnoverRate, criteria.minTurnoverRate, criteria.maxTurnoverRate) &&
      insideRange(quote.volumeRatio, criteria.minVolumeRatio, criteria.maxVolumeRatio)
    );
  }

  function indicatorDef(key) {
    return INDICATOR_DEFS.find((item) => item.key === key) || INDICATOR_DEFS[0];
  }

  function indicatorFieldDef(indicatorKey, fieldKey) {
    const indicator = indicatorDef(indicatorKey);
    return indicator.fields.find(([key]) => key === fieldKey) || indicator.fields[0];
  }

  function legacyMetricToCondition(condition) {
    const map = {
      bollShortState: ["boll-short", "state"],
      bollMidColor: ["boll-short", "midColor"],
      bollUpperColor: ["boll-short", "upperColor"],
      bollLowerColor: ["boll-short", "lowerColor"],
      close: ["boll-short", "close"],
      ma5: ["boll-short", "ma5"],
      mainForceShortAttack: ["main-force", "shortAttack"],
      goldChipMainChip: ["gold-chip", "mainChip"],
      goldChipBarColor: ["gold-chip", "barColor"],
      goldControlValue: ["gold-control", "control"],
      goldControlBarColor: ["gold-control", "barColor"],
      threeDragonRedCount: ["three-dragon", "redCount"],
    };
    if (!condition.metric || !map[condition.metric]) return condition;
    const [indicator, field] = map[condition.metric];
    return { indicator, field, period: condition.period || "day", operator: condition.operator || "eq", value: condition.value || "" };
  }

  function normalizeIndicatorPlan(plan) {
    return {
      name: plan.name || "未命名指标筛选",
      conditions: (plan.conditions || []).map(legacyMetricToCondition),
    };
  }

  function parseConditionValue(rawValue, metrics) {
    const text = String(rawValue ?? "").trim();
    if (Object.prototype.hasOwnProperty.call(metrics, text)) return metrics[text];
    const number = Number(text);
    return text !== "" && Number.isFinite(number) ? number : text;
  }

  function compareCondition(actual, operator, expected) {
    if (operator === "contains") {
      const options = String(expected ?? "")
        .split(/[,\uFF0C、|/]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      return options.length ? options.includes(String(actual ?? "")) : String(actual ?? "").includes(String(expected ?? ""));
    }
    if (operator === "eq") return String(actual ?? "") === String(expected ?? "");
    if (operator === "neq") return String(actual ?? "") !== String(expected ?? "");
    const left = Number(actual);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === "gt") return left > right;
    if (operator === "gte") return left >= right;
    if (operator === "lt") return left < right;
    if (operator === "lte") return left <= right;
    return false;
  }

  function evaluateIndicatorCondition(condition, metrics) {
    const indicatorMetrics = condition.indicator && metrics[condition.indicator] ? metrics[condition.indicator] : metrics;
    const actual = condition.metric ? metrics[condition.metric] : indicatorMetrics[condition.field];
    const expected = parseConditionValue(condition.value, metrics);
    const fieldExpected = parseConditionValue(condition.value, indicatorMetrics);
    return compareCondition(actual, condition.operator, fieldExpected === "" ? expected : fieldExpected);
  }

  function evaluateIndicatorPlan(plan, metrics) {
    const conditions = (plan.conditions || []).filter((condition) => condition && (condition.field || condition.metric));
    const failed = conditions.filter((condition) => !evaluateIndicatorCondition(condition, metrics));
    return {
      passed: failed.length === 0,
      failed,
      total: conditions.length,
    };
  }

  function bollStateLabel(stateValue) {
    if (stateValue === "buy") return "短买";
    if (stateValue === "hold") return "红色持股";
    if (stateValue === "exit") return "离场";
    return "绿色观望";
  }

  function yesNo(value) {
    return value ? "是" : "否";
  }

  function redGreen(value) {
    return value ? "红色" : "绿色";
  }

  function bollMetricsAt(rows, index) {
    const boll = calculateBoll(rows)[index] || {};
    const maMap = {
      ma5: movingAverage(rows, 5, "close")[index],
      ma10: movingAverage(rows, 10, "close")[index],
      ma17: movingAverage(rows, 17, "close")[index],
      ma20: movingAverage(rows, 20, "close")[index],
      ma30: movingAverage(rows, 30, "close")[index],
      ma60: movingAverage(rows, 60, "close")[index],
      ma120: movingAverage(rows, 120, "close")[index],
      ma250: movingAverage(rows, 250, "close")[index],
    };
    return {
      ...maMap,
      state: bollStateLabel(boll.trendState),
      boll: boll.boll,
      ub: boll.ub,
      lb: boll.lb,
      midColor: boll.add !== null && boll.add !== undefined ? "红色" : "绿色",
      upperColor: boll.hold !== null && boll.hold !== undefined ? "红色" : "绿色",
      lowerColor: boll.buy !== null && boll.buy !== undefined ? "红色" : "绿色",
      close: rows[index] ? rows[index].close : null,
    };
  }

  function collectIndicatorMetrics(rows, indexRows, quote) {
    const lastIndex = rows.length - 1;
    const last = rows[lastIndex];
    const prevIndex = Math.max(0, lastIndex - 1);
    const bollMetrics = bollMetricsAt(rows, lastIndex);
    const mainForce = calculateMainForce(rows, indexRows || [], quote)[lastIndex] || {};
    const goldChip = calculateGoldChip(rows, quote)[lastIndex] || {};
    const goldControl = calculateGoldControl(rows)[lastIndex] || {};
    const threeDragon = calculateThreeDragon(rows)[lastIndex] || {};
    const macdValues = macd(rows);
    const macdLast = macdValues[lastIndex] || {};
    const macdPrev = macdValues[prevIndex] || {};
    const kdjValues = calculateKdj(rows);
    const kdjLast = kdjValues[lastIndex] || {};
    const kdjPrev = kdjValues[prevIndex] || {};
    const rsiValues = calculateRsi(rows);
    const rsiLast = rsiValues[lastIndex] || {};
    const rsiPrev = rsiValues[prevIndex] || {};
    const dragonKeys = ["trendRed", "energyRed", "midRed", "shortRed"];
    const maMetrics = {
      close: last ? last.close : null,
      ma5: bollMetrics.ma5,
      ma10: bollMetrics.ma10,
      ma17: bollMetrics.ma17,
      ma20: bollMetrics.ma20,
      ma30: bollMetrics.ma30,
      ma60: bollMetrics.ma60,
      ma120: bollMetrics.ma120,
      ma250: bollMetrics.ma250,
    };
    return {
      ma: maMetrics,
      boll: { boll: bollMetrics.boll, ub: bollMetrics.ub, lb: bollMetrics.lb, close: bollMetrics.close, ma5: bollMetrics.ma5 },
      "boll-ma": bollMetrics,
      "boll-short": bollMetrics,
      volume: { volume: last ? last.volume : 0, barColor: last && last.close >= last.open ? "红色" : "绿色" },
      macd: {
        dif: macdLast.dif || 0,
        dea: macdLast.dea || 0,
        hist: macdLast.hist || 0,
        barColor: (macdLast.hist || 0) >= 0 ? "红色" : "绿色",
        goldenCross: yesNo((macdPrev.dif || 0) <= (macdPrev.dea || 0) && (macdLast.dif || 0) > (macdLast.dea || 0)),
        deadCross: yesNo((macdPrev.dif || 0) >= (macdPrev.dea || 0) && (macdLast.dif || 0) < (macdLast.dea || 0)),
      },
      kdj: {
        k: kdjLast.k || 0,
        d: kdjLast.d || 0,
        j: kdjLast.j || 0,
        goldenCross: yesNo((kdjPrev.k || 0) <= (kdjPrev.d || 0) && (kdjLast.k || 0) > (kdjLast.d || 0)),
        deadCross: yesNo((kdjPrev.k || 0) >= (kdjPrev.d || 0) && (kdjLast.k || 0) < (kdjLast.d || 0)),
      },
      rsi: {
        rsi6: rsiLast.rsi6 || 0,
        rsi12: rsiLast.rsi12 || 0,
        rsi24: rsiLast.rsi24 || 0,
        rsi6CrossUp20: yesNo((rsiPrev.rsi6 || 0) <= 20 && (rsiLast.rsi6 || 0) > 20),
        rsi6CrossDown80: yesNo((rsiPrev.rsi6 || 0) >= 80 && (rsiLast.rsi6 || 0) < 80),
      },
      "main-force": { shortAttack: mainForce.shortAttack || 0, midStrong: mainForce.midStrong || 0, midControl: mainForce.midControl || 0, midOversold: mainForce.midOversold || 0, retailMoney: mainForce.retailMoney || 0 },
      "gold-chip": { mainChip: goldChip.mainChip || 0, retailChip: goldChip.retailChip || 0, lockChip: goldChip.lockChip || 0, floatChip: goldChip.floatChip || 0, controlLine: goldChip.controlLine || 0, barColor: (goldChip.mainChip || 0) > 0 ? "红色" : "蓝色" },
      "gold-control": {
        control: goldControl.control || 0,
        noControl: goldControl.noControl || 0,
        start: goldControl.start || 0,
        hasControl: goldControl.hasControl || 0,
        highControl: goldControl.highControl || 0,
        exit: goldControl.exit || 0,
        barColor: goldControl.highControl ? "紫色" : goldControl.exit ? "绿色" : (goldControl.control || 0) > 0 ? "红色" : "灰色",
      },
      "three-dragon": {
        redCount: dragonKeys.reduce((count, key) => count + (threeDragon[key] ? 1 : 0), 0),
        trendColor: redGreen(threeDragon.trendRed),
        energyColor: redGreen(threeDragon.energyRed),
        midColor: redGreen(threeDragon.midRed),
        shortColor: redGreen(threeDragon.shortRed),
        controlDegree: threeDragon.controlDegree || 0,
        longTrend: yesNo(threeDragon.longTrend),
      },
      bollShortState: bollMetrics.state,
      bollMidColor: bollMetrics.midColor,
      bollUpperColor: bollMetrics.upperColor,
      bollLowerColor: bollMetrics.lowerColor,
      close: bollMetrics.close,
      ma5: bollMetrics.ma5,
      mainForceShortAttack: mainForce.shortAttack || 0,
      goldChipMainChip: goldChip.mainChip || 0,
      goldChipBarColor: (goldChip.mainChip || 0) > 0 ? "红色" : "蓝色",
      goldControlValue: goldControl.control || 0,
      goldControlBarColor: goldControl.highControl ? "紫色" : goldControl.exit ? "绿色" : (goldControl.control || 0) > 0 ? "红色" : "灰色",
      threeDragonRedCount: dragonKeys.reduce((count, key) => count + (threeDragon[key] ? 1 : 0), 0),
    };
  }

  function applyFilters() {
    updateTypeFilterLabel();
    const categorySymbols = state.activeCategory && state.categories[state.activeCategory] ? new Set(state.categories[state.activeCategory]) : null;
    state.filtered = state.quotes.filter((quote) => (!categorySymbols || categorySymbols.has(quote.symbol)) && quoteMatches(quote, readCriteria()));
    state.currentPage = 1;
    sortFiltered();
    renderQuoteTable();
  }

  function renderCategorySelect() {
    const names = Object.keys(state.categories).sort((a, b) => a.localeCompare(b, "zh-CN"));
    const options = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}（${state.categories[name].length}）</option>`).join("");
    els.categorySelect.innerHTML = `<option value="" disabled hidden>选择分组</option>${options}`;
    els.saveCategorySelect.innerHTML = `<option value="" disabled hidden>保存到已有分组</option>${options}`;
    els.categorySelect.value = state.activeCategory;
    if (!els.categorySelect.value) els.categorySelect.selectedIndex = 0;
  }

  function renderManageCategoryList() {
    const names = Object.keys(state.categories).sort((a, b) => a.localeCompare(b, "zh-CN"));
    els.manageCategoryList.innerHTML = names.length
      ? names.map((name) => `<div class="manage-category-row"><span>${escapeHtml(name)}（${state.categories[name].length}）</span><button type="button" data-delete-category="${escapeHtml(name)}">删除</button></div>`).join("")
      : `<p class="empty-note">暂无分组</p>`;
  }

  function openManageCategoryModal() {
    renderManageCategoryList();
    els.manageCategoryModal.hidden = false;
  }

  function closeManageCategoryModal() {
    els.manageCategoryModal.hidden = true;
  }

  function saveManagedCategory() {
    const name = els.managedCategoryNameInput.value.trim();
    if (!name) {
      els.statusText.textContent = "请填写分组名。";
      return;
    }
    if (!state.categories[name]) state.categories[name] = [];
    localStorage.setItem("aShareCategories", JSON.stringify(state.categories));
    els.managedCategoryNameInput.value = "";
    renderCategorySelect();
    renderManageCategoryList();
    els.statusText.textContent = `已新增分组：${name}`;
  }

  function deleteCategory(name) {
    delete state.categories[name];
    if (state.activeCategory === name) state.activeCategory = "";
    localStorage.setItem("aShareCategories", JSON.stringify(state.categories));
    renderCategorySelect();
    renderManageCategoryList();
    applyFilters();
    els.statusText.textContent = `已删除分组：${name}`;
  }

  function currentPageQuotes() {
    const start = (state.currentPage - 1) * state.pageSize;
    return state.filtered.slice(start, start + state.pageSize);
  }

  function updateCategoryMode() {
    const tableWrap = document.querySelector(".table-wrap");
    if (tableWrap) tableWrap.classList.toggle("selection-mode", state.categorySelectionMode);
    els.toggleCategoryModeButton.textContent = state.categorySelectionMode ? "退出收藏" : "收藏股票";
    renderQuoteTable();
  }

  function openCategoryModal() {
    if (!state.selectedCategorySymbols.size) {
      els.statusText.textContent = "请先勾选要收藏的股票。";
      return;
    }
    renderCategorySelect();
    els.categoryModal.hidden = false;
  }

  function closeCategoryModal() {
    els.categoryModal.hidden = true;
  }

  function createCategoryFromModal() {
    const name = els.categoryNameInput.value.trim();
    if (!name) {
      els.statusText.textContent = "请填写分组名。";
      return;
    }
    if (!state.categories[name]) state.categories[name] = [];
    localStorage.setItem("aShareCategories", JSON.stringify(state.categories));
    renderCategorySelect();
    els.saveCategorySelect.value = name;
    els.statusText.textContent = `已添加分组：${name}`;
  }

  function selectCurrentPage() {
    state.categorySelectionMode = true;
    currentPageQuotes().forEach((quote) => state.selectedCategorySymbols.add(quote.symbol));
    updateCategoryMode();
  }

  function saveSelectedCategory() {
    const name = els.categoryNameInput.value.trim() || els.saveCategorySelect.value;
    if (!name) {
      els.statusText.textContent = "请输入新分类名，或选择已有分类。";
      return;
    }
    const symbols = [...state.selectedCategorySymbols];
    if (!symbols.length) {
      els.statusText.textContent = "请先在股票列表勾选要保存的股票。";
      return;
    }
    state.categories[name] = [...new Set([...(state.categories[name] || []), ...symbols])];
    localStorage.setItem("aShareCategories", JSON.stringify(state.categories));
    state.activeCategory = name;
    state.categorySelectionMode = false;
    els.categoryNameInput.value = "";
    state.selectedCategorySymbols.clear();
    renderCategorySelect();
    updateCategoryMode();
    applyFilters();
    closeCategoryModal();
    els.statusText.textContent = `已保存分类：${name}（${state.categories[name].length}只）`;
  }

  function totalPages() {
    return Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  }

  function clampCurrentPage() {
    state.currentPage = clamp(state.currentPage, 1, totalPages());
  }

  function sortFiltered() {
    const direction = state.sortDirection === "asc" ? 1 : -1;
    state.filtered.sort((a, b) => {
      const left = a[state.sortKey];
      const right = b[state.sortKey];
      if (typeof left === "string" || typeof right === "string") {
        return String(left || "").localeCompare(String(right || ""), "zh-CN") * direction;
      }
      if (left === right) return 0;
      if (left === null || left === undefined) return 1;
      if (right === null || right === undefined) return -1;
      return left > right ? direction : -direction;
    });
  }

  function formatNumber(value, digits = 2) {
    return value === null || value === undefined || Number.isNaN(value) ? "--" : value.toFixed(digits);
  }

  function formatInteger(value) {
    return value === null || value === undefined ? "--" : String(value);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
    if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
    return value.toFixed(0);
  }

  function formatSignedPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  function changeColor(value) {
    if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "#475569";
    return value > 0 ? "#d93025" : "#0f9d58";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function classForChange(value) {
    if (value === null || value === 0) return "";
    return value > 0 ? "positive" : "negative";
  }

  function formatField(quote, key, type) {
    const value = quote[key];
    if (type === "money") return formatMoney(value);
    if (type === "integer") return formatInteger(value);
    if (type === "percent") return `${formatNumber(value)}%`;
    if (type === "number") return formatNumber(value);
    return value === null || value === undefined || value === "" ? "--" : String(value);
  }

  function renderColumnSettings() {
    const selectedDefs = state.columnKeys.map((key) => FIELD_DEFS.find(([fieldKey]) => fieldKey === key)).filter(Boolean);
    const unselectedDefs = FIELD_DEFS.filter(([key]) => !state.columnKeys.includes(key));
    const orderedDefs = [...selectedDefs, ...unselectedDefs];
    els.columnSettingsMenu.innerHTML = `
      ${orderedDefs.map(([key, label]) => {
        const index = state.columnKeys.indexOf(key);
        return `<div class="column-setting-row">
          <label><input type="checkbox" value="${key}" ${index >= 0 ? "checked" : ""} />${label}</label>
          <button type="button" class="icon-move" data-move="${key}" data-dir="-1" title="上移" aria-label="${label}上移" ${index <= 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="icon-move" data-move="${key}" data-dir="1" title="下移" aria-label="${label}下移" ${index < 0 || index >= state.columnKeys.length - 1 ? "disabled" : ""}>↓</button>
        </div>`;
      }).join("")}
    `;
  }

  function clonePlan(plan) {
    return JSON.parse(JSON.stringify(plan));
  }

  function emptyCondition() {
    return { indicator: "boll-short", period: "day", field: "state", operator: "eq", value: "短买" };
  }

  function readIndicatorPlanFromForm() {
    const conditions = Array.from(els.indicatorConditionList.querySelectorAll(".condition-row")).map((row) => ({
      indicator: row.querySelector("[data-field='indicator']").value,
      period: row.querySelector("[data-field='period']").value,
      field: row.querySelector("[data-field='conditionField']").value,
      operator: row.querySelector("[data-field='operator']").value,
      value: row.querySelector("[data-field='value']").value.trim(),
    }));
    return {
      name: els.indicatorPlanName.value.trim() || "未命名指标筛选",
      conditions,
    };
  }

  function renderIndicatorPlanSelect() {
    if (!state.indicatorPlans.length) {
      els.indicatorPlanSelect.innerHTML = `<option value="">暂无保存方案</option>`;
      els.indicatorPlanSelect.disabled = true;
      return;
    }
    els.indicatorPlanSelect.disabled = false;
    els.indicatorPlanSelect.innerHTML = state.indicatorPlans.map((plan, index) => `<option value="${index}">${plan.name}</option>`).join("");
  }

  function renderIndicatorConditions(conditions) {
    els.indicatorConditionList.innerHTML = (conditions.length ? conditions : [emptyCondition()])
      .map((condition, index) => {
        const normalized = legacyMetricToCondition(condition);
        const indicator = indicatorDef(normalized.indicator);
        const field = indicatorFieldDef(indicator.key, normalized.field);
        const values = field[3] || [];
        const valueInput =
          field[2] === "select" && normalized.operator !== "contains"
            ? `<select data-field="value">${values.map((value) => `<option value="${value}" ${String(normalized.value) === value ? "selected" : ""}>${value}</option>`).join("")}</select>`
            : `<input data-field="value" type="text" value="${escapeHtml(normalized.value || "")}" placeholder="数值或字段名，如 ma5" />`;
        return `<div class="condition-row">
          <select data-field="indicator">
            ${INDICATOR_DEFS.map((item) => `<option value="${item.key}" ${indicator.key === item.key ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
          <select data-field="period">
            ${PERIOD_OPTIONS.map(([value, label]) => `<option value="${value}" ${normalized.period === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <select data-field="conditionField">
            ${indicator.fields.map(([key, label]) => `<option value="${key}" ${field[0] === key ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <select data-field="operator">
            ${CONDITION_OPERATORS.map(([value, label]) => `<option value="${value}" ${normalized.operator === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          ${valueInput}
          <button type="button" class="remove-condition" data-remove-condition="${index}" title="删除条件">×</button>
        </div>`;
      })
      .join("");
  }

  function loadIndicatorPlan(plan) {
    const next = normalizeIndicatorPlan(clonePlan(plan));
    els.indicatorPlanName.value = next.name || "";
    renderIndicatorConditions(next.conditions || []);
  }

  function saveIndicatorPlan() {
    const plan = normalizeIndicatorPlan(readIndicatorPlanFromForm());
    const existing = state.indicatorPlans.findIndex((item) => item.name === plan.name);
    if (existing >= 0) state.indicatorPlans[existing] = plan;
    else state.indicatorPlans.push(plan);
    localStorage.setItem("aShareIndicatorPlans", JSON.stringify(state.indicatorPlans));
    renderIndicatorPlanSelect();
    els.indicatorPlanSelect.value = String(existing >= 0 ? existing : state.indicatorPlans.length - 1);
    els.indicatorScreenStatus.textContent = `已保存方案：${plan.name}`;
  }

  function deleteIndicatorPlan() {
    const index = Number(els.indicatorPlanSelect.value);
    if (!Number.isInteger(index) || !state.indicatorPlans[index]) return;
    const [removed] = state.indicatorPlans.splice(index, 1);
    localStorage.setItem("aShareIndicatorPlans", JSON.stringify(state.indicatorPlans));
    renderIndicatorPlanSelect();
    loadIndicatorPlan(DEFAULT_INDICATOR_PLAN);
    els.indicatorScreenStatus.textContent = `已删除方案：${removed.name}`;
  }

  async function metricsForQuoteAndPeriod(quote, period) {
    const rows = await fetchKlineForPeriod(quote.symbol, period);
    if (!rows.length) throw new Error("无K线数据");
    const indexRows = await fetchIndexKlineForQuotePeriod(quote, period).catch(() => []);
    return collectIndicatorMetrics(rows, indexRows, quote);
  }

  async function quotePassesIndicatorPlan(quote, plan) {
    const normalizedPlan = normalizeIndicatorPlan(plan);
    const periods = [...new Set((normalizedPlan.conditions || []).map((condition) => condition.period || "day"))];
    const metricsByPeriod = {};
    for (const period of periods) {
      metricsByPeriod[period] = await metricsForQuoteAndPeriod(quote, period);
    }
    const failed = (normalizedPlan.conditions || []).filter((condition) => !evaluateIndicatorCondition(condition, metricsByPeriod[condition.period || "day"] || {}));
    return {
      passed: failed.length === 0,
      failed,
      metricsByPeriod,
    };
  }

  function conditionLabel(condition) {
    const indicator = indicatorDef(condition.indicator);
    const field = indicatorFieldDef(condition.indicator, condition.field);
    const period = PERIOD_OPTIONS.find(([value]) => value === condition.period);
    const operator = CONDITION_OPERATORS.find(([value]) => value === condition.operator);
    return `${indicator.label}/${period ? period[1] : condition.period}/${field[1]} ${operator ? operator[1] : condition.operator} ${condition.value}`;
  }

  async function runIndicatorScreen() {
    const plan = readIndicatorPlanFromForm();
    const runToken = Date.now();
    state.indicatorRunToken = runToken;
    state.indicatorScreenBase = state.quotes.filter((quote) => quoteMatches(quote, readCriteria()));
    const base = state.indicatorScreenBase;
    const matches = [];
    const failedReasons = new Map();
    const klineErrors = new Map();
    let failed = 0;
    let completed = 0;
    let lastPublished = 0;
    els.runIndicatorScreenButton.disabled = true;
    const workerCount = Math.min(IS_MOBILE ? 6 : 10, Math.max(1, base.length));
    els.indicatorScreenStatus.textContent = `开始运行：${plan.name}，共 ${base.length} 只股票，并发 ${workerCount}，K线源：${preferEastmoneyKline() ? "东方财富优先" : "本地代理优先"}。`;
    state.filtered = [];
    state.currentPage = 1;
    renderQuoteTable();
    const publishMatches = (force = false) => {
      const now = Date.now();
      if (!force && now - lastPublished < 1200) return;
      lastPublished = now;
      state.filtered = [...matches];
      state.currentPage = 1;
      sortFiltered();
      renderQuoteTable();
    };
    const workers = Array.from({ length: workerCount }, async (_, workerIndex) => {
      for (let index = workerIndex; index < base.length; index += workerCount) {
        if (state.indicatorRunToken !== runToken) return;
        const quote = base[index];
        try {
          const result = await quotePassesIndicatorPlan(quote, plan);
          if (result.passed) matches.push(quote);
          else {
            result.failed.slice(0, 2).forEach((condition) => {
              const label = conditionLabel(condition);
              failedReasons.set(label, (failedReasons.get(label) || 0) + 1);
            });
          }
        } catch (error) {
          failed += 1;
          const message = String((error && error.message) || error || "未知错误").slice(0, 48);
          klineErrors.set(message, (klineErrors.get(message) || 0) + 1);
        }
        completed += 1;
        if (completed % 20 === 0 || completed === base.length) {
          publishMatches();
          els.indicatorScreenStatus.textContent = `运行中 ${completed}/${base.length}，已在列表显示命中 ${matches.length} 只，K线失败 ${failed}`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    });
    await Promise.all(workers);
    els.runIndicatorScreenButton.disabled = false;
    publishMatches(true);
    const topReasons = [...failedReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => `${label}：${count}`)
      .join("；");
    const topKlineErrors = [...klineErrors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([label, count]) => `${label}：${count}`)
      .join("；");
    if (failed > 0) {
      state.filtered = matches;
      state.currentPage = 1;
      sortFiltered();
      renderQuoteTable();
      els.indicatorScreenStatus.textContent = `筛选已完成：列表中显示命中 ${matches.length} 只 / ${base.length}；另有 ${failed} 只K线失败，未参与判断、未放入列表${topKlineErrors ? `（${topKlineErrors}）` : ""}。`;
      return;
    }
    state.filtered = matches;
    state.currentPage = 1;
    sortFiltered();
    renderQuoteTable();
    els.indicatorScreenStatus.textContent = `筛选完成：命中 ${matches.length} / ${base.length}${topReasons ? `。未命中主要原因：${topReasons}` : "。"}`;
  }

  function renderQuoteHead() {
    const defs = state.columnKeys.map((key) => FIELD_DEFS.find(([fieldKey]) => fieldKey === key)).filter(Boolean);
    els.quoteHead.innerHTML = `<tr><th class="select-column">选择</th><th class="index-column">序号</th>${defs.map(([key, label]) => {
      const active = state.sortKey === key;
      const icon = active ? (state.sortDirection === "asc" ? "↑" : "↓") : "⇅";
      return `<th data-sort="${key}" class="${active ? "is-sorted" : ""}"><button type="button" class="sort-header" title="按${label}排序"><span>${label}</span><span class="sort-icon">${icon}</span></button></th>`;
    }).join("")}</tr>`;
    els.quoteHead.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDirection = ["code", "name", "type", "symbol", "listingDate", "rawTime", "source"].includes(key) ? "asc" : "desc";
        }
        state.currentPage = 1;
        sortFiltered();
        renderQuoteTable();
      });
    });
  }

  function renderQuoteTable() {
    els.totalCount.textContent = String(state.quotes.length);
    els.filteredCount.textContent = String(state.filtered.length);
    const top = state.filtered.reduce((max, quote) => (quote.pctChange !== null && (max === null || quote.pctChange > max) ? quote.pctChange : max), null);
    els.topPctChange.textContent = top === null ? "--" : `${top.toFixed(2)}%`;
    els.downloadButton.disabled = state.filtered.length === 0;
    renderQuoteHead();
    clampCurrentPage();
    els.pageSizeSelect.value = String(state.pageSize);
    els.pageInfo.textContent = `${state.currentPage} / ${totalPages()}`;
    els.prevPageButton.disabled = state.currentPage <= 1;
    els.nextPageButton.disabled = state.currentPage >= totalPages();

    if (!state.filtered.length) {
      els.quoteRows.innerHTML = `<tr><td colspan="${state.columnKeys.length + 2}" class="empty">暂无符合条件的股票</td></tr>`;
      return;
    }
    const defs = state.columnKeys.map((key) => FIELD_DEFS.find(([fieldKey]) => fieldKey === key)).filter(Boolean);
    const start = (state.currentPage - 1) * state.pageSize;
    els.quoteRows.innerHTML = currentPageQuotes()
      .map(
        (quote, rowIndex) => `
          <tr data-symbol="${quote.symbol}" class="${state.selected && state.selected.symbol === quote.symbol ? "selected" : ""}">
            <td class="select-column"><input type="checkbox" class="category-check" data-symbol="${quote.symbol}" ${state.selectedCategorySymbols.has(quote.symbol) ? "checked" : ""} /></td>
            <td class="index-column">${start + rowIndex + 1}</td>
            ${defs
              .map(([key, , type]) => `<td class="${key === "pctChange" ? classForChange(quote.pctChange) : ""}">${formatField(quote, key, type)}</td>`)
              .join("")}
          </tr>`
      )
      .join("");
    els.quoteRows.querySelectorAll("tr[data-symbol]").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest(".category-check")) return;
        event.stopPropagation();
        selectQuote(row.dataset.symbol);
      });
    });
    els.quoteRows.querySelectorAll(".category-check").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        event.stopPropagation();
        if (checkbox.checked) state.selectedCategorySymbols.add(checkbox.dataset.symbol);
        else state.selectedCategorySymbols.delete(checkbox.dataset.symbol);
      });
    });
    enrichVisibleListingDates();
  }

  async function enrichVisibleListingDates() {
    if (state.enrichingListingDates) return;
    if (!readCriteria().keyword && state.filtered.length > 80) return;
    const targets = state.filtered
      .filter((quote) => !quote.listingDate && !state.listingDateCache[quote.symbol] && !state.listingDateMisses.has(quote.symbol))
      .slice(0, 20);
    if (!targets.length) return;
    state.enrichingListingDates = true;
    let changed = false;
    for (const quote of targets) {
      const didFill = await fillQuoteListingDate(quote);
      changed = changed || didFill;
    }
    state.enrichingListingDates = false;
    localStorage.setItem("aShareListingDates", JSON.stringify(state.listingDateCache));
    if (changed) renderQuoteTable();
  }

  async function fillQuoteListingDate(quote) {
    if (!quote || quote.listingDate) return false;
    const cached = state.listingDateCache[quote.symbol] || STATIC_LISTING_DATES[quote.symbol] || KNOWN_LISTING_DATES.get(quote.symbol);
    if (cached) {
      quote.listingDate = cached;
      quote.listingDays = daysSince(cached);
      return true;
    }
    try {
      const listingDate = await requestListingDate(quote.symbol);
      if (!listingDate) {
        state.listingDateMisses.add(quote.symbol);
        return false;
      }
      state.listingDateCache[quote.symbol] = listingDate;
      quote.listingDate = listingDate;
      quote.listingDays = daysSince(listingDate);
      const poolItem = state.stockPool.find((item) => item.symbol === quote.symbol);
      if (poolItem) poolItem.listingDate = listingDate;
      return true;
    } catch (_) {
      state.listingDateMisses.add(quote.symbol);
      return false;
    }
  }

  async function enrichAllListingDates() {
    const runId = ++state.fullListingDateRun;
    const targets = state.quotes.filter((quote) => !quote.listingDate && !state.listingDateCache[quote.symbol]);
    if (!targets.length) return;
    const total = targets.length;
    let completed = 0;
    let changed = 0;
    const workers = Array.from({ length: 6 }, async (_, workerIndex) => {
      for (let index = workerIndex; index < targets.length; index += 6) {
        if (runId !== state.fullListingDateRun) return;
        const didFill = await fillQuoteListingDate(targets[index]);
        completed += 1;
        if (didFill) changed += 1;
        if (completed % 25 === 0 || completed === total) {
          els.statusText.textContent = `正在补全上市天数：${completed}/${total}，已补 ${changed} 只`;
          localStorage.setItem("aShareListingDates", JSON.stringify(state.listingDateCache));
          applyFilters();
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    });
    await Promise.all(workers);
    if (runId !== state.fullListingDateRun) return;
    localStorage.setItem("aShareListingDates", JSON.stringify(state.listingDateCache));
    applyFilters();
    els.statusText.textContent = `已更新：${new Date().toLocaleString("zh-CN")}，成功拉取 ${state.quotes.length} 只股票，上市天数已补 ${changed}/${total}`;
  }

  function refreshIndicatorOptions() {
    const currentMain = els.mainIndicatorSelect.value;
    els.mainIndicatorSelect.innerHTML = `
      <option value="ma">均线</option>
      <option value="boll">BOLL线</option>
      <option value="boll-ma">BOLL均线结合</option>
      <option value="boll-short">BOLL短买结合</option>
      ${state.importedMainIndicators.map((item, index) => `<option value="custom-main-${index}">${item.name}</option>`).join("")}
    `;
    if (Array.from(els.mainIndicatorSelect.options).some((option) => option.value === currentMain)) {
      els.mainIndicatorSelect.value = currentMain;
    } else {
      els.mainIndicatorSelect.value = "ma";
    }
    updateMainControlVisibility();
  }

  function detectIndicatorKind(source, target) {
    if (/中线强势|中线控盘|短线上攻|散户资金|中线超跌/.test(source)) return "main-force";
    if (/短买|红色持股|青色观望|品红离场/.test(source)) return target === "main" ? "boll-short" : "unsupported";
    if (/BOLL|UB:|LB:|MA17/.test(source)) return target === "main" ? "boll-ma" : "unsupported";
    return "unsupported";
  }

  function normalizeImportedIndicators() {
    state.importedMainIndicators = state.importedMainIndicators.map((item) => ({ ...item, kind: item.kind || detectIndicatorKind(item.source || "", "main") }));
    state.importedSubIndicators = state.importedSubIndicators.map((item) => ({ ...item, kind: item.kind || detectIndicatorKind(item.source || "", "sub") }));
    localStorage.setItem("aShareMainIndicators", JSON.stringify(state.importedMainIndicators));
    localStorage.setItem("aShareSubIndicators", JSON.stringify(state.importedSubIndicators));
  }

  function visibleRows(rows) {
    return rows.slice(Math.max(0, rows.length - state.zoomBars));
  }

  function movingAverage(rows, period, key) {
    const result = [];
    let sum = 0;
    rows.forEach((row, index) => {
      const value = row && Number.isFinite(row[key]) ? row[key] : 0;
      sum += value;
      if (index >= period) {
        const old = rows[index - period];
        sum -= old && Number.isFinite(old[key]) ? old[key] : 0;
      }
      result[index] = index + 1 >= period ? sum / period : null;
    });
    return result;
  }

  function standardDeviation(rows, period, key) {
    const ma = movingAverage(rows, period, key);
    return rows.map((_, index) => {
      if (index + 1 < period || ma[index] === null) return null;
      const start = index - period + 1;
      let total = 0;
      for (let i = start; i <= index; i += 1) {
        total += Math.pow(rows[i][key] - ma[index], 2);
      }
      return Math.sqrt(total / period);
    });
  }

  function calculateBoll(rows, period = 20) {
    const mid = movingAverage(rows, period, "close");
    const std = standardDeviation(rows, period, "close");
    const close = rows.map((row) => row.close);
    const low = rows.map((row) => row.low);
    const dc1 = close.map((_, index) => llv(close, index, 2));
    const dcz1 = close.map((value, index) => value > (ref(close, index, 1) ?? value) && value > (ref(close, index, 2) ?? value));
    const dczd = close.map((value, index) => value < (ref(close, index, 1) ?? value) && value < (ref(close, index, 2) ?? value));
    const upFlags = [dcz1];
    const downFlags = [dczd];
    for (let step = 1; step < 12; step += 1) {
      const prevUp = upFlags[step - 1];
      const prevDown = downFlags[step - 1];
      upFlags[step] = close.map((value, index) =>
        Boolean(ref(prevUp, index, 1)) &&
        (step % 2 === 1
          ? value <= (ref(close, index, 1) ?? value) && value >= (ref(close, index, 2) ?? value)
          : value >= (ref(close, index, 1) ?? value) && value <= (ref(close, index, 2) ?? value))
      );
      downFlags[step] = close.map((value, index) =>
        Boolean(ref(prevDown, index, 1)) &&
        (step % 2 === 1
          ? value >= (ref(close, index, 1) ?? value) && value <= (ref(close, index, 2) ?? value)
          : value <= (ref(close, index, 1) ?? value) && value >= (ref(close, index, 2) ?? value))
      );
    }
    const redHoldFlags = close.map((_, index) => upFlags.some((flags) => flags[index]));
    const greenWatchFlags = close.map((_, index) => downFlags.some((flags) => flags[index]));
    const shortBuyFlags = close.map((_, index) => Boolean(ref(greenWatchFlags, index, 1)) && dcz1[index]);
    const exitFlags = close.map((_, index) => Boolean(ref(redHoldFlags, index, 1)) && dczd[index]);
    return rows.map((row, index) => {
      const boll = mid[index];
      const ub = boll === null || std[index] === null ? null : boll + 2 * std[index];
      const lb = boll === null || std[index] === null ? null : boll - 2 * std[index];
      const prev = index > 0 ? { boll: mid[index - 1], ub: mid[index - 1] === null || std[index - 1] === null ? null : mid[index - 1] + 2 * std[index - 1], lb: mid[index - 1] === null || std[index - 1] === null ? null : mid[index - 1] - 2 * std[index - 1] } : {};
      const redHold = redHoldFlags[index];
      const greenWatch = greenWatchFlags[index];
      const shortBuy = shortBuyFlags[index];
      const exitSignal = exitFlags[index];
      const trendState = shortBuy ? "buy" : exitSignal ? "exit" : redHold ? "hold" : "watch";
      const crash = mid[index] !== null && ((row.close - mid[index]) / mid[index]) * 100 < -14;
      return {
        boll,
        ub,
        lb,
        add: boll !== null && prev.boll !== null && boll > prev.boll ? boll : null,
        hold: ub !== null && prev.ub !== null && ub > prev.ub && row.close > boll ? ub : null,
        buy: lb !== null && prev.lb !== null && ((lb < prev.lb && row.close > boll) || lb > prev.lb) ? lb : null,
        redHold,
        greenWatch,
        shortBuy,
        exitSignal,
        trendState,
        crash,
        markY: ref(close, index, 1) || row.low,
        exitY: (ref(close, index, 1) || dc1[index] || row.high) + 0.1,
      };
    });
  }

  function sumSeries(values, index, count) {
    const start = Math.max(0, index - count + 1);
    let total = 0;
    for (let i = start; i <= index; i += 1) total += values[i] || 0;
    return total;
  }

  function ref(values, index, count) {
    return index - count >= 0 ? values[index - count] : null;
  }

  function hhv(values, index, count) {
    const start = Math.max(0, index - count + 1);
    return Math.max(...values.slice(start, index + 1));
  }

  function llv(values, index, count) {
    const start = Math.max(0, index - count + 1);
    return Math.min(...values.slice(start, index + 1));
  }

  function sma(values, period, weight) {
    const result = [];
    values.forEach((value, index) => {
      result[index] = index === 0 ? value : (weight * value + (period - weight) * result[index - 1]) / period;
    });
    return result;
  }

  function wma(values, period) {
    return values.map((_, index) => {
      if (index + 1 < period) return null;
      let total = 0;
      let weightTotal = 0;
      for (let i = 0; i < period; i += 1) {
        const weight = period - i;
        total += values[index - i] * weight;
        weightTotal += weight;
      }
      return total / weightTotal;
    });
  }

  function forecast(values, period) {
    return values.map((_, index) => {
      if (index + 1 < period) return null;
      const start = index - period + 1;
      const xs = Array.from({ length: period }, (_, i) => i + 1);
      const ys = values.slice(start, index + 1);
      const avgX = xs.reduce((sum, value) => sum + value, 0) / period;
      const avgY = ys.reduce((sum, value) => sum + value, 0) / period;
      const numerator = xs.reduce((sum, value, i) => sum + (value - avgX) * (ys[i] - avgY), 0);
      const denominator = xs.reduce((sum, value) => sum + Math.pow(value - avgX, 2), 0) || 1;
      const slope = numerator / denominator;
      return avgY + slope * (period - avgX);
    });
  }

  function cross(left, right, index) {
    if (index <= 0) return false;
    const prevLeft = Array.isArray(left) ? left[index - 1] : left;
    const prevRight = Array.isArray(right) ? right[index - 1] : right;
    const nowLeft = Array.isArray(left) ? left[index] : left;
    const nowRight = Array.isArray(right) ? right[index] : right;
    return prevLeft <= prevRight && nowLeft > nowRight;
  }

  function barsLast(flags, index) {
    for (let i = index; i >= 0; i -= 1) {
      if (flags[i]) return index - i;
    }
    return index + 1;
  }

  function countTrue(flags, index, count) {
    const start = Math.max(0, index - count + 1);
    let total = 0;
    for (let i = start; i <= index; i += 1) {
      if (flags[i]) total += 1;
    }
    return total;
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

  function calculateKdj(rows, period = 9) {
    const k = [];
    const d = [];
    const j = [];
    rows.forEach((row, index) => {
      const lows = rows.slice(Math.max(0, index - period + 1), index + 1).map((item) => item.low);
      const highs = rows.slice(Math.max(0, index - period + 1), index + 1).map((item) => item.high);
      const lowMin = Math.min(...lows);
      const highMax = Math.max(...highs);
      const rsv = highMax === lowMin ? 50 : ((row.close - lowMin) / (highMax - lowMin)) * 100;
      k[index] = index === 0 ? 50 : (rsv + 2 * k[index - 1]) / 3;
      d[index] = index === 0 ? 50 : (k[index] + 2 * d[index - 1]) / 3;
      j[index] = 3 * k[index] - 2 * d[index];
    });
    return rows.map((_, index) => ({ k: k[index], d: d[index], j: j[index] }));
  }

  function calculateRsi(rows, periods = [6, 12, 24]) {
    const changes = rows.map((row, index) => (index === 0 ? 0 : row.close - rows[index - 1].close));
    return rows.map((_, index) => {
      const item = {};
      periods.forEach((period) => {
        let up = 0;
        let total = 0;
        const start = Math.max(1, index - period + 1);
        for (let i = start; i <= index; i += 1) {
          up += Math.max(changes[i], 0);
          total += Math.abs(changes[i]);
        }
        item[`rsi${period}`] = total === 0 ? 50 : (up / total) * 100;
      });
      return item;
    });
  }

  function alignIndexRows(rows, indexRows) {
    const byDate = new Map(indexRows.map((row) => [row.date, row]));
    return rows.map((row) => byDate.get(row.date) || null);
  }

  function stripFormulaComments(source) {
    return source.replace(/\{[^}]*\}/g, "").replace(/\r/g, "");
  }

  function splitFormulaStatements(source) {
    return stripFormulaComments(source)
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function topLevelIndex(text, target) {
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (depth === 0 && text.startsWith(target, index)) return index;
    }
    return -1;
  }

  function splitTopLevelComma(text) {
    const index = topLevelIndex(text, ",");
    return index >= 0 ? [text.slice(0, index).trim(), text.slice(index + 1).trim()] : [text.trim(), ""];
  }

  function formulaTokens(expr) {
    const tokens = [];
    let index = 0;
    while (index < expr.length) {
      const char = expr[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      const two = expr.slice(index, index + 2);
      if ([">=", "<=", "<>", ":="].includes(two)) {
        tokens.push(two);
        index += 2;
        continue;
      }
      if ("+-*/(),><=".includes(char)) {
        tokens.push(char);
        index += 1;
        continue;
      }
      const numberMatch = expr.slice(index).match(/^\d+(?:\.\d+)?/);
      if (numberMatch) {
        tokens.push(numberMatch[0]);
        index += numberMatch[0].length;
        continue;
      }
      const identMatch = expr.slice(index).match(/^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*/);
      if (identMatch) {
        tokens.push(identMatch[0].toUpperCase());
        index += identMatch[0].length;
        continue;
      }
      throw new Error(`公式无法识别字符: ${char}`);
    }
    return tokens;
  }

  function executeFormula(source, rows, indexRows, quote) {
    const length = rows.length;
    const alignedIndex = alignIndexRows(rows, indexRows || []);
    const close = rows.map((row) => row.close);
    const open = rows.map((row) => row.open);
    const high = rows.map((row) => row.high);
    const low = rows.map((row) => row.low);
    const volume = rows.map((row) => row.volume);
    const indexClose = alignedIndex.map((row, index) => (row ? row.close : close[index]));
    const capital = quote && quote.floatMarketCap && quote.latestPrice ? quote.floatMarketCap / quote.latestPrice / 100 : Math.max(...volume, 1);
    const scope = new Map([
      ["C", close],
      ["CLOSE", close],
      ["O", open],
      ["OPEN", open],
      ["H", high],
      ["HIGH", high],
      ["L", low],
      ["LOW", low],
      ["VOL", volume],
      ["V", volume],
      ["INDEXC", indexClose],
      ["CAPITAL", capital],
      ["DRAWNULL", null],
    ]);
    const outputs = [];
    splitFormulaStatements(source).forEach((statement) => {
      const assignIndex = topLevelIndex(statement, ":=");
      const outputIndex = assignIndex < 0 ? topLevelIndex(statement, ":") : -1;
      const splitIndex = assignIndex >= 0 ? assignIndex : outputIndex;
      if (splitIndex < 0) return;
      const name = statement.slice(0, splitIndex).trim().toUpperCase();
      const rest = statement.slice(splitIndex + (assignIndex >= 0 ? 2 : 1)).trim();
      const [expr, attrs] = splitTopLevelComma(rest);
      const value = evalFormulaExpression(expr, scope, length);
      scope.set(name, value);
      if (assignIndex < 0) outputs.push({ name, value: toSeries(value, length), color: formulaColor(attrs) });
    });
    return { outputs, scope };
  }

  function formulaColor(attrs) {
    const text = String(attrs || "").toUpperCase();
    if (text.includes("COLORYELLOW")) return "#d9a400";
    if (text.includes("COLORMAGENTA")) return "#c026d3";
    if (text.includes("COLORGREEN")) return "#0f9d58";
    if (text.includes("COLORBLUE")) return "#1d4ed8";
    if (text.includes("COLORRED")) return "#d93025";
    return "#354252";
  }

  function toSeries(value, length) {
    if (Array.isArray(value)) return value;
    return Array.from({ length }, () => value);
  }

  function seriesOp(left, right, length, fn) {
    const a = toSeries(left, length);
    const b = toSeries(right, length);
    return a.map((value, index) => fn(value, b[index], index));
  }

  function truthy(value) {
    return Boolean(value) && Number(value) !== 0;
  }

  function evalFormulaExpression(expr, scope, length) {
    const tokens = formulaTokens(expr);
    let pos = 0;
    const peek = () => tokens[pos];
    const take = () => tokens[pos++];
    const parseExpression = () => parseOr();
    const parseOr = () => {
      let left = parseAnd();
      while (peek() === "OR") {
        take();
        const right = parseAnd();
        left = seriesOp(left, right, length, (a, b) => truthy(a) || truthy(b));
      }
      return left;
    };
    const parseAnd = () => {
      let left = parseCompare();
      while (peek() === "AND") {
        take();
        const right = parseCompare();
        left = seriesOp(left, right, length, (a, b) => truthy(a) && truthy(b));
      }
      return left;
    };
    const parseCompare = () => {
      let left = parseAdd();
      while ([">", "<", ">=", "<=", "=", "<>"].includes(peek())) {
        const op = take();
        const right = parseAdd();
        left = seriesOp(left, right, length, (a, b) => {
          if (op === ">") return a > b;
          if (op === "<") return a < b;
          if (op === ">=") return a >= b;
          if (op === "<=") return a <= b;
          if (op === "=") return a === b;
          return a !== b;
        });
      }
      return left;
    };
    const parseAdd = () => {
      let left = parseMul();
      while (peek() === "+" || peek() === "-") {
        const op = take();
        const right = parseMul();
        left = seriesOp(left, right, length, (a, b) => (op === "+" ? Number(a || 0) + Number(b || 0) : Number(a || 0) - Number(b || 0)));
      }
      return left;
    };
    const parseMul = () => {
      let left = parseUnary();
      while (peek() === "*" || peek() === "/") {
        const op = take();
        const right = parseUnary();
        left = seriesOp(left, right, length, (a, b) => (op === "*" ? Number(a || 0) * Number(b || 0) : Number(b || 0) === 0 ? 0 : Number(a || 0) / Number(b || 0)));
      }
      return left;
    };
    const parseUnary = () => {
      if (peek() === "-") {
        take();
        return seriesOp(0, parseUnary(), length, (a, b) => a - Number(b || 0));
      }
      return parsePrimary();
    };
    const parsePrimary = () => {
      const token = take();
      if (token === "(") {
        const value = parseExpression();
        if (take() !== ")") throw new Error("公式括号不匹配");
        return value;
      }
      if (/^\d/.test(token)) return Number(token);
      if (peek() === "(") {
        take();
        const args = [];
        if (peek() !== ")") {
          do {
            args.push(parseExpression());
            if (peek() !== ",") break;
            take();
          } while (true);
        }
        if (take() !== ")") throw new Error(`函数 ${token} 括号不匹配`);
        return callFormulaFunction(token, args, length);
      }
      if (!scope.has(token)) return 0;
      return scope.get(token);
    };
    const value = parseExpression();
    if (pos < tokens.length) throw new Error(`公式剩余无法解析: ${tokens.slice(pos).join(" ")}`);
    return value;
  }

  function firstScalar(value, fallback = 0) {
    if (Array.isArray(value)) return Number(value[value.length - 1] ?? fallback);
    return Number(value ?? fallback);
  }

  function callFormulaFunction(name, args, length) {
    if (name === "IF") {
      const condition = toSeries(args[0], length);
      const yes = toSeries(args[1], length);
      const no = toSeries(args[2], length);
      return condition.map((flag, index) => (truthy(flag) ? yes[index] : no[index]));
    }
    if (name === "MA") return maValues(toSeries(args[0], length), args[1], length);
    if (name === "EMA") return emaValues(toSeries(args[0], length), firstScalar(args[1], 1));
    if (name === "SMA") return sma(toSeries(args[0], length), firstScalar(args[1], 1), firstScalar(args[2], 1));
    if (name === "WMA") return wmaValues(toSeries(args[0], length), firstScalar(args[1], 1));
    if (name === "FORCAST" || name === "FORECAST") return forecastValues(toSeries(args[0], length), firstScalar(args[1], 1));
    if (name === "REF") return refValues(toSeries(args[0], length), args[1], length);
    if (name === "SUM") return sumValues(toSeries(args[0], length), args[1], length);
    if (name === "COUNT") return countValues(toSeries(args[0], length), args[1], length);
    if (name === "HHV") return rangeValues(toSeries(args[0], length), args[1], length, Math.max);
    if (name === "LLV") return rangeValues(toSeries(args[0], length), args[1], length, Math.min);
    if (name === "BARSLAST") return barsLastValues(toSeries(args[0], length));
    if (name === "CROSS") {
      const left = toSeries(args[0], length);
      const right = toSeries(args[1], length);
      return left.map((value, index) => index > 0 && left[index - 1] <= right[index - 1] && value > right[index]);
    }
    if (name === "MAX") return seriesOp(args[0], args[1], length, (a, b) => Math.max(Number(a || 0), Number(b || 0)));
    if (name === "MIN") return seriesOp(args[0], args[1], length, (a, b) => Math.min(Number(a || 0), Number(b || 0)));
    if (name === "ABS") return toSeries(args[0], length).map((value) => Math.abs(Number(value || 0)));
    if (name === "SQRT") return toSeries(args[0], length).map((value) => Math.sqrt(Math.max(0, Number(value || 0))));
    return 0;
  }

  function periodAt(period, index, fallback = 1) {
    const value = Array.isArray(period) ? period[index] : period;
    return Math.max(1, Math.floor(Number(value || fallback)));
  }

  function maValues(values, periodArg, length) {
    return values.map((_, index) => {
      const period = periodAt(periodArg, index);
      if (index + 1 < period) return null;
      return sumArray(values, index, period) / period;
    });
  }

  function sumArray(values, index, count) {
    const start = Math.max(0, index - count + 1);
    let total = 0;
    for (let i = start; i <= index; i += 1) total += Number(values[i] || 0);
    return total;
  }

  function refValues(values, periodArg, length) {
    return values.map((_, index) => {
      const period = periodAt(periodArg, index, 0);
      return index - period >= 0 ? values[index - period] : null;
    });
  }

  function sumValues(values, periodArg, length) {
    return values.map((_, index) => sumArray(values, index, periodAt(periodArg, index)));
  }

  function countValues(values, periodArg, length) {
    return values.map((_, index) => {
      const period = periodAt(periodArg, index);
      const start = Math.max(0, index - period + 1);
      let total = 0;
      for (let i = start; i <= index; i += 1) {
        if (truthy(values[i])) total += 1;
      }
      return total;
    });
  }

  function rangeValues(values, periodArg, length, fn) {
    return values.map((_, index) => {
      const period = periodAt(periodArg, index);
      const start = Math.max(0, index - period + 1);
      return fn(...values.slice(start, index + 1).map((value) => Number(value || 0)));
    });
  }

  function barsLastValues(flags) {
    return flags.map((_, index) => barsLast(flags, index));
  }

  function emaValues(values, period) {
    return ema(values.map((value) => Number(value || 0)), period);
  }

  function wmaValues(values, period) {
    return wma(values.map((value) => Number(value || 0)), period);
  }

  function forecastValues(values, period) {
    return forecast(values.map((value) => Number(value || 0)), period);
  }

  function calculateMainForce(rows, indexRows, quote = state.selected) {
    const result = executeFormula(MAIN_FORCE_FORMULA, rows, indexRows || [], quote);
    const byName = new Map(result.outputs.map((item) => [item.name, item.value]));
    return rows.map((_, index) => ({
      shortAttack: Number((byName.get("短线上攻") || [])[index] || 0),
      midStrong: Number((byName.get("中线强势") || [])[index] || 0),
      midControl: Number((byName.get("中线控盘") || [])[index] || 0),
      retailMoney: Number((byName.get("散户资金") || [])[index] || 0),
      midOversold: Number((byName.get("中线超跌") || [])[index] || 0),
    }));
  }

  function calculateGoldControl(rows) {
    const close = rows.map((row) => row.close);
    const ema9 = ema(ema(close, 9), 9);
    return rows.map((row, index) => {
      const control = index === 0 || !ema9[index - 1] ? 0 : ((ema9[index] - ema9[index - 1]) / ema9[index - 1]) * 1000;
      const start = cross(ema9.map((value, i) => (i === 0 || !ema9[i - 1] ? 0 : ((value - ema9[i - 1]) / ema9[i - 1]) * 1000)), 0, index);
      const highControl = control > 0 && row.close === hhv(close, index, 10) && (row.close - llv(close, index, 120)) / Math.max(0.01, hhv(close, index, 120) - llv(close, index, 120)) > 0.5;
      return {
        control,
        noControl: control < 0 ? control : 0,
        start: start ? 5 : 0,
        hasControl: control > ref([control], 0, 0) ? 0 : 0,
        highControl: highControl ? control : 0,
        exit: index > 0 && control < (((ema9[index - 1] - (ema9[index - 2] || ema9[index - 1])) / (ema9[index - 2] || ema9[index - 1])) * 1000) && control > 0 ? control : 0,
      };
    }).map((item, index, arr) => ({
      ...item,
      hasControl: item.control > 0 && (index === 0 || item.control > arr[index - 1].control) ? item.control : 0,
    }));
  }

  function calculateThreeDragon(rows) {
    const close = rows.map((row) => row.close);
    const high = rows.map((row) => row.high);
    const low = rows.map((row) => row.low);
    const open = rows.map((row) => row.open);
    const volume = rows.map((row) => row.volume);
    const x3 = rows.map((row) => (row.close + row.low + row.high) / 3);
    const x4 = ema(x3, 6);
    const x5 = ema(x4, 5);
    const energy = rows.map((row, index) => Math.sqrt(volume[index]) * ((close[index] - (high[index] + low[index]) / 2) / Math.max(0.01, (high[index] + low[index]) / 2)));
    const energyTrend = ema(ema(energy, 16), 16);
    const x2 = rows.map((_, index) => ((close[index] - llv(low, index, 38)) / Math.max(0.01, hhv(high, index, 38) - llv(low, index, 38))) * 100);
    const midLong = sma(x2, 5, 1);
    const midShort = sma(midLong, 10, 1);
    const x1 = rows.map((_, index) => ((close[index] - llv(low, index, 7)) / Math.max(0.01, hhv(high, index, 7) - llv(low, index, 7))) * 100);
    const shortLong = sma(x1, 3, 1);
    const shortShort = sma(shortLong, 3, 1);
    const aaa = rows.map((row) => (3 * row.close + row.open + row.high + row.low) / 6);
    const controlDegree = ema(aaa, 12).map((value, index) => (index === 0 ? 0 : ((value - ref(ema(aaa, 36), index, 1)) / Math.max(0.01, ref(ema(aaa, 36), index, 1))) * 100 + 50));
    const var1 = rows.map((row) => (2 * row.close + row.high + row.low) / 4);
    const var2 = rows.map((_, index) => llv(low, index, 34));
    const var3 = rows.map((_, index) => hhv(high, index, 34));
    const xx = ema(var1.map((value, index) => ((value - var2[index]) / Math.max(0.01, var3[index] - var2[index])) * 100), 13);
    const yy = ema(xx.map((value, index) => 0.667 * (ref(xx, index, 1) || value) + 0.333 * value), 2);
    const wma17 = wma(close, 17);
    const wma34 = wma(close, 34);
    const potential = wma(close.map((value, index) => (wma17[index] === null || wma34[index] === null ? value : 2 * wma17[index] - wma34[index])), Math.round(Math.sqrt(34)));
    return rows.map((_, index) => ({
      trendRed: x4[index] >= x5[index],
      energyRed: energyTrend[index] > 0,
      midRed: midLong[index] > midShort[index],
      shortRed: shortLong[index] > shortShort[index],
      controlDegree: controlDegree[index],
      longTrend: yy[index] < xx[index] && close[index] > (potential[index] || close[index]),
    }));
  }

  function calculateGoldChip(rows, quote = state.selected) {
    const close = rows.map((row) => row.close);
    const high = rows.map((row) => row.high);
    const low = rows.map((row) => row.low);
    const volume = rows.map((row) => row.volume);
    const capital = quote && quote.floatMarketCap && quote.latestPrice ? quote.floatMarketCap / quote.latestPrice / 100 : 1000000;
    const hsl = ema(volume.map((value) => value / Math.max(1, capital)), 3);
    const zdl = hsl.map((_, index) => hhv(hsl, index, 240));
    const zxl = hsl.map((_, index) => llv(hsl, index, 240));
    const xs = movingAverage(rows, 33, "close");
    const f = forecast(close, 20);
    const bias = close.map((value, index) => (f[index] === null ? 0 : ((value - f[index]) / value) * 100));
    const tr = rows.map((row, index) => Math.max(row.high - row.low, Math.abs((ref(close, index, 1) || row.close) - row.high), Math.abs((ref(close, index, 1) || row.close) - row.low)));
    const atr14 = movingAverage(tr.map((value) => ({ value })), 30, "value").map((value, index) => ((value || 0) / close[index]) * 100);
    return rows.map((_, index) => ({
      mainChip: Math.max(0, bias[index]),
      retailChip: Math.max(0, -bias[index]),
      lockChip: zxl[index] ? ema(hsl.map((value, i) => ((value - zxl[i]) / Math.max(0.000001, zxl[i])) * (xs[i] || close[i])), 13)[index] : 0,
      floatChip: hsl[index] ? ema(hsl.map((value, i) => ((zdl[i] - value) / Math.max(0.000001, value)) * (xs[i] || close[i])), 13)[index] : 0,
      controlLine: (atr14[index] || 0) * 0.8,
    }));
  }

  function parseMaPeriods() {
    return Array.from(els.maPeriodsInput.querySelectorAll("input:checked"))
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value) && value > 1 && value <= 250)
      .slice(0, 8);
  }

  function svgLine(points, color, width = 1.5) {
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" />`;
  }

  function svgSeriesLine(values, x, y, color, width = 1.5) {
    const lines = [];
    const dots = [];
    let current = [];
    values.forEach((value, index) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        if (current.length > 1) lines.push(current);
        if (current.length === 1) dots.push(current[0]);
        current = [];
        return;
      }
      current.push(`${x(index)},${y(value)}`);
    });
    if (current.length > 1) lines.push(current);
    if (current.length === 1) dots.push(current[0]);
    return `${lines.map((points) => svgLine(points.join(" "), color, width)).join("")}${dots
      .map((point) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="${Math.max(2, width)}" fill="${color}" />`;
      })
      .join("")}`;
  }

  function colorLabel(label, value, color) {
    return `<span style="color:${color}">${label}:${value}</span>`;
  }

  function priceScale(rows, pad, h) {
    const max = Math.max(...rows.map((row) => row.high));
    const min = Math.min(...rows.map((row) => row.low));
    const span = Math.max(0.01, max - min);
    return { max, min, y: (price) => pad.top + ((max - price) / span) * (h - pad.top - pad.bottom) };
  }

  function chartX(index, rows, pad, w) {
    const slot = (w - pad.left - pad.right) / Math.max(1, rows.length);
    return pad.left + slot * (index + 0.5);
  }

  function dataText(lines, w) {
    const visibleLines = [...lines];
    while (visibleLines.length < 3) visibleLines.push("");
    return `
      <g class="data-display">
        <rect class="data-bg" x="${w - 338}" y="4" width="330" height="${Math.max(24, visibleLines.length * 15 + 8)}" fill="rgba(255,255,255,0.88)" />
        ${visibleLines.map((line, i) => `<text class="data-line" x="${w - 12}" y="${18 + i * 15}" text-anchor="end">${line}</text>`).join("")}
      </g>`;
  }

  function crosshairLayer(pad, w, h) {
    return `
      <g class="crosshair-layer" style="display:none">
        <line class="crosshair-x" y1="${pad.top}" y2="${h - pad.bottom}" />
        <line class="crosshair-y" x1="${pad.left}" x2="${w - pad.right}" />
      </g>`;
  }

  function bindChart(svg, meta) {
    state.chartMetas.set(svg, meta);
    svg.onmousemove = (event) => {
      const rect = svg.getBoundingClientRect();
      const rawX = ((event.clientX - rect.left) / rect.width) * meta.w;
      const index = clamp(Math.round(((rawX - meta.pad.left) / (meta.w - meta.pad.left - meta.pad.right)) * Math.max(1, meta.rows.length - 1)), 0, meta.rows.length - 1);
      state.hoverIndex = index;
      updateAllCrosshairs(index, svg, event);
    };
    svg.onclick = () => {
      if (state.hoverIndex !== null) updateAllCrosshairs(state.hoverIndex, svg);
    };
    svg.onmouseleave = () => {
      if (state.hoverIndex !== null) updateAllCrosshairs(state.hoverIndex, svg);
    };
  }

  function updateDataDisplay(svg, lines) {
    const meta = state.chartMetas.get(svg);
    if (meta && meta.infoNode) {
      meta.infoNode.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
      return;
    }
    svg.querySelectorAll(".data-line").forEach((node, index) => {
      node.textContent = lines[index] || "";
    });
    const bg = svg.querySelector(".data-bg");
    if (bg) bg.setAttribute("height", String(Math.max(24, lines.length * 15 + 8)));
  }

  function updateAllCrosshairs(index, sourceSvg, event) {
    state.chartMetas.forEach((meta, svg) => {
      const layer = svg.querySelector(".crosshair-layer");
      if (!layer || !meta.rows[index]) return;
      const row = meta.rows[index];
      const x = meta.x(index);
      const y = meta.crossY(index);
      layer.style.display = "";
      layer.querySelector(".crosshair-x").setAttribute("x1", x);
      layer.querySelector(".crosshair-x").setAttribute("x2", x);
      layer.querySelector(".crosshair-y").setAttribute("y1", y);
      layer.querySelector(".crosshair-y").setAttribute("y2", y);
      updateDataDisplay(svg, meta.info(row, index));
    });

    const floating = document.querySelector(".chart-tooltip");
    if (floating && event) {
      const meta = state.chartMetas.get(sourceSvg);
      const row = meta && meta.rows[index];
      if (!row) return;
      floating.innerHTML = meta.info(row, index).join("<br>");
      floating.style.display = "block";
      const width = 230;
      const left = event.clientX + width + 18 > window.innerWidth ? event.clientX - width - 12 : event.clientX + 12;
      floating.style.left = `${Math.max(8, left)}px`;
      floating.style.top = `${event.clientY + 12}px`;
    }
  }

  function registerInitialHover(rows) {
    if (!rows.length) return;
    state.hoverIndex = rows.length - 1;
    requestAnimationFrame(() => updateAllCrosshairs(state.hoverIndex, els.mainChart));
  }

  function currentMainIndicator() {
    const value = els.mainIndicatorSelect.value;
    if (value.startsWith("custom-main-")) {
      const index = Number(value.replace("custom-main-", ""));
      const item = state.importedMainIndicators[index];
      return { type: value, label: item ? item.name : "导入主图", item };
    }
    return { type: value, label: value === "boll" ? "BOLL线" : value === "boll-ma" ? "BOLL均线结合" : value === "boll-short" ? "BOLL短买结合" : "均线" };
  }

  function finiteFormulaValues(outputs) {
    return outputs.flatMap((output) => output.value.filter((value) => value !== null && value !== undefined && Number.isFinite(value)));
  }

  function renderImportedMainChart(allRows, mainIndicator) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const w = 700;
    const h = 260;
    const pad = { left: 46, right: 18, top: 20, bottom: 26 };
    const x = (index) => chartX(index, rows, pad, w);
    const candleW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    els.mainChartTitle.textContent = "主图";
    let outputs = [];
    try {
      outputs = executeFormula(mainIndicator.item.source || "", allRows, state.selectedIndexRows || [], state.selected).outputs;
    } catch (error) {
      els.mainChart.setAttribute("viewBox", `0 0 ${w} ${h}`);
      els.mainChart.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" /><text x="24" y="48" fill="#dc2626" font-size="13">${mainIndicator.label} 公式暂无法解析：${String(error.message || error).slice(0, 80)}</text>`;
      els.mainChartInfo.innerHTML = `${mainIndicator.label} 公式暂无法解析`;
      return;
    }
    const visibleOutputs = outputs.map((output) => ({ ...output, value: output.value.slice(offset) })).filter((output) => output.value.some((value) => Number.isFinite(value)));
    const formulaValues = finiteFormulaValues(visibleOutputs);
    const scaleRows = rows.map((row) => ({ high: row.high, low: row.low }));
    const high = Math.max(...scaleRows.map((row) => row.high), ...formulaValues);
    const low = Math.min(...scaleRows.map((row) => row.low), ...formulaValues);
    const { max, min, y } = priceScale([{ high, low }], pad, h);
    const candles = rows
      .map((row, index) => {
        const cx = x(index);
        const up = row.close >= row.open;
        const color = up ? "#d93025" : "#0f9d58";
        const bodyY = Math.min(y(row.open), y(row.close));
        const bodyH = Math.max(1, Math.abs(y(row.open) - y(row.close)));
        return `<line x1="${cx}" y1="${y(row.high)}" x2="${cx}" y2="${y(row.low)}" stroke="${color}" stroke-width="1" /><rect x="${cx - candleW / 2}" y="${bodyY}" width="${candleW}" height="${bodyH}" fill="${up ? "transparent" : color}" stroke="${color}" stroke-width="1" />`;
      })
      .join("");
    const formulaLines = visibleOutputs.map((output) => svgSeriesLine(output.value, x, y, output.color || "#1d4ed8", 1.4)).join("");
    els.mainChart.setAttribute("viewBox", `0 0 ${w} ${h}`);
    els.mainChart.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${candles}${formulaLines}
      <text x="8" y="${pad.top + 10}" fill="#667788" font-size="11">${max.toFixed(2)}</text>
      <text x="8" y="${h - pad.bottom}" fill="#667788" font-size="11">${min.toFixed(2)}</text>
      ${crosshairLayer(pad, w, h)}`;
    bindChart(els.mainChart, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode: els.mainChartInfo,
      crossY: (index) => y(rows[index].close),
      info: (row, index) => [`${row.date} 开:${row.open.toFixed(2)} 高:${row.high.toFixed(2)} 低:${row.low.toFixed(2)} 收:${row.close.toFixed(2)}`, visibleOutputs.map((output) => colorLabel(output.name, formatNumber(output.value[index]), output.color || "#1d4ed8")).join(" ")],
    });
  }

  function renderMainChart(allRows) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const w = 700;
    const h = 260;
    const pad = { left: 46, right: 18, top: 20, bottom: 26 };
    const periods = parseMaPeriods();
    const colors = ["#1d4ed8", "#f59e0b", "#7c3aed", "#0891b2", "#64748b", "#db2777", "#16a34a", "#ea580c"];
    const maMap = new Map(periods.map((period) => [period, movingAverage(allRows, period, "close").slice(offset)]));
    const mainIndicator = currentMainIndicator();
    if (mainIndicator.item) {
      renderImportedMainChart(allRows, mainIndicator);
      return;
    }
    const bollRows = calculateBoll(allRows).slice(offset);
    const shortMaPeriods = [5, 17, 60];
    const shortMaMap = new Map(shortMaPeriods.map((period) => [period, movingAverage(allRows, period, "close").slice(offset)]));
    const isBollMode = mainIndicator.type === "boll" || mainIndicator.type === "boll-ma" || mainIndicator.type === "boll-short";
    const hasFormulaBollColor = mainIndicator.type === "boll-ma" || mainIndicator.type === "boll-short";
    const hasBollMa = hasFormulaBollColor;
    const scaleRows = rows.map((row, index) => {
      const extras = [];
      if (isBollMode) {
        extras.push(bollRows[index].boll, bollRows[index].ub, bollRows[index].lb);
        if (hasBollMa) shortMaPeriods.forEach((period) => extras.push(shortMaMap.get(period)[index]));
      } else {
        periods.forEach((period) => extras.push(maMap.get(period)[index]));
      }
      const validExtras = extras.filter((value) => value !== null && value !== undefined && Number.isFinite(value));
      return {
        high: Math.max(row.high, ...validExtras),
        low: Math.min(row.low, ...validExtras),
      };
    });
    const { max, min, y } = priceScale(scaleRows, pad, h);
    const x = (index) => chartX(index, rows, pad, w);
    const candleW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);

    const candles = rows
      .map((row, index) => {
        const cx = x(index);
        const up = row.close >= row.open;
        const signal = mainIndicator.type === "boll-short" ? bollRows[index] : null;
        let color = up ? "#d93025" : "#0f9d58";
        let bodyFill = up && !isBollMode ? "transparent" : color;
        let extraBody = "";
        if (signal) {
          if (signal.trendState === "buy") {
            color = "#d93025";
            bodyFill = "#facc15";
            extraBody = `<rect x="${cx - Math.max(1, candleW / 6)}" y="${Math.min(y(row.open), y(row.close))}" width="${Math.max(1, candleW / 3)}" height="${Math.max(1, Math.abs(y(row.open) - y(row.close)))}" fill="#d93025" />`;
          } else if (signal.trendState === "hold") {
            color = "#d93025";
            bodyFill = "#d93025";
          } else if (signal.trendState === "exit") {
            color = "#c026d3";
            bodyFill = "#c026d3";
          } else {
            color = "#0f9d58";
            bodyFill = "#0f9d58";
          }
          if (signal.crash) color = "#6b7280";
        }
        const bodyY = Math.min(y(row.open), y(row.close));
        const bodyH = Math.max(1, Math.abs(y(row.open) - y(row.close)));
        return `<line x1="${cx}" y1="${y(row.high)}" x2="${cx}" y2="${y(row.low)}" stroke="${color}" stroke-width="1" />
          <rect x="${cx - candleW / 2}" y="${bodyY}" width="${candleW}" height="${bodyH}" fill="${bodyFill}" stroke="${color}" stroke-width="1" />${extraBody}`;
      })
      .join("");
    const maLines =
      mainIndicator.type === "ma"
        ? periods
            .map((period, colorIndex) => {
              return svgSeriesLine(maMap.get(period), x, y, colors[colorIndex], 1.5);
            })
            .join("")
        : "";
    const bollLine = (key, color, width = 1.3) => svgSeriesLine(bollRows.map((value) => value[key]), x, y, color, width);
    const bollSignalMarks =
      mainIndicator.type === "boll-short"
        ? bollRows
            .map((item, index) => {
              const cx = x(index);
              const parts = [];
              if (item.shortBuy) parts.push(`<text x="${cx + 4}" y="${y(item.markY)}" fill="#d93025" font-size="12">←短买</text><circle cx="${cx}" cy="${y(rows[index].low) - 8}" r="4" fill="#facc15" stroke="#d93025" stroke-width="2" />`);
              if (item.exitSignal) parts.push(`<text x="${cx + 4}" y="${y(item.exitY)}" fill="#c026d3" font-size="12">←离场</text><path d="M ${cx - 4} ${y(rows[index].high) - 8} L ${cx + 4} ${y(rows[index].high) - 8} M ${cx} ${y(rows[index].high) - 12} L ${cx} ${y(rows[index].high) - 4}" stroke="#c026d3" stroke-width="2" />`);
              if (item.crash) parts.push(`<path d="M ${cx - 5} ${y(rows[index].low) + 10} L ${cx} ${y(rows[index].low) + 2} L ${cx + 5} ${y(rows[index].low) + 10}" fill="#6b7280" />`);
              return parts.join("");
            })
            .join("")
        : "";
    const bollLines =
      isBollMode
        ? `${bollLine("boll", hasFormulaBollColor ? "#0f9d58" : "#111827")}${bollLine("ub", hasFormulaBollColor ? "#0f9d58" : "#111827")}${bollLine("lb", hasFormulaBollColor ? "#0f9d58" : "#111827")}${
            hasFormulaBollColor ? `${bollLine("add", "#d93025", 1.8)}${bollLine("hold", "#d93025", 1.8)}${bollLine("buy", "#d93025", 1.8)}` : ""
          }${
            hasBollMa
              ? `${svgSeriesLine(shortMaMap.get(5), x, y, "#111827", 1.3)}${svgSeriesLine(shortMaMap.get(17), x, y, "#c026d3", 1.3)}${svgSeriesLine(shortMaMap.get(60), x, y, "#92400e", 1.3)}${mainIndicator.type === "boll-short" ? bollSignalMarks : ""}`
              : ""
          }`
        : "";
    const clipId = `main-clip-${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const klineChange = (index) => {
      const globalIndex = offset + index;
      const previous = allRows[globalIndex - 1];
      if (!previous || !previous.close) return null;
      return ((allRows[globalIndex].close - previous.close) / previous.close) * 100;
    };

    els.mainChartTitle.textContent = "主图";
    els.mainChart.setAttribute("viewBox", `0 0 ${w} ${h}`);
    els.mainChart.innerHTML = `
      <defs><clipPath id="${clipId}"><rect x="${pad.left}" y="${pad.top}" width="${w - pad.left - pad.right}" height="${h - pad.top - pad.bottom}" /></clipPath></defs>
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <g clip-path="url(#${clipId})">
        ${candles}
        ${maLines}
        ${bollLines}
      </g>
      <text x="8" y="${pad.top + 10}" fill="#667788" font-size="11">${max.toFixed(2)}</text>
      <text x="8" y="${h - pad.bottom}" fill="#667788" font-size="11">${min.toFixed(2)}</text>
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(els.mainChart, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode: els.mainChartInfo,
      crossY: (index) => y(rows[index].close),
      info: (row, index) => {
        if (isBollMode) {
          const boll = bollRows[index];
          const pct = klineChange(index);
          const extra =
            hasBollMa
              ? ` ${colorLabel("MA5", formatNumber(shortMaMap.get(5)[index]), "#111827")} ${colorLabel("MA17", formatNumber(shortMaMap.get(17)[index]), "#c026d3")} ${colorLabel("MA60", formatNumber(shortMaMap.get(60)[index]), "#92400e")}`
              : "";
          const baseBollColor = hasFormulaBollColor ? "#0f9d58" : "#111827";
          const bollColor = hasFormulaBollColor && boll.add !== null ? "#d93025" : baseBollColor;
          const ubColor = hasFormulaBollColor && boll.hold !== null ? "#d93025" : baseBollColor;
          const lbColor = hasFormulaBollColor && boll.buy !== null ? "#d93025" : baseBollColor;
          const stateMap = {
            buy: ["短买", "#facc15"],
            hold: ["红色持股", "#d93025"],
            exit: ["离场", "#c026d3"],
            watch: ["绿色观望", "#0f9d58"],
          };
          const [stateText, stateColor] = stateMap[boll.trendState] || stateMap.watch;
          return [
            `${row.date}  开:${row.open.toFixed(2)} 高:${row.high.toFixed(2)} 低:${row.low.toFixed(2)} 收:${row.close.toFixed(2)} ${colorLabel("涨幅", formatSignedPercent(pct), changeColor(pct))}`,
            `${colorLabel("BOLL", formatNumber(boll.boll), bollColor)} ${colorLabel("UB", formatNumber(boll.ub), ubColor)} ${colorLabel("LB", formatNumber(boll.lb), lbColor)}${extra}${mainIndicator.type === "boll-short" ? ` ${colorLabel("状态", stateText, stateColor)}` : ""}${mainIndicator.type === "boll-short" && boll.crash ? ` <span style="color:#6b7280">急速超跌</span>` : ""}`,
          ];
        }
        const pct = klineChange(index);
        const maInfo = periods
          .map((period, colorIndex) => {
            const value = maMap.get(period)[index];
            return colorLabel(`MA${period}`, value === null ? "--" : value.toFixed(2), colors[colorIndex]);
          })
          .join("  ");
        return [`${row.date}  开:${row.open.toFixed(2)} 高:${row.high.toFixed(2)} 低:${row.low.toFixed(2)} 收:${row.close.toFixed(2)} ${colorLabel("涨幅", formatSignedPercent(pct), changeColor(pct))}`, maInfo];
      },
    });
  }

  function makeSubChartHeader(index, current) {
    const title = document.createElement("h3");
    const name = document.createElement("span");
    name.textContent = `副图${index + 1}`;
    const select = document.createElement("select");
    select.className = "subchart-select";
    [
      ["volume", "成交量"],
      ["macd", "MACD"],
      ["kdj", "KDJ"],
      ["rsi", "RSI"],
      ["main-force", "主力状态"],
      ...BUILTIN_SUB_INDICATORS.map((item, itemIndex) => [`builtin-sub-${itemIndex}`, item.name]),
      ...state.importedSubIndicators.map((item, itemIndex) => [`custom-sub-${itemIndex}`, item.name]),
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === current;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      state.subChartIndicators[index] = select.value;
      renderSelectedCharts();
    });
    title.append(name, select);
    return title;
  }

  function renderSubCharts(allRows) {
    els.subCharts.innerHTML = "";
    const count = Math.min(5, Number(els.subChartCountSelect.value) || 1);
    for (let index = 0; index < count; index += 1) {
      const type = state.subChartIndicators[index] || "volume";
      const card = document.createElement("div");
      card.className = "chart-card";
      const title = makeSubChartHeader(index, type);
      const info = document.createElement("div");
      info.className = "chart-info";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `副图${index + 1}`);
      card.append(title, info, svg);
      els.subCharts.appendChild(card);
      if (type === "volume") renderVolumeChart(svg, allRows, info);
      if (type === "macd") renderMacdChart(svg, allRows, info);
      if (type === "kdj") renderKdjChart(svg, allRows, info);
      if (type === "rsi") renderRsiChart(svg, allRows, info);
      if (type === "main-force") renderMainForceChart(svg, allRows, state.selectedIndexRows, info);
      if (type.startsWith("builtin-sub-")) renderBuiltinSubChart(svg, allRows, type, info);
      if (type.startsWith("custom-sub-")) renderImportedSubChart(svg, allRows, type, info);
    }
  }

  function renderVolumeChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const maxVolume = Math.max(...rows.map((row) => row.volume), 1);
    const y = (value) => pad.top + ((maxVolume - value) / maxVolume) * (h - pad.top - pad.bottom);
    const barW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${rows
        .map((row, index) => {
          const color = row.close >= row.open ? "#d93025" : "#0f9d58";
          return `<rect x="${x(index) - barW / 2}" y="${y(row.volume)}" width="${barW}" height="${h - pad.bottom - y(row.volume)}" fill="${color}" opacity="0.58" />`;
        })
        .join("")}
      <text x="8" y="22" fill="#667788" font-size="11">${formatMoney(maxVolume)}</text>
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(rows[index].volume),
      info: (row) => [`${row.date}  成交量:${formatMoney(row.volume)}`],
    });
  }

  function renderMacdChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const values = macd(rows);
    const maxAbs = Math.max(...values.flatMap((row) => [Math.abs(row.dif), Math.abs(row.dea), Math.abs(row.hist)]), 0.01);
    const y = (value) => pad.top + (0.5 - value / maxAbs / 2) * (h - pad.top - pad.bottom);
    const zeroY = y(0);
    const barW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${zeroY}" x2="${w - pad.right}" y2="${zeroY}" stroke="#dfe5ec" />
      ${values
        .map((row, index) => {
          const yy = y(row.hist);
          const color = row.hist >= 0 ? "#d93025" : "#0f9d58";
          return `<rect x="${x(index) - barW / 2}" y="${Math.min(yy, zeroY)}" width="${barW}" height="${Math.max(1, Math.abs(yy - zeroY))}" fill="${color}" opacity="0.58" />`;
        })
        .join("")}
      ${svgLine(values.map((row, index) => `${x(index)},${y(row.dif)}`).join(" "), "#7c3aed", 1.5)}
      ${svgLine(values.map((row, index) => `${x(index)},${y(row.dea)}`).join(" "), "#f59e0b", 1.5)}
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(values[index].hist),
      info: (row, index) => [`${row.date}  DIF:${values[index].dif.toFixed(3)} DEA:${values[index].dea.toFixed(3)} MACD:${values[index].hist.toFixed(3)}`],
    });
  }

  function renderKdjChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const values = calculateKdj(allRows).slice(offset);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const max = Math.max(...values.flatMap((row) => [row.k, row.d, row.j]), 100);
    const min = Math.min(...values.flatMap((row) => [row.k, row.d, row.j]), 0);
    const span = Math.max(1, max - min);
    const y = (value) => pad.top + ((max - value) / span) * (h - pad.top - pad.bottom);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${y(50)}" x2="${w - pad.right}" y2="${y(50)}" stroke="#dfe5ec" />
      ${svgSeriesLine(values.map((row) => row.k), x, y, "#1d4ed8", 1.4)}
      ${svgSeriesLine(values.map((row) => row.d), x, y, "#f59e0b", 1.4)}
      ${svgSeriesLine(values.map((row) => row.j), x, y, "#c026d3", 1.4)}
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(values[index].j),
      info: (row, index) => [`${row.date}  K:${values[index].k.toFixed(2)} D:${values[index].d.toFixed(2)} J:${values[index].j.toFixed(2)}`],
    });
  }

  function renderRsiChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const values = calculateRsi(allRows).slice(offset);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const y = (value) => pad.top + ((100 - value) / 100) * (h - pad.top - pad.bottom);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${y(50)}" x2="${w - pad.right}" y2="${y(50)}" stroke="#dfe5ec" />
      ${svgSeriesLine(values.map((row) => row.rsi6), x, y, "#1d4ed8", 1.4)}
      ${svgSeriesLine(values.map((row) => row.rsi12), x, y, "#f59e0b", 1.4)}
      ${svgSeriesLine(values.map((row) => row.rsi24), x, y, "#c026d3", 1.4)}
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(values[index].rsi6),
      info: (row, index) => [`${row.date}  RSI6:${values[index].rsi6.toFixed(2)} RSI12:${values[index].rsi12.toFixed(2)} RSI24:${values[index].rsi24.toFixed(2)}`],
    });
  }

  function renderMainForceChart(svg, allRows, indexRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const values = calculateMainForce(allRows, indexRows || []).slice(offset);
    const keys = [
      ["midStrong", "中线强势", "#d93025"],
      ["midControl", "中线控盘", "#d9a400"],
      ["shortAttack", "短线上攻", "#c026d3"],
      ["midOversold", "中线超跌", "#0f9d58"],
      ["retailMoney", "散户资金", "#1d4ed8"],
    ];
    const maxValue = Math.max(...values.flatMap((row) => keys.map(([key]) => Math.max(0, row[key]))), 1);
    const y = (value) => pad.top + ((maxValue - value) / maxValue) * (h - pad.top - pad.bottom);
    const barW = Math.max(2, (w - pad.left - pad.right) / rows.length / 5);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${values
        .map((row, index) =>
          keys
            .map(([key, , color], keyIndex) => {
              const value = row[key];
              if (value <= 0) return "";
              return `<rect x="${x(index) - barW * 2.5 + keyIndex * barW}" y="${y(value)}" width="${barW}" height="${h - pad.bottom - y(value)}" fill="${color}" opacity="0.68" />`;
            })
            .join("")
        )
        .join("")}
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(Math.max(0, ...keys.map(([key]) => values[index][key]))),
      info: (row, index) => [
        `${row.date} ${keys.map(([key, label, color]) => colorLabel(label, values[index][key].toFixed(2), color)).join(" ")}`,
      ],
    });
  }

  function renderImportedSubChart(svg, allRows, type, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const index = Number(type.replace("custom-sub-", ""));
    const item = state.importedSubIndicators[index];
    if (item && item.kind === "main-force") {
      renderMainForceChart(svg, allRows, state.selectedIndexRows, infoNode);
      return;
    }
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 14, bottom: 22 };
    const x = (rowIndex) => chartX(rowIndex, rows, pad, w);
    let outputs = [];
    try {
      outputs = executeFormula((item && item.source) || "", allRows, state.selectedIndexRows || [], state.selected).outputs;
    } catch (error) {
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" /><text x="${pad.left}" y="34" fill="#dc2626" font-size="12">${item ? item.name : "自定义副图"} 公式暂无法解析：${String(error.message || error).slice(0, 70)}</text>${crosshairLayer(pad, w, h)}`;
      bindChart(svg, {
        w,
        h,
        pad,
        rows,
        x,
        infoNode,
        crossY: () => h - pad.bottom,
        info: (row) => [`${row.date}  ${item ? item.name : "自定义副图"} 公式暂无法解析`],
      });
      return;
    }
    const visibleOutputs = outputs.map((output) => ({ ...output, value: output.value.slice(offset) })).filter((output) => output.value.some((value) => Number.isFinite(value)));
    if (visibleOutputs.length) {
      const values = finiteFormulaValues(visibleOutputs);
      const max = Math.max(...values, 1);
      const min = Math.min(...values, 0);
      const range = max === min ? 1 : max - min;
      const y = (value) => pad.top + ((max - value) / range) * (h - pad.top - pad.bottom);
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" />
        <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
        ${visibleOutputs.map((output) => svgSeriesLine(output.value, x, y, output.color || "#1d4ed8", 1.4)).join("")}
        ${crosshairLayer(pad, w, h)}`;
      bindChart(svg, {
        w,
        h,
        pad,
        rows,
        x,
        infoNode,
        crossY: (rowIndex) => y(visibleOutputs[0].value[rowIndex] || 0),
        info: (row, rowIndex) => [`${row.date} ${visibleOutputs.map((output) => colorLabel(output.name, formatNumber(output.value[rowIndex]), output.color || "#1d4ed8")).join(" ")}`],
      });
      return;
    }
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      <text x="${pad.left}" y="34" fill="#667788" font-size="12">${item ? item.name : "自定义副图"} 已导入，但公式没有可绘制输出</text>
      ${crosshairLayer(pad, w, h)}
    `;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: () => h - pad.bottom,
      info: (row) => [`${row.date}  ${item ? item.name : "自定义副图"}`],
    });
  }

  function renderBuiltinSubChart(svg, allRows, type, infoNode) {
    const builtinIndex = Number(type.replace("builtin-sub-", ""));
    const item = BUILTIN_SUB_INDICATORS[builtinIndex];
    if (!item) return renderImportedSubChart(svg, allRows, type, infoNode);
    if (item.kind === "gold-control") return renderGoldControlChart(svg, allRows, infoNode);
    if (item.kind === "three-dragon") return renderThreeDragonChart(svg, allRows, infoNode);
    if (item.kind === "gold-chip") return renderGoldChipChart(svg, allRows, infoNode);
  }

  function renderGoldControlChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const values = calculateGoldControl(allRows).slice(offset);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 12, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const maxAbs = Math.max(...values.map((row) => Math.abs(row.control)), 5);
    const y = (value) => pad.top + (0.5 - value / maxAbs / 2) * (h - pad.top - pad.bottom);
    const zeroY = y(0);
    const barW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${zeroY}" x2="${w - pad.right}" y2="${zeroY}" stroke="#dfe5ec" />
      ${values.map((row, index) => {
        let color = row.control < 0 ? "#94a3b8" : "#d93025";
        if (row.exit) color = "#16a34a";
        if (row.highControl) color = "#c026d3";
        const yy = y(row.control);
        return `<rect x="${x(index) - barW / 2}" y="${Math.min(yy, zeroY)}" width="${barW}" height="${Math.max(1, Math.abs(yy - zeroY))}" fill="${color}" opacity="0.72" />`;
      }).join("")}
      ${crosshairLayer(pad, w, h)}`;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(values[index].control),
      info: (row, index) => [
        `${row.date} ${colorLabel("控盘", values[index].control.toFixed(2), "#d93025")} ${colorLabel("开始", formatNumber(values[index].start), "#d9a400")} ${colorLabel("高控", formatNumber(values[index].highControl), "#c026d3")} ${colorLabel("出货", formatNumber(values[index].exit), "#16a34a")}`,
      ],
    });
  }

  function renderThreeDragonChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const values = calculateThreeDragon(allRows).slice(offset);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 12, bottom: 20 };
    const x = (index) => chartX(index, rows, pad, w);
    const y = (value) => pad.top + ((2.8 - value) / 8) * (h - pad.top - pad.bottom);
    const barW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    const bands = [
      ["trendRed", 2.1, "趋势"],
      ["energyRed", 0.4, "量能"],
      ["midRed", -1.5, "中期"],
      ["shortRed", -3.2, "短期"],
    ];
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" />
      ${bands.map(([key, value, label]) => `<text x="8" y="${y(value) + 4}" fill="#667788" font-size="10">${label}</text>`).join("")}
      ${values.map((row, index) => bands.map(([key, value]) => `<rect x="${x(index) - barW / 2}" y="${y(value) - 5}" width="${barW}" height="10" fill="${row[key] ? "#d93025" : "#16a34a"}" opacity="0.82" />`).join("")).join("")}
      ${values.map((row, index) => row.controlDegree >= 50 ? `<rect x="${x(index) - barW / 2}" y="${h - pad.bottom - 6}" width="${barW}" height="6" fill="${row.controlDegree >= 80 ? "#c026d3" : row.controlDegree >= 60 ? "#fb7185" : "#facc15"}" />` : "").join("")}
      ${crosshairLayer(pad, w, h)}`;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(values[index].shortRed ? -3.2 : 2.1),
      info: (row, index) => [`${row.date}  趋势:${values[index].trendRed ? "红" : "绿"} 量能:${values[index].energyRed ? "红" : "绿"} 中期:${values[index].midRed ? "红" : "绿"} 短期:${values[index].shortRed ? "红" : "绿"} 控盘:${values[index].controlDegree.toFixed(1)}`],
    });
  }

  function renderGoldChipChart(svg, allRows, infoNode) {
    const rows = visibleRows(allRows);
    const offset = allRows.length - rows.length;
    const values = calculateGoldChip(allRows).slice(offset);
    const w = 700;
    const h = 108;
    const pad = { left: 46, right: 18, top: 12, bottom: 22 };
    const x = (index) => chartX(index, rows, pad, w);
    const max = Math.max(...values.flatMap((row) => [row.mainChip, row.retailChip, row.controlLine]), 1);
    const y = (value) => pad.top + ((max - value) / max) * (h - pad.top - pad.bottom);
    const barW = Math.max(3, (w - pad.left - pad.right) / rows.length - 2);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<rect width="${w}" height="${h}" fill="#ffffff" />
      <line x1="${pad.left}" y1="${h - pad.bottom}" x2="${w - pad.right}" y2="${h - pad.bottom}" stroke="#dfe5ec" />
      ${values.map((row, index) => {
        const main = `<rect x="${x(index) - barW / 2}" y="${y(row.mainChip)}" width="${barW}" height="${h - pad.bottom - y(row.mainChip)}" fill="#d93025" opacity="0.68" />`;
        const retail = `<rect x="${x(index) - barW / 2}" y="${y(row.retailChip)}" width="${barW}" height="${h - pad.bottom - y(row.retailChip)}" fill="#1d4ed8" opacity="0.58" />`;
        return row.mainChip >= row.retailChip ? `${retail}${main}` : `${main}${retail}`;
      }).join("")}
      ${svgSeriesLine(values.map((row) => row.controlLine), x, y, "#dc2626", 1.3)}
      ${crosshairLayer(pad, w, h)}`;
    bindChart(svg, {
      w,
      h,
      pad,
      rows,
      x,
      infoNode,
      crossY: (index) => y(Math.max(values[index].mainChip, values[index].retailChip)),
      info: (row, index) => [`${row.date}  主力筹码:${values[index].mainChip.toFixed(2)} 散户筹码:${values[index].retailChip.toFixed(2)} 控盘线:${values[index].controlLine.toFixed(2)}`],
    });
  }

  function renderSelectedCharts() {
    state.chartMetas.clear();
    if (!state.selectedRows.length) {
      els.mainChart.innerHTML = '<rect width="760" height="260" fill="#ffffff" /><text x="24" y="48" fill="#667788" font-size="14">K线数据不足</text>';
      els.subCharts.innerHTML = "";
      return;
    }
    renderMainChart(state.selectedRows);
    renderSubCharts(state.selectedRows);
    registerInitialHover(visibleRows(state.selectedRows));
  }

  async function selectQuote(symbol) {
    const quote = state.quotes.find((item) => item.symbol === symbol);
    if (!quote) return;
    const token = ++state.selectionToken;
    state.selected = quote;
    state.zoomBars = 30;
    renderQuoteTable();
    els.detailTitle.textContent = `${quote.name} ${quote.code}`;
    els.detailMeta.textContent = "";
    try {
      const [rows, indexRows] = await Promise.all([fetchKline(quote.symbol), fetchIndexKlineForQuote(quote)]);
      if (token !== state.selectionToken) return;
      state.selectedRows = rows;
      state.selectedIndexRows = indexRows;
      els.detailMeta.textContent = rows.length ? "" : "K线数据不足";
      renderSelectedCharts();
    } catch (error) {
      if (token !== state.selectionToken) return;
      state.selectedRows = [];
      state.selectedIndexRows = [];
      els.detailMeta.textContent = error.message;
      renderSelectedCharts();
    }
  }

  function setZoomBars(next) {
    state.zoomBars = clamp(next, 30, Math.max(30, state.selectedRows.length || 520));
    renderSelectedCharts();
  }

  async function refreshQuotes() {
    els.refreshButton.disabled = true;
    els.statusText.textContent = "正在拉取全市场 A 股列表...";
    try {
      state.stockPool = await fetchAllStockPool();
      els.statusText.textContent = `已获取 ${state.stockPool.length} 只A股，正在分批拉取实时行情...`;
      state.quotes = await fetchQuotes();
      state.selected = null;
      state.selectedRows = [];
      state.selectedIndexRows = [];
      state.zoomBars = 30;
      els.statusText.textContent = `已更新：${new Date().toLocaleString("zh-CN")}，成功拉取 ${state.quotes.length} 只股票`;
      applyFilters();
      const first = state.filtered.find((quote) => quote.type !== "北交所") || state.filtered[0];
      if (first) selectQuote(first.symbol);
    } catch (error) {
      els.statusText.textContent = `${error.message}。请稍后重试。`;
      state.quotes = [];
      state.filtered = [];
      renderQuoteTable();
    } finally {
      els.refreshButton.disabled = false;
    }
  }

  function downloadCsv() {
    const header = ["股票名称"];
    const rows = state.filtered.map((quote) => [quote.name]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `a-share-filter-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function inferSymbol(code) {
    if (code.startsWith("6")) return `sh${code}`;
    if (code.startsWith("8") || code.startsWith("4") || code.startsWith("9")) return `bj${code}`;
    return `sz${code}`;
  }

  function importIndicator(fileInput, target) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || "");
      const item = { name: file.name.replace(/\.txt$/i, ""), source, kind: detectIndicatorKind(source, target) };
      if (target === "main") {
        state.importedMainIndicators.push(item);
        localStorage.setItem("aShareMainIndicators", JSON.stringify(state.importedMainIndicators));
        refreshIndicatorOptions();
        els.mainIndicatorSelect.value = `custom-main-${state.importedMainIndicators.length - 1}`;
        els.statusText.textContent = `已导入主图指标：${item.name}`;
        updateMainControlVisibility();
      } else {
        state.importedSubIndicators.push(item);
        localStorage.setItem("aShareSubIndicators", JSON.stringify(state.importedSubIndicators));
      }
      fileInput.value = "";
      renderSelectedCharts();
    };
    reader.readAsText(file, "utf-8");
  }

  function bindEvents() {
    Object.values(els.filters).forEach((input) => {
      input.addEventListener("input", applyFilters);
      input.addEventListener("change", applyFilters);
    });
    els.typeFilterButton.addEventListener("click", () => els.filters.type.classList.toggle("open"));
    els.maPeriodsButton.addEventListener("click", () => els.maPeriodsInput.classList.toggle("open"));
    els.columnSettingsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelector(".table-wrap").classList.toggle("columns-open");
    });
    els.columnSettingsMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.target.closest("button[data-move]");
      if (!button) return;
      const key = button.dataset.move;
      const dir = Number(button.dataset.dir);
      const index = state.columnKeys.indexOf(key);
      const nextIndex = index + dir;
      if (index < 0 || nextIndex < 0 || nextIndex >= state.columnKeys.length) return;
      const next = [...state.columnKeys];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      state.columnKeys = next;
      localStorage.setItem("aShareColumns", JSON.stringify(state.columnKeys));
      renderColumnSettings();
      renderQuoteTable();
      document.querySelector(".table-wrap").classList.add("columns-open");
    });
    els.columnSettingsMenu.addEventListener("change", (event) => {
      event.stopPropagation();
      const checked = Array.from(els.columnSettingsMenu.querySelectorAll("input:checked")).map((input) => input.value);
      const next = [...state.columnKeys.filter((key) => checked.includes(key)), ...checked.filter((key) => !state.columnKeys.includes(key))];
      state.columnKeys = next.length ? next : ["code", "name"];
      localStorage.setItem("aShareColumns", JSON.stringify(state.columnKeys));
      renderColumnSettings();
      renderQuoteTable();
      document.querySelector(".table-wrap").classList.add("columns-open");
    });
    els.toggleIndicatorScreenerButton.addEventListener("click", () => {
      const collapsed = els.indicatorScreener.classList.toggle("is-collapsed");
      els.toggleIndicatorScreenerButton.textContent = collapsed ? "展开" : "折叠";
    });
    els.loadDefaultIndicatorPlanButton.addEventListener("click", () => {
      loadIndicatorPlan(DEFAULT_INDICATOR_PLAN);
      els.indicatorScreener.classList.remove("is-collapsed");
      els.toggleIndicatorScreenerButton.textContent = "折叠";
      els.indicatorScreenStatus.textContent = "已填入测试条件。";
    });
    els.addIndicatorConditionButton.addEventListener("click", () => {
      const plan = readIndicatorPlanFromForm();
      plan.conditions.push(emptyCondition());
      loadIndicatorPlan(plan);
    });
    els.saveIndicatorPlanButton.addEventListener("click", saveIndicatorPlan);
    els.deleteIndicatorPlanButton.addEventListener("click", deleteIndicatorPlan);
    els.runIndicatorScreenButton.addEventListener("click", runIndicatorScreen);
    els.indicatorPlanSelect.addEventListener("change", () => {
      const index = Number(els.indicatorPlanSelect.value);
      if (Number.isInteger(index) && state.indicatorPlans[index]) loadIndicatorPlan(state.indicatorPlans[index]);
    });
    els.indicatorConditionList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-condition]");
      if (!button) return;
      const plan = readIndicatorPlanFromForm();
      plan.conditions.splice(Number(button.dataset.removeCondition), 1);
      loadIndicatorPlan(plan);
    });
    els.indicatorConditionList.addEventListener("change", (event) => {
      if (!event.target.matches("[data-field='indicator'], [data-field='conditionField'], [data-field='operator']")) return;
      const plan = readIndicatorPlanFromForm();
      const row = event.target.closest(".condition-row");
      const index = Array.from(els.indicatorConditionList.querySelectorAll(".condition-row")).indexOf(row);
      if (event.target.matches("[data-field='indicator']")) {
        const indicator = indicatorDef(plan.conditions[index].indicator);
        plan.conditions[index].field = indicator.fields[0][0];
        plan.conditions[index].operator = indicator.fields[0][2] === "select" ? "eq" : "gt";
        plan.conditions[index].value = indicator.fields[0][2] === "select" ? indicator.fields[0][3][0] : "0";
      }
      const field = indicatorFieldDef(plan.conditions[index].indicator, plan.conditions[index].field);
      if (event.target.matches("[data-field='conditionField']")) {
        plan.conditions[index].operator = field[2] === "select" ? "eq" : "gt";
        plan.conditions[index].value = field[2] === "select" ? field[3][0] : "0";
      }
      renderIndicatorConditions(plan.conditions);
    });
    document.addEventListener("click", (event) => {
      document.querySelectorAll(".multi-select").forEach((node) => {
        if (!node.contains(event.target)) node.classList.remove("open");
      });
      const tableWrap = document.querySelector(".table-wrap");
      if (tableWrap && !tableWrap.contains(event.target)) tableWrap.classList.remove("columns-open");
    });
    els.maPeriodsInput.addEventListener("change", () => {
      updateMaFilterLabel();
      renderSelectedCharts();
    });
    els.mainIndicatorSelect.addEventListener("change", () => {
      updateMainControlVisibility();
      renderSelectedCharts();
    });
    els.subChartCountSelect.addEventListener("change", renderSelectedCharts);
    els.periodSelect.addEventListener("change", () => {
      if (state.selected) selectQuote(state.selected.symbol);
    });
    els.zoomInButton.addEventListener("click", () => setZoomBars(Math.round(state.zoomBars * 0.72)));
    els.zoomOutButton.addEventListener("click", () => setZoomBars(Math.round(state.zoomBars * 1.38)));
    els.zoomResetButton.addEventListener("click", () => setZoomBars(30));
    els.refreshButton.addEventListener("click", refreshQuotes);
    els.downloadButton.addEventListener("click", downloadCsv);
    els.toggleCategoryModeButton.addEventListener("click", () => {
      state.categorySelectionMode = !state.categorySelectionMode;
      updateCategoryMode();
    });
    els.selectPageButton.addEventListener("click", selectCurrentPage);
    els.confirmFavoriteButton.addEventListener("click", openCategoryModal);
    els.closeCategoryModalButton.addEventListener("click", closeCategoryModal);
    els.categoryModal.addEventListener("click", (event) => {
      if (event.target === els.categoryModal) closeCategoryModal();
    });
    els.showNewCategoryButton.addEventListener("click", () => {
      els.categoryModal.querySelector(".new-category-row").classList.add("is-adding");
      els.categoryNameInput.focus();
    });
    els.createCategoryButton.addEventListener("click", createCategoryFromModal);
    els.saveCategoryButton.addEventListener("click", saveSelectedCategory);
    els.categorySelect.addEventListener("change", () => {
      state.activeCategory = els.categorySelect.value;
      applyFilters();
      els.statusText.textContent = state.activeCategory ? `当前分类：${state.activeCategory}` : "已切换到全部股票。";
    });
    els.manageCategoryButton.addEventListener("click", openManageCategoryModal);
    els.closeManageCategoryButton.addEventListener("click", closeManageCategoryModal);
    els.manageCategoryModal.addEventListener("click", (event) => {
      if (event.target === els.manageCategoryModal) closeManageCategoryModal();
    });
    els.saveManagedCategoryButton.addEventListener("click", saveManagedCategory);
    els.addManagedCategoryButton.addEventListener("click", () => els.managedCategoryNameInput.focus());
    els.manageCategoryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-category]");
      if (button) deleteCategory(button.dataset.deleteCategory);
    });
    els.clearCategoryButton.addEventListener("click", () => {
      state.activeCategory = "";
      renderCategorySelect();
      applyFilters();
      els.statusText.textContent = "已切换到全部股票。";
    });
    els.pageSizeSelect.addEventListener("change", () => {
      state.pageSize = Number(els.pageSizeSelect.value) || 20;
      state.currentPage = 1;
      localStorage.setItem("aSharePageSize", String(state.pageSize));
      renderQuoteTable();
    });
    els.prevPageButton.addEventListener("click", () => {
      state.currentPage -= 1;
      renderQuoteTable();
    });
    els.nextPageButton.addEventListener("click", () => {
      state.currentPage += 1;
      renderQuoteTable();
    });
    els.importMainIndicatorButton.addEventListener("click", () => els.mainIndicatorFile.click());
    els.importSubIndicatorButton.addEventListener("click", () => els.subIndicatorFile.click());
    els.mainIndicatorFile.addEventListener("change", () => importIndicator(els.mainIndicatorFile, "main"));
    els.subIndicatorFile.addEventListener("change", () => importIndicator(els.subIndicatorFile, "sub"));
    els.quoteRows.addEventListener("click", (event) => {
      if (event.target.closest(".category-check")) return;
      const row = event.target.closest("tr[data-symbol]");
      if (row) selectQuote(row.dataset.symbol);
    });
  }

  normalizeImportedIndicators();
  renderColumnSettings();
  renderCategorySelect();
  renderIndicatorPlanSelect();
  loadIndicatorPlan(DEFAULT_INDICATOR_PLAN);
  refreshIndicatorOptions();
  updateMaFilterLabel();
  bindEvents();
  renderQuoteTable();
  window.aShareAnalyzer = { fetchQuotes, parseTencentQuote, quoteMatches, fetchKline, fetchKlineForPeriod, quotePassesIndicatorPlan, executeFormula, calculateMainForce, evaluateIndicatorPlan, collectIndicatorMetrics, defaultIndicatorPlan: DEFAULT_INDICATOR_PLAN, mainForceFormula: MAIN_FORCE_FORMULA, debugState: () => state };
})();


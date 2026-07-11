const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Access-Control-Allow-Origin": "*", ...headers });
  res.end(body);
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

async function proxyKline(req, res, url) {
  const symbol = String(url.searchParams.get("symbol") || "");
  const period = String(url.searchParams.get("period") || "day");
  if (!/^(sh|sz|bj)\d{6}$/.test(symbol)) return send(res, 400, JSON.stringify({ error: "bad symbol" }), { "Content-Type": MIME[".json"] });
  const upstream = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${new URLSearchParams({
    secid: eastmoneySecid(symbol),
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57",
    klt: eastmoneyKlt(period),
    fqt: "0",
    beg: "19900101",
    end: "20500101",
    lmt: "520",
  }).toString()}`;
  try {
    const response = await fetch(upstream);
    const text = await response.text();
    send(res, response.ok ? 200 : response.status, text, { "Content-Type": MIME[".json"] });
  } catch (error) {
    send(res, 502, JSON.stringify({ error: String(error && error.message ? error.message : error) }), { "Content-Type": MIME[".json"] });
  }
}

function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    send(res, 200, content, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
  });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/eastmoney-kline") return proxyKline(req, res, url);
    return serveStatic(req, res, url);
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`A股筛选器已启动: http://0.0.0.0:${PORT}/`);
  });

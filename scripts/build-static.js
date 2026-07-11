const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    fs.readdirSync(source).forEach((entry) => copyRecursive(path.join(source, entry), path.join(target, entry)));
    return;
  }
  fs.copyFileSync(source, target);
}

copyRecursive(path.join(root, "index.html"), path.join(dist, "index.html"));
copyRecursive(path.join(root, "assets"), path.join(dist, "assets"));
copyRecursive(path.join(root, ".openai"), path.join(dist, ".openai"));

const serverDir = path.join(dist, "server");
fs.mkdirSync(serverDir, { recursive: true });
fs.writeFileSync(
  path.join(serverDir, "index.js"),
  `const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
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
  return \`\${market}.\${symbol.slice(2)}\`;
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
  if (!/^(sh|sz|bj)\\d{6}$/.test(symbol)) {
    return send(res, 400, JSON.stringify({ error: "bad symbol" }), { "Content-Type": MIME[".json"] });
  }
  const upstream = \`https://push2his.eastmoney.com/api/qt/stock/kline/get?\${new URLSearchParams({
    secid: eastmoneySecid(symbol),
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57",
    klt: eastmoneyKlt(period),
    fqt: "0",
    beg: "19900101",
    end: "20500101",
    lmt: "520",
  }).toString()}\`;
  try {
    const response = await fetch(upstream);
    const text = await response.text();
    send(res, response.ok ? 200 : response.status, text, { "Content-Type": MIME[".json"] });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    send(res, 502, JSON.stringify({ error: message }), { "Content-Type": MIME[".json"] });
  }
}

function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, \`.\${pathname}\`);
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  }
  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    send(res, 200, content, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
  });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, \`http://\${req.headers.host}\`);
    if (url.pathname === "/api/eastmoney-kline") return proxyKline(req, res, url);
    return serveStatic(req, res, url);
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(\`Stock app started on port \${PORT}\`);
  });
`,
  "utf8"
);

console.log("Static site built to dist/");

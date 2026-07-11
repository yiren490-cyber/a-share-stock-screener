const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyRecursive(source, target) {
  if (source.endsWith(".backup")) return;
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

const deployAssets = {};
function addDeployAsset(urlPath, filePath) {
  deployAssets[urlPath] = fs.readFileSync(filePath, "utf8");
}
addDeployAsset("/", path.join(root, "index.html"));
addDeployAsset("/index.html", path.join(root, "index.html"));
fs.readdirSync(path.join(root, "assets")).forEach((entry) => {
  if (entry.endsWith(".backup")) return;
  const filePath = path.join(root, "assets", entry);
  if (fs.statSync(filePath).isFile()) addDeployAsset(`/assets/${entry}`, filePath);
});

const serverDir = path.join(dist, "server");
fs.mkdirSync(serverDir, { recursive: true });
fs.writeFileSync(
  path.join(serverDir, "index.js"),
  `const ASSETS = ${JSON.stringify(deployAssets)};
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function extname(pathname) {
  const index = pathname.lastIndexOf(".");
  return index >= 0 ? pathname.slice(index) : "";
}

function response(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
  });
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

async function proxyKline(url) {
  const symbol = String(url.searchParams.get("symbol") || "");
  if (!/^(sh|sz|bj)\\d{6}$/.test(symbol)) {
    return response(JSON.stringify({ error: "bad symbol" }), 400, { "Content-Type": MIME[".json"] });
  }
  return response(JSON.stringify({ error: "production proxy disabled; use browser JSONP fallback" }), 502, { "Content-Type": MIME[".json"] });
}

function serveAsset(pathname) {
  const body = ASSETS[pathname];
  if (body == null) return null;
  const type = pathname === "/" ? MIME[".html"] : MIME[extname(pathname)] || "text/plain; charset=utf-8";
  return response(body, 200, { "Content-Type": type });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/eastmoney-kline") return proxyKline(url);
    return serveAsset(url.pathname) || response("Not found", 404, { "Content-Type": "text/plain; charset=utf-8" });
  },
};
`,
  "utf8"
);

console.log("Static site built to dist/");

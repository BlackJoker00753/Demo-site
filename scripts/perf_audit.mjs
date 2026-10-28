// Замер скорости страниц как на слабом ноутбуке: безголовый Chrome, процессор замедлен в 4 раза,
// сеть «быстрый 4G», холодный заход (без кеша и сервис-воркера). Для каждой страницы:
//   - запросы и вес по типам, первая отрисовка (FCP), крупнейший элемент (LCP), DOMContentLoaded;
//   - длинные задачи главного потока (TBT: сумма времени сверх 50 мс) до и после загрузки;
//   - что сайт делает в фоне за 10 секунд после загрузки (запросы, байты, длинные задачи);
//   - плавность прокрутки: доля кадров дольше 33 мс при программной прокрутке.
//
//   node scripts/perf_audit.mjs http://localhost:8765 [/ /watches ...]
//   CPU=1 NET=0 node scripts/perf_audit.mjs ...        (без замедления)
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const pages = process.argv.slice(3).length ? process.argv.slice(3) : ["/", "/watches", "/watch/rolex-submariner", "/brand/rolex", "/complication/tourbillon", "/movements", "/history"];
const cpu = +(process.env.CPU ?? 4);
const net = process.env.NET !== "0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "horo-perf-"));
const port = 9300 + Math.floor(Math.random() * 500);
const mac = process.platform === "darwin";
const chrome = spawn(process.env.CHROME || (mac ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome"), [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1440,900",
  ...(mac ? ["--use-angle=metal", "--enable-gpu"] : ["--enable-unsafe-swiftshader", "--no-sandbox"]),
  "--ignore-gpu-blocklist", "--hide-scrollbars", "--no-first-run", "about:blank",
], { stdio: "ignore" });
let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
let reqs = new Map();
let phase = "load";
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  const p = m.params;
  if (m.method === "Network.requestWillBeSent") reqs.set(p.requestId, { url: p.request.url, type: p.type, phase, bytes: 0 });
  if (m.method === "Network.responseReceived" && reqs.has(p.requestId)) reqs.get(p.requestId).type = p.type;
  if (m.method === "Network.loadingFinished" && reqs.has(p.requestId)) reqs.get(p.requestId).bytes = p.encodedDataLength;
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Network.enable");
await send("Page.enable");
await send("Runtime.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBypassServiceWorker", { bypass: true });
if (net) await send("Network.emulateNetworkConditions", { offline: false, latency: 40, downloadThroughput: 12e6 / 8, uploadThroughput: 4e6 / 8 });
await send("Emulation.setCPUThrottlingRate", { rate: cpu });
// наблюдатели ставятся до кода страницы
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  window.__perf = { long: [], lcp: 0, fcp: 0 };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.long.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__perf.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => e.name === 'first-contentful-paint' && (window.__perf.fcp = e.startTime))).observe({ type: 'paint', buffered: true });
` });

const kb = (b) => `${Math.round(b / 1024)} КБ`;
const rows = [];
for (const path of pages) {
  reqs = new Map();
  phase = "load";
  await send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  reqs = new Map();
  const t0 = Date.now();
  await send("Page.navigate", { url: base + path });
  // ждём загрузку страницы (load) не дольше 30 с
  for (let i = 0; i < 120; i++) { if ((await evaluate("document.readyState")) === "complete") break; await sleep(250); }
  await sleep(1500);
  const loadMs = Date.now() - t0;
  const p1 = await evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, fcp: __perf.fcp, lcp: __perf.lcp, long: __perf.long.slice(), heap: performance.memory?.usedJSHeapSize ?? 0 }; })()`);
  // фон: 10 секунд без действий
  phase = "idle";
  const longBefore = p1.long.length;
  await sleep(10000);
  const p2 = await evaluate(`__perf.long.slice()`);
  const idleLong = p2.slice(longBefore);
  // Lazy resources reached by the scroll probe are not idle background traffic.
  phase = "scroll";
  // прокрутка: 2,5 с плавной прокрутки, измеряем интервалы кадров
  const scroll = await evaluate(`(async () => {
    const H = document.documentElement.scrollHeight - innerHeight;
    if (H < 200) return null;
    const gaps = []; let last = performance.now(); const t0 = last;
    await new Promise((done) => {
      const step = (t) => { gaps.push(t - last); last = t; const k = Math.min(1, (t - t0) / 2500); window.scrollTo(0, k * Math.min(H, 4000)); if (k < 1) requestAnimationFrame(step); else done(); };
      requestAnimationFrame(step);
    });
    gaps.sort((a, b) => a - b);
    return { frames: gaps.length, slow: gaps.filter((g) => g > 33).length, p95: Math.round(gaps[Math.floor(gaps.length * 0.95)]) };
  })()`);
  const all = [...reqs.values()];
  const load = all.filter((r) => r.phase === "load"), idle = all.filter((r) => r.phase === "idle"), scrolled = all.filter((r) => r.phase === "scroll");
  const byType = {};
  load.forEach((r) => (byType[r.type] = (byType[r.type] ?? 0) + r.bytes));
  const tbt = (list) => Math.round(list.reduce((s, [, d]) => s + Math.max(0, d - 50), 0));
  rows.push({ path, loadMs, ...p1, reqs: load.length, bytes: load.reduce((s, r) => s + r.bytes, 0), byType, idleReqs: idle.length, idleBytes: idle.reduce((s, r) => s + r.bytes, 0), idleTop: idle.sort((a, b) => b.bytes - a.bytes).slice(0, 4).map((r) => `${r.url.replace(base, "").slice(0, 60)} ${kb(r.bytes)}`), tbtLoad: tbt(p1.long), tbtIdle: tbt(idleLong), idleLongN: idleLong.length, scroll });
  const r = rows.at(-1);
  console.log(`\n${path}`);
  console.log(`  запросов ${r.reqs}, ${kb(r.bytes)} (${Object.entries(r.byType).sort((a, b) => b[1] - a[1]).map(([t, b]) => `${t} ${kb(b)}`).join(", ")})`);
  console.log(`  FCP ${Math.round(r.fcp)} мс, LCP ${Math.round(r.lcp)} мс, DCL ${Math.round(r.dcl)} мс, load ${Math.round(r.load)} мс; блокировка потока (TBT) ${r.tbtLoad} мс; память JS ${Math.round(r.heap / 1048576)} МБ`);
  console.log(`  фон 10 с: запросов ${r.idleReqs}, ${kb(r.idleBytes)}, длинных задач ${r.idleLongN} (TBT ${r.tbtIdle} мс)${r.idleTop.length ? "\n    " + r.idleTop.join("\n    ") : ""}`);
  if (scrolled.length) console.log(`  загрузка при прокрутке: запросов ${scrolled.length}, ${kb(scrolled.reduce((sum, request) => sum + request.bytes, 0))}`);
  if (r.scroll) console.log(`  прокрутка: кадров ${r.scroll.frames}, медленных (>33 мс) ${r.scroll.slow}, p95 ${r.scroll.p95} мс`);
}
ws.close();
chrome.kill();

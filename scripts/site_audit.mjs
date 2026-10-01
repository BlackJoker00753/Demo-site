// Обход всего сайта безголовым Chrome (DevTools Protocol): ошибки JS, битые запросы, горизонтальный
// скролл, пустой текст («undefined», «NaN»), длинное тире, картинки без alt, число h1.
// Страницы берутся из sitemap.xml плюс служебные маршруты; переходы идут через роутер SPA, так что
// заодно проверяется размонтирование видов.
//
//   node scripts/site_audit.mjs http://localhost:8765            (ПК 1440 и телефон 390)
//   WIDTHS=390 ONLY=/watch/ node scripts/site_audit.mjs http://localhost:8765
//   PER_SECTION=3 node scripts/site_audit.mjs …   (по 3 страницы каждого раздела: быстро, для CI)
//   SLOW_MS=0 …   не считать медленные переходы ошибкой (в CI без GPU 3D рисуется программно)
//
// Выход: список проблем по страницам; код 1, если они есть.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.argv[2] || "http://localhost:8765").replace(/\/$/, "");
const widths = (process.env.WIDTHS || "1440,390").split(",").map(Number);
const only = process.env.ONLY || "";
const perSection = +(process.env.PER_SECTION || 0);
const slowMs = +(process.env.SLOW_MS ?? 7000);
// не в карте сайта, но открываются: сравнение, мировое время по старому адресу, 404
const EXTRA = ["/compare?w=rolex-submariner,omega-speedmaster-moonwatch", "/world-time", "/nope-404"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "horo-audit-"));
const port = 9300 + Math.floor(Math.random() * 500);
const mac = process.platform === "darwin";
const chrome = spawn(process.env.CHROME || (mac ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome"), [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  // на Linux без GPU (CI) WebGL идёт через программный SwiftShader
  ...(mac ? ["--use-angle=metal", "--enable-gpu"] : ["--enable-unsafe-swiftshader", "--no-sandbox"]),
  "--ignore-gpu-blocklist", "--hide-scrollbars", "--no-first-run",
  "--autoplay-policy=no-user-gesture-required", "about:blank",
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
let bucket = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  const p = m.params;
  if (m.method === "Runtime.exceptionThrown") {
    const d = p.exceptionDetails;
    bucket.push(`исключение: ${d.exception?.description?.split("\n").slice(0, 2).join(" ") ?? d.text} @ ${d.url ?? ""}:${d.lineNumber}`);
  } else if (m.method === "Runtime.consoleAPICalled" && (p.type === "error" || p.type === "warning")) {
    const text = p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 220);
    if (!/GPU stall|ReadPixels|fallback to software WebGL/.test(text)) bucket.push(`console.${p.type}: ${text}`);
  } else if (m.method === "Runtime.consoleAPICalled" && /Context Lost/.test(p.args[0]?.value ?? "")) {
    bucket.push("потерян контекст WebGL (утечка контекстов на прошлых страницах?)");
  } else if (m.method === "Log.entryAdded" && (p.entry.level === "error" || /WebGL contexts/.test(p.entry.text))) {
    if (!/favicon|Failed to load resource/.test(p.entry.text + (p.entry.url ?? ""))) bucket.push(`log: ${p.entry.text.slice(0, 200)} ${p.entry.url ?? ""}`);
  } else if (m.method === "Network.responseReceived" && p.response.status >= 400) {
    bucket.push(`HTTP ${p.response.status}: ${p.response.url.replace(base, "")}`);
  } else if (m.method === "Network.loadingFailed" && !p.canceled && p.errorText !== "net::ERR_ABORTED") {
    bucket.push(`сеть: ${p.errorText} ${p.type}`);
  }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  const ex = r.result?.exceptionDetails;
  if (ex) return `исключение: ${(ex.exception?.description ?? ex.text ?? "").split("\n").slice(0, 3).join(" ")}`;
  return r.result?.result?.value;
};
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");

const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).concat(EXTRA).filter((p, i, all) => p.includes(only) && all.indexOf(p) === i)
  .filter((p, i, all) => !perSection || all.slice(0, i).filter((q) => q.split("/")[1] === p.split("/")[1]).length < perSection);

// Проверки на отрисованной странице
const CHECK = `(() => {
  const out = [];
  const W = innerWidth;
  if (document.documentElement.scrollWidth > W + 1) {
    const wide = [...document.querySelectorAll("body *")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width && r.right > W + 1 && getComputedStyle(el).position !== "fixed" && !el.closest("[aria-hidden=true], .marquee, canvas");
    }).slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : "") + "→" + Math.round(el.getBoundingClientRect().right));
    out.push("горизонтальный скролл " + document.documentElement.scrollWidth + ">" + W + " " + wide.join(", "));
  }
  const main = document.querySelector("#app, main") ?? document.body;
  const text = main.innerText;
  const bad = text.match(/[^\\n]{0,40}\\b(undefined|NaN|null|\\[object Object\\])\\b[^\\n]{0,40}/);
  if (bad) out.push("пустое значение в тексте: «" + bad[0].trim() + "»");
  const dash = text.match(/[^\\n]{0,30}\\u2014[^\\n]{0,30}/);
  if (dash) out.push("длинное тире: «" + dash[0].trim() + "»");
  const h1 = document.querySelectorAll("h1").length;
  if (h1 !== 1) out.push("h1: " + h1);
  const noalt = [...document.querySelectorAll("img:not([alt])")].length;
  if (noalt) out.push("img без alt: " + noalt);
  const broken = [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.replace(location.origin, ""));
  if (broken.length) out.push("битые картинки: " + broken.slice(0, 3).join(", "));
  const ids = {};
  document.querySelectorAll("[id]").forEach((el) => (ids[el.id] = (ids[el.id] || 0) + 1));
  const dup = Object.keys(ids).filter((k) => ids[k] > 1);
  if (dup.length) out.push("повторные id: " + dup.slice(0, 5).join(", "));
  const nolabel = [...document.querySelectorAll("button, a[href]")].filter((el) => !el.closest("[aria-hidden=true]") && el.offsetParent && !(el.textContent.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || el.querySelector("img[alt]:not([alt=''])")));
  if (nolabel.length) out.push("кнопки/ссылки без подписи: " + nolabel.slice(0, 3).map((el) => el.outerHTML.slice(0, 80)).join(" | "));
  if (!document.title || /undefined/.test(document.title)) out.push("title: " + document.title);
  return out;
})()`;

const report = new Map();
for (const W of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: W < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: W < 700 });
  await send("Page.navigate", { url: base + "/" });
  await sleep(5000);
  bucket = [];
  for (const path of paths) {
    bucket = [];
    const started = Date.now();
    const res = await evaluate(`(async () => {
      const r = window.__horologium?.router;
      if (!r) return "нет роутера";
      await Promise.race([r.go(${JSON.stringify(path)}), new Promise((ok) => setTimeout(ok, 8000))]);
      await new Promise((ok) => setTimeout(ok, 900));
      window.scrollTo(0, document.documentElement.scrollHeight / 2);
      await new Promise((ok) => setTimeout(ok, 400));
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((ok) => setTimeout(ok, 500));
      window.scrollTo(0, 0);
      return location.pathname;
    })()`);
    const issues = (await evaluate(CHECK)) ?? [];
    const all = [...new Set([...bucket, ...(Array.isArray(issues) ? issues : [String(issues)])])];
    if (path === "/nope-404") all.splice(0, all.length, ...all.filter((s) => !/HTTP 404/.test(s)));
    if (res !== new URL(base + path).pathname) all.push(`адрес после перехода: ${res}`);
    if (slowMs && Date.now() - started > slowMs) all.push(`медленно: ${Date.now() - started} мс`);
    for (const s of all) {
      const key = `${W}px ${s}`;
      if (!report.has(key)) report.set(key, []);
      report.get(key).push(path);
    }
    process.stderr.write(all.length ? "x" : ".");
  }
  process.stderr.write("\n");
}

const rows = [...report.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [issue, where] of rows) {
  console.log(`${issue}\n    ${where.length} стр.: ${where.slice(0, 6).join("  ")}${where.length > 6 ? "  …" : ""}`);
}
console.log(rows.length ? `\nПроблем: ${rows.length} (страниц проверено: ${paths.length} × ${widths.length})` : `\nЧисто: ${paths.length} страниц × ${widths.length} ширины`);
ws.close();
chrome.kill();
process.exit(rows.length ? 1 : 0);

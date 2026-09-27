// Кадры разборки «До детали» через безголовый Chrome (DevTools Protocol): проверка глазами без
// браузерной панели. Chrome запускается с временным профилем и закрывается после съёмки.
//
//   node scripts/teardown_shots.mjs http://localhost:8765/watch/rolex-submariner /tmp/sub 1440 900 0,0.45,1
//   DPR=2 node scripts/teardown_shots.mjs …     (в двойном разрешении, чтобы рассмотреть кромки)
//
// Результат: <префикс>-t000.jpg, -t045.jpg, -t100.jpg (собраны, разборка по оси, лоток).
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, W = "1440", H = "900", ts = "0,0.45,1"] = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), "horo-shot-"));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars", "--no-first-run", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +(process.env.DPR || 1), mobile: +W < 700 });
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(7000);
const ok = await evaluate(`(async () => {
  const el = document.querySelector('#explode');
  const st = window.ScrollTrigger?.getAll().find((s) => s.trigger === el);
  if (!st) return 'no-trigger';
  window.scrollTo(0, st.start + 2);
  await new Promise((r) => setTimeout(r, 1500));
  return 'ok:' + (!!window.__horologium?.teardown);
})()`);
console.log("ready", ok);
for (const t of ts.split(",").map(Number)) {
  await evaluate(`(async () => {
    const el = document.querySelector('#explode');
    const st = window.ScrollTrigger.getAll().find((s) => s.trigger === el);
    window.scrollTo(0, st.start + (st.end - st.start) * ${t} / 1.15 + (${t} === 0 ? 2 : 0));
    await new Promise((r) => setTimeout(r, 1500));
    const td = window.__horologium.teardown; td.introT = null; td.setT(${t}, true);
    await new Promise((r) => setTimeout(r, 300));
  })()`);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 85 });
  const file = `${out}-t${String(Math.round(t * 100)).padStart(3, "0")}.jpg`;
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(file);
}
ws.close();
chrome.kill();

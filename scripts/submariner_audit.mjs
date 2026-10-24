// Real-browser regression check for the workshop, its mobile controls and resource lifecycle.
// CHROME=/usr/bin/chromium node scripts/submariner_audit.mjs http://127.0.0.1:8765 /tmp/submariner-audit
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const base = process.argv[2] ?? "http://127.0.0.1:8765";
const out = process.argv[3] ?? "/tmp/submariner-audit";
mkdirSync(out, { recursive: true });
const port = 9500 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME ?? "chromium", ["--headless=new", "--no-sandbox", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "sub-audit-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
const problems = [], reports = [];
try {
  let tabs;
  for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") problems.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") problems.push(m.params.args.map(a=>a.description??a.value).join(" "));
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) problems.push(`HTTP ${m.params.response.status} ${m.params.response.url}`);
  };
  const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => {
    const r = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result;
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const assert = (condition, message) => { if (!condition) problems.push(message); };
  const waitFor = async expression => {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(250); }
    await shot("failure");
    throw new Error(`Timeout: ${expression}; ${problems.join("; ")}; ${await evaluate("document.querySelector('.sub-stage__status')?.innerText")}`);
  };
  const shot = async name => {
    const result = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${name}.png`), Buffer.from(result.result.data, "base64"));
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  for (const width of (process.env.WIDTHS ?? "1440,768,390").split(",").map(Number)) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    await send("Page.navigate", { url: `${base}/watch/rolex-submariner` });
    await waitFor("!!document.querySelector('.sub-workshop')");
    await waitFor("!document.querySelector('#intro')");
    assert(!(await evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('submariner.glb'))")), `${width}: model loaded before workshop was visible`);
    await evaluate("document.querySelector('.sub-workshop').scrollIntoView({block:'start',behavior:'instant'})");
    await waitFor("!!window.__horologium?.submariner?.parts.length");
    await sleep(1500);
    const initial = await evaluate(`(() => { const s=window.__horologium.submariner;return {parts:s.parts.length,triangles:s.renderer.info.render.triangles,calls:s.renderer.info.render.calls,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,wide:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>${width}+1&&e.getBoundingClientRect().width&&!e.closest('.wtimeline,nav,.wphotos,canvas')).slice(0,12).map(e=>[e.className,e.getBoundingClientRect().width,e.getBoundingClientRect().right])}; })()`);
    assert(initial.parts > 70, `${width}: missing physical parts`);
    assert(await evaluate("window.__horologium.submariner.parts.every(p=>!p.name.includes('_')&&!p.text.startsWith('Отдельный элемент'))"), `${width}: missing part labels or explanations`);
    assert(initial.scrollWidth <= width + 1, `${width}: horizontal overflow`);
    await shot(`${width}-assembled`);
    if (process.env.MATERIAL_PROBE) console.log(await evaluate(`window.__horologium.submariner.parts.filter(p=>/Вставка|Циферблат/.test(p.name)).map(p=>({name:p.name,raw:p.node.userData.name,materials:p.materials.map(m=>({name:m.name,map:!!m.map,channel:m.map?.channel,repeat:m.map?.repeat,offset:m.map?.offset,imageWidth:m.map?.image?.width})),children:p.node.children.length}))`));
    const pick = await evaluate(`(() => {const s=window.__horologium.submariner,p=s.parts.find(p=>p.name==='Стекло'),v=p.center.clone().project(s.camera),r=s.canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};})()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...pick, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...pick, button: "left", clickCount: 1 });
    assert(await evaluate("!document.querySelector('.sub-inspector').hidden"), `${width}: clicking physical geometry did not open its description`);
    await evaluate("document.querySelector('.sub-inspector__close').click()");
    // Actual controls drive every stage; a photo cannot pass these checks.
    for (const step of [2, 4, 7]) {
      await evaluate(`document.querySelector('[data-sub-step="${step}"]').click()`);
      await sleep(1600);
      assert(await evaluate(`document.querySelector('[data-sub-step="${step}"]').getAttribute('aria-current')==='step'`), `${width}: stage ${step} did not activate`);
      await shot(`${width}-step-${step}`);
    }
    await evaluate("document.querySelector('.sub-catalogue').open=true;document.querySelector('.sub-catalogue input').value='Баланс';document.querySelector('.sub-catalogue input').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-sub-part]').click();document.querySelector('.sub-inspector__isolate').click()");
    await sleep(1400);
    assert(await evaluate("window.__horologium.submariner.parts.filter(p=>p.node.visible).length===1"), `${width}: isolate is not a single physical part`);
    await shot(`${width}-part`);
    if (width === 1440) {
      await evaluate("document.querySelector('.sub-inspector__close').click();document.querySelector('.sub-catalogue input').value='Вставка';document.querySelector('.sub-catalogue input').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-sub-part]').click();document.querySelector('.sub-inspector__isolate').click()");
      await sleep(1200);
      await shot("1440-ceramic-detail");
    }
    await evaluate(`document.querySelector('.sub-inspector__close').click();document.querySelector('[data-sub-step="0"]').click()`);
    await sleep(2000);
    const frame = await evaluate("window.__horologium.submariner.renderer.info.render.frame");
    await sleep(900);
    assert(await evaluate(`window.__horologium.submariner.renderer.info.render.frame<=${frame + 1}`), `${width}: idle viewer keeps rendering`);
    await evaluate("window.__oldSub=window.__horologium.submariner;window.__horologium.router.go('/watch/rolex-submariner-date')");
    await waitFor("location.pathname==='/watch/rolex-submariner-date'");
    assert(await evaluate("window.__oldSub.dead && !window.__horologium.submariner"), `${width}: scene not disposed on navigation`);
    reports.push(initial);
    console.log(`${width}px: checked assembly, stages, catalogue, isolation, idle rendering and navigation`);
  }
  // A reduced-motion, Save-Data visitor can read first and opt into 3D explicitly.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(navigator.connection,'saveData',{value:true,configurable:true})" });
  await send("Page.navigate", { url: `${base}/watch/rolex-submariner` });
  await waitFor("!!document.querySelector('.sub-workshop') && !document.querySelector('#intro')");
  await evaluate("document.querySelector('.sub-workshop').scrollIntoView({block:'start',behavior:'instant'})");
  await sleep(800);
  assert(!(await evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('submariner.glb'))")), "Save-Data: automatic model download");
  await evaluate("document.querySelector('[data-sub-load]').click()");
  await waitFor("!!window.__horologium?.submariner?.parts.length");
  await evaluate("document.querySelector('[data-sub-step=\"7\"]').click()");
  await waitFor("window.__horologium.submariner.t===1");
  assert(await evaluate("window.__horologium.submariner.t===window.__horologium.submariner.targetT"), "Reduced motion: viewer keeps interpolating");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.result.identifier });
  writeFileSync(join(out, "report.json"), JSON.stringify({ reports, problems }, null, 2));
  console.log(JSON.stringify({ reports, problems }, null, 2));
} catch (e) { problems.push(e.stack); console.error(e); }
finally { ws?.close(); chrome.kill(); }
process.exitCode = problems.length ? 1 : 0;

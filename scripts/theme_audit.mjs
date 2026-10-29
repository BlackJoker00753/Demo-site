// Browser checks for readable themes, persistent preferences and mobile TCO controls.
// CHROME=/usr/bin/chromium node scripts/theme_audit.mjs <base> <output-directory>
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const base = process.argv[2] ?? "http://127.0.0.1:8765";
const out = process.argv[3] ?? "/tmp/horologium-themes";
mkdirSync(out, { recursive: true });
const port = 9800 + Math.floor(Math.random() * 200);
const chrome = spawn(process.env.CHROME ?? "chromium", ["--headless=new", "--no-sandbox", "--enable-unsafe-swiftshader", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "horo-theme-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const problems = [], reports = [];
let ws;
try {
  let tabs;
  for (let i = 0; i < 80; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); }
  }
  ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") problems.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) problems.push(`HTTP ${message.params.response.status} ${message.params.response.url}`);
  };
  const send = (method, params = {}) => new Promise(resolve => {
    const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const result = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result;
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const assert = (condition, description) => { if (!condition) problems.push(description); };
  const waitFor = async expression => {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(250); }
    throw new Error(`Timeout: ${expression}`);
  };
  const shot = async name => {
    const result = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${name}.png`), Buffer.from(result.result.data, "base64"));
  };
  const openCalculator = async () => {
    await waitFor("!!document.querySelector('#watch-tco') && !document.querySelector('#intro')");
    await evaluate("document.querySelector('#watch-tco').open=true");
    await waitFor("!!document.querySelector('[data-cond]')");
    await evaluate("document.querySelector('.tco-options').open=true");
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Page.navigate", { url: `${base}/watch/rolex-submariner` });
  await openCalculator();
  assert(await evaluate("document.documentElement.dataset.theme==='light'"), "fresh visit is not light");
  for (const width of [320, 390, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    for (const theme of ["light", "dark"]) {
      await evaluate(`if(document.documentElement.dataset.theme!==${JSON.stringify(theme)}) document.querySelector('[data-theme-toggle]').click()`);
      await evaluate("document.querySelector('[data-cond=mint_fullset]')?.click()");
      await evaluate("document.querySelector('[data-cond]').closest('.tco-control-group').scrollIntoView({block:'center',behavior:'instant'})");
      await sleep(500);
      const check = await evaluate(`(() => {
        const contrast = (a,b) => {
          const luminance = c => { const v=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2]; };
          const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
        };
        const issues=[];
        for (const button of document.querySelectorAll('.tco-pill')) {
          const b=button.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(button);const text=r.getBoundingClientRect();
          if(b.height<44 || text.top<b.top || text.bottom>b.bottom || text.right>b.right) issues.push(button.innerText);
        }
        const nav=[...document.querySelectorAll('.nav__brand,.nav__actions > *')].filter(e=>e.getBoundingClientRect().width).map(e=>e.getBoundingClientRect());
        const body=getComputedStyle(document.body),root=getComputedStyle(document.documentElement);
        const bench=document.querySelector('.sub-workshop__body'),bs=getComputedStyle(bench);
        return {width:innerWidth,theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth>innerWidth+1,issues,
          navFits:nav.every((b,i)=>b.right<=innerWidth+1&&(!i||b.left>=nav[i-1].right-1)),
          contrast:contrast(body.color,body.backgroundColor),mutedContrast:contrast(root.getPropertyValue('--text-2').trim().startsWith('#')?'rgb('+root.getPropertyValue('--text-2').trim().slice(1).match(/../g).map(x=>parseInt(x,16)).join(',')+')':body.color,body.backgroundColor),
          workbench:bs.backgroundColor,benchContrast:contrast(bs.color,bs.backgroundColor),
          selected:document.querySelectorAll('[data-cond][aria-pressed=true]').length,
          themeButton:document.querySelector('[data-theme-toggle]').getAttribute('aria-label')};
      })()`);
      reports.push(check);
      assert(!check.overflow && check.navFits, `${width}/${theme}: overflow or navigation overlap`);
      assert(!check.issues.length, `${width}/${theme}: clipped controls: ${check.issues.join("; ")}`);
      assert(check.contrast >= 4.5 && check.mutedContrast >= 4.5 && check.benchContrast >= 4.5, `${width}/${theme}: text contrast`);
      assert(check.workbench === "rgb(229, 232, 235)", `${width}/${theme}: dark workbench`);
      assert(check.selected === 1, `${width}/${theme}: ambiguous condition selection`);
      if (width === 390 || width === 1440) await shot(`${width}-${theme}-condition`);
      for (const attr of ["cond", "tier", "wear", "years"]) {
        const values = await evaluate(`[...document.querySelectorAll('[data-${attr}]')].map(e=>e.dataset.${attr})`);
        for (const value of values) {
          const selector = `[data-${attr}="${value}"]`;
          await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).click()`);
          assert(await evaluate(`document.activeElement?.matches(${JSON.stringify(selector)}) && document.activeElement.getAttribute('aria-pressed')==='true'`), `${width}/${theme}: ${selector} did not preserve focus or selection`);
        }
      }
    }
  }
  await send("Page.reload");
  await openCalculator();
  assert(await evaluate("document.documentElement.dataset.theme==='dark'"), "theme preference lost on reload");
  await evaluate("window.__horologium.router.go('/watches')");
  await waitFor("location.pathname==='/watches' && !!document.querySelector('h1')");
  assert(await evaluate("document.documentElement.dataset.theme==='dark'"), "theme preference lost during navigation");
  await evaluate("document.querySelector('[data-theme-toggle]').click();window.__horologium.router.go('/watch/rolex-submariner')");
  await waitFor("!!document.querySelector('.sub-workshop')");
  await evaluate("document.querySelector('.sub-workshop').scrollIntoView({block:'start',behavior:'instant'})");
  await waitFor("!!window.__horologium?.submariner?.parts.length");
  for (const width of [1440, 768, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    await evaluate("(() => {document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'});window.__themeAuditScene=window.__horologium.submariner;window.__horologium.submariner.setT(1,true);const slider=document.querySelector('.sub-progress input');slider.value=1000;slider.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await sleep(1200);
    for (const theme of ["light", "dark"]) {
      await evaluate(`if(document.documentElement.dataset.theme!==${JSON.stringify(theme)})document.querySelector('[data-theme-toggle]').click()`);
      await sleep(300);
      await shot(`${width}-${theme}-tray`);
      assert(await evaluate("window.__themeAuditScene===window.__horologium.submariner && window.__horologium.submariner.t===1"), "changing theme recreated or reset the workshop");
    }
  }
  const blocked = await send("Page.addScriptToEvaluateOnNewDocument", { source: "Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}" });
  await send("Page.reload");
  await openCalculator();
  assert(await evaluate("document.documentElement.dataset.theme==='light'"), "blocked storage did not fall back to light");
  await evaluate("document.querySelector('[data-theme-toggle]').click()");
  assert(await evaluate("document.documentElement.dataset.theme==='dark'"), "toggle fails with blocked storage");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: blocked.result.identifier });
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    for (const path of ["/", "/country/switzerland", "/brand/rolex", "/watches", "/tco", "/complication/chronograph", "/world-time"]) {
      await evaluate(`window.__horologium.router.go(${JSON.stringify(path)})`);
      await waitFor(`location.pathname===${JSON.stringify(path)} && !!document.querySelector('h1')`);
      await evaluate("if(document.documentElement.dataset.theme!=='light')document.querySelector('[data-theme-toggle]').click();window.scrollTo({top:0,behavior:'instant'})");
      await sleep(1800);
      assert(await evaluate(`document.documentElement.scrollWidth<=${width}+1 && document.querySelector('.nav__actions').getBoundingClientRect().right<=${width}+1`), `${width}/${path}: page or navigation overflow`);
      await shot(`${width}-light-${path.replaceAll('/', '_') || 'home'}`);
    }
  }
} catch (error) { problems.push(error.stack); }
finally { ws?.close(); chrome.kill(); }
writeFileSync(join(out, "report.json"), JSON.stringify({ reports, problems }, null, 2));
console.log(JSON.stringify({ reports, problems }, null, 2));
if (problems.length) process.exitCode = 1;

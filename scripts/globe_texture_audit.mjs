// High-resolution imagery is demand loaded on a capable desktop and skipped with Save-Data.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditBrowser, sleep } from "./audit_browser.mjs";
const base = process.argv[2] ?? "http://127.0.0.1:8765";
const out = process.argv[3] ?? "/tmp/horologium-globe-textures";
const browser = await auditBrowser(out);
const { send, evaluate, wait, assert, problems } = browser;
const reports = [];
let injection;
try {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, screenWidth: 1440, screenHeight: 1000, deviceScaleFactor: 1, mobile: false });
  for (const saveData of [false, true]) {
    if (injection) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection });
    const response = await send("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(navigator,'hardwareConcurrency',{value:8,configurable:true});Object.defineProperty(navigator,'deviceMemory',{value:8,configurable:true});Object.defineProperty(navigator.connection,'saveData',{value:${saveData},configurable:true})` });
    injection = response.result.identifier;
    await send("Page.navigate", { url: base + "/" });
    await wait("!!window.__horologium?.globe.scene?.ready && !document.querySelector('#intro')");
    await sleep(800);
    assert(await evaluate("screen.width===1440 && screen.height===1000"), "test did not emulate a large desktop");
    assert(await evaluate("!performance.getEntriesByType('resource').some(r=>r.name.includes('day-8k'))"), "overview downloaded 8K imagery");
    await evaluate("__horologium.router.go('/country/switzerland')");
    await wait("__horologium.globe.scene.focused?.iso_a3==='CHE' && !!__horologium.globe.scene.countryLayer");
    if (!saveData) await wait("__horologium.globe.scene.highDay===true");
    else await sleep(1500);
    const result = await evaluate("({imageWidth:__horologium.globe.scene.earthUniforms.uDay.value.image.width,requests:performance.getEntriesByType('resource').filter(r=>r.name.includes('day-8k')).length,saveData:navigator.connection.saveData})");
    assert(saveData ? result.requests===0 && result.imageWidth===2048 : result.requests===1 && result.imageWidth===8192, "texture quality does not follow the visitor's intent or data budget");
    reports.push(result);
  }
} catch (error) { problems.push(error.stack); }
finally { await browser.close(); }
writeFileSync(join(out, "report.json"), JSON.stringify({ reports, problems }, null, 2));
console.log(JSON.stringify({ reports, problems }, null, 2));
if (problems.length) process.exitCode = 1;

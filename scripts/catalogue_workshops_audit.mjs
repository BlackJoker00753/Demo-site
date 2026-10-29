// CHROME=/usr/bin/chromium node scripts/catalogue_workshops_audit.mjs <base> <output>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditBrowser, sleep } from "./audit_browser.mjs";
const base = process.argv[2] || "http://127.0.0.1:8765";
const out = process.argv[3] || "/tmp/horologium-catalogue-audit";
const manifest = JSON.parse(readFileSync("frontend/assets/workshop/catalogue/index.json"));
const browser = await auditBrowser(out);
const { send, evaluate, wait, assert, shot, problems } = browser;
const reports = [];
const representative = ["omega-speedmaster-moonwatch", "rolex-gmt-master-ii-pepsi", "cartier-tank-must", "casio-g-shock-dw5600", "grand-seiko-snowflake", "citizen-promaster-diver", "casio-g-shock-gbd-h2000", "rolex-cosmograph-daytona", "breguet-classique-tourbillon-5367"];
const requested = new Set((process.env.ONLY || "").split(",").filter(Boolean));
const slugs = Object.keys(manifest.models).filter(slug => !requested.size || requested.has(slug));
let first = true;
const go = async (slug, width = 1440) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
  if (first) { await send("Page.navigate", { url: `${base}/watch/${slug}` }); first = false; }
  else await evaluate(`window.__oldWorkshop=window.__horologium.workshop;window.__horologium.router.go('/watch/${slug}')`);
  await wait(`location.pathname==='/watch/${slug}' && !!document.querySelector('.sub-workshop') && !document.querySelector('#intro') && !window.__horologium.workshop`);
  assert(!await evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('/workshop/build-model')||r.name.includes('GLTFExporter'))"), `${slug}: offline generator downloaded`);
  await evaluate("document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'})");
  await wait("!!window.__horologium.workshop?.parts.length");
  assert(await evaluate("!window.__oldWorkshop || window.__oldWorkshop.dead"), `${slug}: previous scene still alive`);
};
const crop = async (slug, state) => {
  const clip = await evaluate("(()=>{const r=document.querySelector('.sub-stage').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
  const response = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
  writeFileSync(join(out, `${slug}-${state}.png`), Buffer.from(response.result.data, "base64"));
};
try {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (!process.env.MOBILE_ONLY) for (const slug of slugs) {
    await go(slug);
    const model = await evaluate(`(()=>{
      const s=window.__horologium.workshop;
      const finite=s.parts.every(p=>[...p.home.toArray(),...p.size.toArray()].every(Number.isFinite)&&p.size.length()>0);
      const names=s.parts.every(p=>p.name&&p.text&&p.material);
      for(const t of [.09,1/7,.24,2/7,.37,3/7,.51,4/7,.66,5/7,.8,6/7,1])s.setT(t,true);
      const tray=s.parts.every(p=>p.node.position.distanceTo(p.tray)<1e-5);
      s.setT(0,true);s.focusMotion(true);
      const assembled=s.parts.every(p=>p.node.position.distanceTo(p.home)<1e-5&&p.node.quaternion.angleTo(s.scene.quaternion)<1e-5);
      return {parts:s.parts.length,finite,names,tray,assembled,overflow:document.documentElement.scrollWidth>innerWidth+1,calls:s.renderer.info.render.calls};
    })()`);
    for (const key of ["finite", "names", "tray", "assembled"]) assert(model[key], `${slug}: ${key} failed`);
    assert(!model.overflow, `${slug}: horizontal overflow`);
    assert(model.parts === manifest.models[slug].parts, `${slug}: physical parts missing`);
    await sleep(80);await crop(slug, "assembled");
    if (representative.includes(slug)) {
      await evaluate("window.__horologium.workshop.setT(1,true);window.__horologium.workshop.focusMotion(true)");
      await sleep(100);await crop(slug,"tray");
    }
    reports.push({slug,width:1440,...model});console.log(`${slug}: ${model.parts} parts`);
    await evaluate("performance.clearResourceTimings()");
  }
  for (const width of [768,390]) for (const slug of representative.filter(s=>slugs.includes(s))) {
    await go(slug,width);
    for (const theme of ["light","dark"]) {
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await evaluate("window.__horologium.workshop.setT(1,true);window.__horologium.workshop.focusMotion(true)");
      await sleep(150);
      assert(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"), `${width}/${slug}/${theme}: overflow`);
      await shot(`${width}-${slug}-${theme}`);
    }
    await evaluate("document.querySelector('.sub-catalogue').open=true;document.querySelector('.sub-catalogue input').value='стекло';document.querySelector('.sub-catalogue input').dispatchEvent(new Event('input'))");
    assert(await evaluate("document.querySelectorAll('[data-sub-part]').length===1"),`${width}/${slug}: search glass`);
    await evaluate("document.querySelector('[data-sub-part]').click();document.querySelector('.sub-inspector__isolate').click()");
    assert(await evaluate("window.__horologium.workshop.parts.filter(p=>p.node.visible).length===1"),`${width}/${slug}: isolation`);
    await evaluate("document.querySelector('.sub-inspector__close').click();document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'})");
    await sleep(700);
    const frame=await evaluate("window.__horologium.workshop.renderer.info.render.frame");await sleep(350);
    assert(await evaluate(`window.__horologium.workshop.renderer.info.render.frame===${frame}`),`${width}/${slug}: idle rendering`);
    reports.push({slug,width,mobile:true});
  }
  // A fresh Save-Data visit leaves 3D opt-in; explicit loading remains functional.
  const slug=slugs[0];
  await send("Page.addScriptToEvaluateOnNewDocument",{source:"Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true})"});
  await send("Page.navigate",{url:`${base}/watch/${slug}`});
  await wait("!!document.querySelector('.sub-workshop')&&!document.querySelector('#intro')");
  await evaluate("document.querySelector('.sub-workshop').scrollIntoView({block:'center',behavior:'instant'})");await sleep(600);
  assert(!await evaluate("performance.getEntriesByType('resource').some(r=>r.name.endsWith('.glb'))"),"Save-Data downloaded GLB automatically");
  await evaluate("document.querySelector('[data-sub-load]').click()");await wait("!!window.__horologium.workshop?.parts.length");
  await evaluate("window.__oldWorkshop=window.__horologium.workshop;window.__horologium.router.go('/tco')");
  await wait("!!document.querySelector('#tco-select-watch')");
  assert(await evaluate("window.__oldWorkshop.dead&&!window.__horologium.workshop"),"scene not disposed on leave");
} catch(error) { problems.push(error.stack);await shot("failure"); }
finally {writeFileSync(join(out,"report.json"),JSON.stringify({reports,problems},null,2));await browser.close();}
console.log(problems.length?problems.join("\n"):"Чисто: каталог, раскладка, сборка, размеры, темы, Save-Data и освобождение сцен.");
if(problems.length)process.exitCode=1;

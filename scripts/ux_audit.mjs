import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TCO_PRESETS } from "../frontend/js/core/tco.js";
import { auditBrowser, sleep } from "./audit_browser.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:8765";
const out = process.argv[3] ?? "/tmp/horologium-ux";
const browser = await auditBrowser(out);
const { send, evaluate, wait, shot, assert, problems } = browser;
const reports = [];
const go = async path => {
  await evaluate(`window.__horologium.router.go(${JSON.stringify(path)})`);
  await wait(`window.__horologium.router.current?.name!=='error' && location.pathname+location.search===${JSON.stringify(path)} && !!document.querySelector('h1')`);
  await sleep(500);
};
try {
  await send("Page.navigate", { url: `${base}/tco` });
  await wait("!!document.querySelector('#tco-select-watch') && !document.querySelector('#intro')");
  for (const [slug] of TCO_PRESETS) {
    await go(`/tco?watch=${slug}`);
    await wait(`document.querySelector('#tco-select-watch')?.value===${JSON.stringify(slug)} && !!document.querySelector('#tco-net-tco-val')`);
    assert(await evaluate(`document.querySelector('.tco-selected-info a')?.getAttribute('href')===${JSON.stringify(`/watch/${slug}`)}`), `${slug}: another watch was substituted`);
    reports.push({ preset: slug, selected: await evaluate("document.querySelector('.tco-selected-info h4').innerText") });
  }
  await go("/tco?watch=unknown-watch");
  assert(await evaluate("!!document.querySelector('.tco-selection-error') && !document.querySelector('.tco-box') && document.querySelector('#tco-select-watch').value===''") , "unknown selection silently rendered a calculator");
  await evaluate("document.querySelector('#tco-select-watch').value='rolex-submariner';document.querySelector('#tco-select-watch').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait("!!document.querySelector('#tco-net-tco-val')");
  await evaluate("document.querySelector('.tco-options').open=true");
  await evaluate("document.querySelector('#tco-insurance-toggle').click();document.querySelector('[data-years=\"5\"]').click()");
  const reconciliation = await evaluate(`({summary:document.querySelector('#tco-net-tco-val').innerText.trim(),row:document.querySelector('.is-selected-year td:nth-child(5)').innerText.trim()})`);
  assert(reconciliation.summary === reconciliation.row, "visible table does not match visible summary");
  reports.push({ reconciliation });
  for (const width of [320, 390, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    await go("/movements");
    assert(await evaluate("document.querySelector('#msearch').getBoundingClientRect().top<innerHeight"), `${width}: calibre search below first screen`);
    reports.push({ width, calibreSearchTop: await evaluate("Math.round(document.querySelector('#msearch').getBoundingClientRect().top)") });
    if (width === 390) {
      await evaluate("document.querySelector('#esc-comp').closest('details').open=true;document.querySelector('#comp-play-btn').click()");
      await wait("document.querySelector('#comp-play-btn').classList.contains('is-playing')");
      await evaluate("document.querySelector('#esc-comp').closest('details').open=false");
      await wait("!document.querySelector('#comp-play-btn').classList.contains('is-playing')");
    }
    await evaluate("document.querySelector('.standards-block').open=true;document.querySelector('.standards-block').scrollIntoView({block:'center',behavior:'instant'})");
    await sleep(700);
    for (const theme of ["light", "dark"]) {
      await evaluate(`if(document.documentElement.dataset.theme!==${JSON.stringify(theme)})document.querySelector('[data-theme-toggle]').click()`);
      await sleep(250);
      const box = await evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})");
      assert(box.scroll <= width + 1 && box.client === width, `${width}/${theme}: movement page overflow ${box.scroll}`);
      reports.push({ width, theme, ...box });
      if (width === 390 || width === 1440) await shot(`${width}-${theme}-movements`);
    }
    await go("/watches");
    assert(await evaluate("!document.querySelector('#catalog-filter-details').open && document.querySelector('.wcard').getBoundingClientRect().top<innerHeight"), `${width}: first watch hidden below filters`);
    assert(await evaluate("document.querySelectorAll('#catalog-grid .wcard').length===12"), `${width}: initial watch batch`);
    reports.push({ width, catalogueFirstCardTop: await evaluate("Math.round(document.querySelector('.wcard').getBoundingClientRect().top)") });
    await evaluate("document.querySelector('#catalog-filter-details').open=true;document.querySelector('[data-material=steel]').click();document.querySelector('#catalog-filter-details').open=false");
    assert(await evaluate("location.search.includes('material=steel') && document.querySelector('[data-material=steel]').getAttribute('aria-pressed')==='true' && !document.querySelector('#catalog-active').hidden"), `${width}: filter state not visible or not preserved`);
    await evaluate("document.querySelector('#catalog-active button').click()");
    assert(await evaluate("!location.search && document.querySelector('#catalog-active').hidden"), `${width}: removing active filter failed`);
    await evaluate("document.querySelector('#catalog-more').click()");
    assert(await evaluate("document.querySelectorAll('#catalog-grid .wcard').length===24 && location.search.includes('shown=24')"), `${width}: show more did not preserve batch in URL`);
    await go("/watches?shown=24");
    assert(await evaluate("document.querySelectorAll('#catalog-grid .wcard').length===24"), `${width}: visible batch lost after navigation`);
    await evaluate("document.querySelector('#catalog-search').value='zzzz-not-a-watch';document.querySelector('#catalog-search').dispatchEvent(new Event('input',{bubbles:true}))");
    assert(await evaluate("!!document.querySelector('.catalog-empty button')"), `${width}: empty catalogue has no recovery`);
    await evaluate("document.querySelector('[data-clear-filters]').click()");
    await evaluate("window.scrollTo({top:0,behavior:'instant'})");
    await sleep(1400);
    assert(await evaluate("+getComputedStyle(document.querySelector('.wcard')).opacity>0.9"), `${width}: filtered cards remain invisible`);
    if (width === 390 || width === 1440) await shot(`${width}-catalogue`);
    for (const path of ["/learn", "/methodology"]) {
      await go(path);
      assert(await evaluate(`document.documentElement.scrollWidth<=${width}+1`), `${width}/${path}: overflow`);
      if (width === 390 || width === 1440) await shot(`${width}-${path.slice(1)}`);
    }
  }
  await go("/tco?watch=omega-speedmaster-moonwatch");
  await evaluate("document.querySelector('.tco-options').open=true;document.querySelector('#tco-price-input').value=10000;document.querySelector('#tco-price-input').dispatchEvent(new Event('change',{bubbles:true}))");
  await evaluate("document.querySelector('#tco-insurance-toggle').checked=false;document.querySelector('#tco-insurance-toggle').click()");
  const beforeMethod = await evaluate("document.querySelector('#tco-net-tco-val').innerText.trim()");
  assert(await evaluate("/[,.][0-9]{2}/.test(document.querySelector('#tco-day-val').innerText)"), "daily cost lost its cents");
  await evaluate("document.querySelector('.tco-assumptions').open=true;document.querySelector('.tco-assumptions a').click()");
  await wait("location.pathname==='/methodology' && !!document.querySelector('.methodology-page')");
  await evaluate("history.back()");
  await wait("location.pathname==='/tco' && !!document.querySelector('#tco-net-tco-val')");
  assert(await evaluate(`document.querySelector('#tco-price-input').value==='10000' && document.querySelector('#tco-insurance-toggle').checked && document.querySelector('#tco-net-tco-val').innerText.trim()===${JSON.stringify(beforeMethod)}`), "returning from methodology lost the scenario");
  await go("/learn");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await evaluate("document.querySelectorAll('.learning-steps a')[2].click()");
  await wait("location.pathname==='/watch/rolex-submariner' && !!window.__horologium?.submariner?.parts.length");
  assert(await evaluate("location.search==='?stage=4' && Math.abs(window.__horologium.submariner.t-4/7)<1e-6"), "learning link opened the wrong mechanical stage");
  assert(await evaluate("!document.querySelector('#watch-tco').open && !document.querySelector('#tco-watch-mount .tco-box')"), "closed watch calculator mounted eagerly");
  await evaluate("document.querySelector('#watch-tco').open=true");
  await wait("!!document.querySelector('#tco-watch-mount .tco-box')");
  await evaluate("document.querySelector('#esc-player').closest('details').open=true;document.querySelector('#esc-toggle-btn').click()");
  await wait("document.querySelector('#esc-toggle-btn').classList.contains('is-playing')");
  await evaluate("document.querySelector('#esc-player').closest('details').open=false");
  await wait("!document.querySelector('#esc-toggle-btn').classList.contains('is-playing')");
  await evaluate("document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'})");
  await shot("workshop-learning");
  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 700 });
    for (const slug of ["rolex-gmt-master-ii-pepsi", "longines-spirit-zulu-time"]) {
      await go(`/watch/${slug}`);
      await evaluate("document.querySelector('[data-jump=explode]').click()");
      await sleep(1600);
      assert(await evaluate("document.querySelector('#explode').getBoundingClientRect().top >= document.querySelector('.watch-nav').getBoundingClientRect().bottom-1"), `${width}/${slug}: jump hides section under navigation`);
      await evaluate("scrollTo({top:document.querySelector('.wexplode__pin').getBoundingClientRect().top+scrollY,behavior:'instant'})");
      assert(await evaluate("document.querySelector('.wexplode__head').getBoundingClientRect().top >= document.querySelector('.watch-nav').getBoundingClientRect().bottom-1"), `${width}/${slug}: legacy viewer controls behind navigation`);
      if (slug === "rolex-gmt-master-ii-pepsi") await shot(`${width}-legacy-viewer`);
    }
  }
  await go("/tco?watch=rolex-submariner");
  await evaluate("document.querySelector('.tco-options').open=true;document.querySelector('.tco-control-group').scrollIntoView({block:'start',behavior:'instant'})");
  await shot("tco-scenario");
  await send("Emulation.setEmulatedMedia", { features: [] });
  await evaluate("document.querySelector('#search-open').click()");
  await wait("document.activeElement?.id==='search-input' && document.querySelector('#view').inert");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 });
  assert(await evaluate("document.querySelector('#search').contains(document.activeElement) && document.querySelector('#view').inert"), "modal search releases keyboard focus into background");
  await evaluate("document.querySelector('#search-close').click();document.querySelector('#cur-btn').click()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  assert(await evaluate("document.querySelector('#cur-dropdown').hidden && !document.querySelector('#view').inert"), "Escape did not close currency or search left page inert");
} catch (error) { problems.push(error.stack); }
finally { await browser.close(); }
writeFileSync(join(out, "report.json"), JSON.stringify({ reports, problems }, null, 2));
console.log(JSON.stringify({ reports, problems }, null, 2));
if (problems.length) process.exitCode = 1;

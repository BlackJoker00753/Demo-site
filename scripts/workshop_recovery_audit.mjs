// Save-Data, contained reference photo, failed download, retry, animation and geometry picking.
import {auditBrowser,sleep} from './audit_browser.mjs';
import {writeFileSync} from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8765';
const out=process.argv[3]||'/tmp/horo-workshop-recovery';const b=await auditBrowser(out);let results={};
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true})"});
 await b.send('Page.navigate',{url:base+'/watch/omega-speedmaster-moonwatch'});
 await b.wait("!!document.querySelector('.sub-workshop')&&!document.querySelector('#intro')");
 await b.evaluate("document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'})");await sleep(400);
 results.poster=await b.evaluate("(()=>{const p=document.querySelector('.sub-stage__poster .photo'),s=document.querySelector('.sub-stage').getBoundingClientRect(),r=p.getBoundingClientRect();return {inside:r.bottom<=s.bottom&&r.top>=s.top&&r.right<=s.right,modelRequests:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.glb')).length}})()");
 b.assert(results.poster.inside&&results.poster.modelRequests===0,'Save-Data photo overflows or model downloaded');await b.shot('390-poster');
 await b.evaluate("window.__originalFetch=fetch;window.fetch=(...args)=>String(args[0]).endsWith('omega-speedmaster-moonwatch.glb')?Promise.reject(Error('Expected offline retry probe')):window.__originalFetch(...args);document.querySelector('[data-sub-load]').click()");
 await b.wait("document.querySelector('[data-sub-load]').textContent==='Повторить загрузку'");
 b.assert(await b.evaluate("document.querySelector('.sub-stage canvas').hidden&&!document.querySelector('.sub-stage__poster').hidden&&document.querySelectorAll('[data-sub-part]').length===0"),'failure shows fake geometry or hides reference');
 await b.shot('390-retry');await b.evaluate("window.fetch=window.__originalFetch;document.querySelector('[data-sub-load]').click()");await b.wait('!!window.__horologium.workshop?.parts.length');
 await b.evaluate("document.querySelector('.sub-workshop__body').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('[data-sub-next]').click()");
 await b.wait('window.__horologium.workshop.t>0.005');
 results.motion=await b.evaluate("({progress:window.__horologium.workshop.t,moving:window.__horologium.workshop.moving})");b.assert(results.motion.progress<1/7&&results.motion.moving,'Next skipped physical movement');
 await b.evaluate("document.querySelector('[data-sub-play]').click()");const paused=await b.evaluate('window.__horologium.workshop.t');await sleep(300);
 b.assert(await b.evaluate(`window.__horologium.workshop.t===${paused}&&!window.__horologium.workshop.moving`),'pause changed pose');
 await b.evaluate("window.__horologium.workshop.setT(0,true);window.__horologium.workshop.view('front',true)");await sleep(200);
 const pick=await b.evaluate("(()=>{const s=window.__horologium.workshop,p=s.parts.find(p=>p.role==='crystal_hesalite'),v=p.center.clone().project(s.camera),r=s.canvas.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2}})()");
 await b.send('Input.dispatchMouseEvent',{type:'mousePressed',...pick,button:'left',clickCount:1});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',...pick,button:'left',clickCount:1});
 b.assert(await b.evaluate("!document.querySelector('.sub-inspector').hidden"),'geometry picking did not open explanation');
 results.errors=b.problems.filter(p=>!p.includes('Expected offline retry probe'));
}catch(e){results.errors=[...b.problems,e.stack];await b.shot('failure');}
finally{writeFileSync(out+'/report.json',JSON.stringify(results,null,2));await b.close();}
console.log(JSON.stringify(results));if(results.errors?.length)process.exitCode=1;

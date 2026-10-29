import test from 'node:test';
import assert from 'node:assert/strict';
import { workshopProfile } from '../frontend/js/workshop/profiles.js';
import { planParts, samplePart } from '../frontend/js/ui/submariner-motion.js';
const watch=(type,complications=[],finish='matte')=>({movement:{type,features:[]},complications,render:{dial:{finish}}});
test('API complication objects identify chronograph, split seconds and tourbillon',()=>{
 const p=workshopProfile(watch('manual',[{slug:'chronograph'},{slug:'tourbillon'}]));
 assert.equal(p.family,'manual-chronograph');assert.equal(p.tourbillon,true);
 assert.equal(workshopProfile(watch('automatic',['split-seconds'])).chronograph,true);
});
test('power and regulator explanations follow actual architecture',()=>{
 assert.match(workshopProfile(watch('manual')).steps[3][0],/Ручной/);
 assert.match(workshopProfile(watch('spring_drive')).steps[4][1],/Анкерного спуска нет/);
 assert.match(workshopProfile(watch('solar')).steps[3][0],/аккумулятор/);
 assert.equal(workshopProfile(watch('quartz',[],'lcd')).family,'digital');
 assert.equal(workshopProfile(watch('smart',[],'lcd')).family,'smart');
});
test('caseback and bezel fasteners clear before connected pieces move',()=>{
 for(const [stage,role,name] of [[2,'caseback','Задняя крышка'],[6,'bezel','Безель']]){
  const parts=[{id:'cover',name,stage,role},...Array.from({length:8},(_,i)=>({id:`s${i}`,name:`Винт ${i}`,role:'screw',stage,thread:{}}))];
  const plans=planParts(parts),cover=plans.get('cover');
  assert.ok(cover.start>Math.max(...parts.slice(1).map(p=>plans.get(p.id).exitEnd)));
  const midpoint=(stage-1+cover.start-.01)/7;
  assert.equal(samplePart(cover,midpoint).travel,0);
 }
});

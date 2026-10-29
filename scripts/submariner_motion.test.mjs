import test from "node:test";
import assert from "node:assert/strict";
import { timelineSeconds, timelineProgress, TOTAL_SECONDS, planParts, samplePart, motionShot, motionCaption } from "../frontend/js/ui/submariner-motion.js";

const part = (name, stage, threaded = false) => ({ id: name, name, stage, thread: threaded ? {} : null });
const fixture = [
  part("Винт 12.1", 1, true), part("Винт 6.6", 1, true), part("Звено 12.1: центр", 1),
  part("Винт ротора", 3, true), part("Винт моста автоподзавода 1", 3, true),
  part("Ротор Perpetual", 3), part("Мост автоподзавода", 3),
  part("Винт моста баланса 1", 4, true), part("Мост баланса", 4), part("Баланс", 4),
  part("Барабан", 5), part("Барабан: крышка", 5), part("Заводная пружина", 5), part("Вал барабана", 5),
];
const plans = planParts(fixture);

test("timeline has real, reversible seconds at every stage and scrub position", () => {
  assert.ok(TOTAL_SECONDS >= 45);
  for (let i = 0; i <= 1000; i++) assert.ok(Math.abs(timelineProgress(timelineSeconds(i / 1000)) - i / 1000) < 1e-12);
});

test("all bracelet screws clear before links separate", () => {
  const screws = fixture.filter(p => p.stage === 1 && p.thread).map(p => plans.get(p.id));
  assert.ok(plans.get("Звено 12.1: центр").start > Math.max(...screws.map(p => p.exitEnd)));
  const screw = plans.get("Винт 12.1");
  const halfTurn = samplePart(screw, (screw.start + screw.turnEnd) / 2 / 7);
  assert.ok(halfTurn.spin > 0 && halfTurn.spin < 1);
  assert.equal(halfTurn.exit, 0);
  assert.equal(halfTurn.travel, 0);
});

test("retaining screws and bridges precede the parts they retain", () => {
  assert.ok(plans.get("Винт ротора").exitEnd < plans.get("Ротор Perpetual").start);
  assert.ok(plans.get("Винт моста автоподзавода 1").exitEnd < plans.get("Мост автоподзавода").start);
  assert.ok(plans.get("Винт моста баланса 1").exitEnd < plans.get("Мост баланса").start);
  assert.ok(plans.get("Мост баланса").end < plans.get("Баланс").start);
});

test("barrel, cover, mainspring and arbor form a sequence", () => {
  const names = ["Барабан", "Барабан: крышка", "Заводная пружина", "Вал барабана"];
  for (let i = 1; i < names.length; i++) assert.ok(plans.get(names[i - 1]).end <= plans.get(names[i]).start);
});

test("scrubbing back exactly retraces every intermediate pose, with no finish-only spin", () => {
  for (const plan of plans.values()) {
    const snapshots = Array.from({ length: 301 }, (_, i) => samplePart(plan, i / 300));
    for (let i = 300; i >= 0; i--) {
      assert.deepEqual(samplePart(plan, i / 300), snapshots[i]);
      for (const value of Object.values(snapshots[i])) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
    assert.deepEqual(samplePart(plan, 0), { spin: 0, exit: 0, travel: 0, layout: 0 });
  }
});

test("camera and captions follow rotor, barrel and spring actions in both directions", () => {
  for (const [t, kind] of [[2.62/7,"rotor"],[3.88/7,"balance"],[4.58/7,"barrel"],[4.68/7,"cover"],[4.85/7,"spring"],[4.97/7,"arbor"],[1,"tray"]]) {
    assert.equal(motionShot(t).kind, kind);
    assert.ok(motionCaption(t).length > 10);
    assert.match(motionCaption(t, true), /Возвращение/);
  }
  assert.equal(motionShot(0).kind,"assembled");
});

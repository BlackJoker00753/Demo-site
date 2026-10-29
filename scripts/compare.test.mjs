import { test } from "node:test";
import assert from "node:assert/strict";
import { toggleCompare, getComparedSlugs, clearCompare } from "../frontend/js/core/compare.js";

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
globalThis.window = new EventTarget();

test("a fifth watch never silently removes any of the four chosen watches", () => {
  clearCompare();
  for (const slug of ["one", "two", "three", "four"]) assert.equal(toggleCompare(slug), true);
  let notified = false;
  window.addEventListener("comparelimit", () => { notified = true; }, { once: true });
  assert.equal(toggleCompare("five"), false);
  assert.deepEqual(getComparedSlugs(), ["one", "two", "three", "four"]);
  assert.equal(notified, true);
  assert.equal(toggleCompare("two"), false);
  assert.equal(toggleCompare("five"), true);
  assert.deepEqual(getComparedSlugs(), ["one", "three", "four", "five"]);
});

test("corrupted saved comparison recovers to a usable list", () => {
  values.set("horologium_compare", "not json");
  assert.deepEqual(getComparedSlugs(), []);
  values.set("horologium_compare", JSON.stringify({ unexpected: true }));
  assert.deepEqual(getComparedSlugs(), []);
  values.set("horologium_compare", JSON.stringify(["one", "one", null, "<bad>", "two"]));
  assert.deepEqual(getComparedSlugs(), ["one", "two"]);
});

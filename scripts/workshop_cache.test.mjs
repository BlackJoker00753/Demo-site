import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("offline model storage is bounded and does not block successful downloads on quota failure", async () => {
  const handlers = {}, stores = new Map();let full = false, downloads = 0;
  const context = vm.createContext({ URL, Date, Set, Promise, location: { origin: "https://horo.test" },
    self: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    fetch: async () => { downloads++; return { ok: true, clone() { return this; } }; },
    caches: { open: async name => {
      if (!stores.has(name)) stores.set(name, new Map()); const store = stores.get(name);
      return { match: async request => store.get(request.url), keys: async () => [...store.keys()],
        delete: async key => store.delete(key), put: async (request,response) => { if(full)throw Error("QuotaExceededError");store.set(request.url,response); } };
    } },
  });
  vm.runInContext(readFileSync("frontend/sw.js","utf8"), context);
  assert.equal(downloads, 0, "models were prefetched");
  const load=async i=>{
    let result;handlers.fetch({request:{method:"GET",url:`https://horo.test/assets/workshop/catalogue/watch-${i}.glb`},respondWith:promise=>{result=promise;}});
    return await result;
  };
  for(let i=0;i<9;i++)assert.equal((await load(i)).ok,true);
  const store=[...stores.entries()].find(([name])=>name.startsWith("workshops-"))[1];
  assert.equal(store.size,6);assert.ok(!store.has("https://horo.test/assets/workshop/catalogue/watch-0.glb"));
  const before=downloads;await load(8);assert.equal(downloads,before,"cached model was downloaded again");
  full=true;assert.equal((await load(10)).ok,true,"cache quota broke the model download");
});

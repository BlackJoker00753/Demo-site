// Bake all model-specific geometry outside the visitor's browser.
// GLTFPACK=/path/to/gltfpack CHROME=/usr/bin/chromium node scripts/build_catalogue_workshops.mjs <base> [slug,...]
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { auditBrowser } from "./audit_browser.mjs";
const base = process.argv[2] || "http://127.0.0.1:8765";
const only = new Set((process.argv[3] || "").split(",").filter(Boolean));
const out = resolve("frontend/assets/workshop/catalogue");
mkdirSync(out, { recursive: true });
const sha = data => createHash("sha256").update(data).digest("hex");
const sources = ["workshop/build-model.js", "workshop/build-movement.js", "workshop/profiles.js", "watch3d/factory.js", "watch3d/materials.js", "watch3d/textures.js", "watch3d/strap.js", "watch3d/shapes.js"];
const generatorHash = sha(sources.map(file => readFileSync(`frontend/js/${file}`, "utf8")).join("\n"));
const indexPath = join(out, "index.json");
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : { version: 1, models: {} };
index.generatorHash = generatorHash;
const browser = await auditBrowser("/tmp/horologium-catalogue-build");
const { evaluate, send, wait } = browser;
try {
  await send("Page.navigate", { url: base + "/tco" });
  await wait("!!window.__horologium?.router.current && !document.querySelector('#intro')");
  await evaluate("Promise.all([import('/js/workshop/build-model.js'),import('/vendor/three/addons/exporters/GLTFExporter.js')]).then(([b,e])=>{window.__buildWorkshop=b.buildWorkshopModel;window.__exporter=new e.GLTFExporter()})");
  const watches = await (await fetch(base + "/api/v1/watches")).json();
  let built = 0;
  for (const watch of watches) {
    if (watch.slug === "rolex-submariner" || only.size && !only.has(watch.slug)) continue;
    if (!/^[a-z0-9-]+$/.test(watch.slug)) throw Error("Invalid slug");
    const detail = await (await fetch(`${base}/api/v1/watches/${watch.slug}`)).json();
    const sourceHash = sha(JSON.stringify({ generatorHash, slug: detail.slug, brand: detail.brand_name, render: detail.render, case: detail.case, movement: detail.movement, complications: detail.complications, bracelet: detail.bracelet }));
    if (index.models[watch.slug]?.sourceHash === sourceHash && existsSync(join(out, watch.slug + ".glb"))) continue;
    const result = await evaluate(`(async()=>{
      const model=window.__buildWorkshop(${JSON.stringify(detail)});
      try {
        const data=await window.__exporter.parseAsync(model.scene,{binary:true,onlyVisible:false,maxTextureSize:1024});
        const bytes=new Uint8Array(data);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        return {data:btoa(binary),family:model.profile.family,parts:model.parts.length};
      } finally {model.dispose();}
    })()`);
    const raw = join(out, watch.slug + ".raw.glb"), target = join(out, watch.slug + ".glb");
    writeFileSync(raw, Buffer.from(result.data, "base64"));
    if (!process.env.GLTFPACK) throw Error("Set GLTFPACK; publishable assets require offline quantization");
    execFileSync(process.env.GLTFPACK, ["-i", raw, "-o", target, "-kn", "-km", "-ke"], { stdio: "pipe" });
    unlinkSync(raw);
    const payload = readFileSync(target), jsonLength = payload.readUInt32LE(12);
    const gltf = JSON.parse(payload.subarray(20, 20 + jsonLength));
    const parts = gltf.scenes[0].nodes.map(id => gltf.nodes[id]);
    if (!parts.every(node => node.extras?.workshop)) throw Error(`${watch.slug}: unnamed top-level part`);
    const triangles = gltf.meshes.reduce((n, mesh) => n + mesh.primitives.reduce((s, p) => s + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0), 0);
    if (payload.length > 4 * 1024 * 1024 || triangles > 300000) throw Error(`${watch.slug}: budget ${payload.length} bytes / ${triangles} triangles`);
    index.models[watch.slug] = { family: result.family, caliber: detail.movement.caliber, parts: parts.length, triangles, bytes: payload.length, sha256: sha(payload), sourceHash };
    writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
    console.log(`${watch.slug}: ${parts.length} parts, ${triangles} triangles, ${Math.round(payload.length / 1024)} KiB`);
    if (++built % 6 === 0) await send("HeapProfiler.collectGarbage");
  }
  console.log(`Built ${built}; manifest ${Object.keys(index.models).length} models`);
} finally { await browser.close(); }

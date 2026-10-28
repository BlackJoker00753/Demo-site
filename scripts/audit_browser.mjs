import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function auditBrowser(out) {
  mkdirSync(out, { recursive: true });
  const port = 10000 + Math.floor(Math.random() * 1000);
  const chrome = spawn(process.env.CHROME ?? "chromium", ["--headless=new", "--no-sandbox", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "horo-ux-"))}`, "about:blank"], { stdio: "ignore" });
  let tabs;
  for (let i = 0; i < 80; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); }
  }
  if (!tabs) { chrome.kill(); throw new Error("Chromium did not start"); }
  const ws = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map(), problems = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") problems.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") problems.push(message.params.args.map(arg => arg.description ?? arg.value).join(" "));
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) problems.push(`HTTP ${message.params.response.status} ${message.params.response.url}`);
  };
  const send = (method, params = {}) => new Promise(resolve => {
    const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    const result = response.result;
    if (!result || result.exceptionDetails) throw new Error(result?.exceptionDetails?.exception?.description ?? JSON.stringify(response));
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 160; i++) { if (await evaluate(expression)) return; await sleep(250); }
    throw new Error(`Timeout: ${expression}`);
  };
  const shot = async name => {
    const response = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(out, `${name}.png`), Buffer.from(response.result.data, "base64"));
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  return { send, evaluate, wait, shot, problems,
    assert: (condition, message) => { if (!condition) problems.push(message); },
    async close() { try { await send("Browser.close"); } finally { ws.close(); chrome.kill(); } },
  };
}

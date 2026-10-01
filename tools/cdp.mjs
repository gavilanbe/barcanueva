// Arnés CDP mínimo: Chrome headless + WebSocket nativo de Node 22.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = +(process.env.CDP_PORT || 9344); // varios agentes en paralelo: cada uno con su puerto
const PROFILE = `/tmp/barcanueva-cdp-profile-${PORT}`;

export async function launch(url) {
  try { const { execSync } = await import("node:child_process"); execSync(`pkill -f ${PROFILE} || true`); await new Promise((r) => setTimeout(r, 400)); } catch (e) { }
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--no-first-run", "--disable-gpu", "--window-size=800,700", "--autoplay-policy=no-user-gesture-required", "about:blank",
  ], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === "page")) break; } catch (e) { }
    await new Promise((r) => setTimeout(r, 200));
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.type + ": " + m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.method === "Runtime.exceptionThrown") logs.push("EXC: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true }); await send("Page.navigate", { url });
  const api = {
    logs, send,
    async eval(expr) { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; },
    async key(k, holdMs = 60) {
      const map = { A: ["z", "KeyZ", 90], B: ["x", "KeyX", 88], start: ["Shift", "ShiftLeft", 16], up: ["ArrowUp", "ArrowUp", 38], down: ["ArrowDown", "ArrowDown", 40], left: ["ArrowLeft", "ArrowLeft", 37], right: ["ArrowRight", "ArrowRight", 39] };
      const [key, code, vk] = map[k];
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk });
      await new Promise((r) => setTimeout(r, holdMs));
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
    },
    async shot(path) { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(path, Buffer.from(r.result.data, "base64")); },
    async canvas(path) { const data = await api.eval("(()=>{const s=document.getElementById('screen');const c=document.createElement('canvas');c.width=720;c.height=480;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(s,0,0,720,480);return c.toDataURL()})()"); writeFileSync(path, Buffer.from(data.split(",")[1], "base64")); },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    close() { ws.close(); proc.kill(); },
  };
  return api;
}

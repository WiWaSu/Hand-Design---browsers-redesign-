// Картинки полосы вкладок для тема-пакетов: фон новой вкладки каждой темы, отрисованный Chrome.
// Нужен Chrome с --remote-debugging-port=9333 и загруженным расширением Hand Design (его id в первом аргументе).
//   node tools/frames.mjs <id расширения>
// Пишет files/themes/<тема>/images/frame.png, затем: python tools/gen_chrome_themes.py
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EXT = process.argv[2];
if (!EXT) throw new Error("укажите id расширения");
const ver = await (await fetch("http://127.0.0.1:9333/json/version")).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((ok, no) => ((ws.onopen = ok), (ws.onerror = no)));
let id = 0;
const wait = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) {
    const [ok, no] = wait.get(m.id);
    wait.delete(m.id);
    m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((ok, no) => {
  wait.set(++id, [ok, no]);
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

const { targetId } = await send("Target.createTarget", { url: `chrome-extension://${EXT}/popup/popup.html` });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await sleep(1500);
await s("Emulation.setDeviceMetricsOverride", { width: 1920, height: 140, deviceScaleFactor: 1, mobile: false });
const evalJs = async expr => (await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const themes = await evalJs(`import("../shared/themes.js").then(m => m.THEMES.map(t => ({ id: t.id, scheme: t.scheme, wall: t.wall, bg: t.newtabBg, acc: t.accentDefault })))`);

for (const t of themes) {
  for (const dark of t.scheme === "both" ? [true, false] : [t.scheme !== "light"]) {
    const dirId = t.id + (t.scheme === "both" && !dark ? "-light" : "");
    const out = path.join(ROOT, "files", "themes", dirId);
    if (!fs.existsSync(out)) continue;
    await evalJs(`(() => {
      document.documentElement.innerHTML = "<body style='margin:0'><div id=w></div></body>";
      const r = document.documentElement;
      r.style.colorScheme = ${JSON.stringify(dark ? "dark" : "light")};
      r.style.setProperty("--hd-ua", ${JSON.stringify(t.acc)});
      r.style.setProperty("--fm-user-accent", ${JSON.stringify(t.acc)});
      const w = document.getElementById("w");
      w.style.cssText = "position:fixed;inset:0;background:" + ${JSON.stringify(t.bg || "#000")};
      const g = document.createElement("div");
      g.style.cssText = "position:absolute;left:0;right:0;top:0;height:640px;background:" + ${JSON.stringify(t.wall)} + ";background-size:auto;opacity:.9";
      w.append(g);
      return 1;
    })()`);
    await sleep(150);
    const shot = await s("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(path.join(out, "images"), { recursive: true });
    fs.writeFileSync(path.join(out, "images", "frame.png"), Buffer.from(shot.data, "base64"));
    console.log(dirId);
  }
}
await send("Target.closeTarget", { targetId });
ws.close();

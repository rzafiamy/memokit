// Renders assets/icon.svg (48/128 px) and assets/icon-small.svg (16 px) to src/icons/*.png
// with a headless Chrome/Chromium driven over the DevTools protocol (exact size,
// transparent background). Set CHROME_PATH if the browser is not auto-detected.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT, SRC } from "./lib.mjs";

const TARGETS = [
  { svg: "icon-small.svg", size: 16 },
  { svg: "icon.svg", size: 48 },
  { svg: "icon.svg", size: 128 },
];

const chrome = [
  process.env.CHROME_PATH,
  "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));
if (!chrome) {
  console.error("✗ No Chrome/Chromium found. Set CHROME_PATH=/path/to/chrome");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = mkdtempSync(join(tmpdir(), "memokit-icons-"));
const port = 9400 + Math.floor(Math.random() * 500);
// --no-sandbox: only trusted local SVGs are rendered, and Ubuntu's AppArmor
// blocks Chromium's sandbox for many builds.
const browser = spawn(chrome, [
  "--headless", "--no-sandbox", "--disable-gpu", "--no-first-run",
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmp, "profile")}`, "about:blank",
], { stdio: "ignore" });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not ready yet */ }
    await sleep(200);
  }
  throw new Error("Could not connect to Chrome DevTools");
}

try {
  const ws = new WebSocket(await connect());
  await new Promise((r) => ws.addEventListener("open", r));
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    pending.get(msg.id)?.(msg);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const { svg, size } of TARGETS) {
    const markup = readFileSync(join(ROOT, "assets", svg), "utf8")
      .replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
    const html = join(tmp, `${size}.html`);
    writeFileSync(html, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`);

    await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `file://${html}` });
    await sleep(300);
    const { data } = await send("Page.captureScreenshot", {
      format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
    });
    writeFileSync(join(SRC, "icons", `icon${size}.png`), Buffer.from(data, "base64"));
    console.log(`✓ assets/${svg} -> src/icons/icon${size}.png`);
  }
  ws.close();
} catch (e) {
  console.error("✗ Icon rendering failed:", e.message);
  process.exitCode = 1;
} finally {
  browser.kill();
  await sleep(200);
  rmSync(tmp, { recursive: true, force: true });
}

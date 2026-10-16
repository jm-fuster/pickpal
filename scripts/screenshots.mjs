// Captures the screenshots the README uses, straight from a running PickPal.
//
//   node scripts/screenshots.mjs                 # public pages only, headless
//   node scripts/screenshots.mjs --auth          # opens a window, you sign in, it shoots the app
//   node scripts/screenshots.mjs --auth --generate   # also generates one batch of ideas
//   node scripts/screenshots.mjs --auth --base https://pickpal.example.com
//
// Talks to Chrome over the DevTools Protocol, so it needs nothing beyond
// Node 22+ (global fetch and WebSocket) and a local Chrome or Edge.
//
// The signed-in profile is cached under docs/screenshots/.profile, so you only
// sign in the first time.
//
// IMPORTANT: shoot an account holding made-up people. These images go into a
// public repository, and real names, notes or allergies do not belong there.

import { spawn } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes("--" + name);

const OUT = arg("out", "docs/screenshots");
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const AUTH = has("auth");
const ONLY = arg("only", "");
const PORT = Number(arg("port", "9333"));
const WIDTH = Number(arg("width", "1440"));
const HEIGHT = Number(arg("height", "900"));
const SCALE = Number(arg("scale", "2"));
const PROFILE = path.resolve(arg("profile", path.join(OUT, ".profile")));
const WAIT_MS = Number(arg("wait", "600")) * 1000; // how long --auth waits for you to sign in
const GENERATE = has("generate"); // run one real gift generation before shooting
const OCCASION = arg("occasion", "Cumpleaños");

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("No Chrome or Edge binary found. Add yours to the CHROME list in this script.");
  process.exit(1);
}

// name, route, theme, full page, settle ms
// The landing is shot as its first screen, not the full page: the blocks
// below the fold only reveal on scroll, and 4 s lets the hero scene end.
const PUBLIC_SHOTS = [
  ["landing-light", "/", "light", false, 4000],
  ["landing-dark", "/", "dark", false, 4000],
];

// {person} is replaced with the id of the first person in the account.
const APP_SHOTS = [
  ["agenda-light", "/agenda", "light", false, 2600],
  ["agenda-dark", "/agenda", "dark", false, 2600],
  ["people-light", "/seres-queridos", "light", false, 2400],
  ["person-light", "/seres-queridos/{person}", "light", true, 2400],
  ["gifts-light", "/seres-queridos/{person}/gifts", "light", true, 3200],
  ["gifts-dark", "/seres-queridos/{person}/gifts", "dark", true, 3200],
  ["settings-light", "/settings", "light", true, 2200],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error("timed out: " + method));
      }, 45000);
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (msg) => {
        if (msg.method === method) {
          this.listeners = this.listeners.filter((x) => x !== listener);
          resolve(msg.params);
        }
      };
      this.listeners.push(listener);
    });
  }
}

async function attach() {
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener("open", res);
          ws.addEventListener("error", rej);
        });
        return new CDP(ws);
      }
    } catch {
      // Chrome is still booting.
    }
    await sleep(250);
  }
  throw new Error("could not attach to Chrome on port " + PORT);
}

mkdirSync(OUT, { recursive: true });

const flags = [
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + PROFILE,
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--disable-features=Translate,MediaRouter",
  "about:blank",
];
if (!AUTH) flags.unshift("--headless=new", "--window-size=" + WIDTH + "," + HEIGHT);

const chrome = spawn(CHROME, flags, { stdio: "ignore" });
const cdp = await attach();

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: SCALE,
  mobile: false,
});

async function go(route, theme, settle) {
  // next-themes keeps the choice in localStorage; seed it before any page
  // script runs so the very first paint is already the right theme.
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'try { localStorage.setItem("theme", "' + theme + '") } catch (e) {}',
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-color-scheme", value: theme }],
  });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: BASE + route });
  await Promise.race([loaded, sleep(20000)]);
  await sleep(settle);
}

// The sidebar prints the signed-in address, and these images go into a public
// repository. Swap it for a placeholder right before the shutter.
async function maskEmails() {
  const source = `(() => {
    const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) {
      if (re.test(walker.currentNode.nodeValue || "")) hits.push(walker.currentNode);
      re.lastIndex = 0;
    }
    for (const node of hits) node.nodeValue = node.nodeValue.replace(re, "hola@ejemplo.com");
    return hits.length;
  })()`;
  try {
    await cdp.send("Runtime.evaluate", { expression: source, returnByValue: true });
  } catch {
    // Not worth failing a capture over.
  }
}

async function shoot(name, fullPage) {
  await maskEmails();
  const clip = { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 };
  const res = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
    optimizeForSpeed: false,
    ...(fullPage ? {} : { clip }),
  });
  const file = path.join(OUT, name + ".png");
  writeFileSync(file, Buffer.from(res.data, "base64"));
  console.log("  saved " + file);
}

async function firstPersonId() {
  // "/seres-queridos/new" is the add-person button, not a person, and it sorts
  // first in the DOM — so match a Convex id rather than the first link.
  const expression = `(() => {
    const links = [...document.querySelectorAll('a[href^="/seres-queridos/"]')];
    for (const a of links) {
      const id = (a.getAttribute("href").split("/")[2] || "").split("?")[0];
      if (id && id !== "new" && /^[a-z0-9]{20,}$/.test(id)) return id;
    }
    return "";
  })()`;
  const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
  return res.result.value || "";
}

let shots = PUBLIC_SHOTS;

if (AUTH) {
  await go("/sign-in", "light", 2000);
  console.log("");
  console.log("  A browser window is open at " + BASE + "/sign-in");
  console.log("  Sign in with an account holding MADE-UP people. Nothing else to do —");
  console.log("  this waits for the session and then captures on its own.");
  console.log("");

  // Watch the tab rather than asking for a keypress, so this works unattended.
  // The origin check matters: an OAuth hop sends the tab to accounts.google.com,
  // whose path looks nothing like ours and would otherwise read as "signed in".
  const deadline = Date.now() + WAIT_MS;
  let signedIn = false;
  while (Date.now() < deadline) {
    await sleep(2500);
    let href = "";
    try {
      const res = await cdp.send("Runtime.evaluate", {
        expression: "location.href",
        returnByValue: true,
      });
      href = String(res.result.value || "");
    } catch {
      continue; // mid-navigation
    }
    if (!href.startsWith(BASE + "/")) continue; // still away at the identity provider
    const here = href.slice(BASE.length).split(/[?#]/)[0];
    if (here === "/" || here.startsWith("/sign-in") || here.startsWith("/sign-up")) continue;

    // Confirm rather than assume: /agenda is behind the default-deny proxy, so if
    // it survives without bouncing to sign-in, there is a real session.
    await go("/agenda", "light", 1500);
    const check = await cdp.send("Runtime.evaluate", {
      expression: "location.pathname",
      returnByValue: true,
    });
    if (String(check.result.value || "").startsWith("/agenda")) {
      signedIn = true;
      console.log("  session confirmed on /agenda");
      break;
    }
  }
  if (!signedIn) {
    console.log("  Gave up waiting for a sign-in. Nothing captured.");
    try { await cdp.send("Browser.close"); } catch { /* already gone */ }
    chrome.kill();
    process.exit(1);
  }

  // Deep-link the gift shots at a real person so they have something to show.
  await go("/seres-queridos", "light", 2600);
  const personId = await firstPersonId();
  if (!personId) {
    console.log("");
    console.log("  No people in this account. Add two or three made-up ones and run this again.");
    console.log("");
    try { await cdp.send("Browser.close"); } catch { /* already gone */ }
    chrome.kill();
    process.exit(1);
  }
  console.log("  using person " + personId + " for the gift shots");

  if (GENERATE) {
    // Must happen in this same browser: Chrome drops the Clerk session cookie
    // when it closes, so a second process would arrive signed out.
    console.log("  generating one batch of ideas (spends 1 of the 10 daily)");
    await go("/seres-queridos/" + personId + "/gifts?occasion=" + encodeURIComponent(OCCASION), "light", 5000);

    const clicked = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const all = [...document.querySelectorAll('button, [role="button"], label')];
        const type = all.find((e) => (e.textContent || "").includes("Producto físico"));
        if (type) type.click();
        return type ? "picked a gift type" : "no gift-type control";
      })()`,
      returnByValue: true,
    });
    console.log("  " + clicked.result.value);
    await sleep(1800);

    const fired = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const b = [...document.querySelectorAll('button')]
          .find((e) => /Generar 9 ideas|Regenerar/.test(e.textContent || ""));
        if (!b) return "no generate button";
        if (b.disabled) return "generate button disabled";
        b.click();
        return "generating";
      })()`,
      returnByValue: true,
    });
    console.log("  " + fired.result.value);

    for (let i = 0; i < 40; i++) {
      await sleep(3000);
      const state = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const t = document.body.innerText || "";
          if (/Generando/.test(t)) return "working";
          if (/Has alcanzado|No se pudieron|no autorizado|No autorizado/i.test(t)) return "error";
          if (/Regenerar/.test(t)) return "done";
          return "waiting";
        })()`,
        returnByValue: true,
      });
      const s = state.result.value;
      if (s === "done") { console.log("  ideas ready"); break; }
      if (s === "error") { console.log("  generation failed — capturing the empty state instead"); break; }
    }
  }
  shots = APP_SHOTS.map(([name, route, theme, full, settle]) => [
    name,
    route.replace("{person}", personId),
    theme,
    full,
    settle,
  ]);
}

const wanted = ONLY ? ONLY.split(",").map((s) => s.trim()) : null;

for (const [name, route, theme, fullPage, settle] of shots) {
  if (wanted && !wanted.includes(name)) continue;
  try {
    await go(route, theme, settle);
    await shoot(name, fullPage);
  } catch (err) {
    console.log("  FAILED " + name + ": " + err.message);
  }
}

try { await cdp.send("Browser.close"); } catch { /* already gone */ }
chrome.kill();
process.exit(0);

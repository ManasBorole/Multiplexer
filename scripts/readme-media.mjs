// Captures the README screenshots and demo GIF from the running app.
//
// Starts its own `next dev` on port 3200 with Upstash blanked (captures never
// touch shared state). OpenRouter keys from .env.local are kept, so answers are
// real when keys exist and labelled "simulated" when they don't. Needs Chrome
// and ffmpeg on PATH.
//
// Usage:  node scripts/readme-media.mjs
// Output: docs/screenshot-decision.png, docs/screenshot-inspector.png,
//         docs/screenshot-failover.png, docs/demo.gif

import { spawn, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import puppeteer from "puppeteer-core";

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "/usr/bin/google-chrome");
const PROMPT = "Write a Python function to merge two sorted linked lists.";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(`npx next dev -p ${PORT}`, {
  env: {
    ...process.env,
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    UPSTASH_VECTOR_REST_URL: "",
    UPSTASH_VECTOR_REST_TOKEN: "",
  },
  stdio: "ignore",
  shell: true,
});
const stop = () => {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    else server.kill("SIGTERM");
  } catch {
    /* gone */
  }
};

async function ready() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${BASE}/api/state`)).ok) return;
    } catch {
      /* starting */
    }
    await sleep(1000);
  }
  throw new Error("server did not start");
}

const doneRouting = (page) =>
  page.waitForFunction(() => !document.body.innerText.includes("Routing your prompt"), { timeout: 120000 });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});

try {
  await ready();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await sleep(1200);

  // ── Demo GIF: route a prompt, see the decision, change the objective, re-route ──
  const webm = "docs/demo.webm";
  if (existsSync(webm)) rmSync(webm);
  const recorder = await page.screencast({ path: webm });
  await sleep(800);
  await page.click("#prompt");
  await page.type("#prompt", PROMPT, { delay: 28 });
  await sleep(400);
  await page.click("form button[type=submit]");
  await doneRouting(page);
  await sleep(2600);
  // Instant jump (a smooth scroll would fly through the whole story section).
  await page.evaluate(() => document.getElementById("results").scrollIntoView({ behavior: "instant" }));
  await sleep(3400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(1200);
  await page.evaluate(() => [...document.querySelectorAll("#try button")].find((b) => b.textContent === "Cheapest")?.click());
  await sleep(900);
  await page.evaluate(() => document.getElementById("results").scrollIntoView({ behavior: "instant" }));
  await sleep(1200);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Re-route with current weights")?.click());
  await doneRouting(page);
  await sleep(3400);
  await recorder.stop();

  // ── Screenshots ──
  const results = async (file) => {
    await page.evaluate(() => document.getElementById("results").scrollIntoView());
    await sleep(700);
    await page.screenshot({ path: file });
  };
  await results("docs/screenshot-decision.png");

  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Open inspector")?.click());
  await sleep(900);
  await page.screenshot({ path: "docs/screenshot-inspector.png" });
  await page.keyboard.press("Escape");
  await sleep(500);

  // Failover: switch off the model that just answered, then re-route.
  await page.evaluate(() => {
    const label = document.querySelector("#results .panel b.text-\\[17px\\]")?.textContent;
    const row = [...document.querySelectorAll("#session tbody tr")].find((tr) => tr.children[0].textContent === label);
    row?.querySelector("[role=switch]")?.click();
  });
  await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Re-route with current weights")?.click());
  await doneRouting(page);
  await sleep(1500);
  await results("docs/screenshot-failover.png");
} finally {
  await browser.close();
  stop();
}

// webm -> GIF: long idle stretches shortened (waiting on the model), 10 fps,
// 880 px wide, two-pass palette; only changed regions re-encoded.
execSync(
  'ffmpeg -y -loglevel error -i docs/demo.webm -vf "mpdecimate=max=4,setpts=N/FRAME_RATE/TB,fps=10,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" docs/demo.gif',
  { stdio: "inherit" },
);
rmSync("docs/demo.webm");
console.log("wrote docs/screenshot-*.png and docs/demo.gif");

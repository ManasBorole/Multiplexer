// Real-browser screenshots (framer-motion animations actually run).
// Usage: node capture.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "E:\\Projects\\Multiplexer\\.impeccable\\screens\\";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});

async function shot(name, { width, url, wait = 2500, clickDemo = false }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
  // ?demo=1 routes the first example prompt on load.
  await page.goto(clickDemo ? url + "?demo=1" : url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (clickDemo) {
    // wait for the real model response and the routing decision panel
    await page
      .waitForFunction(() => document.body.innerText.includes("Routing decision"), { timeout: 90000 })
      .catch(() => {});
    await sleep(1200);
  } else {
    await sleep(wait);
  }
  await page.screenshot({ path: OUT + name, fullPage: true });
  console.log("→", name);
  await page.close();
}

await shot("home-desktop.png", { width: 1440, url: BASE, wait: 2600 });
await shot("demo-desktop.png", { width: 1440, url: BASE, wait: 4200, clickDemo: true });
await shot("demo-mobile.png", { width: 402, url: BASE, wait: 4200, clickDemo: true });

await browser.close();
console.log("done");

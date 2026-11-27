// Takes full-page screenshots of /a /b /c /d at 1440 and 375 wide and checks for horizontal scroll (AC9, AC10).
// Uses the installed Google Chrome through playwright-core.
// Usage: node scripts/screenshots.mjs <base-url> <out-dir> [routes=/a,/b,/c,/d] [--reduced]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

// Chrome repeats the top of the page in one-shot captures taller than its texture limit, so capture
// 3000 px bands and stitch them. animations "disabled" fast-forwards finished CSS animations to their
// end state (a plain capture restarts them).
async function captureFullPage(page, file, width) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const BAND = 3000;
  const parts = [];
  for (let y = 0; y < height; y += BAND) {
    const h = Math.min(BAND, height - y);
    const buf = await page.screenshot({ fullPage: true, clip: { x: 0, y, width, height: h }, animations: "disabled" });
    parts.push({ input: buf, top: y, left: 0 });
  }
  await sharp({ create: { width, height, channels: 4, background: "#ffffff" } }).composite(parts).png().toFile(file);
}

const [base = "http://localhost:8787", outDir = "screenshots", routeArg = "/a,/b,/c,/d"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const reduced = process.argv.includes("--reduced");
const routes = routeArg.split(",");
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
  { name: "mobile-375", width: 375, height: 812, isMobile: true },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    for (const route of routes) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      // Scroll through once so one-time reveals and lazy images fire, then go back to the top.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += Math.round(vp.height * 0.6)) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1800);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        widest: [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
      }));
      const name = `${route.replace(/\//g, "") || "index"}-${vp.name}${reduced ? "-reduced" : ""}.png`;
      await captureFullPage(page, path.join(outDir, name), vp.width);
      results.push({ route, viewport: vp.name, file: name, horizontalScroll: overflow.scrollWidth > overflow.clientWidth, ...overflow, errors });
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => r.horizontalScroll)) process.exitCode = 1;

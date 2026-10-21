import { chromium } from "playwright";
// Usage: node scripts/e2e-guest-flow.mjs [baseUrl] [outDir]  (needs playwright + chromium installed)
// Plays the whole game as a guest and screenshots each stage. Creates a guest user and a league.
const BASE = process.argv[2] ?? "http://127.0.0.1:3000", OUT = process.argv[3] ?? ".design/e2e";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const t0 = Date.now();
await page.goto(BASE + "/play");
await page.waitForURL(/\/signin/);
await shot("01-signin");
await page.getByRole("button", { name: "Play as a guest" }).click();
await page.waitForURL(/\/play$/);
await page.getByRole("button", { name: "Start a league" }).click();
await page.getByRole("button", { name: "Create league" }).waitFor();
await shot("02-create");
await page.getByRole("button", { name: "Create league" }).click();
await page.waitForURL(/\/leagues\//);
await page.getByRole("button", { name: "Start the draft" }).waitFor();
await shot("03-setup");
await page.getByRole("button", { name: "Start the draft" }).click();
for (let i = 0; i < 5; i++) {
  await page.getByText("You're on the clock").waitFor({ timeout: 15000 });
  if (i === 0) await shot("04-draft");
  await page.locator("button:has-text('Draft'):not([disabled])").first().click();
  await page.waitForTimeout(800);
}
await page.getByRole("button", { name: /Play the week/ }).waitFor({ timeout: 15000 });
await shot("05-lineup");
await page.getByRole("button", { name: /Play the week/ }).click();
await page.getByRole("heading", { name: "Standings" }).waitFor({ timeout: 15000 });
await page.waitForTimeout(8500);
await shot("06-results");
console.log("league url", page.url(), "ms", Date.now() - t0);
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.getByRole("heading", { name: "Standings" }).waitFor();
await page.waitForTimeout(8000); await shot("07-results-390");
console.log("console errors:", errors.length ? errors : "none");
const me = await page.evaluate(() => fetch("/api/me").then((r) => r.json()));
console.log("TEST_USER", me?.id);
await browser.close();

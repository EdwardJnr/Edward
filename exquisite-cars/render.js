// Exports each 1400 px panel of index.html as a JPEG for Behance (2x for crisp text).
// Usage: NODE_PATH=$(npm root -g) node render.js [scale]
const { chromium } = require('playwright');
const path = require('node:path');
const dir = __dirname;
(async () => {
const scale = Number(process.argv[2] || 2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: scale });
await page.goto('file://' + path.join(dir, 'index.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
for (const s of await page.$$('section.panel')) {
  const name = await s.getAttribute('data-name');
  await s.screenshot({ path: path.join(dir, 'exports', name + '.jpg'), type: 'jpeg', quality: 90 });
  console.log(name);
}
await browser.close();
})();

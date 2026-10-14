const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('file://' + __dirname + '/blueprint/layout.html');
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: __dirname + '/blueprint/layout-blueprint.png', fullPage: true });
  await b.close();
})();

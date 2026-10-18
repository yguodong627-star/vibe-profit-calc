const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--lang=zh-CN'] });
  const mk = async (w, h, mobile, name, fn) => {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); p.on('dialog', d => d.accept('Mug'));
    await p.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'zh-CN' }));
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    await p.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle0' });
    await fn(p); await p.close();
  };
  const set = (p, k, v) => p.$eval('#i-' + k, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const prep = async p => { await p.select('#i-costCur', 'USD'); await set(p, 'cost', '10'); await set(p, 'shipCost', '5'); await set(p, 'otherCost', '1'); await set(p, 'price', '40'); await set(p, 'adPct', '5'); await set(p, 'retRate', '4'); };
  await mk(1366, 900, false, 'd', async p => { await prep(p); await p.screenshot({ path: 'screenshots/desktop-calc.png' }); });
  await mk(1366, 900, false, 'd', async p => { await prep(p);
    await p.click('#saveSc'); await set(p, 'price', '55'); await p.click('#saveSc'); await p.select('#tpl', 'shopify-basic'); await set(p, 'price', '48'); await p.click('#saveSc');
    await p.click('[data-tab=compare]'); for (let i = 0; i < 3; i++) await p.evaluate(i => document.querySelectorAll('[data-sc]')[i].click(), i); await p.screenshot({ path: 'screenshots/desktop-compare.png' }); });
  await mk(390, 844, true, 'm', async p => { await prep(p); await p.screenshot({ path: 'screenshots/mobile-calc.png' });
    await p.evaluate(() => document.querySelector('#result').scrollIntoView()); await new Promise(r => setTimeout(r, 300)); await p.screenshot({ path: 'screenshots/mobile-result.png' }); });
  await mk(390, 844, true, 'm', async p => { await p.click('[data-tab=rates]'); await p.screenshot({ path: 'screenshots/mobile-rates.png', fullPage: false }); });
  await b.close();
})();

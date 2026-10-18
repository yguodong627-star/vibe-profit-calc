// 用法：先 `python3 -m http.server 8765` 在项目根目录，再 NODE_PATH=<含 puppeteer-core 的 node_modules> node tests/selftest.js
const puppeteer = require('puppeteer-core');
const URL_ = process.env.URL || 'http://localhost:8765/index.html';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ FAIL:', m); } };
const near = (a, b, m, e = 1e-9) => ok(Math.abs(a - b) < e, `${m}: got ${a}, want ${b}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--lang=zh-CN'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept(d.defaultValue() || 'x'));
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'zh-CN' }));
  await page.goto(URL_, { waitUntil: 'networkidle0' });

  /* ---------- A. 计算核心（独立手算期望值） ---------- */
  const core = await page.evaluate(() => {
    const D = PC.defaultState, out = {};
    const base = (o) => Object.assign(D(), { costCur: 'USD', sellCur: 'USD', price: 40, shipIncome: 5, cost: 10, shipCost: 5, otherCost: 1,
      commPct: 6.5, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 3, payFixed: 0.25, listing: 0.2, lowThr: 0, commFixedLow: 0, adPct: 0, adFixed: 0, retRate: 0, retShip: 0, retResale: 100, retFeeKeep: 0 }, o);
    const run = (s, P) => PC.calc(s, P === undefined ? s.price : P, PC.costK(s, {}));
    let s = base({}); out.etsy = run(s);
    out.etsyBE = PC.solve(s, 1, 0); out.etsyT25 = PC.solve(s, 1, 0.25);
    out.amz = run(base({ commPct: 15, commMin: 0.3, payPct: 0, payFixed: 0, listing: 0, cost: 0, shipCost: 0, otherCost: 0, shipIncome: 0 }), 1);
    const eb = base({ commPct: 13.6, commFixed: 0.4, commFixedLow: 0.3, lowThr: 10, payPct: 0, payFixed: 0, listing: 0, shipIncome: 0, cost: 0, shipCost: 0, otherCost: 0 });
    out.eb10 = run(eb, 10); out.eb1001 = run(eb, 10.01);
    out.shop = run(base({ price: 50, shipIncome: 0, commPct: 0, payPct: 2.9, payFixed: 0.3, listing: 0, cost: 20, shipCost: 5, otherCost: 0, retRate: 10, retFeeKeep: 100, retResale: 100 }));
    out.tb = run(base({ price: 100, shipIncome: 0, commPct: 0.6, payPct: 0, payFixed: 0, listing: 0, cost: 40, shipCost: 8, otherCost: 0 }));
    out.fxK = PC.costK(base({ costCur: 'CNY', sellCur: 'USD' }), { USD: 7 });
    out.fxMissing = PC.costK(base({ costCur: 'CNY', sellCur: 'USD' }), {});
    out.fxCross = PC.costK(base({ costCur: 'EUR', sellCur: 'GBP' }), { EUR: 8, GBP: 9.6 });
    const bad = base({ commPct: 50, payPct: 60 });
    out.badBE = PC.solve(bad, 1, 0); out.badT = PC.solve(bad, 1, 0.1);
    out.zero = run(base({ shipIncome: 0, cost: 0, shipCost: 0, otherCost: 0, payFixed: 0, listing: 0 }), 0);
    out.tgt100 = PC.solve(s, 1, 1);
    // 反推价满足目标、且少 0.01 就不满足
    const chk = [];
    [[s, 0.1], [s, 0.4], [eb, 0.2], [base({ adPct: 12, adFixed: 0.5, retRate: 8, retShip: 3, retResale: 60, retFeeKeep: 50 }), 0.15], [base({ commMin: 0.3, commPct: 8, payPct: 0, payFixed: 0, listing: 0 }), 0.3]].forEach(([st, m]) => {
      const P = PC.solve(st, 1, m), c = PC.calc(st, P, 1), c2 = PC.calc(st, P - 0.01, 1);
      chk.push({ m, P, okAt: c.margin >= m - 1e-9, notBelow: c2.margin < m });
    });
    out.chk = chk;
    // 高成本下盈亏平衡价应使利润≈0
    const hi = base({ cost: 500, adPct: 10, retRate: 5, retShip: 2 });
    const bp = PC.solve(hi, 1, 0); out.hiBE = { bp, profit: PC.calc(hi, bp, 1).profit, below: PC.calc(hi, bp - 0.01, 1).profit };
    out.csv = PC.parseCSV('\ufeffname,price\r\n"a,b",10\r\n"he said ""hi""",5\r\n');
    return out;
  });
  console.log('A. 计算核心');
  near(core.etsy.fees, 4.725, 'Etsy 费用合计'); near(core.etsy.profit, 24.275, 'Etsy 每件利润'); near(core.etsy.margin, 24.275 / 45, 'Etsy 利润率');
  near(core.etsyBE, 13.18, 'Etsy 盈亏平衡价', 1e-6); near(core.etsyT25, 20.12, 'Etsy 25% 建议价', 1e-6);
  near(core.amz.comm, 0.3, 'Amazon 最低佣金'); near(core.amz.profit, 0.7, 'Amazon 低价利润');
  near(core.eb10.comm, 1.66, 'eBay 总额=10 固定费 0.30'); near(core.eb1001.comm, 10.01 * 0.136 + 0.4, 'eBay 总额>10 固定费 0.40');
  near(core.shop.profit, 20.25, 'Shopify 退货期望利润', 1e-9);
  near(core.tb.profit, 51.4, '淘宝 0.6%'); near(core.tb.margin, 0.514, '淘宝利润率');
  near(core.fxK, 1 / 7, 'CNY→USD 成本折算'); ok(core.fxMissing == null || Number.isNaN(core.fxMissing), '缺汇率返回 NaN'); near(core.fxCross, 8 / 9.6, '交叉汇率');
  ok(core.badBE === null && core.badT === null, '费率>100% 无解返回 null');
  ok(core.zero.margin == null || Number.isNaN(core.zero.margin), '零收入利润率 NaN 不崩'); ok(core.tgt100 === null, '目标 100% 无解');
  core.chk.forEach(x => ok(x.okAt && x.notBelow, `目标 ${x.m} 反推价 ${x.P} 最小且达标`));
  near(core.hiBE.profit, 0, '盈亏平衡价利润≈0', 0.02); ok(core.hiBE.below < 0, '平衡价少一分就亏');
  ok(core.csv.length === 3 && core.csv[1][0] === 'a,b' && core.csv[2][0] === 'he said "hi"', 'CSV 引号解析');

  /* ---------- B. 全部模板：载入后数值有限、已核对模板有来源 ---------- */
  const tpls = await page.evaluate(() => PC.TPLS.map(t => ({ id: t.id, st: t.status, src: t.src.length, f: t.f, cur: t.cur })));
  console.log('B. 模板（' + tpls.length + '）');
  for (const t of tpls) {
    ok(t.id === 'custom' || t.st === 'none' || t.src > 0, t.id + ' 标已核对/部分核对必须有来源链接');
    ok(Object.values(t.f).every(v => Number.isFinite(v)), t.id + ' 数值合法');
  }
  const none = tpls.filter(t => t.st === 'none').map(t => t.id); console.log('   请自行核对的模板:', none.join(','));

  /* ---------- C. UI 流程 ---------- */
  console.log('C. UI');
  const setVal = async (k, v) => { await page.$eval(`#i-${k}`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v); };
  const txt = (sel) => page.$eval(sel, el => el.textContent.trim());
  await page.select('#tpl', 'etsy-us');
  await page.select('#i-costCur', 'USD');
  for (const [k, v] of Object.entries({ price: '40', shipIncome: '5', cost: '10', shipCost: '5', otherCost: '1', retRate: '0', adPct: '0', retFeeKeep: '0' })) await setVal(k, v);
  ok((await txt('#rProfit')).includes('24.28') || (await txt('#rProfit')).includes('24.27'), 'UI 利润显示 ≈24.28: ' + await txt('#rProfit'));
  ok((await txt('#rMargin')) === '53.9%', 'UI 利润率 53.9%: ' + await txt('#rMargin'));
  ok((await txt('#rBE')).includes('13.18'), 'UI 盈亏平衡 13.18: ' + await txt('#rBE'));
  ok((await txt('#rTarget')).includes('25%') && (await txt('#rTarget')).includes('20.12'), 'UI 建议价 20.12: ' + await txt('#rTarget'));
  await page.click('#applyTarget');
  ok((await txt('#rMargin')) === '25.0%', '采用建议价后利润率 25.0%: ' + await txt('#rMargin'));
  // 小红书模板应出现“请自行核对”警告
  await page.select('#tpl', 'xhs');
  ok((await page.$$('#rWarn .warn')).length >= 1, '小红书未核对警告出现');
  // 缺汇率警告，填汇率后消失
  await page.select('#tpl', 'etsy-us'); await page.select('#i-costCur', 'CNY');
  ok((await txt('#rWarn')).includes('汇率'), '缺汇率警告');
  await page.click('[data-tab=rates]');
  await page.$eval('[data-fx=USD]', el => { el.value = '7'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-tab=calc]');
  ok(!(await txt('#rWarn')).includes('汇率'), '填汇率后警告消失');
  // 情景：无限额（保存 12 个）、对比可同时勾选 5 个
  await page.click('[data-tab=calc]');
  for (let i = 0; i < 12; i++) { await setVal('price', String(20 + i)); await page.click('#saveSc'); }
  ok(!(await page.$('dialog')), '页面没有任何弹窗/解锁入口');
  let n = await page.evaluate(() => PC.store().scenarios.length);
  ok(n === 12, '情景保存无上限，实际 ' + n);
  await page.click('[data-tab=compare]');
  for (let i = 0; i < 5; i++) { await page.evaluate((i) => document.querySelectorAll('[data-sc]')[i].click(), i); }
  ok((await page.$$('[data-sc]:checked')).length === 5, '对比可同时勾选 5 个');
  ok((await page.$$('.cmp thead th')).length === 6, '对比表 5 列 + 表头');
  // 自定义模板：不限个数
  await page.click('[data-tab=calc]');
  await page.click('#saveTpl'); await page.click('#saveTpl'); await page.click('#saveTpl');
  ok((await page.evaluate(() => PC.store().myTpls.length)) === 3, '可存多个自定义模板');
  // 批量：直接可用
  await page.click('[data-tab=batch]');
  ok(!(await page.$('#batchLock')), '批量页无锁定提示');
  await page.$eval('#csvText', el => el.value = 'name,price,cost\nA,30,5');
  await page.click('#runPaste');
  ok((await page.$$('#batchOut tbody tr')).length === 1, '批量计算 1 行（无需解锁）');
  await page.$eval('#csvText', el => el.value = '名称,售价,成本,退货率\n=HYPERLINK("x"),30,5,10\n杯子,50,10,0\n坏行,abc,,');
  await page.click('#runPaste');
  ok((await page.$$('#batchOut tbody tr')).length === 3, '批量中文表头 3 行（含坏行不崩）');
  const big = Array.from({ length: 300 }, (_, i) => 'S' + i + ',' + (10 + i) + ',5').join('\n');
  await page.$eval('#csvText', (el, b) => el.value = 'name,price,cost\n' + b, big);
  await page.click('#runPaste');
  ok((await page.$$('#batchOut tbody tr')).length === 300, '批量 300 行无限制');
  // 页面无付费相关文案
  const body = await page.evaluate(() => document.body.innerText + document.documentElement.outerHTML);
  ok(!/Pro\b|授权码|付费|收费|解锁/.test(body), '页面不含 Pro/授权/付费字样');
  // 持久化：刷新后仍在
  await page.reload({ waitUntil: 'networkidle0' });
  const st = await page.evaluate(() => ({ sc: PC.store().scenarios.length, rate: PC.store().rates.USD, price: PC.store().state.price }));
  ok(st.sc === 12 && st.rate === 7, '刷新后情景/汇率保留 ' + JSON.stringify(st));
  // 语言切换
  await page.click('#langBtn');
  ok((await txt('.brand b')) === 'Profit & Price Calculator', '切英文');
  ok((await txt('#rBadge')).length > 0, '英文下状态徽标存在');
  await page.click('#langBtn');
  // 极端输入不崩
  await setVal('price', '1e12'); await setVal('commPct', '99999'); await setVal('retRate', '500');
  ok((await page.$eval('#rProfit', e => e.textContent)).length > 0, '极端输入不崩');
  ok(errors.length === 0, '无控制台错误: ' + errors.join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

/* 利润定价计算器 · 纯前端，无依赖。数据仅存 localStorage。 */
(function () {
'use strict';

/* ---------------- 常量与模板 ---------------- */
var CURS = ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY', 'CAD', 'AUD', 'SGD'];
var DATE = '2026-10-18';
var LIM = { free: { sc: 10, cmp: 3, tpl: 1 }, pro: { sc: 200, cmp: 8, tpl: 1e9 } };

var Z = function (zh, en) { return { zh: zh, en: en }; };
// status: ok 已核对 | part 部分核对 | none 请自行核对
var TPLS = [
  { id: 'etsy-us', g: 'Etsy', name: Z('Etsy · 美国卖家', 'Etsy · US seller'), cur: 'USD', status: 'ok',
    f: { commPct: 6.5, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 3, payFixed: 0.25, listing: 0.2, retFeeKeep: 0 },
    note: Z('交易费 6.5%（含运费与礼品包装费，美国卖家不含销售税）；Etsy Payments 3% + $0.25（按含运费、税的总额）；刊登费 $0.20/次，这里按每件摊 $0.20。站外广告 12%/15% 请填在“广告占比”。退货时各项费用是否退还以 Etsy 为准，默认按全退。',
      'Transaction fee 6.5% (item + shipping + gift wrap; US sales tax excluded). Etsy Payments 3% + $0.25 on the gross incl. shipping/tax. Listing fee $0.20 per listing, counted here as $0.20 per sale. Offsite Ads 12%/15%: enter under ad %. Refund treatment of fees follows Etsy; default assumes fully refunded.'),
    src: [['Etsy Fees & Payments Policy', 'https://www.etsy.com/legal/fees/'], ['Etsy Help: Payment processing fees', 'https://help.etsy.com/hc/en-us/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy']] },
  { id: 'etsy-uk', g: 'Etsy', name: Z('Etsy · 英国银行账户', 'Etsy · UK bank account'), cur: 'GBP', status: 'part',
    f: { commPct: 6.5, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 4, payFixed: 0.2, listing: 0, retFeeKeep: 0 },
    note: Z('处理费 4% + £0.20 来自官方帮助页表格；交易费 6.5% 为通用费率。英国 VAT、刊登费（$0.20 折成英镑）未计入，请自行核对。',
      'Processing 4% + £0.20 is from the official help table; 6.5% transaction fee is the general rate. UK VAT on fees and the $0.20 listing fee (in GBP) are not included — please verify.'),
    src: [['Etsy Help: Payment processing fees', 'https://help.etsy.com/hc/en-us/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy'], ['Etsy Fees & Payments Policy', 'https://www.etsy.com/legal/fees/']] },
  { id: 'etsy-de', g: 'Etsy', name: Z('Etsy · 德国银行账户', 'Etsy · German bank account'), cur: 'EUR', status: 'part',
    f: { commPct: 6.5, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 4, payFixed: 0.3, listing: 0, retFeeKeep: 0 },
    note: Z('处理费 4% + €0.30 来自官方帮助页表格；VAT、刊登费未计入，请自行核对。', 'Processing 4% + €0.30 from the official help table; VAT and listing fee not included — please verify.'),
    src: [['Etsy Help: Payment processing fees', 'https://help.etsy.com/hc/en-us/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy']] },
  { id: 'amz-us', g: 'Amazon', name: Z('亚马逊美国 · 多数类目 15%', 'Amazon US · most categories 15%'), cur: 'USD', status: 'ok',
    f: { commPct: 15, commOnShip: 1, commFixed: 0, commMin: 0.3, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0 },
    note: Z('推荐费 = 总售价（含运费、礼品包装）× 类目费率，最低 $0.30。FBA 配送费、仓储费、月租/单件费用本模板未内置，请把 FBA 配送费填进“实际运费/配送费”，其余请自行核对。服装、美妆、家具、珠宝等是分档费率，本工具暂不支持分档，请选自定义手填。',
      'Referral fee = total price (incl. shipping/gift wrap) × category rate, min $0.30. FBA fulfilment, storage and subscription/per-item fees are not built in: enter FBA fees under actual shipping. Tiered categories (apparel, beauty, furniture, jewelry…) are not supported as tiers — use Custom.'),
    src: [['Amazon: How much does it cost to sell on Amazon', 'https://sell.amazon.com/pricing'], ['Amazon 2026 US referral & FBA fee update', 'https://sellingpartners.aboutamazon.com/update-to-u-s-referral-and-fulfillment-by-amazon-fees-for-2026']] },
  { id: 'amz-us-ce', g: 'Amazon', name: Z('亚马逊美国 · 消费电子 8%', 'Amazon US · Consumer electronics 8%'), cur: 'USD', status: 'ok',
    f: { commPct: 8, commOnShip: 1, commFixed: 0, commMin: 0.3, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0 },
    note: Z('同上；电子配件（Electronics Accessories）是 15%（100 美元以内部分）分档，不是这一条。', 'As above. Electronics Accessories is tiered (15% up to $100) and is not this template.'),
    src: [['Amazon: How much does it cost to sell on Amazon', 'https://sell.amazon.com/pricing']] },
  { id: 'amz-us-auto', g: 'Amazon', name: Z('亚马逊美国 · 汽车与摩托 12%', 'Amazon US · Automotive 12%'), cur: 'USD', status: 'ok',
    f: { commPct: 12, commOnShip: 1, commFixed: 0, commMin: 0.3, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0 },
    note: Z('同上。', 'As above.'),
    src: [['Amazon: How much does it cost to sell on Amazon', 'https://sell.amazon.com/pricing']] },
  { id: 'shopify-basic', g: 'Shopify', name: Z('Shopify · Basic · Shopify Payments', 'Shopify · Basic · Shopify Payments'), cur: 'USD', status: 'ok',
    f: { commPct: 0, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 2.9, payFixed: 0.3, listing: 0, retFeeKeep: 100 },
    note: Z('线上标准卡 2.9% + 30¢（Basic）；高级卡 3.5% + 30¢，国际卡另加 1%。月费（$39/月，年付 $29）是固定成本，不在每件里。Shopify 说明退款时刷卡手续费不退。',
      'Online standard cards 2.9% + 30¢ (Basic); premium cards 3.5% + 30¢; international +1%. The monthly plan fee is a fixed cost, not included per item. Shopify states card fees are not returned on refunds.'),
    src: [['Shopify Pricing', 'https://www.shopify.com/pricing'], ['Shopify Help: Pricing plans and billing', 'https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/pricing-overview']] },
  { id: 'shopify-3p', g: 'Shopify', name: Z('Shopify · Basic · 第三方支付', 'Shopify · Basic · third-party gateway'), cur: 'USD', status: 'part',
    f: { commPct: 2, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 100 },
    note: Z('不用 Shopify Payments 时，Basic 另收 2% 交易费（已填在佣金）。第三方支付自身的费率（如 PayPal、Stripe）请自行核对并填到“支付手续费”。',
      'Without Shopify Payments, Basic adds a 2% transaction fee (entered as commission). The third-party gateway\'s own rate is not included — enter it under payment fee.'),
    src: [['Shopify Pricing', 'https://www.shopify.com/pricing']] },
  { id: 'ebay-us', g: 'eBay', name: Z('eBay 美国 · 多数类目（无店铺订阅）', 'eBay US · most categories (no store)'), cur: 'USD', status: 'part',
    f: { commPct: 13.6, commOnShip: 1, commFixed: 0.4, commMin: 0, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0, lowThr: 10, commFixedLow: 0.3 },
    note: Z('成交价值费 13.6%（基数含运费与销售税，这里没算税）+ 每单 $0.40（总额 ≤ $10 为 $0.30）。支付费已含在内。书籍影音 15.3%、珠宝手袋 15% 等其他类目、店铺订阅折扣、7500 美元以上部分 2.35%、广告费均未内置。eBay 官方页面我这边打不开（被拦截），数据来自引用该页面的第三方并与另一来源互相印证，所以只标“部分核对”。',
      'Final value fee 13.6% (base includes shipping and sales tax; tax not modelled) + $0.40 per order ($0.30 if total ≤ $10). Payment fees included. Other categories (books/media 15.3%, jewelry/handbags 15%…), store discounts, the 2.35% tier above $7,500 and ad fees are not built in. eBay\'s own page blocked my fetch; numbers come from third parties citing it, so only "partly verified".'),
    src: [['eBay: Selling fees', 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822'], ['第三方：sellmath eBay FVF', 'https://sellmath.com/en/guide/ebay-final-value-fees-by-category']] },
  { id: 'taobao', g: 'CN', name: Z('淘宝（非天猫）· 基础软件服务费', 'Taobao (non-Tmall) · base software fee'), cur: 'CNY', status: 'part',
    f: { commPct: 0.6, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 100 },
    note: Z('2024-09-01 起按确认收货成交金额 × 0.6% 收基础软件服务费，确认收货后退款不退已扣费用（所以默认退货费用不退）；同日起支付宝不再收原 0.6% 支付手续费。直通车/万相台等推广费、保证金、技术服务费类目差异请自行核对。来源为淘宝官方协议 + 第三方整理的规则全文，没能在淘宝规则中心原页核对。',
      'From 2024-09-01 Taobao charges 0.6% of the confirmed-received amount as a base software fee; not refunded after receipt confirmation. Alipay stopped its former 0.6% payment fee the same day. Promotion costs, deposits and category differences are not included. Sources: Taobao\'s official agreement plus a third-party write-up of the rule text; the original rule page was not checked.'),
    src: [['淘宝网卖家服务协议（官方）', 'https://terms.alicdn.com/legal-agreement/terms/suit_bu1_taobao/suit_bu1_taobao201908081502_44434.html'], ['基础软件服务费规则（第三方整理）', 'https://diantuoyi.com/article/4770.html'], ['淘宝支付服务费调整说明（第三方整理）', 'https://diantuoyi.com/article/10466.html']] },
  { id: 'xhs', g: 'CN', name: Z('小红书店铺（费率未核对）', 'Xiaohongshu shop (rates unverified)'), cur: 'CNY', status: 'none',
    f: { commPct: 0, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0 },
    note: Z('请自行核对：小红书的技术服务费按类目不同，官方招商页需要选择类目后才显示，我没能取到。有第三方文章称类目费率约 2%–5.7% 外加约 0.7% 支付渠道费、且“百万免佣”已于 2026-05 结束——这是转述、未经核实，所以本模板预填 0，请到“小红书招商官网 → 开店材料及费用”查你类目的数字再填。',
      'Please verify yourself: the fee depends on category, and the official page only shows it after choosing one — I could not retrieve it. Third-party articles mention ~2%–5.7% plus ~0.7% payment channel fee and the "free commission" promo ending in 2026-05; unverified hearsay, so this template is prefilled with 0. Look up your category on the official page and enter it.'),
    src: [['小红书招商官网：开店材料及费用', 'https://zhaoshang.xiaohongshu.com/merchant/materials-and-cost']] },
  { id: 'custom', g: 'Custom', name: Z('自定义（全部归零）', 'Custom (all zero)'), cur: 'CNY', status: 'none',
    f: { commPct: 0, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 0, payFixed: 0, listing: 0, retFeeKeep: 0 },
    note: Z('适合京东、拼多多、抖音、Shopee、Temu 或任何自己知道费率的渠道：手填佣金、支付费即可。', 'For any channel whose rates you know: fill commission and payment fee yourself.'),
    src: [] }
];
var GROUPS = { Etsy: 'Etsy', Amazon: Z('亚马逊', 'Amazon'), Shopify: 'Shopify', eBay: 'eBay', CN: Z('国内平台', 'China platforms'), Custom: Z('其他', 'Other') };

/* ---------------- 文案 ---------------- */
var I18N = {
  zh: {
    title: '利润定价计算器', sub: '小卖家工具箱 · 01', tabCalc: '计算', tabCompare: '情景对比', tabBatch: '批量 <i class="pro-tag">Pro</i>', tabRates: '费率与汇率',
    proBtn: 'Pro 解锁', proOn: 'Pro 已解锁',
    hTpl: '1 · 平台模板', hPrice: '2 · 售价与成本', hFee: '3 · 平台费用', hAd: '4 · 广告与退货', hTarget: '5 · 目标利润率',
    advSum: '高级：小额订单固定费', saveTpl: '存为我的模板', delTpl: '删除当前模板',
    rProfit: '每件利润', rMargin: '利润率', rBE: '盈亏平衡价', rFees: '平台费合计', saveSc: '保存为情景', applyTarget: '采用建议售价', detail: '明细',
    disc: '免责声明：平台费率、汇率与规则会变化，本工具的预设仅供参考，结果为估算，不构成财务、税务建议。定价前请以平台后台和自己的账单为准。',
    hScen: '已保存的情景', hCmp: '对比', hBatch: 'CSV 批量算利润',
    batchDesc: '按“计算”页当前选中的平台模板与费用设置，对每一行商品算利润。CSV 里没写的列用当前设置。',
    batchLocked: '批量导入与导出是 Pro 功能。', dlSample: '下载示例 CSV', pickCsv: '选择 CSV 文件', runPaste: '计算粘贴内容', expCsv: '导出结果 CSV',
    batchCols: '列：name 名称, price 售价, ship_income 收取运费, cost 成本, ship_cost 实际运费, other_cost 其他成本, ad_pct 广告%, return_rate 退货率%。也认中文表头。',
    hFx: '汇率（手动填写）', fxDesc: '没有内置汇率，避免过期数据误导你。填“1 单位该货币 = 多少人民币”，成本币种与售价币种不同时才会用到。',
    hSrc: '费率更新日期与来源', srcDesc: '下表为内置预设。“已核对”指在核对日读取了平台官方页面内容；“部分核对”指官方页面没能直接打开或含第三方转述；“请自行核对”表示没有拿到可靠来源，预设值不可直接使用。',
    foot: '数据只保存在本浏览器（localStorage），不上传。清除浏览器数据会丢失。',
    proTitle: 'Pro 解锁', pro1: 'CSV 批量导入多个商品，一次算完并导出结果', pro2: '保存多个自定义费率模板（免费版 1 个）', pro3: '情景保存上限 200 个，对比最多 8 个（免费 10 个 / 3 个）',
    proFree: '免费版的计算、模板、情景保存与对比都是完整可用的。', licLabel: '授权码',
    licNote: '当前只做本地格式校验，是占位实现，尚未接入收款与发码；校验可被绕过，不具备防盗版能力。',
    licApply: '验证并解锁', licClear: '清除授权', licBuy: '获取授权（收款未开通）', close: '关闭',
    licOK: '授权码有效，Pro 已在本机解锁。', licBad: '授权码无效，请检查格式。', licCleared: '已清除授权。',
    st_ok: '已核对', st_part: '部分核对', st_none: '请自行核对', checked: '核对日', src: '来源', modified: '（已修改）', myTpl: '我的模板',
    L_sellCur: '售价币种', L_costCur: '成本币种', L_price: '商品售价', L_shipIncome: '向买家收取的运费', L_cost: '进货/生产成本', L_shipCost: '实际发货运费 / 配送费', L_otherCost: '其他成本（包装、人工…）',
    L_commPct: '平台佣金 %', L_commOnShip: '佣金基数含运费', L_commFixed: '每单固定佣金', L_commMin: '佣金最低收费', L_payPct: '支付手续费 %', L_payFixed: '每单支付固定费', L_listing: '刊登费（每件摊）',
    L_lowThr: '小额订单阈值（总额 ≤）', L_commFixedLow: '小额订单固定费',
    L_adPct: '广告费占售价 %', L_adFixed: '每单广告费', L_retRate: '退货率 %', L_retShip: '每次退货的退回运费', L_retResale: '退回后可再售比例 %', L_retFeeKeep: '退货时平台费不退还比例 %',
    L_targetMargin: '目标利润率 %',
    H_price: '不含运费的商品价格', H_shipIncome: '买家付的运费；包邮填 0', H_commOnShip: '多数平台按含运费总额收', H_commMin: '如亚马逊 $0.30，0 表示无', H_listing: '如 Etsy 每次刊登 $0.20', H_adPct: '按售价比例；Etsy 站外广告可填 12–15', H_adFixed: '按单计的广告成本，如 CPA', H_retResale: '退回商品还能卖出的成本比例', H_retFeeKeep: 'Shopify 刷卡费退款时不退，填 100', H_targetMargin: '利润率 = 每件利润 ÷（售价 + 收取运费）',
    yes: '是',
    rLines: ['商品售价', '收取运费', '平台佣金', '支付手续费', '刊登费', '广告费', '进货/生产成本', '实际运费', '其他成本'], rKeep: '未退货时利润', rRet: '退货预期损失', rFinal: '每件利润（含退货期望）',
    legFees: '平台费', legAd: '广告', legCost: '成本', legShip: '运费', legOther: '其他', legRet: '退货损失', legProfit: '利润',
    tgtLine: function (p, m, cur) { return '想要 ' + m + ' 利润率 → 建议售价 <b>' + p + '</b>'; },
    tgtNone: '目标利润率在当前费用结构下无法达到（费用+广告占比已超过 100% − 目标）。',
    beNone: '当前费用结构下任何售价都不盈利。',
    wUnverified: '这个模板的费率没有核对到可靠来源，请先填写真实费率，否则结果不可信。',
    wPart: '这个模板只做了部分核对，请对照平台后台。',
    wRate: function (a, b) { return '缺少汇率：请在“费率与汇率”里填 ' + a + (b ? ' 和 ' + b : '') + ' 对人民币的汇率，成本无法折算。'; },
    wLoss: '按当前设置每件亏损。', wFeeHigh: '各项比例合计 ≥ 100%，价格再高也无法盈利。',
    cnyLine: function (v) { return '折合 ' + v; },
    scName: '给这个情景起个名字', scDefault: '情景', scSaved: '已保存情景', scLimit: function (n) { return '免费版最多保存 ' + n + ' 个情景，可删除旧的或解锁 Pro。'; },
    scEmpty: '还没有保存的情景。在“计算”页点“保存为情景”。', scLoad: '载入', scDel: '删除', scSel: '对比',
    cmpEmpty: '勾选 2 个以上情景进行对比。', cmpMax: function (n) { return '当前最多对比 ' + n + ' 个。'; },
    cRows: ['平台模板', '售价币种', '商品售价', '每件利润', '利润率', '盈亏平衡价', '平台费合计', '成本（折算）'], cBest: '利润率最高',
    tplName: '给模板起个名字', tplSaved: '已保存模板', tplLimit: '免费版只能保存 1 个自定义模板，覆盖请先删除旧的，或解锁 Pro。', tplDeleted: '已删除', tplNoDel: '内置模板不能删除。', tplEx: '内置模板',
    proNeed: '这是 Pro 功能。', csvEmpty: '没有可计算的行。', csvDone: function (n) { return '已计算 ' + n + ' 行'; }, csvCols: ['名称', '售价', '收取运费', '成本', '实际运费', '其他成本', '广告%', '退货率%', '平台费', '每件利润', '利润率', '盈亏平衡价', '建议售价'],
    fxRow: function (c) { return '1 ' + c + ' ='; }, fxUnit: 'CNY', fxFixed: '基准',
    sTplCols: ['模板', '状态', '核对日', '来源与备注'], unreach: '无法达到'
  },
  en: {
    title: 'Profit & Price Calculator', sub: 'Seller toolbox · 01', tabCalc: 'Calculator', tabCompare: 'Compare', tabBatch: 'Batch <i class="pro-tag">Pro</i>', tabRates: 'Rates & FX',
    proBtn: 'Unlock Pro', proOn: 'Pro unlocked',
    hTpl: '1 · Platform template', hPrice: '2 · Price & costs', hFee: '3 · Platform fees', hAd: '4 · Ads & returns', hTarget: '5 · Target margin',
    advSum: 'Advanced: small-order fixed fee', saveTpl: 'Save as my template', delTpl: 'Delete this template',
    rProfit: 'Profit per unit', rMargin: 'Margin', rBE: 'Break-even price', rFees: 'Platform fees', saveSc: 'Save scenario', applyTarget: 'Use suggested price', detail: 'Details',
    disc: 'Disclaimer: platform fees, FX rates and rules change. Presets are for reference and results are estimates, not financial or tax advice. Check your platform dashboard and statements before pricing.',
    hScen: 'Saved scenarios', hCmp: 'Comparison', hBatch: 'Batch profit from CSV',
    batchDesc: 'Uses the platform template and fee settings currently selected on the Calculator tab. Columns missing from the CSV fall back to those settings.',
    batchLocked: 'Batch import/export is a Pro feature.', dlSample: 'Download sample CSV', pickCsv: 'Choose CSV file', runPaste: 'Calculate pasted text', expCsv: 'Export results CSV',
    batchCols: 'Columns: name, price, ship_income, cost, ship_cost, other_cost, ad_pct, return_rate (%). Chinese headers also accepted.',
    hFx: 'Exchange rates (manual)', fxDesc: 'No built-in rates, so stale data cannot mislead you. Enter "1 unit of currency = how many CNY". Only used when cost currency differs from selling currency.',
    hSrc: 'Fee update dates & sources', srcDesc: '"Verified" = official page content was read on the check date. "Partly" = the official page could not be opened directly or relies on third-party reports. "Verify yourself" = no reliable source found; do not use the preset as is.',
    foot: 'Data stays in this browser (localStorage) and is never uploaded. Clearing browser data erases it.',
    proTitle: 'Unlock Pro', pro1: 'Batch-import many products via CSV and export results', pro2: 'Save multiple custom fee templates (free: 1)', pro3: 'Up to 200 saved scenarios, compare up to 8 (free: 10 / 3)',
    proFree: 'The free version is fully usable: calculation, templates, saving and comparing scenarios.', licLabel: 'License key',
    licNote: 'Local format check only — a placeholder. Payment and key issuing are not connected; the check can be bypassed and is not anti-piracy.',
    licApply: 'Verify & unlock', licClear: 'Clear license', licBuy: 'Get a key (payments not live)', close: 'Close',
    licOK: 'Key accepted. Pro unlocked on this device.', licBad: 'Invalid key. Check the format.', licCleared: 'License cleared.',
    st_ok: 'Verified', st_part: 'Partly verified', st_none: 'Verify yourself', checked: 'Checked', src: 'Sources', modified: ' (modified)', myTpl: 'My templates',
    L_sellCur: 'Selling currency', L_costCur: 'Cost currency', L_price: 'Item price', L_shipIncome: 'Shipping charged to buyer', L_cost: 'Product cost', L_shipCost: 'Actual shipping / fulfilment', L_otherCost: 'Other costs (packaging, labor…)',
    L_commPct: 'Commission %', L_commOnShip: 'Commission base includes shipping', L_commFixed: 'Fixed commission per order', L_commMin: 'Minimum commission', L_payPct: 'Payment fee %', L_payFixed: 'Fixed payment fee per order', L_listing: 'Listing fee (per sale)',
    L_lowThr: 'Small-order threshold (total ≤)', L_commFixedLow: 'Fixed fee for small orders',
    L_adPct: 'Ads, % of price', L_adFixed: 'Ads per order', L_retRate: 'Return rate %', L_retShip: 'Return shipping per return', L_retResale: 'Resalable after return %', L_retFeeKeep: 'Platform fees not refunded on return %',
    L_targetMargin: 'Target margin %',
    H_price: 'Price excluding shipping', H_shipIncome: 'What the buyer pays; 0 if free shipping', H_commOnShip: 'Most platforms charge on item + shipping', H_commMin: 'e.g. Amazon $0.30; 0 = none', H_listing: 'e.g. Etsy $0.20 per listing', H_adPct: 'Share of price; Etsy Offsite Ads 12–15', H_adFixed: 'Per-order ad cost, e.g. CPA', H_retResale: 'Share of cost recovered when resold', H_retFeeKeep: 'Shopify keeps card fees on refunds: 100', H_targetMargin: 'Margin = profit ÷ (price + shipping charged)',
    yes: 'Yes',
    rLines: ['Item price', 'Shipping charged', 'Commission', 'Payment fee', 'Listing fee', 'Advertising', 'Product cost', 'Actual shipping', 'Other costs'], rKeep: 'Profit if kept', rRet: 'Expected return loss', rFinal: 'Profit per unit (expected)',
    legFees: 'Fees', legAd: 'Ads', legCost: 'Cost', legShip: 'Shipping', legOther: 'Other', legRet: 'Returns', legProfit: 'Profit',
    tgtLine: function (p, m) { return 'For a ' + m + ' margin → suggested price <b>' + p + '</b>'; },
    tgtNone: 'The target margin is unreachable with this fee structure (fees + ads exceed 100% − target).',
    beNone: 'No price is profitable under this fee structure.',
    wUnverified: 'No reliable source was found for this template\'s rates. Enter real rates first or the result is meaningless.',
    wPart: 'This template is only partly verified. Compare with your platform dashboard.',
    wRate: function (a, b) { return 'Missing FX rate: enter ' + a + (b ? ' and ' + b : '') + ' to CNY under Rates & FX; costs cannot be converted.'; },
    wLoss: 'You lose money on each unit at these settings.', wFeeHigh: 'Percentages add up to ≥ 100%; no price can be profitable.',
    cnyLine: function (v) { return '≈ ' + v; },
    scName: 'Name this scenario', scDefault: 'Scenario', scSaved: 'Scenario saved', scLimit: function (n) { return 'Free plan keeps up to ' + n + ' scenarios. Delete old ones or unlock Pro.'; },
    scEmpty: 'No saved scenarios yet. Use "Save scenario" on the Calculator tab.', scLoad: 'Load', scDel: 'Delete', scSel: 'Compare',
    cmpEmpty: 'Tick two or more scenarios to compare.', cmpMax: function (n) { return 'You can compare up to ' + n + ' at a time.'; },
    cRows: ['Template', 'Currency', 'Item price', 'Profit / unit', 'Margin', 'Break-even', 'Platform fees', 'Cost (converted)'], cBest: 'Best margin',
    tplName: 'Name this template', tplSaved: 'Template saved', tplLimit: 'Free plan keeps 1 custom template. Delete the old one or unlock Pro.', tplDeleted: 'Deleted', tplNoDel: 'Built-in templates cannot be deleted.', tplEx: 'Built-in',
    proNeed: 'This is a Pro feature.', csvEmpty: 'No rows to calculate.', csvDone: function (n) { return n + ' rows calculated'; }, csvCols: ['name', 'price', 'ship_income', 'cost', 'ship_cost', 'other_cost', 'ad_pct', 'return_rate', 'fees', 'profit', 'margin', 'break_even', 'suggested_price'],
    fxRow: function (c) { return '1 ' + c + ' ='; }, fxUnit: 'CNY', fxFixed: 'base',
    sTplCols: ['Template', 'Status', 'Checked', 'Sources & notes'], unreach: 'unreachable'
  }
};

/* ---------------- 表单字段定义 ---------------- */
var FIELDS = {
  basic: [
    { k: 'sellCur', t: 'cur' }, { k: 'costCur', t: 'cur' },
    { k: 'price', u: 'sell', h: 1 }, { k: 'shipIncome', u: 'sell', h: 1 },
    { k: 'cost', u: 'cost' }, { k: 'shipCost', u: 'cost' }, { k: 'otherCost', u: 'cost' }
  ],
  fee: [
    { k: 'commPct', u: '%' }, { k: 'commFixed', u: 'sell' },
    { k: 'commOnShip', t: 'chk', h: 1 }, { k: 'commMin', u: 'sell', h: 1 },
    { k: 'payPct', u: '%' }, { k: 'payFixed', u: 'sell' }, { k: 'listing', u: 'sell', h: 1 }
  ],
  adv: [{ k: 'lowThr', u: 'sell' }, { k: 'commFixedLow', u: 'sell' }],
  ad: [
    { k: 'adPct', u: '%', h: 1 }, { k: 'adFixed', u: 'sell', h: 1 },
    { k: 'retRate', u: '%' }, { k: 'retShip', u: 'cost' }, { k: 'retResale', u: '%', h: 1 }, { k: 'retFeeKeep', u: '%', h: 1 }
  ],
  target: [{ k: 'targetMargin', u: '%', h: 1 }]
};
var FEE_KEYS = ['commPct', 'commOnShip', 'commFixed', 'commMin', 'payPct', 'payFixed', 'listing', 'retFeeKeep', 'lowThr', 'commFixedLow'];

function defaultState() {
  return { tpl: 'etsy-us', dirty: false, sellCur: 'USD', costCur: 'CNY', price: 30, shipIncome: 5, cost: 45, shipCost: 4.5, otherCost: 8,
    commPct: 6.5, commOnShip: 1, commFixed: 0, commMin: 0, payPct: 3, payFixed: 0.25, listing: 0.2, lowThr: 0, commFixedLow: 0,
    adPct: 0, adFixed: 0, retRate: 3, retShip: 0, retResale: 80, retFeeKeep: 0, targetMargin: 25 };
}

/* ---------------- 存储 ---------------- */
var KEY = 'pc.v1';
var store = { lang: guessLang(), state: defaultState(), rates: {}, scenarios: [], myTpls: [], license: '' };
function guessLang() { return /^zh/i.test(navigator.language || 'zh') ? 'zh' : 'en'; }
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      store.lang = o.lang === 'en' ? 'en' : o.lang === 'zh' ? 'zh' : store.lang;
      store.state = Object.assign(defaultState(), o.state || {});
      store.rates = o.rates || {}; store.scenarios = o.scenarios || []; store.myTpls = o.myTpls || []; store.license = o.license || '';
    }
  } catch (e) { /* 损坏的存档直接忽略 */ }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast('localStorage 不可用 / unavailable'); } }

/* ---------------- 授权占位 ---------------- */
var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function licSum(a, b) {
  var h = 2166136261, s = 'PC1' + a + b;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  var out = ''; for (var j = 0; j < 4; j++) { out += ALPHA[h & 31]; h >>>= 5; }
  return out;
}
function licValid(k) {
  var m = /^PC1-([A-HJ-NP-Z2-9]{4})-([A-HJ-NP-Z2-9]{4})-([A-HJ-NP-Z2-9]{4})$/.exec((k || '').trim().toUpperCase());
  return !!m && licSum(m[1], m[2]) === m[3];
}
function isPro() { return licValid(store.license); }

/* ---------------- 计算核心 ---------------- */
function num(v) { v = parseFloat(v); return isFinite(v) ? v : 0; }
function costK(s, rates) {
  if (s.costCur === s.sellCur) return 1;
  var a = s.costCur === 'CNY' ? 1 : num(rates[s.costCur]), b = s.sellCur === 'CNY' ? 1 : num(rates[s.sellCur]);
  return a > 0 && b > 0 ? a / b : NaN;
}
function calc(s, P, k) {
  var S = s.shipIncome, rev = P + S;
  var base = s.commOnShip ? rev : P;
  var fixed = (s.lowThr > 0 && rev <= s.lowThr) ? s.commFixedLow : s.commFixed;
  var comm = rev > 0 ? Math.max(base * s.commPct / 100, s.commMin) + fixed : 0;
  var pay = rev > 0 ? rev * s.payPct / 100 + s.payFixed : 0;
  var listing = s.listing;
  var ad = P * s.adPct / 100 + s.adFixed;
  var cost = s.cost * k, shipCost = s.shipCost * k, other = s.otherCost * k, retShip = s.retShip * k;
  var keep = rev - comm - pay - listing - ad - cost - shipCost - other;
  var r = Math.min(Math.max(s.retRate, 0), 100) / 100;
  var retProfit = -(shipCost + retShip + (1 - s.retResale / 100) * cost + other + ad + (s.retFeeKeep / 100) * (comm + pay) + listing);
  var retAdj = r * (retProfit - keep);
  var profit = keep + retAdj;
  return { P: P, rev: rev, comm: comm, pay: pay, listing: listing, fees: comm + pay + listing, ad: ad, cost: cost, shipCost: shipCost, other: other,
    keep: keep, retAdj: retAdj, profit: profit, margin: rev > 0 ? profit / rev : NaN };
}
// 找到最小售价使 利润 - m×(售价+运费收入) ≥ 0；找不到返回 null
function solve(s, k, m) {
  if (!isFinite(k) || m >= 1) return null;
  var f = function (P) { var c = calc(s, P, k); return c.profit - m * c.rev; };
  if (f(0) >= 0 && s.shipIncome > 0) return 0;
  var hi = 1;
  while (f(hi) < 0 && hi < 1e9) hi *= 2;
  if (f(hi) < 0) return null;
  var lo = 0;
  for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (f(mid) >= 0) hi = mid; else lo = mid; }
  var P = Math.ceil(hi * 100 - 1e-7) / 100, n = 0;
  while (f(P) < -1e-9 && n++ < 2000) P = Math.round((P + 0.01) * 100) / 100;
  return P;
}

/* ---------------- 工具 ---------------- */
var $ = function (id) { return document.getElementById(id); };
function T() { return I18N[store.lang]; }
function L(o) { return typeof o === 'string' ? o : o[store.lang]; }
function money(v, cur) {
  if (!isFinite(v)) return '—';
  try { return new Intl.NumberFormat(store.lang === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: cur, currencyDisplay: 'code', maximumFractionDigits: cur === 'JPY' ? 0 : 2 }).format(v).replace(/\u00a0/g, ' '); }
  catch (e) { return v.toFixed(2) + ' ' + cur; }
}
function pct(v) { return isFinite(v) ? (v * 100).toFixed(1) + '%' : '—'; }
function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
var toastTimer;
function toast(msg) { var el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2400); }
function allTpls() { return TPLS.concat(store.myTpls.map(function (m) { return { id: m.id, g: 'My', name: m.name, cur: m.cur, status: 'none', f: m.f, my: 1, note: '', src: [] }; })); }
function getTpl(id) { return allTpls().filter(function (t) { return t.id === id; })[0]; }
function numOr(v, d) { return v === undefined ? d : v; }

/* ---------------- 渲染：表单 ---------------- */
function buildForm() {
  var t = T();
  [['f-basic', FIELDS.basic], ['f-fee', FIELDS.fee], ['f-adv', FIELDS.adv], ['f-ad', FIELDS.ad], ['f-target', FIELDS.target]].forEach(function (g) {
    $(g[0]).innerHTML = g[1].map(function (f) { return fieldHTML(f, t); }).join('');
  });
  var sel = $('tpl'), html = '';
  var groups = {};
  allTpls().forEach(function (x) { (groups[x.g] = groups[x.g] || []).push(x); });
  Object.keys(groups).forEach(function (g) {
    var label = g === 'My' ? t.myTpl : L(GROUPS[g]);
    html += '<optgroup label="' + esc(label) + '">' + groups[g].map(function (x) {
      return '<option value="' + esc(x.id) + '">' + esc(L(x.name)) + (x.status === 'none' && !x.my && x.id !== 'custom' ? ' ⚠' : '') + '</option>'; }).join('') + '</optgroup>';
  });
  sel.innerHTML = html;
  syncForm();
}
function fieldHTML(f, t) {
  var label = t['L_' + f.k], hint = f.h && t['H_' + f.k] ? '<small>' + esc(t['H_' + f.k]) + '</small>' : '';
  if (f.t === 'cur') {
    return '<div class="fld"><label for="i-' + f.k + '">' + esc(label) + '</label><select id="i-' + f.k + '" data-k="' + f.k + '">' + CURS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div>';
  }
  if (f.t === 'chk') {
    return '<div class="fld chk"><label><input type="checkbox" id="i-' + f.k + '" data-k="' + f.k + '"> ' + esc(label) + '</label>' + hint + '</div>';
  }
  return '<div class="fld"><label for="i-' + f.k + '">' + esc(label) + '</label><div class="inp"><input id="i-' + f.k + '" data-k="' + f.k + '" type="number" inputmode="decimal" step="any" min="0"><span class="unit" data-u="' + f.u + '"></span></div>' + hint + '</div>';
}
function syncForm() {
  var s = store.state;
  document.querySelectorAll('[data-k]').forEach(function (el) {
    var k = el.dataset.k;
    if (el.type === 'checkbox') el.checked = !!s[k];
    else if (el.tagName === 'SELECT') el.value = s[k];
    else el.value = s[k] === 0 ? '' : s[k];
  });
  $('tpl').value = s.tpl;
  syncUnits();
}
function syncUnits() {
  var s = store.state;
  document.querySelectorAll('.unit').forEach(function (u) { u.textContent = u.dataset.u === 'sell' ? s.sellCur : u.dataset.u === 'cost' ? s.costCur : '%'; });
}
function applyTpl(id) {
  var tp = getTpl(id); if (!tp) return;
  var s = store.state;
  s.tpl = id; s.dirty = false; s.sellCur = tp.cur;
  FEE_KEYS.forEach(function (k) { s[k] = numOr(tp.f[k], 0); });
  syncForm(); render(); save();
}

/* ---------------- 渲染：结果 ---------------- */
var last = null;
function render() {
  var t = T(), s = store.state, k = costK(s, store.rates), cur = s.sellCur;
  var c = calc(s, s.price, k);
  var be = solve(s, k, 0);
  var tm = s.targetMargin / 100, tp = solve(s, k, tm);
  last = { c: c, be: be, tp: tp, k: k };
  var tpl = getTpl(s.tpl);

  // 模板信息
  var st = tpl ? tpl.status : 'none';
  var info = '';
  if (tpl) {
    info += '<span class="st st-' + st + '">' + t['st_' + st] + '</span>';
    if (tpl.my) info += '<span class="muted">' + t.myTpl + '</span>';
    else if (tpl.id !== 'custom') info += '<span class="muted">' + t.checked + ' ' + DATE + '</span>';
    if (s.dirty) info += '<span class="muted">' + t.modified + '</span>';
    if (tpl.note) info += '<p>' + esc(L(tpl.note)) + '</p>';
    if (tpl.src.length) info += '<p class="srcs">' + t.src + '：' + tpl.src.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a>'; }).join(' · ') + '</p>';
  }
  $('tplInfo').innerHTML = info;
  $('delTpl').style.display = tpl && tpl.my ? '' : 'none';

  // 警告
  var w = [];
  if (st === 'none' && tpl && !tpl.my && tpl.id !== 'custom') w.push(t.wUnverified);
  else if (st === 'part') w.push(t.wPart);
  if (!isFinite(k)) w.push(t.wRate(s.costCur, s.sellCur !== 'CNY' ? s.sellCur : ''));
  var ratio = (s.commPct + s.payPct + s.adPct) / 100 + (s.retRate ? 0 : 0);
  if (ratio >= 1) w.push(t.wFeeHigh);
  else if (isFinite(c.profit) && c.profit < 0) w.push(t.wLoss);
  $('rWarn').innerHTML = w.map(function (x) { return '<div class="warn">' + esc(x) + '</div>'; }).join('');
  $('rBadge').className = 'badge st-' + st; $('rBadge').textContent = tpl ? t['st_' + st] : '';

  var ok = isFinite(c.profit);
  var pe = $('rProfit'); pe.textContent = ok ? money(c.profit, cur) : '—'; pe.className = 'big ' + (ok ? (c.profit < 0 ? 'neg' : 'pos') : '');
  $('rMargin').textContent = ok ? pct(c.margin) : '—';
  $('rMargin').className = ok && c.profit < 0 ? 'neg' : '';
  $('rBE').textContent = be === null ? (isFinite(k) ? t.unreach : '—') : money(be, cur);
  $('rFees').textContent = ok ? money(c.fees, cur) : '—';
  var cnyRate = cur === 'CNY' ? 1 : num(store.rates[cur]);
  $('rProfitCny').textContent = ok && cur !== 'CNY' && cnyRate > 0 ? t.cnyLine(money(c.profit * cnyRate, 'CNY')) : '';
  $('mProfit').textContent = ok ? money(c.profit, cur) : '—'; $('mProfit').className = ok && c.profit < 0 ? 'neg' : '';
  $('mMargin').textContent = ok ? pct(c.margin) : '—';

  var mtxt = (s.targetMargin || 0) + '%';
  $('rTarget').innerHTML = tp === null ? '<span class="muted">' + esc(isFinite(k) ? t.tgtNone : '') + '</span>' : t.tgtLine(esc(money(tp, cur)), mtxt, cur);
  $('applyTarget').disabled = tp === null;

  // 条形图与明细
  if (ok) {
    var segs = [['fees', c.fees, t.legFees], ['ad', c.ad, t.legAd], ['cost', c.cost, t.legCost], ['ship', c.shipCost, t.legShip], ['other', c.other, t.legOther], ['ret', Math.max(-c.retAdj, 0), t.legRet], ['profit', Math.max(c.profit, 0), t.legProfit]];
    var tot = segs.reduce(function (a, x) { return a + x[1]; }, 0);
    $('rBar').innerHTML = tot > 0 ? segs.filter(function (x) { return x[1] > 0; }).map(function (x) { return '<i class="s-' + x[0] + '" style="width:' + (x[1] / tot * 100).toFixed(2) + '%"></i>'; }).join('') : '';
    $('rLegend').innerHTML = segs.filter(function (x) { return x[1] > 0; }).map(function (x) { return '<span><i class="s-' + x[0] + '"></i>' + x[2] + ' ' + (x[1] / tot * 100).toFixed(0) + '%</span>'; }).join('');
    var N = t.rLines, rows = [
      [N[0], c.P], [N[1], s.shipIncome], [N[2], -c.comm], [N[3], -c.pay], [N[4], -c.listing], [N[5], -c.ad], [N[6], -c.cost], [N[7], -c.shipCost], [N[8], -c.other]
    ].filter(function (r) { return r[1] !== 0 || r[0] === N[0]; });
    var h = rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="n">' + money(r[1], cur) + '</td></tr>'; }).join('');
    h += '<tr class="sum"><td>' + t.rKeep + '</td><td class="n">' + money(c.keep, cur) + '</td></tr>';
    if (s.retRate > 0) h += '<tr><td>' + t.rRet + ' (' + s.retRate + '%)</td><td class="n">' + money(c.retAdj, cur) + '</td></tr>';
    h += '<tr class="sum fin"><td>' + t.rFinal + '</td><td class="n">' + money(c.profit, cur) + '</td></tr>';
    $('rTable').innerHTML = h;
  } else { $('rBar').innerHTML = ''; $('rLegend').innerHTML = ''; $('rTable').innerHTML = ''; }
}

/* ---------------- 情景与对比 ---------------- */
var cmpSel = {};
function limits() { return isPro() ? LIM.pro : LIM.free; }
function snapshot(s) { return JSON.parse(JSON.stringify(s)); }
function evalState(s) {
  var k = costK(s, store.rates), c = calc(s, s.price, k);
  return { c: c, be: solve(s, k, 0), k: k };
}
function renderScenarios() {
  var t = T(), list = store.scenarios;
  $('scCount').textContent = list.length + ' / ' + limits().sc;
  if (!list.length) $('scList').innerHTML = '<p class="muted">' + t.scEmpty + '</p>';
  else $('scList').innerHTML = '<ul class="sc">' + list.map(function (x) {
    var e = evalState(x.s), tpl = getTpl(x.s.tpl);
    return '<li><label class="pick"><input type="checkbox" data-sc="' + x.id + '"' + (cmpSel[x.id] ? ' checked' : '') + '> <span>' + t.scSel + '</span></label>' +
      '<div class="sc-m"><b>' + esc(x.name) + '</b><span class="muted small">' + esc(tpl ? L(tpl.name) : x.s.tpl) + ' · ' + money(x.s.price, x.s.sellCur) + '</span></div>' +
      '<div class="sc-n ' + (e.c.profit < 0 ? 'neg' : 'pos') + '">' + money(e.c.profit, x.s.sellCur) + '<small>' + pct(e.c.margin) + '</small></div>' +
      '<button class="btn sm ghost" data-load="' + x.id + '">' + t.scLoad + '</button><button class="btn sm ghost" data-del="' + x.id + '">' + t.scDel + '</button></li>';
  }).join('') + '</ul>';
  var ids = Object.keys(cmpSel).filter(function (id) { return cmpSel[id]; });
  var items = store.scenarios.filter(function (x) { return ids.indexOf(x.id) >= 0; });
  if (items.length < 2) { $('cmpWrap').innerHTML = '<p class="muted">' + t.cmpEmpty + '</p>'; return; }
  var ev = items.map(function (x) { return evalState(x.s); });
  var best = 0; ev.forEach(function (e, i) { if (!(ev[best].c.margin >= e.c.margin)) best = i; });
  var R = t.cRows, h = '<table class="cmp"><thead><tr><th></th>' + items.map(function (x, i) { return '<th>' + esc(x.name) + (i === best ? '<span class="best">' + t.cBest + '</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
  function row(label, fn, cls) { h += '<tr class="' + (cls || '') + '"><td>' + label + '</td>' + items.map(function (x, i) { return '<td class="n">' + fn(x, ev[i]) + '</td>'; }).join('') + '</tr>'; }
  row(R[0], function (x) { var tp = getTpl(x.s.tpl); return esc(tp ? L(tp.name) : x.s.tpl); }, 'txt');
  row(R[1], function (x) { return x.s.sellCur; });
  row(R[2], function (x) { return money(x.s.price, x.s.sellCur); });
  row(R[3], function (x, e) { return '<b class="' + (e.c.profit < 0 ? 'neg' : 'pos') + '">' + money(e.c.profit, x.s.sellCur) + '</b>'; });
  row(R[4], function (x, e) { return pct(e.c.margin); });
  row(R[5], function (x, e) { return e.be === null ? t.unreach : money(e.be, x.s.sellCur); });
  row(R[6], function (x, e) { return money(e.c.fees, x.s.sellCur); });
  row(R[7], function (x, e) { return money(e.c.cost + e.c.shipCost + e.c.other, x.s.sellCur); });
  $('cmpWrap').innerHTML = h + '</tbody></table>';
}

/* ---------------- 费率与汇率页 ---------------- */
function renderRates() {
  var t = T();
  $('fxGrid').innerHTML = CURS.map(function (c) {
    return '<div class="fld"><label>' + t.fxRow(c) + '</label><div class="inp">' + (c === 'CNY' ? '<input value="1" disabled>' : '<input type="number" inputmode="decimal" step="any" min="0" data-fx="' + c + '" value="' + (store.rates[c] || '') + '">') + '<span class="unit">' + t.fxUnit + '</span></div></div>';
  }).join('');
  var h = '<table class="src"><thead><tr>' + t.sTplCols.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
  TPLS.filter(function (x) { return x.id !== 'custom'; }).forEach(function (x) {
    h += '<tr><td><b>' + esc(L(x.name)) + '</b></td><td><span class="st st-' + x.status + '">' + t['st_' + x.status] + '</span></td><td class="nw">' + DATE + '</td><td>' +
      x.src.map(function (u) { return '<a href="' + u[1] + '" target="_blank" rel="noopener">' + esc(u[0]) + '</a>'; }).join('<br>') + '<div class="muted small">' + esc(L(x.note)) + '</div></td></tr>';
  });
  $('srcTable').innerHTML = h + '</tbody></table>';
}

/* ---------------- CSV 批量 ---------------- */
var batchRows = [];
var HEAD = { name: 'name', 名称: 'name', 商品: 'name', price: 'price', 售价: 'price', ship_income: 'shipIncome', 收取运费: 'shipIncome', 运费收入: 'shipIncome', cost: 'cost', 成本: 'cost',
  ship_cost: 'shipCost', 实际运费: 'shipCost', 运费成本: 'shipCost', other_cost: 'otherCost', 其他成本: 'otherCost', ad_pct: 'adPct', 广告: 'adPct', 广告占比: 'adPct', return_rate: 'retRate', 退货率: 'retRate' };
function parseCSV(text) {
  text = text.replace(/^\ufeff/, '');
  var rows = [], row = [], cur = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t' || ch === ';') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row);
  return rows;
}
function runBatch(text) {
  var t = T();
  if (!isPro()) { toast(t.proNeed); openPro(); return; }
  var rows = parseCSV(text);
  if (rows.length < 2) { toast(t.csvEmpty); return; }
  var head = rows[0].map(function (x) { var key = x.trim().replace(/[%％]$/, '').toLowerCase().replace(/\s+/g, '_'); return HEAD[key] || HEAD[x.trim()] || null; });
  var s0 = store.state, k = costK(s0, store.rates);
  batchRows = [];
  rows.slice(1).forEach(function (r, i) {
    var s = Object.assign({}, s0), name = '#' + (i + 1);
    head.forEach(function (key, j) {
      if (!key || r[j] === undefined || r[j].trim() === '') return;
      if (key === 'name') name = r[j].trim(); else s[key] = num(r[j].replace(/[%％,]/g, ''));
    });
    var c = calc(s, s.price, k);
    batchRows.push({ name: name, s: s, c: c, be: solve(s, k, 0), tp: solve(s, k, s0.targetMargin / 100) });
  });
  renderBatch();
  toast(t.csvDone(batchRows.length));
}
function renderBatch() {
  var t = T(), cur = store.state.sellCur;
  $('batchLock').style.display = isPro() ? 'none' : '';
  if (!batchRows.length) { $('batchOut').innerHTML = ''; return; }
  var C = t.csvCols;
  var h = '<table class="cmp"><thead><tr>' + [C[0], C[1], C[3], C[8], C[9], C[10], C[11], C[12]].map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
  batchRows.forEach(function (r) {
    h += '<tr><td class="txt">' + esc(r.name) + '</td><td class="n">' + money(r.s.price, cur) + '</td><td class="n">' + r.s.cost + '</td><td class="n">' + money(r.c.fees, cur) + '</td><td class="n"><b class="' + (r.c.profit < 0 ? 'neg' : 'pos') + '">' + money(r.c.profit, cur) + '</b></td><td class="n">' + pct(r.c.margin) + '</td><td class="n">' + (r.be === null ? '—' : money(r.be, cur)) + '</td><td class="n">' + (r.tp === null ? '—' : money(r.tp, cur)) + '</td></tr>';
  });
  $('batchOut').innerHTML = h + '</tbody></table>';
}
function csvCell(v) {
  v = String(v);
  if (/^[=+\-@]/.test(v) && isNaN(Number(v))) v = "'" + v;   // 防公式注入
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function download(name, text) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function exportBatch() {
  var t = T();
  if (!isPro()) { toast(t.proNeed); openPro(); return; }
  if (!batchRows.length) { toast(t.csvEmpty); return; }
  var C = t.csvCols, cur = store.state.sellCur;
  var out = [C.concat(['currency']).map(csvCell).join(',')];
  batchRows.forEach(function (r) {
    out.push([r.name, r.s.price, r.s.shipIncome, r.s.cost, r.s.shipCost, r.s.otherCost, r.s.adPct, r.s.retRate, r.c.fees.toFixed(2), r.c.profit.toFixed(2), (r.c.margin * 100).toFixed(1) + '%', r.be === null ? '' : r.be.toFixed(2), r.tp === null ? '' : r.tp.toFixed(2), cur].map(csvCell).join(','));
  });
  download('profit-results.csv', out.join('\r\n'));
}

/* ---------------- Pro 对话框 ---------------- */
function openPro() {
  $('licIn').value = store.license; setLicMsg();
  var d = $('proDlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
}
function setLicMsg(msg, bad) {
  $('licMsg').textContent = msg || (isPro() ? T().licOK : ''); $('licMsg').className = 'licmsg' + (bad ? ' bad' : isPro() || msg ? ' good' : '');
}
function refreshPro() {
  var b = $('proBtn'); b.classList.toggle('on', isPro());
  b.firstElementChild.textContent = isPro() ? T().proOn : T().proBtn;
  $('batchLock').style.display = isPro() ? 'none' : '';
  $('batchCard').classList.toggle('locked', !isPro());
}

/* ---------------- 语言 ---------------- */
function applyLang() {
  var t = T();
  document.documentElement.lang = store.lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(function (el) { var v = t[el.dataset.i18n]; if (typeof v === 'string') el.innerHTML = v; });
  $('langBtn').textContent = store.lang === 'zh' ? 'EN' : '中';
  document.title = t.title + ' · ' + (store.lang === 'zh' ? 'Profit & Price Calculator' : '利润定价计算器');
  buildForm(); render(); renderScenarios(); renderRates(); renderBatch(); refreshPro();
}

/* ---------------- 事件 ---------------- */
function setTab(name) {
  document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'tab-' + name); });
  document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
  document.body.dataset.tab = name;
  if (name === 'compare') renderScenarios();
  window.scrollTo(0, 0);
}
function init() {
  load();
  document.addEventListener('input', function (e) {
    var el = e.target, s = store.state;
    if (el.dataset.k) {
      var k = el.dataset.k;
      if (el.type === 'checkbox') s[k] = el.checked ? 1 : 0;
      else if (el.tagName === 'SELECT') s[k] = el.value;
      else s[k] = Math.max(num(el.value), 0);
      if (FEE_KEYS.indexOf(k) >= 0) s.dirty = true;
      if (k === 'sellCur') { s.dirty = true; }
      if (k === 'sellCur' || k === 'costCur') syncUnits();
      render(); save();
    } else if (el.dataset.fx) {
      store.rates[el.dataset.fx] = num(el.value) || ''; save(); render();
    }
  });
  $('tpl').addEventListener('change', function () { applyTpl(this.value); });
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
  $('langBtn').addEventListener('click', function () { store.lang = store.lang === 'zh' ? 'en' : 'zh'; save(); applyLang(); });
  $('proBtn').addEventListener('click', openPro);
  document.addEventListener('click', function (e) {
    var t = T(), el = e.target.closest('[data-open-pro],[data-load],[data-del]');
    if (!el) return;
    if (el.hasAttribute('data-open-pro')) openPro();
    else if (el.dataset.load) {
      var x = store.scenarios.filter(function (y) { return y.id === el.dataset.load; })[0];
      if (x) { store.state = Object.assign(defaultState(), snapshot(x.s)); save(); syncForm(); $('tpl').value = store.state.tpl; render(); setTab('calc'); }
    } else if (el.dataset.del) {
      store.scenarios = store.scenarios.filter(function (y) { return y.id !== el.dataset.del; }); delete cmpSel[el.dataset.del]; save(); renderScenarios();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.sc) {
      var id = e.target.dataset.sc, n = Object.keys(cmpSel).filter(function (x) { return cmpSel[x]; }).length;
      if (e.target.checked && n >= limits().cmp) { e.target.checked = false; toast(T().cmpMax(limits().cmp)); return; }
      cmpSel[id] = e.target.checked; renderScenarios();
    }
  });
  $('saveSc').addEventListener('click', function () {
    var t = T();
    if (store.scenarios.length >= limits().sc) { toast(t.scLimit(limits().sc)); if (!isPro()) openPro(); return; }
    var def = t.scDefault + ' ' + (store.scenarios.length + 1);
    var name = window.prompt(t.scName, def); if (name === null) return;
    store.scenarios.unshift({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: (name.trim() || def).slice(0, 40), s: snapshot(store.state), at: Date.now() });
    save(); renderScenarios(); toast(t.scSaved);
  });
  $('applyTarget').addEventListener('click', function () {
    if (last && last.tp !== null) { store.state.price = last.tp; syncForm(); render(); save(); }
  });
  $('saveTpl').addEventListener('click', function () {
    var t = T();
    if (store.myTpls.length >= limits().tpl) { toast(t.tplLimit); if (!isPro()) openPro(); return; }
    var name = window.prompt(t.tplName, ''); if (!name || !name.trim()) return;
    var s = store.state, f = {}; FEE_KEYS.forEach(function (k) { f[k] = s[k]; });
    var id = 'my-' + Date.now().toString(36);
    store.myTpls.push({ id: id, name: name.trim().slice(0, 40), cur: s.sellCur, f: f });
    s.tpl = id; s.dirty = false; save(); buildForm(); render(); toast(t.tplSaved);
  });
  $('delTpl').addEventListener('click', function () {
    var t = T(), tp = getTpl(store.state.tpl);
    if (!tp || !tp.my) { toast(t.tplNoDel); return; }
    store.myTpls = store.myTpls.filter(function (x) { return x.id !== tp.id; });
    store.state.tpl = 'custom'; save(); buildForm(); render(); toast(t.tplDeleted);
  });
  $('mGo').addEventListener('click', function () { $('result').scrollIntoView({ behavior: 'smooth' }); });
  // batch
  $('csvFile').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    if (!isPro()) { toast(T().proNeed); openPro(); this.value = ''; return; }
    var r = new FileReader(); r.onload = function () { $('csvText').value = r.result; runBatch(r.result); }; r.readAsText(f); this.value = '';
  });
  $('csvFile').addEventListener('click', function (e) { if (!isPro()) { e.preventDefault(); toast(T().proNeed); openPro(); } });
  $('runPaste').addEventListener('click', function () { runBatch($('csvText').value); });
  $('expCsv').addEventListener('click', exportBatch);
  $('dlSample').addEventListener('click', function () {
    download('sample-products.csv', 'name,price,ship_income,cost,ship_cost,other_cost,ad_pct,return_rate\r\nMug 马克杯,24,0,6.5,4,0.8,8,3\r\nTote bag,32,5,9,4.5,1,10,5\r\nPrint A3,18,3,2.2,2.5,0.5,12,2\r\n');
  });
  // pro dialog
  $('licOk').addEventListener('click', function () {
    var v = $('licIn').value.trim().toUpperCase();
    if (licValid(v)) { store.license = v; save(); setLicMsg(T().licOK); refreshPro(); renderScenarios(); }
    else setLicMsg(T().licBad, true);
  });
  $('licClear').addEventListener('click', function () { store.license = ''; $('licIn').value = ''; save(); setLicMsg(T().licCleared); refreshPro(); renderScenarios(); });
  $('proDlg').addEventListener('click', function (e) { if (e.target === this) this.close(); });
  if (!getTpl(store.state.tpl)) store.state.tpl = 'etsy-us';
  applyLang();
}

window.PC = { calc: calc, solve: solve, costK: costK, TPLS: TPLS, licSum: licSum, licValid: licValid, parseCSV: parseCSV, defaultState: defaultState, store: function () { return store; } };
init();
})();

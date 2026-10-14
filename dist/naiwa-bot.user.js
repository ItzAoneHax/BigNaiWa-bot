// ==UserScript==
// @name         合成大奶娃 · AI 自动打
// @namespace    bignaiwa-bot
// @version      1.0.0
// @description  用移植物理做落点推演，自动把「合成大奶娃」打到高分
// @match        https://yhsome.github.io/BigNaiWa/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
/* 合成大奶娃 · AI 自动打 —— 单文件版（由 build.mjs 生成，勿手改）
 *  用法：打开游戏页 → F12 控制台 → 粘贴本文件全部内容 → 回车
 *        window.NaiwaBot.run({ mode:'realtime' })        实时看它打（推演在 Worker 里，页面不卡）
 *        window.NaiwaBot.run({ mode:'turbo', seed:1 })   快进刷分
 */
(function () {
'use strict';
const MODS = {};
const EMBEDDED_SHAPES = [{"parts":[[-0.004,0.064,0.853],[-0.038,-0.79,0.217],[0.178,-0.773,0.199],[-0.259,-0.752,0.178],[-0.403,0.819,0.17],[0.395,0.819,0.169],[0.369,-0.705,0.136],[-0.425,-0.679,0.117],[0.238,0.883,0.106],[-0.246,0.887,0.106],[0.488,-0.637,0.088],[-0.14,0.909,0.085],[0.119,0.909,0.081],[0.539,0.722,0.081],[-0.522,-0.616,0.078],[-0.055,0.917,0.076]],"rb":1.083},{"parts":[[0,0.166,0.695],[-0.004,-0.531,0.412],[-0.306,0.79,0.2],[0.297,0.794,0.2],[0.14,-0.917,0.078],[-0.136,-0.921,0.076],[-0.688,0.267,0.074],[0.684,0.301,0.072],[0.212,-0.883,0.066],[0.055,-0.938,0.064],[-0.696,0.183,0.064],[-0.208,-0.892,0.06],[-0.047,-0.943,0.059],[0.692,0.229,0.059],[-0.675,0.344,0.058],[0.391,-0.412,0.055]],"rb":1.047},{"parts":[[-0.098,0.276,0.599],[-0.115,-0.323,0.369],[0.306,-0.705,0.282],[-0.535,-0.705,0.28],[-0.382,0.807,0.185],[0.174,0.811,0.183],[-0.633,-0.004,0.142],[-0.726,-0.115,0.129],[0.501,0.238,0.112],[0.594,0.306,0.08],[-0.531,0.692,0.064],[0.025,-0.667,0.061],[-0.582,0.628,0.06],[-0.467,-0.195,0.059],[-0.255,-0.667,0.055],[-0.616,0.577,0.053]],"rb":1.165},{"parts":[[0.276,0.276,0.57],[-0.437,-0.072,0.347],[0.344,-0.301,0.331],[-0.526,-0.408,0.278],[-0.297,0.246,0.244],[0.365,-0.633,0.226],[-0.008,0.773,0.195],[-0.255,0.488,0.138],[0.45,0.819,0.136],[-0.756,-0.246,0.118],[-0.187,0.611,0.114],[0.259,-0.832,0.1],[0.382,-0.858,0.099],[0.178,-0.76,0.094],[-0.539,0.28,0.09],[0.573,-0.543,0.089]],"rb":1.071},{"parts":[[-0.191,0.115,0.54],[0.344,0.204,0.422],[-0.331,-0.42,0.377],[-0.531,-0.743,0.177],[0.641,0.505,0.166],[-0.14,-0.747,0.164],[-0.526,0.539,0.155],[-0.059,0.641,0.154],[-0.098,0.836,0.14],[0.004,-0.828,0.132],[0.684,0.667,0.128],[-0.543,0.696,0.127],[-0.692,-0.819,0.126],[-0.361,-0.798,0.119],[0.34,0.628,0.118],[-0.582,0.819,0.116]],"rb":1.199},{"parts":[[0.323,0.047,0.472],[-0.301,0.132,0.406],[0.45,-0.408,0.342],[0.565,-0.73,0.272],[0.34,0.518,0.165],[-0.526,0.476,0.16],[0.701,0.331,0.159],[0.357,0.824,0.157],[-0.577,0.79,0.151],[0.811,0.446,0.149],[-0.709,0.119,0.145],[-0.594,0.624,0.144],[0.713,0.645,0.143],[-0.297,0.539,0.141],[-0.208,0.743,0.129],[-0.675,-0.03,0.114]],"rb":1.195},{"parts":[[0.093,0.195,0.329],[0.467,-0.157,0.262],[-0.187,0.013,0.149],[0.412,0.102,0.146],[-0.008,0.51,0.144],[-0.272,-0.11,0.121],[-0.017,0.654,0.119],[0.293,-0.357,0.118],[-0.391,-0.161,0.115],[-0.191,0.378,0.112],[0.476,-0.769,0.11],[0.119,-0.658,0.108],[0.446,-0.658,0.105],[0.055,-0.752,0.1],[-0.497,-0.221,0.096],[0.399,-0.412,0.094]],"rb":1.014},{"parts":[[0,0.306,0.63],[0.004,-0.327,0.388],[-0.021,-0.718,0.225],[0.374,-0.204,0.178],[-0.395,-0.187,0.172],[-0.514,-0.059,0.136],[0.505,-0.081,0.127],[-0.382,0.811,0.127],[0.378,0.811,0.127],[0.476,0.722,0.07],[-0.488,0.705,0.066],[0.2,-0.662,0.065],[-0.582,0.059,0.064],[-0.272,0.875,0.064],[0.263,0.879,0.059],[0.526,0.654,0.058]],"rb":1.024},{"parts":[[-0.127,0.284,0.694],[-0.081,-0.412,0.334],[0.556,0.034,0.33],[0.743,-0.242,0.252],[-0.183,-0.735,0.251],[-0.667,0.722,0.251],[0.386,0.752,0.229],[-0.819,0.335,0.18],[0.887,-0.034,0.11],[-0.565,-0.255,0.109],[0.892,-0.45,0.106],[-0.476,0.887,0.093],[0.068,-0.713,0.093],[-0.603,-0.361,0.09],[0.204,0.896,0.085],[0.514,0.56,0.084]],"rb":1.233},{"parts":[[-0.089,-0.051,0.743],[0.348,0.552,0.419],[-0.45,-0.701,0.305],[-0.14,0.692,0.301],[0.607,0.212,0.229],[-0.157,-0.794,0.118],[-0.374,0.883,0.115],[0.743,0.399,0.098],[0.654,-0.013,0.097]],"rb":1.138},{"parts":[[-0.025,-0.144,0.238],[-0.013,0.696,0.174],[-0.008,0.098,0.154],[-0.187,0.726,0.132],[-0.008,-0.386,0.117],[-0.004,0.255,0.104],[-0.323,0.722,0.099],[-0.004,0.361,0.091],[-0.008,0.522,0.089],[0.161,0.692,0.088],[0.251,0.705,0.084],[0.204,-0.212,0.072],[-0.429,0.705,0.072],[0.335,0.718,0.069],[0.106,-0.344,0.061],[-0.119,0.841,0.057]],"rb":0.906}];
/* 推演跑在 Worker 里，主线程只负责驱动游戏和出手 —— 这份代码就是那个 Worker */
const WORKER_SOURCE = "(function () {\n'use strict';\nconst MODS = {};\nconst EMBEDDED_SHAPES = [{\"parts\":[[-0.004,0.064,0.853],[-0.038,-0.79,0.217],[0.178,-0.773,0.199],[-0.259,-0.752,0.178],[-0.403,0.819,0.17],[0.395,0.819,0.169],[0.369,-0.705,0.136],[-0.425,-0.679,0.117],[0.238,0.883,0.106],[-0.246,0.887,0.106],[0.488,-0.637,0.088],[-0.14,0.909,0.085],[0.119,0.909,0.081],[0.539,0.722,0.081],[-0.522,-0.616,0.078],[-0.055,0.917,0.076]],\"rb\":1.083},{\"parts\":[[0,0.166,0.695],[-0.004,-0.531,0.412],[-0.306,0.79,0.2],[0.297,0.794,0.2],[0.14,-0.917,0.078],[-0.136,-0.921,0.076],[-0.688,0.267,0.074],[0.684,0.301,0.072],[0.212,-0.883,0.066],[0.055,-0.938,0.064],[-0.696,0.183,0.064],[-0.208,-0.892,0.06],[-0.047,-0.943,0.059],[0.692,0.229,0.059],[-0.675,0.344,0.058],[0.391,-0.412,0.055]],\"rb\":1.047},{\"parts\":[[-0.098,0.276,0.599],[-0.115,-0.323,0.369],[0.306,-0.705,0.282],[-0.535,-0.705,0.28],[-0.382,0.807,0.185],[0.174,0.811,0.183],[-0.633,-0.004,0.142],[-0.726,-0.115,0.129],[0.501,0.238,0.112],[0.594,0.306,0.08],[-0.531,0.692,0.064],[0.025,-0.667,0.061],[-0.582,0.628,0.06],[-0.467,-0.195,0.059],[-0.255,-0.667,0.055],[-0.616,0.577,0.053]],\"rb\":1.165},{\"parts\":[[0.276,0.276,0.57],[-0.437,-0.072,0.347],[0.344,-0.301,0.331],[-0.526,-0.408,0.278],[-0.297,0.246,0.244],[0.365,-0.633,0.226],[-0.008,0.773,0.195],[-0.255,0.488,0.138],[0.45,0.819,0.136],[-0.756,-0.246,0.118],[-0.187,0.611,0.114],[0.259,-0.832,0.1],[0.382,-0.858,0.099],[0.178,-0.76,0.094],[-0.539,0.28,0.09],[0.573,-0.543,0.089]],\"rb\":1.071},{\"parts\":[[-0.191,0.115,0.54],[0.344,0.204,0.422],[-0.331,-0.42,0.377],[-0.531,-0.743,0.177],[0.641,0.505,0.166],[-0.14,-0.747,0.164],[-0.526,0.539,0.155],[-0.059,0.641,0.154],[-0.098,0.836,0.14],[0.004,-0.828,0.132],[0.684,0.667,0.128],[-0.543,0.696,0.127],[-0.692,-0.819,0.126],[-0.361,-0.798,0.119],[0.34,0.628,0.118],[-0.582,0.819,0.116]],\"rb\":1.199},{\"parts\":[[0.323,0.047,0.472],[-0.301,0.132,0.406],[0.45,-0.408,0.342],[0.565,-0.73,0.272],[0.34,0.518,0.165],[-0.526,0.476,0.16],[0.701,0.331,0.159],[0.357,0.824,0.157],[-0.577,0.79,0.151],[0.811,0.446,0.149],[-0.709,0.119,0.145],[-0.594,0.624,0.144],[0.713,0.645,0.143],[-0.297,0.539,0.141],[-0.208,0.743,0.129],[-0.675,-0.03,0.114]],\"rb\":1.195},{\"parts\":[[0.093,0.195,0.329],[0.467,-0.157,0.262],[-0.187,0.013,0.149],[0.412,0.102,0.146],[-0.008,0.51,0.144],[-0.272,-0.11,0.121],[-0.017,0.654,0.119],[0.293,-0.357,0.118],[-0.391,-0.161,0.115],[-0.191,0.378,0.112],[0.476,-0.769,0.11],[0.119,-0.658,0.108],[0.446,-0.658,0.105],[0.055,-0.752,0.1],[-0.497,-0.221,0.096],[0.399,-0.412,0.094]],\"rb\":1.014},{\"parts\":[[0,0.306,0.63],[0.004,-0.327,0.388],[-0.021,-0.718,0.225],[0.374,-0.204,0.178],[-0.395,-0.187,0.172],[-0.514,-0.059,0.136],[0.505,-0.081,0.127],[-0.382,0.811,0.127],[0.378,0.811,0.127],[0.476,0.722,0.07],[-0.488,0.705,0.066],[0.2,-0.662,0.065],[-0.582,0.059,0.064],[-0.272,0.875,0.064],[0.263,0.879,0.059],[0.526,0.654,0.058]],\"rb\":1.024},{\"parts\":[[-0.127,0.284,0.694],[-0.081,-0.412,0.334],[0.556,0.034,0.33],[0.743,-0.242,0.252],[-0.183,-0.735,0.251],[-0.667,0.722,0.251],[0.386,0.752,0.229],[-0.819,0.335,0.18],[0.887,-0.034,0.11],[-0.565,-0.255,0.109],[0.892,-0.45,0.106],[-0.476,0.887,0.093],[0.068,-0.713,0.093],[-0.603,-0.361,0.09],[0.204,0.896,0.085],[0.514,0.56,0.084]],\"rb\":1.233},{\"parts\":[[-0.089,-0.051,0.743],[0.348,0.552,0.419],[-0.45,-0.701,0.305],[-0.14,0.692,0.301],[0.607,0.212,0.229],[-0.157,-0.794,0.118],[-0.374,0.883,0.115],[0.743,0.399,0.098],[0.654,-0.013,0.097]],\"rb\":1.138},{\"parts\":[[-0.025,-0.144,0.238],[-0.013,0.696,0.174],[-0.008,0.098,0.154],[-0.187,0.726,0.132],[-0.008,-0.386,0.117],[-0.004,0.255,0.104],[-0.323,0.722,0.099],[-0.004,0.361,0.091],[-0.008,0.522,0.089],[0.161,0.692,0.088],[0.251,0.705,0.084],[0.204,-0.212,0.072],[-0.429,0.705,0.072],[0.335,0.718,0.069],[0.106,-0.344,0.061],[-0.119,0.841,0.057]],\"rb\":0.906}];\nMODS['engine'] = (function () {\n/* ============================================================================\r\n *  engine.js —— 合成大奶娃 (BigNaiWa v1) 物理 / 合成 / 计分内核的 1:1 移植\r\n *\r\n *  用途：把 game.js 里那段 IIFE 私有的物理循环搬到可复用的模块里，用于\r\n *        (1) 浏览器里给 bot 做「落点推演」（不改动线上游戏，只用它的状态）\r\n *        (2) Node 里做高速自我对弈 / 参数调优（比真实页面快几百倍）\r\n *\r\n *  移植原则：数值运算的顺序、常量、Float32Array 精度全部照抄，\r\n *            因此同一浏览器（V8）下与线上游戏逐帧一致（见 tools/verify-engine.mjs）。\r\n *  被刻意省略的只有纯表现层：粒子、音效、DOM、localStorage（都不参与物理）。\r\n * ========================================================================== */\r\n\r\n/* 诊断计数器（每帧 +1，开销可以忽略）：给 bench / 调参工具看「干了多少活」 */\r\nconst DIAG = { updates: 0, clones: 0 };\r\nfunction resetDiag() { DIAG.updates = 0; DIAG.clones = 0; }\r\n\r\n/* ---------------------------------------------------------------- 常量 ---- */\r\n\r\nconst CFG = {\r\n  W: 420,              // 逻辑宽度\r\n  H: 700,              // 逻辑高度\r\n  WALL: 10,            // 左右墙厚\r\n  DROP_Y: 74,          // 待投放水果的高度\r\n  DANGER_Y: 142,       // 警戒线\r\n  GRAVITY: 2600,       // px/s²\r\n  SUBSTEPS: 3,         // 每帧物理子步\r\n  ITER: 6,             // 每个子步的约束迭代次数\r\n  DROP_MS: 360,        // 两次投放的最小间隔\r\n  OVER_LIMIT: 1.5,     // 越线持续多少秒判负\r\n  REST_SPEED: 140,     // 线上方且速度低于它才算“卡住”\r\n  MAX_TIER: 10,        // 最大那只（神奶蛙）的索引\r\n  MAX_BONUS: 500,      // 两只神奶蛙相撞的奖励分\r\n  MAX_MERGE_GIVES_REVIVE: true,\r\n  FREEZE_MS: 130,      // 清场定格\r\n  REVIVE_STEP: 2000,   // 每累计多少分发一枚复活币\r\n  MERGE_PAD: 0.8,      // 合成判定接触容差\r\n  RESTITUTION: 0.38,   // 球球弹性\r\n  WALL_RESTITUTION: 0.45,\r\n  REST_THRESHOLD: 55,\r\n  FRICTION: 0.955,\r\n  SQUASH_DECAY: 9,\r\n  SQUASH_MAX: 0.30,\r\n  FIXED: 1 / 60,       // 主循环固定步长\r\n};\r\n\r\nCFG.REST_SPEED2 = CFG.REST_SPEED * CFG.REST_SPEED;\r\n\r\n/* 水果链（半径照抄 game.js；名字只用于报告） */\r\nconst FRUITS = [\r\n  { name: '葡萄',   r: 17 },\r\n  { name: '樱桃',   r: 23 },\r\n  { name: '橘子',   r: 31 },\r\n  { name: '柠檬',   r: 39 },\r\n  { name: '猕猴桃', r: 48 },\r\n  { name: '番茄',   r: 58 },\r\n  { name: '桃子',   r: 69 },\r\n  { name: '菠萝',   r: 81 },\r\n  { name: '椰子',   r: 94 },\r\n  { name: '半奶蛙', r: 108 },\r\n  { name: '神奶蛙', r: 124 },\r\n];\r\n\r\n/* 合成出 tier 的得分（三角数） */\r\nconst MERGE_SCORE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];\r\n\r\n/* 新水果掉落表 */\r\nconst SPAWN_TIERS = [0, 1, 2, 3, 4];\r\nconst SPAWN_WEIGHTS = [0.28, 0.24, 0.20, 0.16, 0.12];\r\n\r\n/* 每个 tier 对应「合成它」的实际得分（含两只神奶蛙的特殊奖励） */\r\nconst TIER_VALUE = MERGE_SCORE.slice();\r\n\r\n/* --------------------------------------------------------- 碰撞外形数据 ---- */\r\n/* parts: [ox, oy, s]（单位：以 r 为 1）；rb: 包围圆半径系数 */\r\n\r\nlet SHAPES = null;          // 当前生效的外形（推演时可切换成低成本近似）\r\nlet EXACT_SHAPES = null;    // 线上一模一样的原始外形\r\nconst UNIT_SHAPE = { rb: 1, parts: [[0, 0, 1]] };\r\n\r\n/* 把 [ox,oy,s] 列表压成一条 Float64Array，加速 syncParts（数值完全一致） */\r\nfunction pack(sh) {\r\n  if (!sh.flat) {\r\n    const n = sh.parts.length;\r\n    const f = new Float64Array(n * 3);\r\n    let ext = 0;\r\n    for (let i = 0; i < n; i++) {\r\n      const p = sh.parts[i];\r\n      f[i * 3] = p[0]; f[i * 3 + 1] = p[1]; f[i * 3 + 2] = p[2];\r\n      const d = Math.hypot(p[0], p[1]) + p[2];      // 这个小圆离中心最远能到哪\r\n      if (d > ext) ext = d;\r\n    }\r\n    sh.flat = f;\r\n    /* 真实外接半径。注意 shapes.json 里的 rb 只保留三位小数，\r\n       有 7 个等级其实略小于真实外接半径（差 ~0.1px）——\r\n       游戏自己的粗筛也用这个偏小的 rb（我们照抄，才能逐帧一致），\r\n       但「墙判定早退」是我们新加的优化，必须用真实值，否则会漏掉贴墙的推力。 */\r\n    sh.ext = Math.max(sh.rb, ext);\r\n  }\r\n  return sh;\r\n}\r\n\r\nfunction setShapes(shapes) {\r\n  if (shapes && shapes.length) {\r\n    for (const sh of shapes) pack(sh);\r\n    EXACT_SHAPES = shapes; SHAPES = shapes;\r\n  }\r\n}\r\nfunction getShapes() { return SHAPES; }\r\nfunction getExactShapes() { return EXACT_SHAPES; }\r\n\r\n/* ---------------------------------------------------------------------------\r\n * 外形保真度档位 —— 推演的「模型精度」\r\n *\r\n * 线上每颗水果的碰撞体是 16 个小圆（贴图轮廓），两两求交 = 256 次判定，\r\n * 6 次迭代 × 3 子步下就是主要开销。做落点筛选时不必这么精细：\r\n *   'exact'     16 个小圆，和线上完全一致（用于最终排序 / 自我对弈）\r\n *   { parts: K } 只保留最大的 K 个小圆（形状粗糙但仍是多边形，保留互锁感）\r\n *   { circle: f } 退化成一个半径 f×r 的圆（最快，用来粗筛）\r\n * 切换只影响「之后创建」的球，已经在场上的球保持自己创建时的外形不变。\r\n * ------------------------------------------------------------------------- */\r\nfunction setShapeMode(mode) {\r\n  if (!EXACT_SHAPES) return;\r\n  if (!mode || mode === 'exact') { SHAPES = EXACT_SHAPES; return; }\r\n\r\n  const out = [];\r\n  for (let t = 0; t < EXACT_SHAPES.length; t++) {\r\n    const src = EXACT_SHAPES[t];\r\n    if (!src || !src.parts || !src.parts.length) { out.push(UNIT_SHAPE); continue; }\r\n\r\n    if (mode.circle) {\r\n      const f = mode.circle;\r\n      out.push(pack({ rb: f, parts: [[0, 0, f]] }));\r\n      continue;\r\n    }\r\n    const K = Math.max(1, Math.min(mode.parts | 0, src.parts.length));\r\n    const sorted = src.parts.slice().sort((a, b) => b[2] - a[2]).slice(0, K);\r\n    let rb = 0;\r\n    for (const p of sorted) {\r\n      const d = Math.sqrt(p[0] * p[0] + p[1] * p[1]) + p[2];\r\n      if (d > rb) rb = d;\r\n    }\r\n    out.push(pack({ rb, parts: sorted }));\r\n  }\r\n  SHAPES = out;\r\n}\r\n\r\nfunction shapeOf(tier) {\r\n  const s = SHAPES && SHAPES[tier];\r\n  if (s && s.parts && s.parts.length) return s;\r\n  return UNIT_SHAPE;\r\n}\r\n\r\n/* ------------------------------------------------ 世界（= game.js 的 state）- */\r\n\r\nfunction makeWorld(opts = {}) {\r\n  const w = {\r\n    balls: [],\r\n    score: 0,\r\n    pending: 0,\r\n    next: 0,\r\n    ready: true,\r\n    cooldown: 0,\r\n    aimX: CFG.W / 2,\r\n    over: false,\r\n    flash: 0,\r\n    revives: 0,        // 本局还剩几枚复活币\r\n    reviveGiven: 0,    // 本局已经发放过几次\r\n    freeze: 0,         // 命中定格剩余秒数\r\n    danger: false,\r\n    now: 0,            // 虚拟毫秒时钟（对应线上的 performance.now()）\r\n    drops: 0,\r\n    rng: opts.rng || Math.random,\r\n    overAt: -1,\r\n    mergedMaxTier: -1,   // 本局（或本轮推演）合出的最大 tier\r\n    freed: 0,            // 本轮推演里「合成释放掉的面积」累计（只做记账，不参与物理）\r\n    stepCount: 0,        // 已经跑了多少物理帧（诊断用）\r\n    mergeTrace: null,    // 诊断：把每次合成记下来（默认关闭，零开销）\r\n  };\r\n  return w;\r\n}\r\n\r\nfunction resetWorld(w, opts = {}) {\r\n  if (opts.rng) w.rng = opts.rng;\r\n  w.balls.length = 0;\r\n  w.score = 0;\r\n  w.over = false;\r\n  w.ready = true;\r\n  w.cooldown = 0;\r\n  w.flash = 0;\r\n  w.danger = false;\r\n  w.aimX = CFG.W / 2;\r\n  w.revives = 0;\r\n  w.reviveGiven = 0;\r\n  w.freeze = 0;\r\n  w.drops = 0;\r\n  w.overAt = -1;\r\n  w.mergedMaxTier = -1;\r\n  w.freed = 0;\r\n  w.pending = pickSpawnTier(w);\r\n  w.next = pickSpawnTier(w, w.pending);\r\n  return w;\r\n}\r\n\r\n/* ------------------------------------------------------------ 生成 / 刚体 -- */\r\n\r\n/* 角度只在一帧的「速度推导」那一步变，其余时间 cos/sin 是常量。\r\n   缓存起来完全等价（同一个 Math.cos(同一个角度)），但省掉大量三角函数。 */\r\nfunction updateTrig(b) {\r\n  b.pcos = Math.cos(b.angle);\r\n  b.psin = Math.sin(b.angle);\r\n}\r\n\r\n/* 局部坐标缓存：把「小圆的局部偏移 × r」和「小圆半径 × r」提前算好。\r\n * 这两个量只取决于外形和 r（同一个等级恒定），与球的位置/角度无关，\r\n * 所以每颗球算一次、克隆时直接共享引用即可。运算结果与逐次现算完全相同。 */\r\nfunction localOf(sh, r) {\r\n  if (sh.loc && sh.loc.r === r) return sh.loc;\r\n  const f = sh.flat || pack(sh).flat;\r\n  const n = f.length / 3;\r\n  const lx = new Float64Array(n), ly = new Float64Array(n), ls = new Float64Array(n);\r\n  for (let i = 0, k = 0; i < n; i++, k += 3) {\r\n    lx[i] = f[k] * r;\r\n    ly[i] = f[k + 1] * r;\r\n    ls[i] = f[k + 2] * r;\r\n  }\r\n  sh.loc = { r, lx, ly, ls };\r\n  return sh.loc;\r\n}\r\n\r\nfunction syncParts(b) {\r\n  const c = b.pcos, s = b.psin;\r\n  const x = b.x, y = b.y;\r\n  const lx = b.lx, ly = b.ly, ls = b.ls;\r\n  const wx = b.wx, wy = b.wy, ws = b.ws;\r\n  const n = b.np;\r\n  for (let i = 0; i < n; i++) {\r\n    const ox = lx[i], oy = ly[i];\r\n    wx[i] = x + ox * c - oy * s;\r\n    wy[i] = y + ox * s + oy * c;\r\n    ws[i] = ls[i];\r\n  }\r\n}\r\n\r\nfunction makeBall(w, x, y, tier, vx, vy) {\r\n  const r = FRUITS[tier].r;\r\n  const m = r * r;\r\n  const sh = shapeOf(tier);\r\n  const n = sh.parts.length;\r\n  const loc = localOf(sh, r);\r\n  const b = {\r\n    x, y, vx: vx || 0, vy: vy || 0,\r\n    px: x, py: y,\r\n    r, tier, angle: 0,\r\n    mass: m, invMass: 1 / m,\r\n    bornAt: w.now,\r\n    overTime: 0,\r\n    landed: false,\r\n    dead: false,\r\n    contacts: 0,\r\n    pvx: 0, pvy: 0,\r\n    sq: 0, sqA: 0,\r\n    parts: sh.parts,\r\n    np: n,\r\n    pcos: 1, psin: 0,\r\n    rb: sh.rb * r,\r\n    rbe: (sh.ext || sh.rb) * r,\r\n    lx: loc.lx, ly: loc.ly, ls: loc.ls,   // 局部偏移缓存（只读，克隆时共享）\r\n    wx: new Float32Array(n),\r\n    wy: new Float32Array(n),\r\n    ws: new Float32Array(n),\r\n    gen: 0,                 // 合成代数（只做诊断；放进字面量里，避免合成后动态加属性换形状）\r\n  };\r\n  syncParts(b);\r\n  return b;\r\n}\r\n\r\n/* 深拷贝一颗球（推演用；parts 是共享引用，不必复制）\r\n *\r\n * 注意：这里必须用对象字面量，并且键的顺序与 makeBall / adoptFromGame 完全一致。\r\n * 早先用 Object.create(null) + 逐个赋值，V8 会把这种对象放进「字典模式」，\r\n * 之后每一次属性读写都走哈希查找，而推演里跑的全是克隆出来的球（实测慢得多）。\r\n * 字面量 + 统一形状 = 同样的数值、同样的运算顺序，只是属性访问变快。 */\r\nfunction cloneBall(b, now) {\r\n  return {\r\n    x: b.x, y: b.y, vx: b.vx, vy: b.vy, px: b.px, py: b.py,\r\n    r: b.r, tier: b.tier, angle: b.angle, mass: b.mass, invMass: b.invMass,\r\n    bornAt: b.bornAt, overTime: b.overTime, landed: b.landed, dead: b.dead, contacts: b.contacts,\r\n    pvx: b.pvx, pvy: b.pvy, sq: b.sq, sqA: b.sqA,\r\n    parts: b.parts, np: b.np, pcos: b.pcos, psin: b.psin, rb: b.rb, rbe: b.rbe,\r\n    lx: b.lx, ly: b.ly, ls: b.ls,        // 只读缓存，直接共享\r\n    wx: new Float32Array(b.wx), wy: new Float32Array(b.wy), ws: new Float32Array(b.ws),\r\n    gen: b.gen || 0,\r\n  };\r\n}\r\n\r\n/* ------------------------------------------------------------------ 投放 -- */\r\n\r\nfunction aimLimit(tier) {\r\n  const r = FRUITS[tier].r * shapeOf(tier).rb;\r\n  return [CFG.WALL + r + 0.5, CFG.W - CFG.WALL - r - 0.5];\r\n}\r\n\r\nconst clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);\r\n\r\nfunction moveAim(w, x) {\r\n  const [lo, hi] = aimLimit(w.pending);\r\n  w.aimX = clamp(x, lo, hi);\r\n}\r\n\r\nfunction tryDrop(w) {\r\n  if (w.over || !w.ready) return false;\r\n  const tier = w.pending;\r\n  const [lo, hi] = aimLimit(tier);\r\n  const x = clamp(w.aimX, lo, hi);\r\n  w.balls.push(makeBall(w, x, CFG.DROP_Y, tier, 0, 130));\r\n  w.ready = false;\r\n  w.cooldown = CFG.DROP_MS / 1000;\r\n  w.pending = w.next;\r\n  w.next = pickSpawnTier(w, w.pending);\r\n  w.drops++;\r\n  return true;\r\n}\r\n\r\n/* 直接按 x 投放（推演用）：等价于 moveAim(x) + tryDrop() */\r\nfunction dropAt(w, x) {\r\n  moveAim(w, x);\r\n  return tryDrop(w);\r\n}\r\n\r\n/* --------------------------------------------------------------- 随机数 --- */\r\n\r\nfunction rollSpawnTier(w) {\r\n  const r = w.rng();\r\n  let acc = 0;\r\n  for (let i = 0; i < SPAWN_TIERS.length; i++) {\r\n    acc += SPAWN_WEIGHTS[i];\r\n    if (r <= acc) return SPAWN_TIERS[i];\r\n  }\r\n  return SPAWN_TIERS[0];\r\n}\r\n\r\nfunction pickSpawnTier(w, avoid) {\r\n  if (avoid === undefined) return rollSpawnTier(w);\r\n  for (let i = 0; i < 6; i++) {\r\n    const t = rollSpawnTier(w);\r\n    if (t !== avoid) return t;\r\n  }\r\n  return rollSpawnTier(w);\r\n}\r\n\r\n/* --------------------------------------------------------------- 计分 ----- */\r\n\r\n/* 只保留「会影响后续玩法」的部分：分数、复活币发放、定格 */\r\nfunction addScore(w, n) {\r\n  w.score += n;\r\n  grantRevives(w);\r\n}\r\n\r\nfunction grantRevives(w) {\r\n  while (w.reviveGiven < Math.floor(w.score / CFG.REVIVE_STEP)) {\r\n    w.reviveGiven++;\r\n    w.revives++;\r\n  }\r\n}\r\n\r\n/* -------------------------------------------------------------- 物理 ------ */\r\n\r\n/* 复用的扁平缓冲：接触表 & 合成表（避免每帧产生成百上千的临时对象） */\r\nlet CT_CAP = 0, ctKind = new Int8Array(0), ctA = new Int32Array(0), ctB = new Int32Array(0);\r\nlet ctNX = new Float64Array(0), ctNY = new Float64Array(0);\r\nfunction ensureCt(cap) {\r\n  if (cap <= CT_CAP) return;\r\n  CT_CAP = Math.max(64, cap);\r\n  ctKind = new Int8Array(CT_CAP); ctA = new Int32Array(CT_CAP); ctB = new Int32Array(CT_CAP);\r\n  ctNX = new Float64Array(CT_CAP); ctNY = new Float64Array(CT_CAP);\r\n}\r\nconst MERGE_SCRATCH = [];\r\n\r\n/* 分段计时（默认关闭，调试用）：0积分 1墙 2球球 3收尾 4速度 5冲量 6合成 */\r\nconst PROF = { on: false, t: new Float64Array(8), n: 0 };\r\nconst _now = (typeof performance !== 'undefined' ? () => performance.now() : () => Date.now());\r\n\r\n/* stepPhysics 收尾的合成处理从 stepsPerSubstep 中抽出来（保持原来的调用顺序） */\r\n\r\nfunction stepPhysics(w, dt) {\r\n  const balls = w.balls;\r\n  const nBalls = balls.length;\r\n\r\n  /* 接触表：原来每个接触都 new 一个对象，活跃盘面一帧上百个，GC 很吃亏。\r\n     改成复用的扁平数组（kind: 0=撞墙 1=球球），算出来的数值完全一样。 */\r\n  ensureCt(nBalls * nBalls + nBalls * 4 + 32);\r\n  let ctN = 0;\r\n  const mergeFlat = MERGE_SCRATCH;\r\n  mergeFlat.length = 0;\r\n\r\n  /* --- 积分 --- */\r\nif (PROF.on) PROF.t[0] += _now();\r\n  for (let i = 0; i < nBalls; i++) {\r\n    const b = balls[i];\r\n    b.px = b.x;\r\n    b.py = b.y;\r\n    b.vy += CFG.GRAVITY * dt;\r\n    b.pvx = b.vx;\r\n    b.pvy = b.vy;\r\n    b.x += b.vx * dt;\r\n    b.y += b.vy * dt;\r\n    b.contacts = 0;\r\n    syncParts(b);\r\n  }\r\n\r\n  /* --- 约束求解 --- */\r\n  for (let it = 0; it < CFG.ITER; it++) {\r\n\r\n    /* 墙 & 地面 */\r\nif (PROF.on) PROF.t[1] += _now();\r\n    for (let i = 0; i < nBalls; i++) {\r\n      const b = balls[i];\r\n      if (b.dead) continue;\r\n      /* 真实外接圆完全够不着任何一面墙 → 跳过逐个小圆的判定（数学上等价，纯省算力） */\r\n      const rb = b.rbe;\r\n      if (b.x - rb >= CFG.WALL && b.x + rb <= CFG.W - CFG.WALL &&\r\n          b.y + rb <= CFG.H - CFG.WALL && b.y - rb >= 0) continue;\r\n\r\n      let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;\r\n      const n = b.np;\r\n      const wx = b.wx, wy = b.wy, ws = b.ws;\r\n      for (let k = 0; k < n; k++) {\r\n        const x = wx[k], y = wy[k], rr = ws[k];\r\n        const l = CFG.WALL - (x - rr);\r\n        if (l > pushL) pushL = l;\r\n        const rgt = (x + rr) - (CFG.W - CFG.WALL);\r\n        if (rgt > pushR) pushR = rgt;\r\n        const dn = (y + rr) - (CFG.H - CFG.WALL);\r\n        if (dn > pushFloor) pushFloor = dn;\r\n        const up = -(y - rr);\r\n        if (up > pushCeil) pushCeil = up;\r\n      }\r\n      if (pushL || pushR || pushFloor || pushCeil) {\r\n        b.x += pushL - pushR;\r\n        b.y += pushCeil - pushFloor;\r\n        b.contacts++;\r\n        if (it === 0) {\r\n          if (pushL)     { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 1;  ctNY[ctN] = 0;  ctN++; }\r\n          if (pushR)     { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = -1; ctNY[ctN] = 0;  ctN++; }\r\n          if (pushFloor) { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 0;  ctNY[ctN] = -1; ctN++; }\r\n          if (pushCeil)  { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 0;  ctNY[ctN] = 1;  ctN++; }\r\n        }\r\n        syncParts(b);\r\n      }\r\n    }\r\n\r\n    /* 球球 */\r\nif (PROF.on) PROF.t[2] += _now();\r\n    for (let i = 0; i < nBalls; i++) {\r\n      const a = balls[i];\r\n      if (a.dead) continue;\r\n      const awx = a.wx, awy = a.wy, aws = a.ws;\r\n      const pa = a.np, ainv = a.invMass;\r\n      for (let j = i + 1; j < nBalls; j++) {\r\n        const b = balls[j];\r\n        if (b.dead || a.dead) continue;\r\n\r\n        const cdx = b.x - a.x, cdy = b.y - a.y;\r\n        const rbSum = a.rb + b.rb;\r\n        if (cdx * cdx + cdy * cdy >= rbSum * rbSum) continue;\r\n\r\n        const pb = b.np;\r\n        const brb = b.rb;\r\n        const bwx = b.wx, bwy = b.wy, bws = b.ws;\r\n        const bx0 = b.x, by0 = b.y;\r\n        let minGap = 1e9, bnx = 0, bny = 0;\r\n\r\n        for (let m = 0; m < pa; m++) {\r\n          const ax = awx[m], ay = awy[m], ar = aws[m];\r\n          const ddx = bx0 - ax, ddy = by0 - ay;\r\n          const far = brb + ar;\r\n          if (ddx * ddx + ddy * ddy >= far * far) continue;\r\n\r\n          for (let k = 0; k < pb; k++) {\r\n            const bx = bwx[k], by = bwy[k], br = bws[k];\r\n            const dx = bx - ax, dy = by - ay;\r\n            const sum = ar + br;\r\n            const d2 = dx * dx + dy * dy;\r\n            if (d2 >= sum * sum) continue;\r\n            const d = Math.sqrt(d2);\r\n            const gap = d - sum;\r\n            if (gap < minGap) {\r\n              minGap = gap;\r\n              if (d < 1e-4) { bnx = 1; bny = 0; }\r\n              else { bnx = dx / d; bny = dy / d; }\r\n            }\r\n          }\r\n        }\r\n\r\n        if (minGap > CFG.MERGE_PAD || minGap === 1e9) continue;\r\n\r\n        if (a.tier === b.tier && it === 0) {\r\n          a.dead = true;\r\n          b.dead = true;\r\n          mergeFlat.push(a, b);\r\n          continue;\r\n        }\r\n\r\n        if (minGap >= 0) continue;\r\n        if (it === 0) { ctKind[ctN] = 1; ctA[ctN] = i; ctB[ctN] = j; ctNX[ctN] = bnx; ctNY[ctN] = bny; ctN++; }\r\n        const corr = Math.min(-minGap - 0.05, 4) * 0.9;\r\n        if (corr <= 0) continue;\r\n        const invSum = ainv + b.invMass;\r\n        const wa = ainv / invSum;\r\n        const wb = b.invMass / invSum;\r\n\r\n        a.x -= bnx * corr * wa;  a.y -= bny * corr * wa;\r\n        b.x += bnx * corr * wb;  b.y += bny * corr * wb;\r\n\r\n        a.contacts++;\r\n        b.contacts++;\r\n        syncParts(a);\r\n        syncParts(b);\r\n      }\r\n    }\r\n  }\r\n\r\n  /* --- 收尾墙约束 --- */\r\nif (PROF.on) PROF.t[3] += _now();\r\n  for (let i = 0; i < nBalls; i++) {\r\n    const b = balls[i];\r\n    if (b.dead) continue;\r\n    const rb = b.rbe;\r\n    if (b.x - rb >= CFG.WALL && b.x + rb <= CFG.W - CFG.WALL &&\r\n        b.y + rb <= CFG.H - CFG.WALL && b.y - rb >= 0) continue;\r\n\r\n    let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;\r\n    const n = b.np;\r\n    const wx = b.wx, wy = b.wy, ws = b.ws;\r\n    for (let k = 0; k < n; k++) {\r\n      const x = wx[k], y = wy[k], rr = ws[k];\r\n      const l = CFG.WALL - (x - rr);             if (l > pushL) pushL = l;\r\n      const rgt = (x + rr) - (CFG.W - CFG.WALL); if (rgt > pushR) pushR = rgt;\r\n      const dn = (y + rr) - (CFG.H - CFG.WALL);  if (dn > pushFloor) pushFloor = dn;\r\n      const up = -(y - rr);                      if (up > pushCeil) pushCeil = up;\r\n    }\r\n    if (pushL || pushR || pushFloor || pushCeil) {\r\n      b.x += pushL - pushR;\r\n      b.y += pushCeil - pushFloor;\r\n      b.contacts++;\r\n      syncParts(b);\r\n    }\r\n  }\r\n\r\n  /* --- PBD 速度 + 摩擦 --- */\r\nif (PROF.on) PROF.t[4] += _now();\r\n  const invDt = 1 / dt;\r\n  for (let i = 0; i < nBalls; i++) {\r\n    const b = balls[i];\r\n    if (b.dead) continue;\r\n\r\n    const dx = b.x - b.px;\r\n    const dy = b.y - b.py;\r\n\r\n    let vx = dx * invDt;\r\n    let vy = dy * invDt;\r\n\r\n    if (b.contacts > 0) vx *= CFG.FRICTION;\r\n    if (b.sq > 0) b.sq = Math.max(0, b.sq - b.sq * CFG.SQUASH_DECAY * dt);\r\n\r\n    b.vx = vx;\r\n    b.vy = vy;\r\n    b.angle += dx / b.r * 0.85;\r\n    updateTrig(b);                       // 角度变了，刷新 cos/sin 缓存\r\n\r\n    if (!b.landed) {\r\n      if (b.contacts > 0 || w.now - b.bornAt > 900) b.landed = true;\r\n    }\r\n  }\r\n\r\n  /* --- 弹性冲量 --- */\r\nif (PROF.on) PROF.t[5] += _now();\r\n  for (let k = 0; k < ctN; k++) {\r\n    if (ctKind[k] === 0) {\r\n      /* 撞墙 / 撞地面 */\r\n      const b = balls[ctA[k]];\r\n      if (b.dead) continue;\r\n      const nx = ctNX[k], ny = ctNY[k];\r\n      const vnPre = b.pvx * nx + b.pvy * ny;\r\n      if (vnPre < -CFG.REST_THRESHOLD) {\r\n        const vnPost = b.vx * nx + b.vy * ny;\r\n        const target = -CFG.WALL_RESTITUTION * vnPre;\r\n        const j = target - vnPost;\r\n        if (j > 0) {\r\n          b.vx += j * nx;\r\n          b.vy += j * ny;\r\n          squash(b, nx, ny, -vnPre);\r\n        }\r\n      }\r\n    } else {\r\n      /* 球与球 */\r\n      const a = balls[ctA[k]], b = balls[ctB[k]];\r\n      if (a.dead || b.dead) continue;\r\n      const nx = ctNX[k], ny = ctNY[k];\r\n      const vnPre = (a.pvx - b.pvx) * nx + (a.pvy - b.pvy) * ny;\r\n      if (vnPre > CFG.REST_THRESHOLD) {\r\n        const vnPost = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;\r\n        const target = -CFG.RESTITUTION * vnPre;\r\n        const j = (vnPost - target) / (a.invMass + b.invMass);\r\n        if (j > 0) {\r\n          a.vx -= j * a.invMass * nx;  a.vy -= j * a.invMass * ny;\r\n          b.vx += j * b.invMass * nx;  b.vy += j * b.invMass * ny;\r\n          squash(a, -nx, -ny, vnPre);\r\n          squash(b, nx, ny, vnPre);\r\n        }\r\n      }\r\n    }\r\n  }\r\n\r\n  /* --- 处理合成 --- */\r\nif (PROF.on) PROF.t[6] += _now();\r\n  if (mergeFlat.length) processMerges(w, mergeFlat);\r\n}\r\n\r\nfunction squash(b, nx, ny, speed) {\r\n  const k = Math.min(CFG.SQUASH_MAX, speed / 1500);\r\n  if (k <= b.sq) return;\r\n  b.sq = k;\r\n  b.sqA = Math.atan2(ny, nx);\r\n}\r\n\r\n/**\r\n * 处理合成。\r\n * @param {*} w\r\n * @param {Array} merges 扁平数组：[a, b, a, b, ...]（stepPhysics 的复用缓冲），\r\n *                        也兼容 [[a,b], ...] 的老写法\r\n */\r\nfunction processMerges(w, merges) {\r\n  let gained = 0;\r\n  let maxMergeTier = -1;\r\n  const events = [];\r\n  const flat = merges.length === 0 || merges[0] === undefined || !Array.isArray(merges[0]);\r\n\r\n  for (let k = 0, n = flat ? merges.length >> 1 : merges.length; k < n; k++) {\r\n    const a = flat ? merges[k * 2] : merges[k][0];\r\n    const b = flat ? merges[k * 2 + 1] : merges[k][1];\r\n    const mx = (a.x + b.x) * 0.5;\r\n    const my = (a.y + b.y) * 0.5;\r\n    const tier = a.tier;\r\n    /* 代数：0 = 直接和被投下的那颗合成；>=1 = 被落子引发的连锁（撞动了别人 / 腾出了空间） */\r\n    const gen = Math.max(a.gen || 0, b.gen || 0);\r\n\r\n    if (tier >= CFG.MAX_TIER) {\r\n      addScore(w, CFG.MAX_BONUS);\r\n      gained += CFG.MAX_BONUS;\r\n      w.flash = 1.4;\r\n      w.freeze = CFG.FREEZE_MS / 1000;\r\n      if (CFG.MAX_MERGE_GIVES_REVIVE) w.revives++;\r\n      if (tier > (w.mergedMaxTier ?? -1)) w.mergedMaxTier = tier;\r\n      w.freed += a.r * a.r + b.r * b.r;      // 两只神奶蛙一起没了：整块面积都还给了盘面\r\n      events.push({ tier, x: mx, y: my, score: CFG.MAX_BONUS, bonus: true });\r\n      if (w.mergeTrace) w.mergeTrace.push({ tier, x: mx, y: my, gen, bonus: true, step: w.stepCount || 0 });\r\n    } else {\r\n      const nt = tier + 1;\r\n      const nb = makeBall(w, mx, my, nt, (a.vx + b.vx) * 0.5, (a.vy + b.vy) * 0.5 - 60);\r\n      nb.x = clamp(nb.x, CFG.WALL + nb.r, CFG.W - CFG.WALL - nb.r);\r\n      nb.y = Math.min(nb.y, CFG.H - CFG.WALL - nb.r);\r\n      nb.px = nb.x;\r\n      nb.py = nb.y;\r\n      nb.landed = true;\r\n      nb.gen = gen + 1;                 // 合成产物继承「代数 + 1」\r\n      w.balls.push(nb);\r\n\r\n      addScore(w, MERGE_SCORE[nt]);\r\n      gained += MERGE_SCORE[nt];\r\n      /* 记账：这一合净释放了多少面积（两颗消失、一颗更大的顶上）—— 只用于评估函数，\r\n         不参与物理。加大果的权重靠的是面积本身随半径平方增长。 */\r\n      w.freed += a.r * a.r + b.r * b.r - nb.r * nb.r;\r\n      if (nt === CFG.MAX_TIER) w.flash = 1;\r\n      events.push({ tier: nt, x: mx, y: my, score: MERGE_SCORE[nt], bonus: false });\r\n      if (w.mergeTrace) w.mergeTrace.push({ tier: nt, x: mx, y: my, gen, bonus: false, step: w.stepCount || 0 });\r\n      if (nt > maxMergeTier) maxMergeTier = nt;\r\n      if (nt > (w.mergedMaxTier ?? -1)) w.mergedMaxTier = nt;\r\n    }\r\n  }\r\n\r\n  const alive = [];\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    if (!w.balls[i].dead) alive.push(w.balls[i]);\r\n  }\r\n  w.balls = alive;\r\n\r\n  w.lastMerges = events;\r\n  w.lastMergeGain = gained;\r\n  if (maxMergeTier >= 0) w.lastMaxMergeTier = maxMergeTier;\r\n  return events;\r\n}\r\n\r\n/* --------------------------------------------------------------- 判负 ----- */\r\n\r\nfunction checkGameOver(w, dt) {\r\n  let danger = false;\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    const b = w.balls[i];\r\n    if (b.dead || !b.landed) continue;\r\n    const top = b.y - b.r;\r\n\r\n    if (top < CFG.DANGER_Y) {\r\n      danger = true;\r\n      if (b.vx * b.vx + b.vy * b.vy < CFG.REST_SPEED2) {\r\n        b.overTime += dt;\r\n        if (b.overTime > CFG.OVER_LIMIT) { w.over = true; w.overAt = w.now; return true; }\r\n      } else {\r\n        b.overTime = Math.max(0, b.overTime - dt * 2);\r\n      }\r\n    } else {\r\n      b.overTime = Math.max(0, b.overTime - dt * 2);\r\n      if (b.overTime > 0) danger = true;\r\n    }\r\n  }\r\n  w.danger = danger;\r\n  return false;\r\n}\r\n\r\n/* --------------------------------------------------------------- 复活 ----- */\r\n\r\nfunction revive(w) {\r\n  if (!w.over || w.revives <= 0) return false;\r\n\r\n  let top = -1;\r\n  let topEdge = Infinity;\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    const b = w.balls[i];\r\n    if (b.dead) continue;\r\n    const edge = b.y - b.r;\r\n    if (edge < topEdge) { topEdge = edge; top = i; }\r\n  }\r\n  if (top >= 0) w.balls.splice(top, 1);\r\n\r\n  w.balls = w.balls.filter((b) => !b.dead && (b.y - b.r) >= CFG.DANGER_Y + 6);\r\n\r\n  for (let i = 0; i < w.balls.length; i++) w.balls[i].overTime = 0;\r\n\r\n  w.revives--;\r\n  w.over = false;\r\n  w.danger = false;\r\n  w.ready = true;\r\n  w.cooldown = 0;\r\n  w.flash = 0.6;\r\n  return true;\r\n}\r\n\r\n/* --------------------------------------------------------------- 主循环 --- */\r\n\r\nfunction update(w, dt) {\r\n  DIAG.updates++;\r\n  w.now += dt * 1000;                       // 虚拟时钟（对应线上 performance.now()）\r\n  w.stepCount = (w.stepCount || 0) + 1;\r\n\r\n  if (w.freeze > 0) { w.freeze = Math.max(0, w.freeze - dt); return; }\r\n  if (w.over) return;\r\n\r\n  if (!w.ready) {\r\n    w.cooldown -= dt;\r\n    if (w.cooldown <= 0) w.ready = true;\r\n  }\r\n\r\n  const sub = dt / CFG.SUBSTEPS;\r\n  for (let s = 0; s < CFG.SUBSTEPS; s++) stepPhysics(w, sub);\r\n\r\n  checkGameOver(w, dt);\r\n  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.2);\r\n}\r\n\r\n/* -------------------------------------------------------------- 快照 ------ */\r\n\r\n/* 把一个世界深拷贝出来（推演用）。balls 用对象池减少 GC 压力 */\r\nfunction cloneWorld(src, dst) {\r\n  DIAG.clones++;\r\n  const w = dst || makeWorld({ rng: src.rng });\r\n  const balls = [];\r\n  for (let i = 0; i < src.balls.length; i++) balls.push(cloneBall(src.balls[i], src.now));\r\n  w.balls = balls;\r\n  w.score = src.score;\r\n  w.pending = src.pending;\r\n  w.next = src.next;\r\n  w.ready = src.ready;\r\n  w.cooldown = src.cooldown;\r\n  w.aimX = src.aimX;\r\n  w.over = src.over;\r\n  w.flash = src.flash;\r\n  w.revives = src.revives;\r\n  w.reviveGiven = src.reviveGiven;\r\n  w.freeze = src.freeze;\r\n  w.danger = src.danger;\r\n  w.now = src.now;\r\n  w.drops = src.drops;\r\n  w.rng = src.rng;\r\n  w.overAt = src.overAt;\r\n  w.mergedMaxTier = src.mergedMaxTier;\r\n  w.freed = src.freed;\r\n  w.lastMerges = src.lastMerges;\r\n  w.lastMergeGain = src.lastMergeGain;\r\n  w.lastMaxMergeTier = src.lastMaxMergeTier;\r\n  return w;\r\n}\r\n\r\n/* 让世界跑 seconds 秒（固定步长），可选提前停止条件 */\r\nfunction runFor(w, seconds, opts = {}) {\r\n  const step = CFG.FIXED;\r\n  const n = Math.round(seconds / step);\r\n  const stopWhen = opts.stopWhen;\r\n  for (let i = 0; i < n; i++) {\r\n    update(w, step);\r\n    if (w.over) return i + 1;\r\n    if (stopWhen && stopWhen(w, i)) return i + 1;\r\n  }\r\n  return n;\r\n}\r\n\r\n/* 盘面静止度：所有球的最大速度（判断推演是否已经稳定） */\r\nfunction maxSpeed(w) {\r\n  let m = 0;\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    const b = w.balls[i];\r\n    const v = b.vx * b.vx + b.vy * b.vy;\r\n    if (v > m) m = v;\r\n  }\r\n  return Math.sqrt(m);\r\n}\r\n\r\n/* 顶部高度（越小越高） */\r\nfunction stackTop(w) {\r\n  let top = CFG.H;\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    const t = w.balls[i].y - w.balls[i].r;\r\n    if (t < top) top = t;\r\n  }\r\n  return top;\r\n}\r\n\r\n/* ---------------------------------------------------------------------------\r\n *  快照：主线程 → Worker 的最小序列化形式\r\n *  （球的 wx/wy/ws 不传，Worker 按 tier 用自己的 shapes 重建，省带宽也省 GC）\r\n * ------------------------------------------------------------------------- */\r\nfunction snapshotOf(g, nowMs) {\r\n  return {\r\n    balls: (g.balls || []).map(b => ({\r\n      x: b.x, y: b.y, vx: b.vx, vy: b.vy, px: b.px, py: b.py,\r\n      r: b.r, tier: b.tier, angle: b.angle,\r\n      mass: b.mass, invMass: b.invMass,\r\n      bornAt: b.bornAt, overTime: b.overTime,\r\n      landed: !!b.landed, dead: !!b.dead, contacts: b.contacts || 0,\r\n      pvx: b.pvx || 0, pvy: b.pvy || 0, sq: b.sq || 0, sqA: b.sqA || 0,\r\n    })),\r\n    score: g.score, pending: g.pending, next: g.next,\r\n    ready: g.ready, cooldown: g.cooldown, aimX: g.aimX,\r\n    over: g.over, revives: g.revives, reviveGiven: g.reviveGiven,\r\n    freeze: g.freeze, danger: g.danger, flash: g.flash || 0,\r\n    drops: g.drops || 0,\r\n    nowMs: nowMs === undefined ? null : nowMs,\r\n  };\r\n}\r\n\r\n/* 从真实游戏对象（window.__DNW__）搬运状态到本引擎的世界。\r\n   gameState 既可以是活的对象，也可以是 snapshotOf() 出来的普通对象。 */\r\nfunction adoptFromGame(w, gameState, shapes, nowMs) {\r\n  if (shapes) setShapes(shapes);\r\n  const balls = [];\r\n  for (let i = 0; i < gameState.balls.length; i++) {\r\n    const g = gameState.balls[i];\r\n    const sh = shapeOf(g.tier);\r\n    const n = sh.parts.length;\r\n    const loc = localOf(sh, g.r);\r\n    const b = {\r\n      x: g.x, y: g.y, vx: g.vx, vy: g.vy, px: g.px, py: g.py,\r\n      r: g.r, tier: g.tier, angle: g.angle,\r\n      mass: g.mass, invMass: g.invMass,\r\n      bornAt: g.bornAt, overTime: g.overTime,\r\n      landed: g.landed, dead: !!g.dead, contacts: g.contacts || 0,\r\n      pvx: g.pvx || 0, pvy: g.pvy || 0,\r\n      sq: g.sq || 0, sqA: g.sqA || 0,\r\n      parts: sh.parts, np: n,\r\n      pcos: 1, psin: 0, rb: sh.rb * g.r,\r\n      rbe: (sh.ext || sh.rb) * g.r,\r\n      lx: loc.lx, ly: loc.ly, ls: loc.ls,\r\n      wx: new Float32Array(n), wy: new Float32Array(n), ws: new Float32Array(n),\r\n      gen: 0,\r\n    };\r\n    updateTrig(b);            // 角度是从游戏那边搬过来的，缓存要先算好\r\n    syncParts(b);\r\n    balls.push(b);\r\n  }\r\n  w.balls = balls;\r\n  w.score = gameState.score;\r\n  w.pending = gameState.pending;\r\n  w.next = gameState.next;\r\n  w.ready = gameState.ready;\r\n  w.cooldown = gameState.cooldown;\r\n  w.aimX = gameState.aimX;\r\n  w.over = gameState.over;\r\n  w.revives = gameState.revives;\r\n  w.reviveGiven = gameState.reviveGiven;\r\n  w.freeze = gameState.freeze;\r\n  w.danger = gameState.danger;\r\n  w.flash = gameState.flash || 0;\r\n  /* gameState 里的 bornAt 用的是主线程的真实时钟；Worker 里的 performance.now()\r\n     是另一个时间原点，所以必须显式把主线程的 now 带过来（否则对齐会错） */\r\n  w.now = (nowMs !== undefined && nowMs !== null) ? nowMs\r\n    : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());\r\n  return w;\r\n}\r\n\r\n\r\n\nreturn { syncParts, DIAG, resetDiag, CFG, FRUITS, MERGE_SCORE, SPAWN_TIERS, SPAWN_WEIGHTS, TIER_VALUE, setShapes, getShapes, getExactShapes, setShapeMode, makeWorld, resetWorld, makeBall, cloneBall, aimLimit, moveAim, tryDrop, dropAt, pickSpawnTier, PROF, stepPhysics, processMerges, checkGameOver, revive, update, cloneWorld, runFor, maxSpeed, stackTop, snapshotOf, adoptFromGame };\n})();\n\nMODS['planner'] = (function () {\n/* ============================================================================\r\n *  planner.js —— 落点决策\r\n *\r\n *  管线（每一层都能开关、都能预算降级）：\r\n *    ① 候选生成：在可投范围内按 step 均分（含两端），必要时加局部细化\r\n *    ② 推演      ：克隆世界 → 投放 → 用「和线上一模一样」的物理跑到稳定\r\n *    ③ 评估      ：真实得分 + 盘面形状风险 + 潜在合成机会\r\n *    ④ 精选      ：前 topK 个候选跑更长的推演\r\n *    ⑤ 期望搜索  ：下一步那颗水果是随机的，按掉落权重做一层期望（可关）\r\n *    ⑥ 细化      ：在冠军落点左右再试几个更细的位置\r\n *\r\n *  为什么全程用 exact 物理：见 tools/model-agreement.mjs —— 换成近似外形\r\n *  （少几个碰撞小圆 / 直接用圆）以后，决策排序与真实物理几乎不相关（ρ≈0），\r\n *  因为「这颗到底会不会撞上、会不会合成」本来就是混沌的，必须精确模拟。\r\n * ========================================================================== */\r\n\r\nconst E = MODS['engine'];\r\n\r\n/* ------------------------------------------------------------ 权重配置 ---- */\r\n\r\nconst DEFAULT_WEIGHTS = {\r\n  merge:   1.00,   // 推演窗口内真实拿到的分数\r\n  mergeW:  3.00,   // 推演窗口内合出的最大 tier 奖励（引导往大果走）\r\n  top:     2.00,   // 堆顶逼近警戒线的二次惩罚\r\n  above:   8.00,   // 越线水果的数量 × 体积\r\n  overT:   4.00,   // 越线计时（离判负还有多远）\r\n  bump:    0.00,   // 表面起伏（对照实验里关掉它反而更好，留 0 但保留这个旋钮）\r\n  adj:     2.40,   // 同级相邻度（潜在合成机会；对照实验里加强它更稳）\r\n  bigPair: 2.20,   // 同级「大果」抱团：后期最要命的就是两个大奶蛙各占一边永远合不上\r\n  blocked: 0.90,   // 两个同级大果之间塞着别的水果（合不拢的直接原因）\r\n  mono:    0.00,   // 层级沿水平方向的梯度（大果集中在一侧）—— 默认关，可调参开\r\n  bigHigh: 0.80,   // 大果被顶到高处\r\n  buried:  0.60,   // 大果压小果（被埋的小果就废了）\r\n  frag:    0.25,   // 碎块惩罚\r\n  /* 形状 / 长期位置（2026-10-14 新增，默认全 0 = 完全不参与，见 features() 的说明）：\r\n     flat   柱子凸出（罚）· pool 工作面还剩多宽（奖）· ground 大果沉底（奖） */\r\n  flat:    0.00,\r\n  pool:    0.00,\r\n  ground:  0.00,\r\n  /* 用户反馈的两项「长久受益」（默认关闭，用 tools/tune.mjs 验证过才开）：\r\n     stuck —— 底部堆着没有同级伙伴的大果（占地方又合不掉）\r\n     space —— 这一手合成释放掉的空间（大果收益随半径平方增长） */\r\n  stuck:   0.00,\r\n  space:   0.00,\r\n  dead:   -10000,  // 推演中判负（手里没有复活币时的死局）\r\n  /* 有复活币时，风险不再等于死：允许把场面堆得更高，换更大的合成空间\r\n     （每 2000 分、以及两只神奶蛙相撞都会再发币） */\r\n  riskScaleWithRevive: 0.45,\r\n};\r\n\r\nconst SOFT_TOP = 330;   // 顶部从 y=330 开始算「接近警戒线」\r\n\r\n/* -------------------------------------------------------- 盘面特征提取 ---- */\r\n\r\nconst N_BINS = 8;\r\n\r\nfunction features(w) {\r\n  const balls = w.balls;\r\n  const n = balls.length;\r\n  const W = E.CFG.W, WALL = E.CFG.WALL, H = E.CFG.H;\r\n  const binW = (W - 2 * WALL) / N_BINS;\r\n\r\n  let top = H;\r\n  let above = 0, aboveMass = 0, overT = 0;\r\n  let bigHigh = 0;\r\n\r\n  const profile = new Float64Array(N_BINS).fill(H - WALL);\r\n\r\n  for (let i = 0; i < n; i++) {\r\n    const b = balls[i];\r\n    if (b.dead) continue;\r\n    const t = b.y - b.r;\r\n    if (t < top) top = t;\r\n    if (t < E.CFG.DANGER_Y) {\r\n      above++;\r\n      aboveMass += (E.CFG.DANGER_Y - t) * (b.r / 50);\r\n    }\r\n    if (b.overTime > overT) overT = b.overTime;\r\n    if (t < SOFT_TOP) bigHigh += (SOFT_TOP - t) * (b.r / 100) * (b.r / 100);\r\n\r\n    const i0 = Math.max(0, Math.floor((b.x - b.r - WALL) / binW));\r\n    const i1 = Math.min(N_BINS - 1, Math.floor((b.x + b.r - WALL) / binW));\r\n    for (let k = i0; k <= i1; k++) if (t < profile[k]) profile[k] = t;\r\n  }\r\n\r\n  let bump = 0;\r\n  for (let k = 0; k + 1 < N_BINS; k++) bump += Math.abs(profile[k + 1] - profile[k]);\r\n\r\n  /* 同级相邻度：距离越近、越可能马上合（按合成价值加权） */\r\n  let adj = 0;\r\n  for (let i = 0; i < n; i++) {\r\n    const a = balls[i];\r\n    if (a.dead || a.tier >= E.CFG.MAX_TIER) continue;\r\n    for (let j = i + 1; j < n; j++) {\r\n      const b = balls[j];\r\n      if (b.dead || b.tier !== a.tier) continue;\r\n      const dx = b.x - a.x, dy = b.y - a.y;\r\n      const d = Math.sqrt(dx * dx + dy * dy);\r\n      const reach = (a.r + b.r) * 1.9;\r\n      if (d >= reach) continue;\r\n      const near = 1 - d / reach;\r\n      adj += near * near * (E.MERGE_SCORE[a.tier + 1] + 1);\r\n    }\r\n  }\r\n\r\n  /* 「大果抱团」与「被挡」：后期最常见的死法 —— 两只半奶蛙/神奶蛙各占一边，\r\n     中间塞着一堆小果，永远合不到一起。这两项就是专门治它的。\r\n     tier 越大权重越夸张（(tier-3)^1.6），因为大果合成的收益是超线性的。 */\r\n  let bigPair = 0, blocked = 0, monoNum = 0, monoDen = 0;\r\n  for (let i = 0; i < n; i++) {\r\n    const a = balls[i];\r\n    if (a.dead || a.tier < 5) continue;\r\n    for (let j = i + 1; j < n; j++) {\r\n      const b = balls[j];\r\n      if (b.dead || b.tier !== a.tier) continue;\r\n      const wBig = Math.pow(a.tier - 3, 1.6);\r\n      const dx = b.x - a.x, dy = b.y - a.y;\r\n      const d = Math.sqrt(dx * dx + dy * dy);\r\n      const reach = (a.r + b.r) * 2.2;\r\n      if (d < reach) bigPair += (1 - d / reach) * wBig;\r\n      else bigPair -= Math.min(1, (d - reach) / ((a.r + b.r) * 3)) * wBig * 0.6;\r\n\r\n      /* 两颗大果水平之间、位置更高（y 更小）的水果 = 挡路的 */\r\n      if (d < (a.r + b.r) * 3.4) {\r\n        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);\r\n        const yBar = Math.max(a.y, b.y);\r\n        for (let k = 0; k < n; k++) {\r\n          const c = balls[k];\r\n          if (c === a || c === b || c.dead) continue;\r\n          if (c.x > x0 && c.x < x1 && c.y < yBar) blocked += wBig * 0.35;\r\n        }\r\n      }\r\n    }\r\n  }\r\n  /* 层级梯度：大果是不是集中在一侧（经典的「大果归边」打法） */\r\n  {\r\n    let sxy = 0, sx = 0, sy = 0, sx2 = 0, cnt = 0;\r\n    for (let i = 0; i < n; i++) {\r\n      const b = balls[i];\r\n      if (b.dead) continue;\r\n      const t = b.tier + 1, x = b.x;\r\n      sxy += t * x; sx += x; sy += t; sx2 += x * x; cnt++;\r\n    }\r\n    if (cnt > 3) {\r\n      const mx = sx / cnt, my = sy / cnt;\r\n      const vx = sx2 / cnt - mx * mx;\r\n      if (vx > 1) { monoNum = Math.abs((sxy / cnt - mx * my) / Math.sqrt(vx)); monoDen = 1; }\r\n    }\r\n  }\r\n\r\n  /* 「被埋」：大果压在小果上 → 那颗小果基本再也合不掉了（后期最伤的盘面） */\r\n  let buried = 0;\r\n  for (let i = 0; i < n; i++) {\r\n    const a = balls[i];\r\n    if (a.dead) continue;\r\n    for (let j = 0; j < n; j++) {\r\n      if (i === j) continue;\r\n      const b = balls[j];\r\n      if (b.dead || a.r < b.r * 1.35) continue;       // a 得明显比 b 大\r\n      if (a.y + a.r * 0.7 > b.y) continue;            // 且 a 得压在 b 上面\r\n      buried += (a.r / b.r) * 0.06;\r\n    }\r\n  }\r\n\r\n  /* 顶点风险：只有靠近/越过警戒线才计入 */\r\n  const gap = Math.max(0, top - SOFT_TOP);\r\n  const topRisk = gap === 0 ? 1 + (SOFT_TOP - top) / 40 : 0;\r\n\r\n  /* 「无效大果」：没有同级伙伴的大果 —— 占着地方、又永远合不掉。\r\n     这正是用户观察到的情况：底部堆了一堆奶蛙，彼此都合不到一起，越堆越高。\r\n     按面积 (r/100)² 计权：越大的果占地方越多，越该优先把它处理掉。\r\n     一旦出现了同级伙伴（2.5 倍半径和之内），就不算「无效」了 —— 它有机会合。 */\r\n  let stuck = 0;\r\n  for (let i = 0; i < n; i++) {\r\n    const a = balls[i];\r\n    if (a.dead || a.tier < 6) continue;\r\n    let partner = false;\r\n    for (let j = 0; j < n; j++) {\r\n      if (i === j) continue;\r\n      const b = balls[j];\r\n      if (b.dead || b.tier !== a.tier) continue;\r\n      const dx = b.x - a.x, dy = b.y - a.y;\r\n      const reach = (a.r + b.r) * 2.5;\r\n      if (dx * dx + dy * dy < reach * reach) { partner = true; break; }\r\n    }\r\n    if (!partner) stuck += (a.r / 100) * (a.r / 100);\r\n  }\r\n\r\n  /* ------------------------------------------------------------------------\r\n   *  形状 / 长期位置（2026-10-14 新增；权重默认 0 —— 不开时一个比特都不变）\r\n   *\r\n   *  动机是 README 第十三节的解剖结果：**52.5% 的手，前 8 名候选的评估值完全\r\n   *  并列**（极差 ≤0.5）。并列大多出现在盘面还稀疏的时候 —— 那些落点在 2.6 秒\r\n   *  窗口内确实等价，可是它们把水果放在左边/右边/中间，对**几十手之后**的形状\r\n   *  影响完全不同，而这件事在评估函数里过去权重为零。\r\n   *\r\n   *  三项各管一件事：\r\n   *    flat  —— 有没有「柱子」凸出来。判负看的就是最高那一颗，所以把\"比平均\r\n   *             高出一截的柱\"按平方罚。（与 bump 的区别：bump 罚的是斜率，一个\r\n   *             平缓的斜坡 bump 很大却一点都不危险。）\r\n   *    pool  —— 工作面还剩多少、而且是\"整片都还剩\"。取每列可用高度（堆顶到\r\n   *             警戒线）的截断平均。它比 top 温和得多（top 只看全局最高点，\r\n   *             压线时无上限放大），给中前期的\"布局够不够宽\"一个有梯度的信号。\r\n   *    ground—— 大质量有没有沉底。大果停在底层 = 上面留给可操作的小果；\r\n   *             大果悬在中间 = 既挡路又随时会被顶到线上。按 (r/100)³ 计权，\r\n   *             所以它关心的是「半奶蛙/神奶蛙在哪」，而不是葡萄在哪。\r\n   * ---------------------------------------------------------------------- */\r\n  let meanTop = 0, nCol = 0;\r\n  for (let k = 0; k < N_BINS; k++) {\r\n    if (profile[k] < H - WALL) { meanTop += profile[k]; nCol++; }\r\n  }\r\n  meanTop = nCol ? meanTop / nCol : H - WALL;\r\n\r\n  let flat = 0;\r\n  for (let k = 0; k < N_BINS; k++) {\r\n    const d = meanTop - profile[k];          // >0 = 这一列比平均高\r\n    if (d > 0) flat += d * d;\r\n  }\r\n  flat = flat / (N_BINS * 2500);             // 一根高出平均 50px 的柱子 ≈ 0.125\r\n\r\n  let pool = 0;\r\n  for (let k = 0; k < N_BINS; k++) {\r\n    const free = profile[k] - E.CFG.DANGER_Y;\r\n    pool += free <= 0 ? 0 : Math.min(1, free / 220);\r\n  }\r\n  pool = pool / N_BINS;\r\n\r\n  let ground = 0;\r\n  const floorY = H - WALL;\r\n  for (let i = 0; i < n; i++) {\r\n    const b = balls[i];\r\n    if (b.dead) continue;\r\n    const depth = (floorY - (b.y + b.r)) / floorY;     // 0 = 贴着底板\r\n    const wBig = b.r / 100;\r\n    ground += wBig * wBig * wBig * Math.max(0, 1 - depth);\r\n  }\r\n  ground = ground / 3;\r\n\r\n  return {\r\n    n, top, above, aboveMass, buried: buried / 10,\r\n    bigPair: bigPair / 12,\r\n    blocked: blocked / 12,\r\n    stuck: stuck / 4,\r\n    flat, pool, ground,\r\n    /* 本轮推演里合成「释放掉的面积」：两颗消失、一颗更大的顶上，净腾出来的空间。\r\n       加大果的收益随半径平方增长 —— 合掉两只半奶蛙腾出的地方，是合掉两颗葡萄的 160 倍。 */\r\n    space: (w.freed || 0) / 10000,\r\n    mono: monoDen ? monoNum / 200 : 0,\r\n    overN: Math.min(1, overT / E.CFG.OVER_LIMIT),\r\n    bump: bump / (N_BINS - 1) / 100,\r\n    adj: adj / 40,\r\n    bigHigh: bigHigh / 60,\r\n    room: Math.max(0, top - E.CFG.DANGER_Y) / (H - E.CFG.DANGER_Y),\r\n    topRisk2: topRisk * topRisk,\r\n  };\r\n}\r\n\r\n/* ------------------------------------------------------------ 局面评估 ---- */\r\n\r\nconst DIAG = { evals: 0 };\r\nfunction resetDiag() { DIAG.evals = 0; }\r\n\r\nfunction evaluate(w, before, wt = DEFAULT_WEIGHTS) {\r\n  DIAG.evals++;\r\n  if (w.over) return wt.dead ?? DEFAULT_WEIGHTS.dead;   // 权重表允许只写想改的项\r\n  const f = features(w);\r\n  /* 手里有复活币时「越线」没那么可怕：输了只是清掉顶上一片、花一枚币继续打。\r\n     所以风险项整体缩小 —— 这就是「用复活币换更大空间」的实现。 */\r\n  const risk = (w.revives > 0) ? (wt.riskScaleWithRevive ?? 1) : 1;\r\n\r\n  let v = 0;\r\n  v += wt.merge * (w.score - before);\r\n  v += wt.mergeW * Math.max(0, (w.mergedMaxTier ?? -1) - 3);\r\n  v -= wt.top * f.topRisk2 * 24 * risk;\r\n  v -= wt.above * f.aboveMass * risk;\r\n  v -= wt.overT * f.overN * 20 * risk;\r\n  v -= wt.bump * f.bump * 20;\r\n  v += wt.adj * f.adj;\r\n  v += (wt.bigPair || 0) * f.bigPair;\r\n  v -= (wt.blocked || 0) * f.blocked;\r\n  v += (wt.mono || 0) * f.mono * 4;\r\n  v -= wt.bigHigh * f.bigHigh;\r\n  v -= (wt.buried || 0) * f.buried;\r\n  v -= (wt.fragFruit ? wt.frag * f.n * wt.fragFruit : wt.frag * f.n * 0.15);\r\n  /* 可选的「材料」项（默认关闭，权重缺省时完全不参与）：盘面上未合成的 2^tier 之和。\r\n     合成守恒这个量，它是还没变成分数的潜在价值；复活删掉的水果会让它下降，从而被计入代价。 */\r\n  if (wt.mat) v += wt.mat * tokenMass(w) / 100;\r\n  /* 「无效大果」惩罚 + 「腾出空间」奖励（默认关闭）。\r\n     用户的观察：先把顶部消掉只是拿了眼前的分数，底部那一堆合不掉的奶蛙才是长久的病。\r\n     space 直接奖励「这一手腾出了多少地方」，大果的收益随半径平方增长，\r\n     所以它会把「合掉两只半奶蛙」排在「多拿 45 分」前面。 */\r\n  v -= (wt.stuck || 0) * f.stuck;\r\n  /* 形状 / 长期位置三项（默认全 0，见 features() 里的说明）。\r\n     flat 是罚项（柱子），pool / ground 是奖项（工作面宽、大果沉底）。 */\r\n  v -= (wt.flat || 0) * f.flat;\r\n  v += (wt.pool || 0) * f.pool;\r\n  v += (wt.ground || 0) * f.ground;\r\n  if (wt.space) v += wt.space * f.space;\r\n  return v;\r\n}\r\n\r\nfunction tokenMass(w) {\r\n  let s = 0;\r\n  for (let i = 0; i < w.balls.length; i++) {\r\n    const b = w.balls[i];\r\n    if (!b.dead) s += Math.pow(2, b.tier);\r\n  }\r\n  return s;\r\n}\r\n\r\n/* ---------------------------------------------------------------- 工具 ---- */\r\n\r\nconst now = (typeof performance !== 'undefined' && performance.now)\r\n  ? () => performance.now() : () => Date.now();\r\n\r\nfunction mulberry32(seed) {\r\n  let a = seed >>> 0;\r\n  return function () {\r\n    a |= 0; a = (a + 0x6D2B79F5) | 0;\r\n    let t = Math.imul(a ^ (a >>> 15), 1 | a);\r\n    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;\r\n    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\r\n  };\r\n}\r\n\r\nfunction candidateXs(tier, step, around = null, span = 0) {\r\n  const [lo, hi] = E.aimLimit(tier);\r\n  if (around !== null) {\r\n    const out = [];\r\n    for (let x = around - span; x <= around + span + 1e-9; x += step) out.push(Math.min(hi, Math.max(lo, x)));\r\n    return out;\r\n  }\r\n  const out = [];\r\n  if (hi <= lo) return [lo];\r\n  const n = Math.max(1, Math.round((hi - lo) / step));\r\n  for (let i = 0; i <= n; i++) out.push(lo + (hi - lo) * (i / n));\r\n  return out;\r\n}\r\n\r\n/* ---------------------------------------------------------------------------\r\n *  收敛判定：什么时候可以认为「盘面已经不会再变了」\r\n *\r\n *  规则一（原有）：瞬时速度 < 25 px/s（= 每帧位移 < 0.42px）。\r\n *  规则二（新增）：**整盘净位移**——连续两个窗口里，每颗水果相对上一个\r\n *    窗口的位移都小于 1.5px。\r\n *\r\n *  为什么要加规则二：奶蛙被挤在中间时，碰撞箱解算收敛不了，会一直小幅上下抖\r\n *  （位置在 ±0.7px 里来回，速度却一直有 30~200 px/s），于是规则一永远不触发，\r\n *  每一次推演都要跑满整个时间窗 —— 这就是「抖动时思考特别慢」的直接原因。\r\n *  规则二看的是「走了多远」而不是「走得多快」，这种原地抖动会被正确识别为已停。\r\n *\r\n *  参数都是量出来的（tools/packed-probe.mjs、tools/jitter-diag.mjs）：\r\n *  真停住时每 16 帧的净位移是 0.5~1.2px，而瞬时速度还能尖到 200 px/s。\r\n *\r\n *  正确性说明：这里改的是「什么时候收工」，**物理本身一个比特都没有动**\r\n *  （引擎仍然是逐帧照抄线上），而且规则二比规则一更严格：\r\n *  一个正在慢慢滚动（20px/s）的水果会被规则一放行、但不会通过规则二。\r\n * ------------------------------------------------------------------------- */\r\nconst SETTLE = {\r\n  /* 默认关闭。实测（tools/settle-ab.mjs，5 个盘面）：打开后只省 1~3% 的物理帧，\r\n     但 5 个盘面里有 1 个换掉了落点 —— 按本项目「决定不逐位相同就必须有证据证明更好」\r\n     的规矩，在没有跑分证据之前不开。想在抖动盘面上再快一点可以开：\r\n       NaiwaBot.planner.SETTLE.vibrate = true\r\n     它只在「整盘每 16 帧净位移 < 1.5px、连续两个窗口」时才收工，物理一个比特没动。 */\r\n  vibrate: false,\r\n  vibWindow: 16,      // 窗口长度（帧）；必须是 4 的倍数，才可能和 (i & 3) === 0 对齐\r\n  vibEps: 1.5,        // 窗口间允许的最大位移（px）\r\n  vibNeed: 2,         // 连续多少个窗口满足才算「冻住」\r\n  vibMaxSpeed: 400,   // 抖动幅度上限：再快说明是真的在动，不认「冻住」\r\n};\r\n\r\nconst POSE_CAP = 200;                       // 盘面最多约 96 颗\r\nconst posePrev = new Float64Array(POSE_CAP * 3 + 2);\r\nconst poseCur = new Float64Array(POSE_CAP * 3 + 2);\r\n\r\n/* 采集姿态：球数、分数、每颗的 (tier, x, y)。返回球数，-1 表示放不下 */\r\nfunction capturePose(w, buf) {\r\n  const nb = w.balls.length;\r\n  if (nb > POSE_CAP) return -1;\r\n  buf[0] = nb; buf[1] = w.score;\r\n  for (let k = 0; k < nb; k++) {\r\n    const b = w.balls[k];\r\n    buf[2 + k * 3] = b.tier;\r\n    buf[3 + k * 3] = b.x;\r\n    buf[4 + k * 3] = b.y;\r\n  }\r\n  return nb;\r\n}\r\n\r\n/* 两个姿态之间的最大位移；球数/分数/等级不一致时返回 Infinity（= 不算冻住） */\r\nfunction poseShift(a, b, nb) {\r\n  if (a[1] !== b[1]) return Infinity;              // 分数变了 → 期间发生了合成\r\n  let m = 0;\r\n  for (let k = 0; k < nb; k++) {\r\n    if (a[2 + k * 3] !== b[2 + k * 3]) return Infinity;   // 等级对不上 → 不是同一颗\r\n    const dx = Math.abs(a[3 + k * 3] - b[3 + k * 3]);\r\n    const dy = Math.abs(a[4 + k * 3] - b[4 + k * 3]);\r\n    const d = dx > dy ? dx : dy;\r\n    if (d > m) m = d;\r\n  }\r\n  return m;\r\n}\r\n\r\n/* 跑到 h 秒；盘面静下来（且已跑够 quiet）就提前收工 */\r\nfunction runSettle(w, h, quiet, allowRevive = true) {\r\n  const step = E.CFG.FIXED;\r\n  const n = Math.round(h / step);\r\n  const minSteps = quiet ? Math.round(quiet / step) : n;\r\n  const vib = SETTLE.vibrate;\r\n  let prevN = -1, frozen = 0;\r\n\r\n  for (let i = 0; i < n; i++) {\r\n    E.update(w, step);\r\n    if (w.over) {\r\n      /* 有币就花：推演里直接把复活做掉，继续往下跑。\r\n         这样评估函数看到的是「用币之后的真实局面」，而不是一刀切判死 */\r\n      if (allowRevive && w.revives > 0 && E.revive(w)) { prevN = -1; frozen = 0; continue; }\r\n      return i + 1;\r\n    }\r\n    if (i < minSteps || (i & 3) !== 0) continue;\r\n\r\n    if (E.maxSpeed(w) < 25) return i + 1;          // 规则一：真的静止\r\n\r\n    if (vib && i % SETTLE.vibWindow === 0) {        // 规则二：整盘净位移\r\n      const nb = capturePose(w, poseCur);\r\n      if (nb < 0) continue;\r\n      if (nb === prevN && E.maxSpeed(w) < SETTLE.vibMaxSpeed) {\r\n        const shift = poseShift(poseCur, posePrev, nb);\r\n        if (shift < SETTLE.vibEps) {\r\n          frozen++;\r\n          if (frozen >= SETTLE.vibNeed) return i + 1;\r\n        } else frozen = 0;\r\n      } else frozen = 0;\r\n      posePrev.set(poseCur);                        // 滚动基线\r\n      prevN = nb;\r\n    }\r\n  }\r\n  return n;\r\n}\r\n\r\n/* 推演一次投放 → 返回评估值。\r\n   allowRevive=false 表示「推演里不许用币续命」= 越线就直接判死（保守打法用）。 */\r\nfunction rolloutValue(src, x, h, wt, scratch, quiet, allowRevive = true) {\r\n  const sim = E.cloneWorld(src, scratch);\r\n  sim.mergedMaxTier = -1; sim.freed = 0;\r\n  const before = sim.score;\r\n  E.dropAt(sim, x);          // 若 !ready 会失败 → 调用方保证 ready\r\n  runSettle(sim, h, quiet, allowRevive);\r\n  const v = evaluate(sim, before, wt);\r\n  return { v, sim, gain: sim.score - before };\r\n}\r\n\r\n/* --------------------------------------------------------------- 主入口 --- */\r\n\r\n/* ---------------------------------------------------------------------------\r\n *  四个搜索阶段 —— 都写成「纯函数」：(世界, 参数, 候选落点列表) → 结果列表\r\n *\r\n *  这样同一套代码既能顺序跑（Node 自我对弈），也能分片丢给多个 Worker 并行跑\r\n *  （浏览器里的 bot）。每个阶段内部对每个 x 的计算互相独立，分片不会改变任何数值，\r\n *  合并时按原顺序拼接 + 稳定排序，结果与顺序版逐位一致。\r\n * ------------------------------------------------------------------------- */\r\n\r\n/* ① 粗筛：每个候选跑 h1 秒 */\r\nfunction stageScreen(world, opts, xs, ctx) {\r\n  const st = stageCtx(world, opts, ctx);\r\n  const out = new Array(xs.length);\r\n  for (let i = 0; i < xs.length; i++) {\r\n    const o = rolloutValue(world, xs[i], st.h1, st.wt, st.scratch, st.quiet, st.allowRevive);\r\n    out[i] = { x: xs[i], v1: o.v };\r\n  }\r\n  return out;\r\n}\r\n\r\n/* ② 精选：长推演 h2 秒 */\r\nfunction stageLong(world, opts, xs, ctx) {\r\n  const st = stageCtx(world, opts, ctx);\r\n  const out = new Array(xs.length);\r\n  for (let i = 0; i < xs.length; i++) {\r\n    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6, st.allowRevive);\r\n    out[i] = { x: xs[i], v2: o.v, gain: o.gain, top: E.stackTop(o.sim) };\r\n  }\r\n  return out;\r\n}\r\n\r\n/* ③ 第二层（连手棋）：拆成三步，所有工作单元都能跨 Worker 并行 ------------\r\n *   a. ply2Plan     ：展开「外层落点 × 颜色 × 内层落点」的全部工作单元（纯索引，无物理）\r\n *   b. stageInner   ：单元 = 外层投放并稳定 → 内层颜色投放 → 跑 h1（可切片并行）\r\n *      stageRecheck ：每个 (外层, 颜色) 的内层冠军再跑一次 h2 长推演（可切片并行）\r\n *   c. ply2Best / ply2RecheckItems / ply2Assemble：取内层第一个最大值（与原来的\r\n *      `v > bestInner` 完全一致），再按原来的顺序做加权求和\r\n *  外层基准直接取精选阶段的 v2：二者是同一条推演（同盘面、同落点、同样的 h2 与 quiet），\r\n *  原先 stagePly2 会把它再算一遍，纯属重复。与原实现逐位一致（tools/verify-exact.mjs 守着）。 */\r\n\r\nfunction ply2Plan(world, opts, outerXs) {\r\n  const step = opts.step || 8;\r\n  const known = opts.nextMode === 'known';\r\n  const h1 = opts.h1 ?? 1.2;\r\n  const innerStep = known ? Math.max(4, step * 0.75) : Math.max(10, step * 1.5);\r\n  const innerH = known ? h1 : Math.min(h1, 1.0);\r\n  const tiers = known ? [world.next] : E.SPAWN_TIERS.filter(t => t !== world.pending);\r\n  const items = [];\r\n  for (let o = 0; o < outerXs.length; o++) {\r\n    for (let ti = 0; ti < tiers.length; ti++) {\r\n      for (const x2 of candidateXs(tiers[ti], innerStep)) {\r\n        items.push({ o, x: outerXs[o], ti, t: tiers[ti], x2 });\r\n      }\r\n    }\r\n  }\r\n  return { known, innerH, h2: opts.h2 ?? 2.6, tiers, nOuter: outerXs.length, items };\r\n}\r\n\r\n/* 工作单元按「外层落点」连续排列，这里缓存当前外层的盘面与内层盘面，\r\n   同一外层、同一颜色只构造一次（构造过程与原来逐个构造完全相同） */\r\n/* 缓存结构：Map<外层落点x, {sim1, inners: Map<颜色t, inner>}>。\r\n   sim1 不能用 st.scratch（多份外层盘面要同时存活），这里每份都是独立的克隆。 */\r\nfunction innerOf(world, st, cache, it) {\r\n  let e = cache.get(it.x);\r\n  if (!e) {\r\n    const sim1 = E.cloneWorld(world);\r\n    sim1.mergedMaxTier = -1; sim1.freed = 0;\r\n    E.dropAt(sim1, it.x);\r\n    runSettle(sim1, st.h2, st.quiet + 0.6);\r\n    e = { sim1, inners: new Map() };\r\n    cache.set(it.x, e);\r\n  }\r\n  let inner = e.inners.get(it.t);\r\n  if (!inner) {\r\n    inner = E.cloneWorld(e.sim1, E.makeWorld({ rng: world.rng }));\r\n    inner.pending = it.t;\r\n    inner.ready = true;\r\n    inner.cooldown = 0;\r\n    e.inners.set(it.t, inner);\r\n  }\r\n  return inner;\r\n}\r\n\r\nfunction stageInner(world, opts, items, ctx) {\r\n  const st = stageCtx(world, opts, ctx);\r\n  const innerH = opts.nextMode === 'known' ? st.h1 : Math.min(st.h1, 1.0);\r\n  /* 顺序版传入同一个 ctx.cache：复核阶段就能复用这里建好的外层/内层盘面 */\r\n  const cache = (ctx && ctx.cache) || new Map();\r\n  const out = new Array(items.length);\r\n  for (let i = 0; i < items.length; i++) {\r\n    const it = items[i];\r\n    const inner = innerOf(world, st, cache, it);\r\n    const s2 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));\r\n    s2.mergedMaxTier = -1; s2.freed = 0;\r\n    const b2 = s2.score;\r\n    E.dropAt(s2, it.x2);\r\n    runSettle(s2, innerH, 0.7, st.allowRevive);\r\n    out[i] = evaluate(s2, b2, st.wt);\r\n  }\r\n  return out;\r\n}\r\n\r\n/* 内层冠军的长推演复核（连锁合成往往 1 秒后才发生） */\r\nfunction stageRecheck(world, opts, items, ctx) {\r\n  const st = stageCtx(world, opts, ctx);\r\n  const cache = (ctx && ctx.cache) || new Map();\r\n  const out = new Array(items.length);\r\n  for (let i = 0; i < items.length; i++) {\r\n    const it = items[i];\r\n    const inner = innerOf(world, st, cache, it);\r\n    const s3 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));\r\n    s3.mergedMaxTier = -1; s3.freed = 0;\r\n    const b3 = s3.score;\r\n    E.dropAt(s3, it.x2);\r\n    runSettle(s3, st.h2, 1.2, st.allowRevive);\r\n    out[i] = evaluate(s3, b3, st.wt);\r\n  }\r\n  return out;\r\n}\r\n\r\n/* 每个 (外层, 颜色) 的内层最优：取第一个最大值（与原来的 `v > bestInner` 一致） */\r\nfunction ply2Best(plan, innerVals) {\r\n  const best = [];\r\n  for (let o = 0; o < plan.nOuter; o++) {\r\n    const row = [];\r\n    for (let ti = 0; ti < plan.tiers.length; ti++) row.push({ v: -Infinity, idx: -1 });\r\n    best.push(row);\r\n  }\r\n  for (let i = 0; i < plan.items.length; i++) {\r\n    const it = plan.items[i];\r\n    const cell = best[it.o][it.ti];\r\n    const v = innerVals[i];\r\n    if (v > cell.v) { cell.v = v; cell.idx = i; }\r\n  }\r\n  return best;\r\n}\r\n\r\n/* 需要长推演复核的内层冠军（只有 h2 比内层horizon长时才复核，与原来的条件一致） */\r\nfunction ply2RecheckItems(plan, best) {\r\n  const out = [];\r\n  if (!(plan.h2 > plan.innerH)) return out;\r\n  for (let o = 0; o < plan.nOuter; o++) {\r\n    for (let ti = 0; ti < plan.tiers.length; ti++) {\r\n      const c = best[o][ti];\r\n      if (c.idx < 0) continue;\r\n      const it = plan.items[c.idx];\r\n      out.push({ o, ti, x: it.x, t: it.t, x2: it.x2 });\r\n    }\r\n  }\r\n  return out;\r\n}\r\n\r\n/* 汇总：每个外层落点的 v3（基准 = 精选阶段的 v2，见上面的说明） */\r\nfunction ply2Assemble(world, plan, outerBase, best, rcItems, rcVals) {\r\n  const pAvoid = spawnProb(world.pending);\r\n  const rc = [];\r\n  for (let o = 0; o < plan.nOuter; o++) rc.push(new Array(plan.tiers.length).fill(undefined));\r\n  for (let k = 0; k < rcItems.length; k++) rc[rcItems[k].o][rcItems[k].ti] = rcVals[k];\r\n  const out = new Array(plan.nOuter);\r\n  for (let o = 0; o < plan.nOuter; o++) {\r\n    let exp = 0, wsum = 0;\r\n    for (let ti = 0; ti < plan.tiers.length; ti++) {\r\n      const t = plan.tiers[ti];\r\n      const p = plan.known ? 1 : SPAWN_W(t) / (1 - pAvoid);\r\n      let bestInner = best[o][ti].v;\r\n      const v3 = rc[o][ti];\r\n      if (v3 !== undefined && v3 > bestInner) bestInner = v3;\r\n      exp += p * bestInner;\r\n      wsum += p;\r\n    }\r\n    out[o] = outerBase[o] + (plan.known ? 1.0 : 0.8) * (exp / (wsum || 1));\r\n  }\r\n  return out;\r\n}\r\n\r\n/* ④ 细化：冠军附近更细的落点在跑一遍长推演 */\r\nfunction stageRefine(world, opts, xs, ctx) {\r\n  const st = stageCtx(world, opts, ctx);\r\n  const out = new Array(xs.length);\r\n  for (let i = 0; i < xs.length; i++) {\r\n    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6, st.allowRevive);\r\n    out[i] = { x: xs[i], v: o.v };\r\n  }\r\n  return out;\r\n}\r\n\r\nconst STAGES = {\r\n  screen: stageScreen, long: stageLong, inner: stageInner, recheck: stageRecheck, refine: stageRefine,\r\n};\r\n\r\nfunction stageCtx(world, opts, ctx) {\r\n  const step = opts.step || 8;\r\n  return {\r\n    wt: opts.weights ? { ...DEFAULT_WEIGHTS, ...opts.weights } : DEFAULT_WEIGHTS,\r\n    step,\r\n    h1: opts.h1 ?? 1.2,\r\n    h2: opts.h2 ?? 2.6,\r\n    quiet: opts.quiet ?? 0.9,\r\n    /* 推演里允不允许用复活币续命。allowRevive:false = 保守打法：\r\n       越线就直接判死（dead 一票否决），不把\"反正有币\"算进落点价值。 */\r\n    allowRevive: opts.allowRevive !== false,\r\n    scratch: (ctx && ctx.scratch) || E.makeWorld({ rng: world.rng }),\r\n  };\r\n}\r\n\r\n/**\r\n * 顺序版搜索（Node 自我对弈 / 基准测试用；浏览器里跑并行版）。\r\n * 返回 {x, value, candCount, ms, ranked}\r\n */\r\nfunction searchBest(world, opts = {}) {\r\n  const step = opts.step || 8;\r\n  const topK = opts.topK ?? 8;\r\n  const lookahead = opts.lookahead ?? 1;\r\n  const t0 = now();\r\n  const xs = candidateXs(world.pending, step);\r\n\r\n  /* ① 粗筛 */\r\n  const results = stageScreen(world, opts, xs).map(r => ({ x: r.x, v1: r.v1 }));\r\n  results.sort((a, b) => b.v1 - a.v1);\r\n\r\n  /* ② 精选 */\r\n  const shortlist = results.slice(0, Math.min(topK, results.length));\r\n  const longs = stageLong(world, opts, shortlist.map(r => r.x));\r\n  for (let i = 0; i < shortlist.length; i++) {\r\n    shortlist[i].v2 = longs[i].v2;\r\n    shortlist[i].gain2 = longs[i].gain;\r\n    shortlist[i].top2 = longs[i].top;\r\n  }\r\n  shortlist.sort((a, b) => (b.v2 ?? b.v1) - (a.v2 ?? a.v1));\r\n\r\n  let best = shortlist[0];\r\n\r\n  /* ③ 第二层（下一颗已知 → 连手棋） */\r\n  const nTop = Math.min(opts.innerTop ?? 4, shortlist.length);\r\n  if (lookahead >= 2 && shortlist.length > 1) {\r\n    const top = shortlist.slice(0, nTop);\r\n    const plan2 = ply2Plan(world, opts, top.map(r => r.x));\r\n    const ctx2 = { cache: new Map() };          // 顺序版：内层与复核共享外层/内层盘面\r\n    const best2 = ply2Best(plan2, stageInner(world, opts, plan2.items, ctx2));\r\n    const rcItems = ply2RecheckItems(plan2, best2);\r\n    const v3 = ply2Assemble(world, plan2, top.map(r => r.v2), best2, rcItems, stageRecheck(world, opts, rcItems, ctx2));\r\n    for (let i = 0; i < top.length; i++) top[i].v3 = v3[i];\r\n    top.sort((a, b) => b.v3 - a.v3);\r\n    best = top[0];\r\n  }\r\n\r\n  /* ④ 细化 */\r\n  if (opts.refine !== false) {\r\n    const fine = Math.max(2, Math.round(step / 2));\r\n    const probes = candidateXs(world.pending, fine, best.x, step).filter(x => Math.abs(x - best.x) > 1e-6);\r\n    if (probes.length) {\r\n      const rf = stageRefine(world, opts, probes);\r\n      let bestV = best.v3 ?? best.v2 ?? best.v1;\r\n      for (const r of rf) {\r\n        if (r.v > bestV) { bestV = r.v; best = { x: r.x, v1: r.v, v2: r.v }; }\r\n      }\r\n    }\r\n  }\r\n\r\n  const value = best.v3 ?? best.v2 ?? best.v1;\r\n  return {\r\n    x: best.x, value, candCount: xs.length, ms: Math.round(now() - t0),\r\n    ranked: results.slice(0, 5).map(r => +r.v1.toFixed(2)),\r\n  };\r\n}\r\n\r\n/**\r\n * 并行版：和 searchBest 完全同构，只是每个阶段通过 exec 分片执行。\r\n * @param exec (stageName, xs) => Promise<[{x, ...}]>  —— 结果顺序必须与 xs 一致\r\n */\r\nasync function planParallel(world, opts, exec) {\r\n  const step = opts.step || 8;\r\n  const topK = opts.topK ?? 8;\r\n  const lookahead = opts.lookahead ?? 1;\r\n  const t0 = now();\r\n  const xs = candidateXs(world.pending, step);\r\n\r\n  const screen = await exec('screen', xs);\r\n  const results = screen.map(r => ({ x: r.x, v1: r.v1 }));\r\n  results.sort((a, b) => b.v1 - a.v1);\r\n\r\n  const shortlist = results.slice(0, Math.min(topK, results.length));\r\n  const longs = await exec('long', shortlist.map(r => r.x));\r\n  for (let i = 0; i < shortlist.length; i++) {\r\n    shortlist[i].v2 = longs[i].v2;\r\n    shortlist[i].gain2 = longs[i].gain;\r\n    shortlist[i].top2 = longs[i].top;\r\n  }\r\n  shortlist.sort((a, b) => (b.v2 ?? b.v1) - (a.v2 ?? a.v1));\r\n\r\n  let best = shortlist[0];\r\n\r\n  const nTop = Math.min(opts.innerTop ?? 4, shortlist.length);\r\n  if (lookahead >= 2 && shortlist.length > 1) {\r\n    const top = shortlist.slice(0, nTop);\r\n    const plan2 = ply2Plan(world, opts, top.map(r => r.x));\r\n    /* 工作单元是扁平的（外层 × 颜色 × 内层落点），切片后各 Worker 都能分到活 */\r\n    const best2 = ply2Best(plan2, await exec('inner', plan2.items));\r\n    const rcItems = ply2RecheckItems(plan2, best2);\r\n    const rcVals = rcItems.length ? await exec('recheck', rcItems) : [];\r\n    const v3 = ply2Assemble(world, plan2, top.map(r => r.v2), best2, rcItems, rcVals);\r\n    for (let i = 0; i < top.length; i++) top[i].v3 = v3[i];\r\n    top.sort((a, b) => b.v3 - a.v3);\r\n    best = top[0];\r\n  }\r\n\r\n  if (opts.refine !== false) {\r\n    const fine = Math.max(2, Math.round(step / 2));\r\n    const probes = candidateXs(world.pending, fine, best.x, step).filter(x => Math.abs(x - best.x) > 1e-6);\r\n    if (probes.length) {\r\n      const rf = await exec('refine', probes);\r\n      let bestV = best.v3 ?? best.v2 ?? best.v1;\r\n      for (const r of rf) {\r\n        if (r.v > bestV) { bestV = r.v; best = { x: r.x, v1: r.v, v2: r.v }; }\r\n      }\r\n    }\r\n  }\r\n\r\n  const value = best.v3 ?? best.v2 ?? best.v1;\r\n  return {\r\n    x: best.x, value, candCount: xs.length, ms: Math.round(now() - t0),\r\n    ranked: results.slice(0, 5).map(r => +r.v1.toFixed(2)),\r\n  };\r\n}\r\n\r\n/* ============================================================================\r\n *  投掷时机：现在丢，还是等这一波连锁/抖动安静下来再丢？\r\n *\r\n *  这是真问题：合成的一瞬间棋盘是「乱」的（水果在弹、在滚、连锁还没走完）。\r\n *   - 现在丢：落点会撞上正在运动的水果，结果更不可预测（但推演里的物理是真的，\r\n *             所以 bot 其实能算准「丢进混乱里」会发生什么，甚至能借势撞出合成）\r\n *   - 等它稳定再丢：局面更清楚，落点更好挑，但要消耗时间\r\n *  两条路各自的「终点盘面」用同一个评估函数打分（同一时刻截止），谁高选谁；\r\n *  等待期间自己发生的合成也算分。等久了会有一个很小的惩罚项打破平局。\r\n * ========================================================================== */\r\n\r\nconst TIMING = {\r\n  quietSpeed: 60,            // 盘面最大速度低于它就算「安静」\r\n  maxWaitFrames: 180,        // 最多等 3 秒（游戏时间）\r\n  waitPenaltyPerFrame: 0.02, // 每等一帧扣一点（纯粹用来打破平局）\r\n};\r\n\r\n/* 让世界自己前进 n 帧（不做任何投放） */\r\nfunction advanceFrames(w, n) {\r\n  for (let i = 0; i < n; i++) {\r\n    E.update(w, E.CFG.FIXED);\r\n    if (w.over) return i + 1;\r\n  }\r\n  return n;\r\n}\r\n\r\n/* 让世界自己跑 maxFrames 帧，直到安静下来；返回实际跑了多少帧 */\r\nfunction advanceUntilQuiet(w, maxFrames, quietSpeed) {\r\n  for (let i = 0; i < maxFrames; i++) {\r\n    E.update(w, E.CFG.FIXED);\r\n    if (w.over) return i + 1;\r\n    if (i > 6 && E.maxSpeed(w) < quietSpeed) return i + 1;\r\n  }\r\n  return maxFrames;\r\n}\r\n\r\n/**\r\n * 带时机决策的完整入口。\r\n * opts.timing: 'auto'（默认，盘面在动就比较两种时机）| 'now'（永远立刻丢）| 'settle'（永远等安静）\r\n * 返回值在 searchBest 的基础上多两个字段：delayFrames（从快照时刻起算的等待帧数）、choice\r\n */\r\nfunction plan(world, opts = {}) {\r\n  const t0 = now();\r\n\r\n  /* 主线程在 Worker 思考期间并不会暂停游戏：实时模式下这一手大约会在\r\n     latencyFrames 帧之后真正落下。既然我们的物理是准的，就干脆让推演\r\n     从「那一刻」的盘面开始 —— 计划才落在它真正生效的时间点上。 */\r\n  let base = world;\r\n  let latency = Math.max(0, Math.round(opts.latencyFrames || 0));\r\n  if (latency > 0) {\r\n    const ahead = E.cloneWorld(world, E.makeWorld({ rng: world.rng }));\r\n    advanceFrames(ahead, latency);\r\n    if (ahead.over) latency = 0;      // 光是等就输了 → 退回当前盘面\r\n    else base = ahead;\r\n  }\r\n\r\n  const timing = opts.timing || 'auto';\r\n  if (timing === 'now') {\r\n    return { ...searchBest(base, opts), delayFrames: latency, choice: 'now' };\r\n  }\r\n\r\n  const quietSpeed = opts.quietSpeed ?? TIMING.quietSpeed;\r\n  const maxWait = opts.maxWaitFrames ?? TIMING.maxWaitFrames;\r\n  const penaltyPerFrame = opts.waitPenaltyPerFrame ?? TIMING.waitPenaltyPerFrame;\r\n\r\n  /* 盘面本来就安静 → 没什么可等的 */\r\n  if (E.maxSpeed(base) < quietSpeed) {\r\n    return { ...searchBest(base, opts), delayFrames: latency, choice: 'quiet' };\r\n  }\r\n\r\n  const nowRes = searchBest(base, opts);\r\n\r\n  /* 预算烧完了就别再算第二种 */\r\n  if (opts.budgetMs && opts.budgetMs < 1e8 && now() - t0 > opts.budgetMs * 0.6) {\r\n    return { ...nowRes, delayFrames: latency, choice: 'now' };\r\n  }\r\n\r\n  /* 让棋盘自己走一遍，看看「安静之后」长什么样 */\r\n  const probe = E.cloneWorld(base, E.makeWorld({ rng: base.rng }));\r\n  const frames = advanceUntilQuiet(probe, maxWait, quietSpeed);\r\n  if (frames <= 0) return { ...nowRes, delayFrames: latency, choice: 'now' };\r\n\r\n  if (probe.over) {\r\n    /* 光等着就输了 —— 那说明现在必须动手 */\r\n    return { ...nowRes, delayFrames: latency, choice: 'now' };\r\n  }\r\n\r\n  const gained = probe.score - base.score;   // 等待期间自己合出来的分\r\n  const laterRes = searchBest(probe, opts);\r\n  const laterValue = laterRes.value + gained - penaltyPerFrame * frames;\r\n\r\n  if (laterValue > nowRes.value) {\r\n    return {\r\n      ...laterRes,\r\n      value: laterValue,\r\n      delayFrames: latency + frames,\r\n      choice: 'settle',\r\n      waitGain: gained,\r\n      nowValue: nowRes.value,\r\n      nowX: nowRes.x,\r\n    };\r\n  }\r\n  return { ...nowRes, delayFrames: latency, choice: 'now', laterValue, laterX: laterRes.x };\r\n}\r\n\r\n/* 掉落权重小工具（原来的实现在重构时被覆盖了，补回来） */\r\nfunction spawnProb(tier) {\r\n  const i = E.SPAWN_TIERS.indexOf(tier);\r\n  if (i < 0) return 0;\r\n  let s = 0;\r\n  for (const w of E.SPAWN_WEIGHTS) s += w;\r\n  return E.SPAWN_WEIGHTS[i] / s;\r\n}\r\nfunction SPAWN_W(tier) {\r\n  const i = E.SPAWN_TIERS.indexOf(tier);\r\n  return i < 0 ? 0 : E.SPAWN_WEIGHTS[i];\r\n}\r\n\nreturn { DEFAULT_WEIGHTS, SOFT_TOP, features, DIAG, resetDiag, evaluate, tokenMass, now, mulberry32, candidateXs, SETTLE, runSettle, rolloutValue, stageScreen, stageLong, ply2Plan, stageInner, stageRecheck, ply2Best, ply2RecheckItems, ply2Assemble, stageRefine, STAGES, searchBest, planParallel, TIMING, advanceFrames, advanceUntilQuiet, plan };\n})();\n\nMODS['worker'] = (function () {\n/* ============================================================================\r\n *  worker.js —— 推演工作线程\r\n *\r\n *  主线程只把「当前盘面快照 + 决策参数」丢过来，这里负责：\r\n *    ① 重建世界（移植物理引擎）\r\n *    ② 搜落点（候选 → 推演 → 评估 → 期望搜索 → 细化）\r\n *    ③ 顺带决定「投掷时机」（现在丢 or 等安静）\r\n *    ④ 把 {x, delayFrames, ...} 回传\r\n *\r\n *  这样主线程一秒都不会被阻塞：页面照常渲染、水果照常滚，\r\n *  bot 在后台线程里慢慢算。\r\n * ========================================================================== */\r\n\r\nconst E = MODS['engine'];\r\nconst P = MODS['planner'];\r\n\r\nlet shapesReady = false;\r\n\r\nself.onmessage = (e) => {\r\n  const m = e.data;\r\n  if (!m || typeof m !== 'object') return;\r\n\r\n  if (m.type === 'init') {\r\n    if (m.shapes && m.shapes.length) { E.setShapes(m.shapes); shapesReady = true; }\r\n    self.postMessage({ type: 'ready', tiers: shapesReady ? m.shapes.length : 0 });\r\n    return;\r\n  }\r\n\r\n  /* 延迟补偿：把盘面往前推 n 帧，返回推进后的快照（实时模式下用） */\r\n  if (m.type === 'advance') {\r\n    try {\r\n      const w = E.makeWorld({ rng: Math.random });\r\n      E.adoptFromGame(w, m.state, null, m.state.nowMs);\r\n      P.advanceFrames(w, m.frames | 0);\r\n      self.postMessage({ type: 'advance', id: m.id, ok: true, state: E.snapshotOf(w, w.now) });\r\n    } catch (err) {\r\n      self.postMessage({ type: 'advance', id: m.id, ok: false, error: String((err && err.stack) || err) });\r\n    }\r\n    return;\r\n  }\r\n\r\n  /* 单个搜索阶段（并行版把候选落点切片丢过来，各算各的） */\r\n  if (m.type === 'stage') {\r\n    try {\r\n      const w = E.makeWorld({ rng: Math.random });\r\n      E.adoptFromGame(w, m.state, null, m.state.nowMs);\r\n      const fn = P.STAGES[m.stage];\r\n      const results = fn(w, m.opts || {}, m.xs);\r\n      self.postMessage({ type: 'stage', id: m.id, ok: true, results });\r\n    } catch (err) {\r\n      self.postMessage({ type: 'stage', id: m.id, ok: false, error: String((err && err.stack) || err) });\r\n    }\r\n    return;\r\n  }\r\n\r\n  if (m.type === 'plan') {\r\n    const t0 = performance.now();\r\n    try {\r\n      const w = E.makeWorld({ rng: Math.random });\r\n      E.adoptFromGame(w, m.state, null, m.state.nowMs);\r\n      const dec = P.plan(w, m.opts || {});\r\n      self.postMessage({\r\n        type: 'plan', id: m.id, ok: true,\r\n        result: {\r\n          x: dec.x, value: dec.value, delayFrames: dec.delayFrames || 0,\r\n          choice: dec.choice || 'now', candCount: dec.candCount,\r\n          computeMs: performance.now() - t0,\r\n        },\r\n      });\r\n    } catch (err) {\r\n      self.postMessage({ type: 'plan', id: m.id, ok: false, error: String((err && err.stack) || err) });\r\n    }\r\n  }\r\n};\r\n\nreturn {  };\n})();\n\n})();";
MODS['engine'] = (function () {
/* ============================================================================
 *  engine.js —— 合成大奶娃 (BigNaiWa v1) 物理 / 合成 / 计分内核的 1:1 移植
 *
 *  用途：把 game.js 里那段 IIFE 私有的物理循环搬到可复用的模块里，用于
 *        (1) 浏览器里给 bot 做「落点推演」（不改动线上游戏，只用它的状态）
 *        (2) Node 里做高速自我对弈 / 参数调优（比真实页面快几百倍）
 *
 *  移植原则：数值运算的顺序、常量、Float32Array 精度全部照抄，
 *            因此同一浏览器（V8）下与线上游戏逐帧一致（见 tools/verify-engine.mjs）。
 *  被刻意省略的只有纯表现层：粒子、音效、DOM、localStorage（都不参与物理）。
 * ========================================================================== */

/* 诊断计数器（每帧 +1，开销可以忽略）：给 bench / 调参工具看「干了多少活」 */
const DIAG = { updates: 0, clones: 0 };
function resetDiag() { DIAG.updates = 0; DIAG.clones = 0; }

/* ---------------------------------------------------------------- 常量 ---- */

const CFG = {
  W: 420,              // 逻辑宽度
  H: 700,              // 逻辑高度
  WALL: 10,            // 左右墙厚
  DROP_Y: 74,          // 待投放水果的高度
  DANGER_Y: 142,       // 警戒线
  GRAVITY: 2600,       // px/s²
  SUBSTEPS: 3,         // 每帧物理子步
  ITER: 6,             // 每个子步的约束迭代次数
  DROP_MS: 360,        // 两次投放的最小间隔
  OVER_LIMIT: 1.5,     // 越线持续多少秒判负
  REST_SPEED: 140,     // 线上方且速度低于它才算“卡住”
  MAX_TIER: 10,        // 最大那只（神奶蛙）的索引
  MAX_BONUS: 500,      // 两只神奶蛙相撞的奖励分
  MAX_MERGE_GIVES_REVIVE: true,
  FREEZE_MS: 130,      // 清场定格
  REVIVE_STEP: 2000,   // 每累计多少分发一枚复活币
  MERGE_PAD: 0.8,      // 合成判定接触容差
  RESTITUTION: 0.38,   // 球球弹性
  WALL_RESTITUTION: 0.45,
  REST_THRESHOLD: 55,
  FRICTION: 0.955,
  SQUASH_DECAY: 9,
  SQUASH_MAX: 0.30,
  FIXED: 1 / 60,       // 主循环固定步长
};

CFG.REST_SPEED2 = CFG.REST_SPEED * CFG.REST_SPEED;

/* 水果链（半径照抄 game.js；名字只用于报告） */
const FRUITS = [
  { name: '葡萄',   r: 17 },
  { name: '樱桃',   r: 23 },
  { name: '橘子',   r: 31 },
  { name: '柠檬',   r: 39 },
  { name: '猕猴桃', r: 48 },
  { name: '番茄',   r: 58 },
  { name: '桃子',   r: 69 },
  { name: '菠萝',   r: 81 },
  { name: '椰子',   r: 94 },
  { name: '半奶蛙', r: 108 },
  { name: '神奶蛙', r: 124 },
];

/* 合成出 tier 的得分（三角数） */
const MERGE_SCORE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

/* 新水果掉落表 */
const SPAWN_TIERS = [0, 1, 2, 3, 4];
const SPAWN_WEIGHTS = [0.28, 0.24, 0.20, 0.16, 0.12];

/* 每个 tier 对应「合成它」的实际得分（含两只神奶蛙的特殊奖励） */
const TIER_VALUE = MERGE_SCORE.slice();

/* --------------------------------------------------------- 碰撞外形数据 ---- */
/* parts: [ox, oy, s]（单位：以 r 为 1）；rb: 包围圆半径系数 */

let SHAPES = null;          // 当前生效的外形（推演时可切换成低成本近似）
let EXACT_SHAPES = null;    // 线上一模一样的原始外形
const UNIT_SHAPE = { rb: 1, parts: [[0, 0, 1]] };

/* 把 [ox,oy,s] 列表压成一条 Float64Array，加速 syncParts（数值完全一致） */
function pack(sh) {
  if (!sh.flat) {
    const n = sh.parts.length;
    const f = new Float64Array(n * 3);
    let ext = 0;
    for (let i = 0; i < n; i++) {
      const p = sh.parts[i];
      f[i * 3] = p[0]; f[i * 3 + 1] = p[1]; f[i * 3 + 2] = p[2];
      const d = Math.hypot(p[0], p[1]) + p[2];      // 这个小圆离中心最远能到哪
      if (d > ext) ext = d;
    }
    sh.flat = f;
    /* 真实外接半径。注意 shapes.json 里的 rb 只保留三位小数，
       有 7 个等级其实略小于真实外接半径（差 ~0.1px）——
       游戏自己的粗筛也用这个偏小的 rb（我们照抄，才能逐帧一致），
       但「墙判定早退」是我们新加的优化，必须用真实值，否则会漏掉贴墙的推力。 */
    sh.ext = Math.max(sh.rb, ext);
  }
  return sh;
}

function setShapes(shapes) {
  if (shapes && shapes.length) {
    for (const sh of shapes) pack(sh);
    EXACT_SHAPES = shapes; SHAPES = shapes;
  }
}
function getShapes() { return SHAPES; }
function getExactShapes() { return EXACT_SHAPES; }

/* ---------------------------------------------------------------------------
 * 外形保真度档位 —— 推演的「模型精度」
 *
 * 线上每颗水果的碰撞体是 16 个小圆（贴图轮廓），两两求交 = 256 次判定，
 * 6 次迭代 × 3 子步下就是主要开销。做落点筛选时不必这么精细：
 *   'exact'     16 个小圆，和线上完全一致（用于最终排序 / 自我对弈）
 *   { parts: K } 只保留最大的 K 个小圆（形状粗糙但仍是多边形，保留互锁感）
 *   { circle: f } 退化成一个半径 f×r 的圆（最快，用来粗筛）
 * 切换只影响「之后创建」的球，已经在场上的球保持自己创建时的外形不变。
 * ------------------------------------------------------------------------- */
function setShapeMode(mode) {
  if (!EXACT_SHAPES) return;
  if (!mode || mode === 'exact') { SHAPES = EXACT_SHAPES; return; }

  const out = [];
  for (let t = 0; t < EXACT_SHAPES.length; t++) {
    const src = EXACT_SHAPES[t];
    if (!src || !src.parts || !src.parts.length) { out.push(UNIT_SHAPE); continue; }

    if (mode.circle) {
      const f = mode.circle;
      out.push(pack({ rb: f, parts: [[0, 0, f]] }));
      continue;
    }
    const K = Math.max(1, Math.min(mode.parts | 0, src.parts.length));
    const sorted = src.parts.slice().sort((a, b) => b[2] - a[2]).slice(0, K);
    let rb = 0;
    for (const p of sorted) {
      const d = Math.sqrt(p[0] * p[0] + p[1] * p[1]) + p[2];
      if (d > rb) rb = d;
    }
    out.push(pack({ rb, parts: sorted }));
  }
  SHAPES = out;
}

function shapeOf(tier) {
  const s = SHAPES && SHAPES[tier];
  if (s && s.parts && s.parts.length) return s;
  return UNIT_SHAPE;
}

/* ------------------------------------------------ 世界（= game.js 的 state）- */

function makeWorld(opts = {}) {
  const w = {
    balls: [],
    score: 0,
    pending: 0,
    next: 0,
    ready: true,
    cooldown: 0,
    aimX: CFG.W / 2,
    over: false,
    flash: 0,
    revives: 0,        // 本局还剩几枚复活币
    reviveGiven: 0,    // 本局已经发放过几次
    freeze: 0,         // 命中定格剩余秒数
    danger: false,
    now: 0,            // 虚拟毫秒时钟（对应线上的 performance.now()）
    drops: 0,
    rng: opts.rng || Math.random,
    overAt: -1,
    mergedMaxTier: -1,   // 本局（或本轮推演）合出的最大 tier
    freed: 0,            // 本轮推演里「合成释放掉的面积」累计（只做记账，不参与物理）
    stepCount: 0,        // 已经跑了多少物理帧（诊断用）
    mergeTrace: null,    // 诊断：把每次合成记下来（默认关闭，零开销）
  };
  return w;
}

function resetWorld(w, opts = {}) {
  if (opts.rng) w.rng = opts.rng;
  w.balls.length = 0;
  w.score = 0;
  w.over = false;
  w.ready = true;
  w.cooldown = 0;
  w.flash = 0;
  w.danger = false;
  w.aimX = CFG.W / 2;
  w.revives = 0;
  w.reviveGiven = 0;
  w.freeze = 0;
  w.drops = 0;
  w.overAt = -1;
  w.mergedMaxTier = -1;
  w.freed = 0;
  w.pending = pickSpawnTier(w);
  w.next = pickSpawnTier(w, w.pending);
  return w;
}

/* ------------------------------------------------------------ 生成 / 刚体 -- */

/* 角度只在一帧的「速度推导」那一步变，其余时间 cos/sin 是常量。
   缓存起来完全等价（同一个 Math.cos(同一个角度)），但省掉大量三角函数。 */
function updateTrig(b) {
  b.pcos = Math.cos(b.angle);
  b.psin = Math.sin(b.angle);
}

/* 局部坐标缓存：把「小圆的局部偏移 × r」和「小圆半径 × r」提前算好。
 * 这两个量只取决于外形和 r（同一个等级恒定），与球的位置/角度无关，
 * 所以每颗球算一次、克隆时直接共享引用即可。运算结果与逐次现算完全相同。 */
function localOf(sh, r) {
  if (sh.loc && sh.loc.r === r) return sh.loc;
  const f = sh.flat || pack(sh).flat;
  const n = f.length / 3;
  const lx = new Float64Array(n), ly = new Float64Array(n), ls = new Float64Array(n);
  for (let i = 0, k = 0; i < n; i++, k += 3) {
    lx[i] = f[k] * r;
    ly[i] = f[k + 1] * r;
    ls[i] = f[k + 2] * r;
  }
  sh.loc = { r, lx, ly, ls };
  return sh.loc;
}

function syncParts(b) {
  const c = b.pcos, s = b.psin;
  const x = b.x, y = b.y;
  const lx = b.lx, ly = b.ly, ls = b.ls;
  const wx = b.wx, wy = b.wy, ws = b.ws;
  const n = b.np;
  for (let i = 0; i < n; i++) {
    const ox = lx[i], oy = ly[i];
    wx[i] = x + ox * c - oy * s;
    wy[i] = y + ox * s + oy * c;
    ws[i] = ls[i];
  }
}

function makeBall(w, x, y, tier, vx, vy) {
  const r = FRUITS[tier].r;
  const m = r * r;
  const sh = shapeOf(tier);
  const n = sh.parts.length;
  const loc = localOf(sh, r);
  const b = {
    x, y, vx: vx || 0, vy: vy || 0,
    px: x, py: y,
    r, tier, angle: 0,
    mass: m, invMass: 1 / m,
    bornAt: w.now,
    overTime: 0,
    landed: false,
    dead: false,
    contacts: 0,
    pvx: 0, pvy: 0,
    sq: 0, sqA: 0,
    parts: sh.parts,
    np: n,
    pcos: 1, psin: 0,
    rb: sh.rb * r,
    rbe: (sh.ext || sh.rb) * r,
    lx: loc.lx, ly: loc.ly, ls: loc.ls,   // 局部偏移缓存（只读，克隆时共享）
    wx: new Float32Array(n),
    wy: new Float32Array(n),
    ws: new Float32Array(n),
    gen: 0,                 // 合成代数（只做诊断；放进字面量里，避免合成后动态加属性换形状）
  };
  syncParts(b);
  return b;
}

/* 深拷贝一颗球（推演用；parts 是共享引用，不必复制）
 *
 * 注意：这里必须用对象字面量，并且键的顺序与 makeBall / adoptFromGame 完全一致。
 * 早先用 Object.create(null) + 逐个赋值，V8 会把这种对象放进「字典模式」，
 * 之后每一次属性读写都走哈希查找，而推演里跑的全是克隆出来的球（实测慢得多）。
 * 字面量 + 统一形状 = 同样的数值、同样的运算顺序，只是属性访问变快。 */
function cloneBall(b, now) {
  return {
    x: b.x, y: b.y, vx: b.vx, vy: b.vy, px: b.px, py: b.py,
    r: b.r, tier: b.tier, angle: b.angle, mass: b.mass, invMass: b.invMass,
    bornAt: b.bornAt, overTime: b.overTime, landed: b.landed, dead: b.dead, contacts: b.contacts,
    pvx: b.pvx, pvy: b.pvy, sq: b.sq, sqA: b.sqA,
    parts: b.parts, np: b.np, pcos: b.pcos, psin: b.psin, rb: b.rb, rbe: b.rbe,
    lx: b.lx, ly: b.ly, ls: b.ls,        // 只读缓存，直接共享
    wx: new Float32Array(b.wx), wy: new Float32Array(b.wy), ws: new Float32Array(b.ws),
    gen: b.gen || 0,
  };
}

/* ------------------------------------------------------------------ 投放 -- */

function aimLimit(tier) {
  const r = FRUITS[tier].r * shapeOf(tier).rb;
  return [CFG.WALL + r + 0.5, CFG.W - CFG.WALL - r - 0.5];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function moveAim(w, x) {
  const [lo, hi] = aimLimit(w.pending);
  w.aimX = clamp(x, lo, hi);
}

function tryDrop(w) {
  if (w.over || !w.ready) return false;
  const tier = w.pending;
  const [lo, hi] = aimLimit(tier);
  const x = clamp(w.aimX, lo, hi);
  w.balls.push(makeBall(w, x, CFG.DROP_Y, tier, 0, 130));
  w.ready = false;
  w.cooldown = CFG.DROP_MS / 1000;
  w.pending = w.next;
  w.next = pickSpawnTier(w, w.pending);
  w.drops++;
  return true;
}

/* 直接按 x 投放（推演用）：等价于 moveAim(x) + tryDrop() */
function dropAt(w, x) {
  moveAim(w, x);
  return tryDrop(w);
}

/* --------------------------------------------------------------- 随机数 --- */

function rollSpawnTier(w) {
  const r = w.rng();
  let acc = 0;
  for (let i = 0; i < SPAWN_TIERS.length; i++) {
    acc += SPAWN_WEIGHTS[i];
    if (r <= acc) return SPAWN_TIERS[i];
  }
  return SPAWN_TIERS[0];
}

function pickSpawnTier(w, avoid) {
  if (avoid === undefined) return rollSpawnTier(w);
  for (let i = 0; i < 6; i++) {
    const t = rollSpawnTier(w);
    if (t !== avoid) return t;
  }
  return rollSpawnTier(w);
}

/* --------------------------------------------------------------- 计分 ----- */

/* 只保留「会影响后续玩法」的部分：分数、复活币发放、定格 */
function addScore(w, n) {
  w.score += n;
  grantRevives(w);
}

function grantRevives(w) {
  while (w.reviveGiven < Math.floor(w.score / CFG.REVIVE_STEP)) {
    w.reviveGiven++;
    w.revives++;
  }
}

/* -------------------------------------------------------------- 物理 ------ */

/* 复用的扁平缓冲：接触表 & 合成表（避免每帧产生成百上千的临时对象） */
let CT_CAP = 0, ctKind = new Int8Array(0), ctA = new Int32Array(0), ctB = new Int32Array(0);
let ctNX = new Float64Array(0), ctNY = new Float64Array(0);
function ensureCt(cap) {
  if (cap <= CT_CAP) return;
  CT_CAP = Math.max(64, cap);
  ctKind = new Int8Array(CT_CAP); ctA = new Int32Array(CT_CAP); ctB = new Int32Array(CT_CAP);
  ctNX = new Float64Array(CT_CAP); ctNY = new Float64Array(CT_CAP);
}
const MERGE_SCRATCH = [];

/* 分段计时（默认关闭，调试用）：0积分 1墙 2球球 3收尾 4速度 5冲量 6合成 */
const PROF = { on: false, t: new Float64Array(8), n: 0 };
const _now = (typeof performance !== 'undefined' ? () => performance.now() : () => Date.now());

/* stepPhysics 收尾的合成处理从 stepsPerSubstep 中抽出来（保持原来的调用顺序） */

function stepPhysics(w, dt) {
  const balls = w.balls;
  const nBalls = balls.length;

  /* 接触表：原来每个接触都 new 一个对象，活跃盘面一帧上百个，GC 很吃亏。
     改成复用的扁平数组（kind: 0=撞墙 1=球球），算出来的数值完全一样。 */
  ensureCt(nBalls * nBalls + nBalls * 4 + 32);
  let ctN = 0;
  const mergeFlat = MERGE_SCRATCH;
  mergeFlat.length = 0;

  /* --- 积分 --- */
if (PROF.on) PROF.t[0] += _now();
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i];
    b.px = b.x;
    b.py = b.y;
    b.vy += CFG.GRAVITY * dt;
    b.pvx = b.vx;
    b.pvy = b.vy;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.contacts = 0;
    syncParts(b);
  }

  /* --- 约束求解 --- */
  for (let it = 0; it < CFG.ITER; it++) {

    /* 墙 & 地面 */
if (PROF.on) PROF.t[1] += _now();
    for (let i = 0; i < nBalls; i++) {
      const b = balls[i];
      if (b.dead) continue;
      /* 真实外接圆完全够不着任何一面墙 → 跳过逐个小圆的判定（数学上等价，纯省算力） */
      const rb = b.rbe;
      if (b.x - rb >= CFG.WALL && b.x + rb <= CFG.W - CFG.WALL &&
          b.y + rb <= CFG.H - CFG.WALL && b.y - rb >= 0) continue;

      let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;
      const n = b.np;
      const wx = b.wx, wy = b.wy, ws = b.ws;
      for (let k = 0; k < n; k++) {
        const x = wx[k], y = wy[k], rr = ws[k];
        const l = CFG.WALL - (x - rr);
        if (l > pushL) pushL = l;
        const rgt = (x + rr) - (CFG.W - CFG.WALL);
        if (rgt > pushR) pushR = rgt;
        const dn = (y + rr) - (CFG.H - CFG.WALL);
        if (dn > pushFloor) pushFloor = dn;
        const up = -(y - rr);
        if (up > pushCeil) pushCeil = up;
      }
      if (pushL || pushR || pushFloor || pushCeil) {
        b.x += pushL - pushR;
        b.y += pushCeil - pushFloor;
        b.contacts++;
        if (it === 0) {
          if (pushL)     { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 1;  ctNY[ctN] = 0;  ctN++; }
          if (pushR)     { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = -1; ctNY[ctN] = 0;  ctN++; }
          if (pushFloor) { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 0;  ctNY[ctN] = -1; ctN++; }
          if (pushCeil)  { ctKind[ctN] = 0; ctA[ctN] = i; ctNX[ctN] = 0;  ctNY[ctN] = 1;  ctN++; }
        }
        syncParts(b);
      }
    }

    /* 球球 */
if (PROF.on) PROF.t[2] += _now();
    for (let i = 0; i < nBalls; i++) {
      const a = balls[i];
      if (a.dead) continue;
      const awx = a.wx, awy = a.wy, aws = a.ws;
      const pa = a.np, ainv = a.invMass;
      for (let j = i + 1; j < nBalls; j++) {
        const b = balls[j];
        if (b.dead || a.dead) continue;

        const cdx = b.x - a.x, cdy = b.y - a.y;
        const rbSum = a.rb + b.rb;
        if (cdx * cdx + cdy * cdy >= rbSum * rbSum) continue;

        const pb = b.np;
        const brb = b.rb;
        const bwx = b.wx, bwy = b.wy, bws = b.ws;
        const bx0 = b.x, by0 = b.y;
        let minGap = 1e9, bnx = 0, bny = 0;

        for (let m = 0; m < pa; m++) {
          const ax = awx[m], ay = awy[m], ar = aws[m];
          const ddx = bx0 - ax, ddy = by0 - ay;
          const far = brb + ar;
          if (ddx * ddx + ddy * ddy >= far * far) continue;

          for (let k = 0; k < pb; k++) {
            const bx = bwx[k], by = bwy[k], br = bws[k];
            const dx = bx - ax, dy = by - ay;
            const sum = ar + br;
            const d2 = dx * dx + dy * dy;
            if (d2 >= sum * sum) continue;
            const d = Math.sqrt(d2);
            const gap = d - sum;
            if (gap < minGap) {
              minGap = gap;
              if (d < 1e-4) { bnx = 1; bny = 0; }
              else { bnx = dx / d; bny = dy / d; }
            }
          }
        }

        if (minGap > CFG.MERGE_PAD || minGap === 1e9) continue;

        if (a.tier === b.tier && it === 0) {
          a.dead = true;
          b.dead = true;
          mergeFlat.push(a, b);
          continue;
        }

        if (minGap >= 0) continue;
        if (it === 0) { ctKind[ctN] = 1; ctA[ctN] = i; ctB[ctN] = j; ctNX[ctN] = bnx; ctNY[ctN] = bny; ctN++; }
        const corr = Math.min(-minGap - 0.05, 4) * 0.9;
        if (corr <= 0) continue;
        const invSum = ainv + b.invMass;
        const wa = ainv / invSum;
        const wb = b.invMass / invSum;

        a.x -= bnx * corr * wa;  a.y -= bny * corr * wa;
        b.x += bnx * corr * wb;  b.y += bny * corr * wb;

        a.contacts++;
        b.contacts++;
        syncParts(a);
        syncParts(b);
      }
    }
  }

  /* --- 收尾墙约束 --- */
if (PROF.on) PROF.t[3] += _now();
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i];
    if (b.dead) continue;
    const rb = b.rbe;
    if (b.x - rb >= CFG.WALL && b.x + rb <= CFG.W - CFG.WALL &&
        b.y + rb <= CFG.H - CFG.WALL && b.y - rb >= 0) continue;

    let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;
    const n = b.np;
    const wx = b.wx, wy = b.wy, ws = b.ws;
    for (let k = 0; k < n; k++) {
      const x = wx[k], y = wy[k], rr = ws[k];
      const l = CFG.WALL - (x - rr);             if (l > pushL) pushL = l;
      const rgt = (x + rr) - (CFG.W - CFG.WALL); if (rgt > pushR) pushR = rgt;
      const dn = (y + rr) - (CFG.H - CFG.WALL);  if (dn > pushFloor) pushFloor = dn;
      const up = -(y - rr);                      if (up > pushCeil) pushCeil = up;
    }
    if (pushL || pushR || pushFloor || pushCeil) {
      b.x += pushL - pushR;
      b.y += pushCeil - pushFloor;
      b.contacts++;
      syncParts(b);
    }
  }

  /* --- PBD 速度 + 摩擦 --- */
if (PROF.on) PROF.t[4] += _now();
  const invDt = 1 / dt;
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i];
    if (b.dead) continue;

    const dx = b.x - b.px;
    const dy = b.y - b.py;

    let vx = dx * invDt;
    let vy = dy * invDt;

    if (b.contacts > 0) vx *= CFG.FRICTION;
    if (b.sq > 0) b.sq = Math.max(0, b.sq - b.sq * CFG.SQUASH_DECAY * dt);

    b.vx = vx;
    b.vy = vy;
    b.angle += dx / b.r * 0.85;
    updateTrig(b);                       // 角度变了，刷新 cos/sin 缓存

    if (!b.landed) {
      if (b.contacts > 0 || w.now - b.bornAt > 900) b.landed = true;
    }
  }

  /* --- 弹性冲量 --- */
if (PROF.on) PROF.t[5] += _now();
  for (let k = 0; k < ctN; k++) {
    if (ctKind[k] === 0) {
      /* 撞墙 / 撞地面 */
      const b = balls[ctA[k]];
      if (b.dead) continue;
      const nx = ctNX[k], ny = ctNY[k];
      const vnPre = b.pvx * nx + b.pvy * ny;
      if (vnPre < -CFG.REST_THRESHOLD) {
        const vnPost = b.vx * nx + b.vy * ny;
        const target = -CFG.WALL_RESTITUTION * vnPre;
        const j = target - vnPost;
        if (j > 0) {
          b.vx += j * nx;
          b.vy += j * ny;
          squash(b, nx, ny, -vnPre);
        }
      }
    } else {
      /* 球与球 */
      const a = balls[ctA[k]], b = balls[ctB[k]];
      if (a.dead || b.dead) continue;
      const nx = ctNX[k], ny = ctNY[k];
      const vnPre = (a.pvx - b.pvx) * nx + (a.pvy - b.pvy) * ny;
      if (vnPre > CFG.REST_THRESHOLD) {
        const vnPost = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        const target = -CFG.RESTITUTION * vnPre;
        const j = (vnPost - target) / (a.invMass + b.invMass);
        if (j > 0) {
          a.vx -= j * a.invMass * nx;  a.vy -= j * a.invMass * ny;
          b.vx += j * b.invMass * nx;  b.vy += j * b.invMass * ny;
          squash(a, -nx, -ny, vnPre);
          squash(b, nx, ny, vnPre);
        }
      }
    }
  }

  /* --- 处理合成 --- */
if (PROF.on) PROF.t[6] += _now();
  if (mergeFlat.length) processMerges(w, mergeFlat);
}

function squash(b, nx, ny, speed) {
  const k = Math.min(CFG.SQUASH_MAX, speed / 1500);
  if (k <= b.sq) return;
  b.sq = k;
  b.sqA = Math.atan2(ny, nx);
}

/**
 * 处理合成。
 * @param {*} w
 * @param {Array} merges 扁平数组：[a, b, a, b, ...]（stepPhysics 的复用缓冲），
 *                        也兼容 [[a,b], ...] 的老写法
 */
function processMerges(w, merges) {
  let gained = 0;
  let maxMergeTier = -1;
  const events = [];
  const flat = merges.length === 0 || merges[0] === undefined || !Array.isArray(merges[0]);

  for (let k = 0, n = flat ? merges.length >> 1 : merges.length; k < n; k++) {
    const a = flat ? merges[k * 2] : merges[k][0];
    const b = flat ? merges[k * 2 + 1] : merges[k][1];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    const tier = a.tier;
    /* 代数：0 = 直接和被投下的那颗合成；>=1 = 被落子引发的连锁（撞动了别人 / 腾出了空间） */
    const gen = Math.max(a.gen || 0, b.gen || 0);

    if (tier >= CFG.MAX_TIER) {
      addScore(w, CFG.MAX_BONUS);
      gained += CFG.MAX_BONUS;
      w.flash = 1.4;
      w.freeze = CFG.FREEZE_MS / 1000;
      if (CFG.MAX_MERGE_GIVES_REVIVE) w.revives++;
      if (tier > (w.mergedMaxTier ?? -1)) w.mergedMaxTier = tier;
      w.freed += a.r * a.r + b.r * b.r;      // 两只神奶蛙一起没了：整块面积都还给了盘面
      events.push({ tier, x: mx, y: my, score: CFG.MAX_BONUS, bonus: true });
      if (w.mergeTrace) w.mergeTrace.push({ tier, x: mx, y: my, gen, bonus: true, step: w.stepCount || 0 });
    } else {
      const nt = tier + 1;
      const nb = makeBall(w, mx, my, nt, (a.vx + b.vx) * 0.5, (a.vy + b.vy) * 0.5 - 60);
      nb.x = clamp(nb.x, CFG.WALL + nb.r, CFG.W - CFG.WALL - nb.r);
      nb.y = Math.min(nb.y, CFG.H - CFG.WALL - nb.r);
      nb.px = nb.x;
      nb.py = nb.y;
      nb.landed = true;
      nb.gen = gen + 1;                 // 合成产物继承「代数 + 1」
      w.balls.push(nb);

      addScore(w, MERGE_SCORE[nt]);
      gained += MERGE_SCORE[nt];
      /* 记账：这一合净释放了多少面积（两颗消失、一颗更大的顶上）—— 只用于评估函数，
         不参与物理。加大果的权重靠的是面积本身随半径平方增长。 */
      w.freed += a.r * a.r + b.r * b.r - nb.r * nb.r;
      if (nt === CFG.MAX_TIER) w.flash = 1;
      events.push({ tier: nt, x: mx, y: my, score: MERGE_SCORE[nt], bonus: false });
      if (w.mergeTrace) w.mergeTrace.push({ tier: nt, x: mx, y: my, gen, bonus: false, step: w.stepCount || 0 });
      if (nt > maxMergeTier) maxMergeTier = nt;
      if (nt > (w.mergedMaxTier ?? -1)) w.mergedMaxTier = nt;
    }
  }

  const alive = [];
  for (let i = 0; i < w.balls.length; i++) {
    if (!w.balls[i].dead) alive.push(w.balls[i]);
  }
  w.balls = alive;

  w.lastMerges = events;
  w.lastMergeGain = gained;
  if (maxMergeTier >= 0) w.lastMaxMergeTier = maxMergeTier;
  return events;
}

/* --------------------------------------------------------------- 判负 ----- */

function checkGameOver(w, dt) {
  let danger = false;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    if (b.dead || !b.landed) continue;
    const top = b.y - b.r;

    if (top < CFG.DANGER_Y) {
      danger = true;
      if (b.vx * b.vx + b.vy * b.vy < CFG.REST_SPEED2) {
        b.overTime += dt;
        if (b.overTime > CFG.OVER_LIMIT) { w.over = true; w.overAt = w.now; return true; }
      } else {
        b.overTime = Math.max(0, b.overTime - dt * 2);
      }
    } else {
      b.overTime = Math.max(0, b.overTime - dt * 2);
      if (b.overTime > 0) danger = true;
    }
  }
  w.danger = danger;
  return false;
}

/* --------------------------------------------------------------- 复活 ----- */

function revive(w) {
  if (!w.over || w.revives <= 0) return false;

  let top = -1;
  let topEdge = Infinity;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    if (b.dead) continue;
    const edge = b.y - b.r;
    if (edge < topEdge) { topEdge = edge; top = i; }
  }
  if (top >= 0) w.balls.splice(top, 1);

  w.balls = w.balls.filter((b) => !b.dead && (b.y - b.r) >= CFG.DANGER_Y + 6);

  for (let i = 0; i < w.balls.length; i++) w.balls[i].overTime = 0;

  w.revives--;
  w.over = false;
  w.danger = false;
  w.ready = true;
  w.cooldown = 0;
  w.flash = 0.6;
  return true;
}

/* --------------------------------------------------------------- 主循环 --- */

function update(w, dt) {
  DIAG.updates++;
  w.now += dt * 1000;                       // 虚拟时钟（对应线上 performance.now()）
  w.stepCount = (w.stepCount || 0) + 1;

  if (w.freeze > 0) { w.freeze = Math.max(0, w.freeze - dt); return; }
  if (w.over) return;

  if (!w.ready) {
    w.cooldown -= dt;
    if (w.cooldown <= 0) w.ready = true;
  }

  const sub = dt / CFG.SUBSTEPS;
  for (let s = 0; s < CFG.SUBSTEPS; s++) stepPhysics(w, sub);

  checkGameOver(w, dt);
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.2);
}

/* -------------------------------------------------------------- 快照 ------ */

/* 把一个世界深拷贝出来（推演用）。balls 用对象池减少 GC 压力 */
function cloneWorld(src, dst) {
  DIAG.clones++;
  const w = dst || makeWorld({ rng: src.rng });
  const balls = [];
  for (let i = 0; i < src.balls.length; i++) balls.push(cloneBall(src.balls[i], src.now));
  w.balls = balls;
  w.score = src.score;
  w.pending = src.pending;
  w.next = src.next;
  w.ready = src.ready;
  w.cooldown = src.cooldown;
  w.aimX = src.aimX;
  w.over = src.over;
  w.flash = src.flash;
  w.revives = src.revives;
  w.reviveGiven = src.reviveGiven;
  w.freeze = src.freeze;
  w.danger = src.danger;
  w.now = src.now;
  w.drops = src.drops;
  w.rng = src.rng;
  w.overAt = src.overAt;
  w.mergedMaxTier = src.mergedMaxTier;
  w.freed = src.freed;
  w.lastMerges = src.lastMerges;
  w.lastMergeGain = src.lastMergeGain;
  w.lastMaxMergeTier = src.lastMaxMergeTier;
  return w;
}

/* 让世界跑 seconds 秒（固定步长），可选提前停止条件 */
function runFor(w, seconds, opts = {}) {
  const step = CFG.FIXED;
  const n = Math.round(seconds / step);
  const stopWhen = opts.stopWhen;
  for (let i = 0; i < n; i++) {
    update(w, step);
    if (w.over) return i + 1;
    if (stopWhen && stopWhen(w, i)) return i + 1;
  }
  return n;
}

/* 盘面静止度：所有球的最大速度（判断推演是否已经稳定） */
function maxSpeed(w) {
  let m = 0;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    const v = b.vx * b.vx + b.vy * b.vy;
    if (v > m) m = v;
  }
  return Math.sqrt(m);
}

/* 顶部高度（越小越高） */
function stackTop(w) {
  let top = CFG.H;
  for (let i = 0; i < w.balls.length; i++) {
    const t = w.balls[i].y - w.balls[i].r;
    if (t < top) top = t;
  }
  return top;
}

/* ---------------------------------------------------------------------------
 *  快照：主线程 → Worker 的最小序列化形式
 *  （球的 wx/wy/ws 不传，Worker 按 tier 用自己的 shapes 重建，省带宽也省 GC）
 * ------------------------------------------------------------------------- */
function snapshotOf(g, nowMs) {
  return {
    balls: (g.balls || []).map(b => ({
      x: b.x, y: b.y, vx: b.vx, vy: b.vy, px: b.px, py: b.py,
      r: b.r, tier: b.tier, angle: b.angle,
      mass: b.mass, invMass: b.invMass,
      bornAt: b.bornAt, overTime: b.overTime,
      landed: !!b.landed, dead: !!b.dead, contacts: b.contacts || 0,
      pvx: b.pvx || 0, pvy: b.pvy || 0, sq: b.sq || 0, sqA: b.sqA || 0,
    })),
    score: g.score, pending: g.pending, next: g.next,
    ready: g.ready, cooldown: g.cooldown, aimX: g.aimX,
    over: g.over, revives: g.revives, reviveGiven: g.reviveGiven,
    freeze: g.freeze, danger: g.danger, flash: g.flash || 0,
    drops: g.drops || 0,
    nowMs: nowMs === undefined ? null : nowMs,
  };
}

/* 从真实游戏对象（window.__DNW__）搬运状态到本引擎的世界。
   gameState 既可以是活的对象，也可以是 snapshotOf() 出来的普通对象。 */
function adoptFromGame(w, gameState, shapes, nowMs) {
  if (shapes) setShapes(shapes);
  const balls = [];
  for (let i = 0; i < gameState.balls.length; i++) {
    const g = gameState.balls[i];
    const sh = shapeOf(g.tier);
    const n = sh.parts.length;
    const loc = localOf(sh, g.r);
    const b = {
      x: g.x, y: g.y, vx: g.vx, vy: g.vy, px: g.px, py: g.py,
      r: g.r, tier: g.tier, angle: g.angle,
      mass: g.mass, invMass: g.invMass,
      bornAt: g.bornAt, overTime: g.overTime,
      landed: g.landed, dead: !!g.dead, contacts: g.contacts || 0,
      pvx: g.pvx || 0, pvy: g.pvy || 0,
      sq: g.sq || 0, sqA: g.sqA || 0,
      parts: sh.parts, np: n,
      pcos: 1, psin: 0, rb: sh.rb * g.r,
      rbe: (sh.ext || sh.rb) * g.r,
      lx: loc.lx, ly: loc.ly, ls: loc.ls,
      wx: new Float32Array(n), wy: new Float32Array(n), ws: new Float32Array(n),
      gen: 0,
    };
    updateTrig(b);            // 角度是从游戏那边搬过来的，缓存要先算好
    syncParts(b);
    balls.push(b);
  }
  w.balls = balls;
  w.score = gameState.score;
  w.pending = gameState.pending;
  w.next = gameState.next;
  w.ready = gameState.ready;
  w.cooldown = gameState.cooldown;
  w.aimX = gameState.aimX;
  w.over = gameState.over;
  w.revives = gameState.revives;
  w.reviveGiven = gameState.reviveGiven;
  w.freeze = gameState.freeze;
  w.danger = gameState.danger;
  w.flash = gameState.flash || 0;
  /* gameState 里的 bornAt 用的是主线程的真实时钟；Worker 里的 performance.now()
     是另一个时间原点，所以必须显式把主线程的 now 带过来（否则对齐会错） */
  w.now = (nowMs !== undefined && nowMs !== null) ? nowMs
    : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  return w;
}



return { syncParts, DIAG, resetDiag, CFG, FRUITS, MERGE_SCORE, SPAWN_TIERS, SPAWN_WEIGHTS, TIER_VALUE, setShapes, getShapes, getExactShapes, setShapeMode, makeWorld, resetWorld, makeBall, cloneBall, aimLimit, moveAim, tryDrop, dropAt, pickSpawnTier, PROF, stepPhysics, processMerges, checkGameOver, revive, update, cloneWorld, runFor, maxSpeed, stackTop, snapshotOf, adoptFromGame };
})();

MODS['planner'] = (function () {
/* ============================================================================
 *  planner.js —— 落点决策
 *
 *  管线（每一层都能开关、都能预算降级）：
 *    ① 候选生成：在可投范围内按 step 均分（含两端），必要时加局部细化
 *    ② 推演      ：克隆世界 → 投放 → 用「和线上一模一样」的物理跑到稳定
 *    ③ 评估      ：真实得分 + 盘面形状风险 + 潜在合成机会
 *    ④ 精选      ：前 topK 个候选跑更长的推演
 *    ⑤ 期望搜索  ：下一步那颗水果是随机的，按掉落权重做一层期望（可关）
 *    ⑥ 细化      ：在冠军落点左右再试几个更细的位置
 *
 *  为什么全程用 exact 物理：见 tools/model-agreement.mjs —— 换成近似外形
 *  （少几个碰撞小圆 / 直接用圆）以后，决策排序与真实物理几乎不相关（ρ≈0），
 *  因为「这颗到底会不会撞上、会不会合成」本来就是混沌的，必须精确模拟。
 * ========================================================================== */

const E = MODS['engine'];

/* ------------------------------------------------------------ 权重配置 ---- */

const DEFAULT_WEIGHTS = {
  merge:   1.00,   // 推演窗口内真实拿到的分数
  mergeW:  3.00,   // 推演窗口内合出的最大 tier 奖励（引导往大果走）
  top:     2.00,   // 堆顶逼近警戒线的二次惩罚
  above:   8.00,   // 越线水果的数量 × 体积
  overT:   4.00,   // 越线计时（离判负还有多远）
  bump:    0.00,   // 表面起伏（对照实验里关掉它反而更好，留 0 但保留这个旋钮）
  adj:     2.40,   // 同级相邻度（潜在合成机会；对照实验里加强它更稳）
  bigPair: 2.20,   // 同级「大果」抱团：后期最要命的就是两个大奶蛙各占一边永远合不上
  blocked: 0.90,   // 两个同级大果之间塞着别的水果（合不拢的直接原因）
  mono:    0.00,   // 层级沿水平方向的梯度（大果集中在一侧）—— 默认关，可调参开
  bigHigh: 0.80,   // 大果被顶到高处
  buried:  0.60,   // 大果压小果（被埋的小果就废了）
  frag:    0.25,   // 碎块惩罚
  /* 形状 / 长期位置（2026-10-14 新增，默认全 0 = 完全不参与，见 features() 的说明）：
     flat   柱子凸出（罚）· pool 工作面还剩多宽（奖）· ground 大果沉底（奖） */
  flat:    0.00,
  pool:    0.00,
  ground:  0.00,
  /* 用户反馈的两项「长久受益」（默认关闭，用 tools/tune.mjs 验证过才开）：
     stuck —— 底部堆着没有同级伙伴的大果（占地方又合不掉）
     space —— 这一手合成释放掉的空间（大果收益随半径平方增长） */
  stuck:   0.00,
  space:   0.00,
  dead:   -10000,  // 推演中判负（手里没有复活币时的死局）
  /* 有复活币时，风险不再等于死：允许把场面堆得更高，换更大的合成空间
     （每 2000 分、以及两只神奶蛙相撞都会再发币） */
  riskScaleWithRevive: 0.45,
};

const SOFT_TOP = 330;   // 顶部从 y=330 开始算「接近警戒线」

/* -------------------------------------------------------- 盘面特征提取 ---- */

const N_BINS = 8;

function features(w) {
  const balls = w.balls;
  const n = balls.length;
  const W = E.CFG.W, WALL = E.CFG.WALL, H = E.CFG.H;
  const binW = (W - 2 * WALL) / N_BINS;

  let top = H;
  let above = 0, aboveMass = 0, overT = 0;
  let bigHigh = 0;

  const profile = new Float64Array(N_BINS).fill(H - WALL);

  for (let i = 0; i < n; i++) {
    const b = balls[i];
    if (b.dead) continue;
    const t = b.y - b.r;
    if (t < top) top = t;
    if (t < E.CFG.DANGER_Y) {
      above++;
      aboveMass += (E.CFG.DANGER_Y - t) * (b.r / 50);
    }
    if (b.overTime > overT) overT = b.overTime;
    if (t < SOFT_TOP) bigHigh += (SOFT_TOP - t) * (b.r / 100) * (b.r / 100);

    const i0 = Math.max(0, Math.floor((b.x - b.r - WALL) / binW));
    const i1 = Math.min(N_BINS - 1, Math.floor((b.x + b.r - WALL) / binW));
    for (let k = i0; k <= i1; k++) if (t < profile[k]) profile[k] = t;
  }

  let bump = 0;
  for (let k = 0; k + 1 < N_BINS; k++) bump += Math.abs(profile[k + 1] - profile[k]);

  /* 同级相邻度：距离越近、越可能马上合（按合成价值加权） */
  let adj = 0;
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    if (a.dead || a.tier >= E.CFG.MAX_TIER) continue;
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];
      if (b.dead || b.tier !== a.tier) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const reach = (a.r + b.r) * 1.9;
      if (d >= reach) continue;
      const near = 1 - d / reach;
      adj += near * near * (E.MERGE_SCORE[a.tier + 1] + 1);
    }
  }

  /* 「大果抱团」与「被挡」：后期最常见的死法 —— 两只半奶蛙/神奶蛙各占一边，
     中间塞着一堆小果，永远合不到一起。这两项就是专门治它的。
     tier 越大权重越夸张（(tier-3)^1.6），因为大果合成的收益是超线性的。 */
  let bigPair = 0, blocked = 0, monoNum = 0, monoDen = 0;
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    if (a.dead || a.tier < 5) continue;
    for (let j = i + 1; j < n; j++) {
      const b = balls[j];
      if (b.dead || b.tier !== a.tier) continue;
      const wBig = Math.pow(a.tier - 3, 1.6);
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const reach = (a.r + b.r) * 2.2;
      if (d < reach) bigPair += (1 - d / reach) * wBig;
      else bigPair -= Math.min(1, (d - reach) / ((a.r + b.r) * 3)) * wBig * 0.6;

      /* 两颗大果水平之间、位置更高（y 更小）的水果 = 挡路的 */
      if (d < (a.r + b.r) * 3.4) {
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
        const yBar = Math.max(a.y, b.y);
        for (let k = 0; k < n; k++) {
          const c = balls[k];
          if (c === a || c === b || c.dead) continue;
          if (c.x > x0 && c.x < x1 && c.y < yBar) blocked += wBig * 0.35;
        }
      }
    }
  }
  /* 层级梯度：大果是不是集中在一侧（经典的「大果归边」打法） */
  {
    let sxy = 0, sx = 0, sy = 0, sx2 = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.dead) continue;
      const t = b.tier + 1, x = b.x;
      sxy += t * x; sx += x; sy += t; sx2 += x * x; cnt++;
    }
    if (cnt > 3) {
      const mx = sx / cnt, my = sy / cnt;
      const vx = sx2 / cnt - mx * mx;
      if (vx > 1) { monoNum = Math.abs((sxy / cnt - mx * my) / Math.sqrt(vx)); monoDen = 1; }
    }
  }

  /* 「被埋」：大果压在小果上 → 那颗小果基本再也合不掉了（后期最伤的盘面） */
  let buried = 0;
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    if (a.dead) continue;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = balls[j];
      if (b.dead || a.r < b.r * 1.35) continue;       // a 得明显比 b 大
      if (a.y + a.r * 0.7 > b.y) continue;            // 且 a 得压在 b 上面
      buried += (a.r / b.r) * 0.06;
    }
  }

  /* 顶点风险：只有靠近/越过警戒线才计入 */
  const gap = Math.max(0, top - SOFT_TOP);
  const topRisk = gap === 0 ? 1 + (SOFT_TOP - top) / 40 : 0;

  /* 「无效大果」：没有同级伙伴的大果 —— 占着地方、又永远合不掉。
     这正是用户观察到的情况：底部堆了一堆奶蛙，彼此都合不到一起，越堆越高。
     按面积 (r/100)² 计权：越大的果占地方越多，越该优先把它处理掉。
     一旦出现了同级伙伴（2.5 倍半径和之内），就不算「无效」了 —— 它有机会合。 */
  let stuck = 0;
  for (let i = 0; i < n; i++) {
    const a = balls[i];
    if (a.dead || a.tier < 6) continue;
    let partner = false;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = balls[j];
      if (b.dead || b.tier !== a.tier) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const reach = (a.r + b.r) * 2.5;
      if (dx * dx + dy * dy < reach * reach) { partner = true; break; }
    }
    if (!partner) stuck += (a.r / 100) * (a.r / 100);
  }

  /* ------------------------------------------------------------------------
   *  形状 / 长期位置（2026-10-14 新增；权重默认 0 —— 不开时一个比特都不变）
   *
   *  动机是 README 第十三节的解剖结果：**52.5% 的手，前 8 名候选的评估值完全
   *  并列**（极差 ≤0.5）。并列大多出现在盘面还稀疏的时候 —— 那些落点在 2.6 秒
   *  窗口内确实等价，可是它们把水果放在左边/右边/中间，对**几十手之后**的形状
   *  影响完全不同，而这件事在评估函数里过去权重为零。
   *
   *  三项各管一件事：
   *    flat  —— 有没有「柱子」凸出来。判负看的就是最高那一颗，所以把"比平均
   *             高出一截的柱"按平方罚。（与 bump 的区别：bump 罚的是斜率，一个
   *             平缓的斜坡 bump 很大却一点都不危险。）
   *    pool  —— 工作面还剩多少、而且是"整片都还剩"。取每列可用高度（堆顶到
   *             警戒线）的截断平均。它比 top 温和得多（top 只看全局最高点，
   *             压线时无上限放大），给中前期的"布局够不够宽"一个有梯度的信号。
   *    ground—— 大质量有没有沉底。大果停在底层 = 上面留给可操作的小果；
   *             大果悬在中间 = 既挡路又随时会被顶到线上。按 (r/100)³ 计权，
   *             所以它关心的是「半奶蛙/神奶蛙在哪」，而不是葡萄在哪。
   * ---------------------------------------------------------------------- */
  let meanTop = 0, nCol = 0;
  for (let k = 0; k < N_BINS; k++) {
    if (profile[k] < H - WALL) { meanTop += profile[k]; nCol++; }
  }
  meanTop = nCol ? meanTop / nCol : H - WALL;

  let flat = 0;
  for (let k = 0; k < N_BINS; k++) {
    const d = meanTop - profile[k];          // >0 = 这一列比平均高
    if (d > 0) flat += d * d;
  }
  flat = flat / (N_BINS * 2500);             // 一根高出平均 50px 的柱子 ≈ 0.125

  let pool = 0;
  for (let k = 0; k < N_BINS; k++) {
    const free = profile[k] - E.CFG.DANGER_Y;
    pool += free <= 0 ? 0 : Math.min(1, free / 220);
  }
  pool = pool / N_BINS;

  let ground = 0;
  const floorY = H - WALL;
  for (let i = 0; i < n; i++) {
    const b = balls[i];
    if (b.dead) continue;
    const depth = (floorY - (b.y + b.r)) / floorY;     // 0 = 贴着底板
    const wBig = b.r / 100;
    ground += wBig * wBig * wBig * Math.max(0, 1 - depth);
  }
  ground = ground / 3;

  return {
    n, top, above, aboveMass, buried: buried / 10,
    bigPair: bigPair / 12,
    blocked: blocked / 12,
    stuck: stuck / 4,
    flat, pool, ground,
    /* 本轮推演里合成「释放掉的面积」：两颗消失、一颗更大的顶上，净腾出来的空间。
       加大果的收益随半径平方增长 —— 合掉两只半奶蛙腾出的地方，是合掉两颗葡萄的 160 倍。 */
    space: (w.freed || 0) / 10000,
    mono: monoDen ? monoNum / 200 : 0,
    overN: Math.min(1, overT / E.CFG.OVER_LIMIT),
    bump: bump / (N_BINS - 1) / 100,
    adj: adj / 40,
    bigHigh: bigHigh / 60,
    room: Math.max(0, top - E.CFG.DANGER_Y) / (H - E.CFG.DANGER_Y),
    topRisk2: topRisk * topRisk,
  };
}

/* ------------------------------------------------------------ 局面评估 ---- */

const DIAG = { evals: 0 };
function resetDiag() { DIAG.evals = 0; }

function evaluate(w, before, wt = DEFAULT_WEIGHTS) {
  DIAG.evals++;
  if (w.over) return wt.dead ?? DEFAULT_WEIGHTS.dead;   // 权重表允许只写想改的项
  const f = features(w);
  /* 手里有复活币时「越线」没那么可怕：输了只是清掉顶上一片、花一枚币继续打。
     所以风险项整体缩小 —— 这就是「用复活币换更大空间」的实现。 */
  const risk = (w.revives > 0) ? (wt.riskScaleWithRevive ?? 1) : 1;

  let v = 0;
  v += wt.merge * (w.score - before);
  v += wt.mergeW * Math.max(0, (w.mergedMaxTier ?? -1) - 3);
  v -= wt.top * f.topRisk2 * 24 * risk;
  v -= wt.above * f.aboveMass * risk;
  v -= wt.overT * f.overN * 20 * risk;
  v -= wt.bump * f.bump * 20;
  v += wt.adj * f.adj;
  v += (wt.bigPair || 0) * f.bigPair;
  v -= (wt.blocked || 0) * f.blocked;
  v += (wt.mono || 0) * f.mono * 4;
  v -= wt.bigHigh * f.bigHigh;
  v -= (wt.buried || 0) * f.buried;
  v -= (wt.fragFruit ? wt.frag * f.n * wt.fragFruit : wt.frag * f.n * 0.15);
  /* 可选的「材料」项（默认关闭，权重缺省时完全不参与）：盘面上未合成的 2^tier 之和。
     合成守恒这个量，它是还没变成分数的潜在价值；复活删掉的水果会让它下降，从而被计入代价。 */
  if (wt.mat) v += wt.mat * tokenMass(w) / 100;
  /* 「无效大果」惩罚 + 「腾出空间」奖励（默认关闭）。
     用户的观察：先把顶部消掉只是拿了眼前的分数，底部那一堆合不掉的奶蛙才是长久的病。
     space 直接奖励「这一手腾出了多少地方」，大果的收益随半径平方增长，
     所以它会把「合掉两只半奶蛙」排在「多拿 45 分」前面。 */
  v -= (wt.stuck || 0) * f.stuck;
  /* 形状 / 长期位置三项（默认全 0，见 features() 里的说明）。
     flat 是罚项（柱子），pool / ground 是奖项（工作面宽、大果沉底）。 */
  v -= (wt.flat || 0) * f.flat;
  v += (wt.pool || 0) * f.pool;
  v += (wt.ground || 0) * f.ground;
  if (wt.space) v += wt.space * f.space;
  return v;
}

function tokenMass(w) {
  let s = 0;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    if (!b.dead) s += Math.pow(2, b.tier);
  }
  return s;
}

/* ---------------------------------------------------------------- 工具 ---- */

const now = (typeof performance !== 'undefined' && performance.now)
  ? () => performance.now() : () => Date.now();

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function candidateXs(tier, step, around = null, span = 0) {
  const [lo, hi] = E.aimLimit(tier);
  if (around !== null) {
    const out = [];
    for (let x = around - span; x <= around + span + 1e-9; x += step) out.push(Math.min(hi, Math.max(lo, x)));
    return out;
  }
  const out = [];
  if (hi <= lo) return [lo];
  const n = Math.max(1, Math.round((hi - lo) / step));
  for (let i = 0; i <= n; i++) out.push(lo + (hi - lo) * (i / n));
  return out;
}

/* ---------------------------------------------------------------------------
 *  收敛判定：什么时候可以认为「盘面已经不会再变了」
 *
 *  规则一（原有）：瞬时速度 < 25 px/s（= 每帧位移 < 0.42px）。
 *  规则二（新增）：**整盘净位移**——连续两个窗口里，每颗水果相对上一个
 *    窗口的位移都小于 1.5px。
 *
 *  为什么要加规则二：奶蛙被挤在中间时，碰撞箱解算收敛不了，会一直小幅上下抖
 *  （位置在 ±0.7px 里来回，速度却一直有 30~200 px/s），于是规则一永远不触发，
 *  每一次推演都要跑满整个时间窗 —— 这就是「抖动时思考特别慢」的直接原因。
 *  规则二看的是「走了多远」而不是「走得多快」，这种原地抖动会被正确识别为已停。
 *
 *  参数都是量出来的（tools/packed-probe.mjs、tools/jitter-diag.mjs）：
 *  真停住时每 16 帧的净位移是 0.5~1.2px，而瞬时速度还能尖到 200 px/s。
 *
 *  正确性说明：这里改的是「什么时候收工」，**物理本身一个比特都没有动**
 *  （引擎仍然是逐帧照抄线上），而且规则二比规则一更严格：
 *  一个正在慢慢滚动（20px/s）的水果会被规则一放行、但不会通过规则二。
 * ------------------------------------------------------------------------- */
const SETTLE = {
  /* 默认关闭。实测（tools/settle-ab.mjs，5 个盘面）：打开后只省 1~3% 的物理帧，
     但 5 个盘面里有 1 个换掉了落点 —— 按本项目「决定不逐位相同就必须有证据证明更好」
     的规矩，在没有跑分证据之前不开。想在抖动盘面上再快一点可以开：
       NaiwaBot.planner.SETTLE.vibrate = true
     它只在「整盘每 16 帧净位移 < 1.5px、连续两个窗口」时才收工，物理一个比特没动。 */
  vibrate: false,
  vibWindow: 16,      // 窗口长度（帧）；必须是 4 的倍数，才可能和 (i & 3) === 0 对齐
  vibEps: 1.5,        // 窗口间允许的最大位移（px）
  vibNeed: 2,         // 连续多少个窗口满足才算「冻住」
  vibMaxSpeed: 400,   // 抖动幅度上限：再快说明是真的在动，不认「冻住」
};

const POSE_CAP = 200;                       // 盘面最多约 96 颗
const posePrev = new Float64Array(POSE_CAP * 3 + 2);
const poseCur = new Float64Array(POSE_CAP * 3 + 2);

/* 采集姿态：球数、分数、每颗的 (tier, x, y)。返回球数，-1 表示放不下 */
function capturePose(w, buf) {
  const nb = w.balls.length;
  if (nb > POSE_CAP) return -1;
  buf[0] = nb; buf[1] = w.score;
  for (let k = 0; k < nb; k++) {
    const b = w.balls[k];
    buf[2 + k * 3] = b.tier;
    buf[3 + k * 3] = b.x;
    buf[4 + k * 3] = b.y;
  }
  return nb;
}

/* 两个姿态之间的最大位移；球数/分数/等级不一致时返回 Infinity（= 不算冻住） */
function poseShift(a, b, nb) {
  if (a[1] !== b[1]) return Infinity;              // 分数变了 → 期间发生了合成
  let m = 0;
  for (let k = 0; k < nb; k++) {
    if (a[2 + k * 3] !== b[2 + k * 3]) return Infinity;   // 等级对不上 → 不是同一颗
    const dx = Math.abs(a[3 + k * 3] - b[3 + k * 3]);
    const dy = Math.abs(a[4 + k * 3] - b[4 + k * 3]);
    const d = dx > dy ? dx : dy;
    if (d > m) m = d;
  }
  return m;
}

/* 跑到 h 秒；盘面静下来（且已跑够 quiet）就提前收工 */
function runSettle(w, h, quiet, allowRevive = true) {
  const step = E.CFG.FIXED;
  const n = Math.round(h / step);
  const minSteps = quiet ? Math.round(quiet / step) : n;
  const vib = SETTLE.vibrate;
  let prevN = -1, frozen = 0;

  for (let i = 0; i < n; i++) {
    E.update(w, step);
    if (w.over) {
      /* 有币就花：推演里直接把复活做掉，继续往下跑。
         这样评估函数看到的是「用币之后的真实局面」，而不是一刀切判死 */
      if (allowRevive && w.revives > 0 && E.revive(w)) { prevN = -1; frozen = 0; continue; }
      return i + 1;
    }
    if (i < minSteps || (i & 3) !== 0) continue;

    if (E.maxSpeed(w) < 25) return i + 1;          // 规则一：真的静止

    if (vib && i % SETTLE.vibWindow === 0) {        // 规则二：整盘净位移
      const nb = capturePose(w, poseCur);
      if (nb < 0) continue;
      if (nb === prevN && E.maxSpeed(w) < SETTLE.vibMaxSpeed) {
        const shift = poseShift(poseCur, posePrev, nb);
        if (shift < SETTLE.vibEps) {
          frozen++;
          if (frozen >= SETTLE.vibNeed) return i + 1;
        } else frozen = 0;
      } else frozen = 0;
      posePrev.set(poseCur);                        // 滚动基线
      prevN = nb;
    }
  }
  return n;
}

/* 推演一次投放 → 返回评估值。
   allowRevive=false 表示「推演里不许用币续命」= 越线就直接判死（保守打法用）。 */
function rolloutValue(src, x, h, wt, scratch, quiet, allowRevive = true) {
  const sim = E.cloneWorld(src, scratch);
  sim.mergedMaxTier = -1; sim.freed = 0;
  const before = sim.score;
  E.dropAt(sim, x);          // 若 !ready 会失败 → 调用方保证 ready
  runSettle(sim, h, quiet, allowRevive);
  const v = evaluate(sim, before, wt);
  return { v, sim, gain: sim.score - before };
}

/* --------------------------------------------------------------- 主入口 --- */

/* ---------------------------------------------------------------------------
 *  四个搜索阶段 —— 都写成「纯函数」：(世界, 参数, 候选落点列表) → 结果列表
 *
 *  这样同一套代码既能顺序跑（Node 自我对弈），也能分片丢给多个 Worker 并行跑
 *  （浏览器里的 bot）。每个阶段内部对每个 x 的计算互相独立，分片不会改变任何数值，
 *  合并时按原顺序拼接 + 稳定排序，结果与顺序版逐位一致。
 * ------------------------------------------------------------------------- */

/* ① 粗筛：每个候选跑 h1 秒 */
function stageScreen(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h1, st.wt, st.scratch, st.quiet, st.allowRevive);
    out[i] = { x: xs[i], v1: o.v };
  }
  return out;
}

/* ② 精选：长推演 h2 秒 */
function stageLong(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6, st.allowRevive);
    out[i] = { x: xs[i], v2: o.v, gain: o.gain, top: E.stackTop(o.sim) };
  }
  return out;
}

/* ③ 第二层（连手棋）：拆成三步，所有工作单元都能跨 Worker 并行 ------------
 *   a. ply2Plan     ：展开「外层落点 × 颜色 × 内层落点」的全部工作单元（纯索引，无物理）
 *   b. stageInner   ：单元 = 外层投放并稳定 → 内层颜色投放 → 跑 h1（可切片并行）
 *      stageRecheck ：每个 (外层, 颜色) 的内层冠军再跑一次 h2 长推演（可切片并行）
 *   c. ply2Best / ply2RecheckItems / ply2Assemble：取内层第一个最大值（与原来的
 *      `v > bestInner` 完全一致），再按原来的顺序做加权求和
 *  外层基准直接取精选阶段的 v2：二者是同一条推演（同盘面、同落点、同样的 h2 与 quiet），
 *  原先 stagePly2 会把它再算一遍，纯属重复。与原实现逐位一致（tools/verify-exact.mjs 守着）。 */

function ply2Plan(world, opts, outerXs) {
  const step = opts.step || 8;
  const known = opts.nextMode === 'known';
  const h1 = opts.h1 ?? 1.2;
  const innerStep = known ? Math.max(4, step * 0.75) : Math.max(10, step * 1.5);
  const innerH = known ? h1 : Math.min(h1, 1.0);
  const tiers = known ? [world.next] : E.SPAWN_TIERS.filter(t => t !== world.pending);
  const items = [];
  for (let o = 0; o < outerXs.length; o++) {
    for (let ti = 0; ti < tiers.length; ti++) {
      for (const x2 of candidateXs(tiers[ti], innerStep)) {
        items.push({ o, x: outerXs[o], ti, t: tiers[ti], x2 });
      }
    }
  }
  return { known, innerH, h2: opts.h2 ?? 2.6, tiers, nOuter: outerXs.length, items };
}

/* 工作单元按「外层落点」连续排列，这里缓存当前外层的盘面与内层盘面，
   同一外层、同一颜色只构造一次（构造过程与原来逐个构造完全相同） */
/* 缓存结构：Map<外层落点x, {sim1, inners: Map<颜色t, inner>}>。
   sim1 不能用 st.scratch（多份外层盘面要同时存活），这里每份都是独立的克隆。 */
function innerOf(world, st, cache, it) {
  let e = cache.get(it.x);
  if (!e) {
    const sim1 = E.cloneWorld(world);
    sim1.mergedMaxTier = -1; sim1.freed = 0;
    E.dropAt(sim1, it.x);
    runSettle(sim1, st.h2, st.quiet + 0.6);
    e = { sim1, inners: new Map() };
    cache.set(it.x, e);
  }
  let inner = e.inners.get(it.t);
  if (!inner) {
    inner = E.cloneWorld(e.sim1, E.makeWorld({ rng: world.rng }));
    inner.pending = it.t;
    inner.ready = true;
    inner.cooldown = 0;
    e.inners.set(it.t, inner);
  }
  return inner;
}

function stageInner(world, opts, items, ctx) {
  const st = stageCtx(world, opts, ctx);
  const innerH = opts.nextMode === 'known' ? st.h1 : Math.min(st.h1, 1.0);
  /* 顺序版传入同一个 ctx.cache：复核阶段就能复用这里建好的外层/内层盘面 */
  const cache = (ctx && ctx.cache) || new Map();
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const inner = innerOf(world, st, cache, it);
    const s2 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));
    s2.mergedMaxTier = -1; s2.freed = 0;
    const b2 = s2.score;
    E.dropAt(s2, it.x2);
    runSettle(s2, innerH, 0.7, st.allowRevive);
    out[i] = evaluate(s2, b2, st.wt);
  }
  return out;
}

/* 内层冠军的长推演复核（连锁合成往往 1 秒后才发生） */
function stageRecheck(world, opts, items, ctx) {
  const st = stageCtx(world, opts, ctx);
  const cache = (ctx && ctx.cache) || new Map();
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const inner = innerOf(world, st, cache, it);
    const s3 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));
    s3.mergedMaxTier = -1; s3.freed = 0;
    const b3 = s3.score;
    E.dropAt(s3, it.x2);
    runSettle(s3, st.h2, 1.2, st.allowRevive);
    out[i] = evaluate(s3, b3, st.wt);
  }
  return out;
}

/* 每个 (外层, 颜色) 的内层最优：取第一个最大值（与原来的 `v > bestInner` 一致） */
function ply2Best(plan, innerVals) {
  const best = [];
  for (let o = 0; o < plan.nOuter; o++) {
    const row = [];
    for (let ti = 0; ti < plan.tiers.length; ti++) row.push({ v: -Infinity, idx: -1 });
    best.push(row);
  }
  for (let i = 0; i < plan.items.length; i++) {
    const it = plan.items[i];
    const cell = best[it.o][it.ti];
    const v = innerVals[i];
    if (v > cell.v) { cell.v = v; cell.idx = i; }
  }
  return best;
}

/* 需要长推演复核的内层冠军（只有 h2 比内层horizon长时才复核，与原来的条件一致） */
function ply2RecheckItems(plan, best) {
  const out = [];
  if (!(plan.h2 > plan.innerH)) return out;
  for (let o = 0; o < plan.nOuter; o++) {
    for (let ti = 0; ti < plan.tiers.length; ti++) {
      const c = best[o][ti];
      if (c.idx < 0) continue;
      const it = plan.items[c.idx];
      out.push({ o, ti, x: it.x, t: it.t, x2: it.x2 });
    }
  }
  return out;
}

/* 汇总：每个外层落点的 v3（基准 = 精选阶段的 v2，见上面的说明） */
function ply2Assemble(world, plan, outerBase, best, rcItems, rcVals) {
  const pAvoid = spawnProb(world.pending);
  const rc = [];
  for (let o = 0; o < plan.nOuter; o++) rc.push(new Array(plan.tiers.length).fill(undefined));
  for (let k = 0; k < rcItems.length; k++) rc[rcItems[k].o][rcItems[k].ti] = rcVals[k];
  const out = new Array(plan.nOuter);
  for (let o = 0; o < plan.nOuter; o++) {
    let exp = 0, wsum = 0;
    for (let ti = 0; ti < plan.tiers.length; ti++) {
      const t = plan.tiers[ti];
      const p = plan.known ? 1 : SPAWN_W(t) / (1 - pAvoid);
      let bestInner = best[o][ti].v;
      const v3 = rc[o][ti];
      if (v3 !== undefined && v3 > bestInner) bestInner = v3;
      exp += p * bestInner;
      wsum += p;
    }
    out[o] = outerBase[o] + (plan.known ? 1.0 : 0.8) * (exp / (wsum || 1));
  }
  return out;
}

/* ④ 细化：冠军附近更细的落点在跑一遍长推演 */
function stageRefine(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6, st.allowRevive);
    out[i] = { x: xs[i], v: o.v };
  }
  return out;
}

const STAGES = {
  screen: stageScreen, long: stageLong, inner: stageInner, recheck: stageRecheck, refine: stageRefine,
};

function stageCtx(world, opts, ctx) {
  const step = opts.step || 8;
  return {
    wt: opts.weights ? { ...DEFAULT_WEIGHTS, ...opts.weights } : DEFAULT_WEIGHTS,
    step,
    h1: opts.h1 ?? 1.2,
    h2: opts.h2 ?? 2.6,
    quiet: opts.quiet ?? 0.9,
    /* 推演里允不允许用复活币续命。allowRevive:false = 保守打法：
       越线就直接判死（dead 一票否决），不把"反正有币"算进落点价值。 */
    allowRevive: opts.allowRevive !== false,
    scratch: (ctx && ctx.scratch) || E.makeWorld({ rng: world.rng }),
  };
}

/**
 * 顺序版搜索（Node 自我对弈 / 基准测试用；浏览器里跑并行版）。
 * 返回 {x, value, candCount, ms, ranked}
 */
function searchBest(world, opts = {}) {
  const step = opts.step || 8;
  const topK = opts.topK ?? 8;
  const lookahead = opts.lookahead ?? 1;
  const t0 = now();
  const xs = candidateXs(world.pending, step);

  /* ① 粗筛 */
  const results = stageScreen(world, opts, xs).map(r => ({ x: r.x, v1: r.v1 }));
  results.sort((a, b) => b.v1 - a.v1);

  /* ② 精选 */
  const shortlist = results.slice(0, Math.min(topK, results.length));
  const longs = stageLong(world, opts, shortlist.map(r => r.x));
  for (let i = 0; i < shortlist.length; i++) {
    shortlist[i].v2 = longs[i].v2;
    shortlist[i].gain2 = longs[i].gain;
    shortlist[i].top2 = longs[i].top;
  }
  shortlist.sort((a, b) => (b.v2 ?? b.v1) - (a.v2 ?? a.v1));

  let best = shortlist[0];

  /* ③ 第二层（下一颗已知 → 连手棋） */
  const nTop = Math.min(opts.innerTop ?? 4, shortlist.length);
  if (lookahead >= 2 && shortlist.length > 1) {
    const top = shortlist.slice(0, nTop);
    const plan2 = ply2Plan(world, opts, top.map(r => r.x));
    const ctx2 = { cache: new Map() };          // 顺序版：内层与复核共享外层/内层盘面
    const best2 = ply2Best(plan2, stageInner(world, opts, plan2.items, ctx2));
    const rcItems = ply2RecheckItems(plan2, best2);
    const v3 = ply2Assemble(world, plan2, top.map(r => r.v2), best2, rcItems, stageRecheck(world, opts, rcItems, ctx2));
    for (let i = 0; i < top.length; i++) top[i].v3 = v3[i];
    top.sort((a, b) => b.v3 - a.v3);
    best = top[0];
  }

  /* ④ 细化 */
  if (opts.refine !== false) {
    const fine = Math.max(2, Math.round(step / 2));
    const probes = candidateXs(world.pending, fine, best.x, step).filter(x => Math.abs(x - best.x) > 1e-6);
    if (probes.length) {
      const rf = stageRefine(world, opts, probes);
      let bestV = best.v3 ?? best.v2 ?? best.v1;
      for (const r of rf) {
        if (r.v > bestV) { bestV = r.v; best = { x: r.x, v1: r.v, v2: r.v }; }
      }
    }
  }

  const value = best.v3 ?? best.v2 ?? best.v1;
  return {
    x: best.x, value, candCount: xs.length, ms: Math.round(now() - t0),
    ranked: results.slice(0, 5).map(r => +r.v1.toFixed(2)),
  };
}

/**
 * 并行版：和 searchBest 完全同构，只是每个阶段通过 exec 分片执行。
 * @param exec (stageName, xs) => Promise<[{x, ...}]>  —— 结果顺序必须与 xs 一致
 */
async function planParallel(world, opts, exec) {
  const step = opts.step || 8;
  const topK = opts.topK ?? 8;
  const lookahead = opts.lookahead ?? 1;
  const t0 = now();
  const xs = candidateXs(world.pending, step);

  const screen = await exec('screen', xs);
  const results = screen.map(r => ({ x: r.x, v1: r.v1 }));
  results.sort((a, b) => b.v1 - a.v1);

  const shortlist = results.slice(0, Math.min(topK, results.length));
  const longs = await exec('long', shortlist.map(r => r.x));
  for (let i = 0; i < shortlist.length; i++) {
    shortlist[i].v2 = longs[i].v2;
    shortlist[i].gain2 = longs[i].gain;
    shortlist[i].top2 = longs[i].top;
  }
  shortlist.sort((a, b) => (b.v2 ?? b.v1) - (a.v2 ?? a.v1));

  let best = shortlist[0];

  const nTop = Math.min(opts.innerTop ?? 4, shortlist.length);
  if (lookahead >= 2 && shortlist.length > 1) {
    const top = shortlist.slice(0, nTop);
    const plan2 = ply2Plan(world, opts, top.map(r => r.x));
    /* 工作单元是扁平的（外层 × 颜色 × 内层落点），切片后各 Worker 都能分到活 */
    const best2 = ply2Best(plan2, await exec('inner', plan2.items));
    const rcItems = ply2RecheckItems(plan2, best2);
    const rcVals = rcItems.length ? await exec('recheck', rcItems) : [];
    const v3 = ply2Assemble(world, plan2, top.map(r => r.v2), best2, rcItems, rcVals);
    for (let i = 0; i < top.length; i++) top[i].v3 = v3[i];
    top.sort((a, b) => b.v3 - a.v3);
    best = top[0];
  }

  if (opts.refine !== false) {
    const fine = Math.max(2, Math.round(step / 2));
    const probes = candidateXs(world.pending, fine, best.x, step).filter(x => Math.abs(x - best.x) > 1e-6);
    if (probes.length) {
      const rf = await exec('refine', probes);
      let bestV = best.v3 ?? best.v2 ?? best.v1;
      for (const r of rf) {
        if (r.v > bestV) { bestV = r.v; best = { x: r.x, v1: r.v, v2: r.v }; }
      }
    }
  }

  const value = best.v3 ?? best.v2 ?? best.v1;
  return {
    x: best.x, value, candCount: xs.length, ms: Math.round(now() - t0),
    ranked: results.slice(0, 5).map(r => +r.v1.toFixed(2)),
  };
}

/* ============================================================================
 *  投掷时机：现在丢，还是等这一波连锁/抖动安静下来再丢？
 *
 *  这是真问题：合成的一瞬间棋盘是「乱」的（水果在弹、在滚、连锁还没走完）。
 *   - 现在丢：落点会撞上正在运动的水果，结果更不可预测（但推演里的物理是真的，
 *             所以 bot 其实能算准「丢进混乱里」会发生什么，甚至能借势撞出合成）
 *   - 等它稳定再丢：局面更清楚，落点更好挑，但要消耗时间
 *  两条路各自的「终点盘面」用同一个评估函数打分（同一时刻截止），谁高选谁；
 *  等待期间自己发生的合成也算分。等久了会有一个很小的惩罚项打破平局。
 * ========================================================================== */

const TIMING = {
  quietSpeed: 60,            // 盘面最大速度低于它就算「安静」
  maxWaitFrames: 180,        // 最多等 3 秒（游戏时间）
  waitPenaltyPerFrame: 0.02, // 每等一帧扣一点（纯粹用来打破平局）
};

/* 让世界自己前进 n 帧（不做任何投放） */
function advanceFrames(w, n) {
  for (let i = 0; i < n; i++) {
    E.update(w, E.CFG.FIXED);
    if (w.over) return i + 1;
  }
  return n;
}

/* 让世界自己跑 maxFrames 帧，直到安静下来；返回实际跑了多少帧 */
function advanceUntilQuiet(w, maxFrames, quietSpeed) {
  for (let i = 0; i < maxFrames; i++) {
    E.update(w, E.CFG.FIXED);
    if (w.over) return i + 1;
    if (i > 6 && E.maxSpeed(w) < quietSpeed) return i + 1;
  }
  return maxFrames;
}

/**
 * 带时机决策的完整入口。
 * opts.timing: 'auto'（默认，盘面在动就比较两种时机）| 'now'（永远立刻丢）| 'settle'（永远等安静）
 * 返回值在 searchBest 的基础上多两个字段：delayFrames（从快照时刻起算的等待帧数）、choice
 */
function plan(world, opts = {}) {
  const t0 = now();

  /* 主线程在 Worker 思考期间并不会暂停游戏：实时模式下这一手大约会在
     latencyFrames 帧之后真正落下。既然我们的物理是准的，就干脆让推演
     从「那一刻」的盘面开始 —— 计划才落在它真正生效的时间点上。 */
  let base = world;
  let latency = Math.max(0, Math.round(opts.latencyFrames || 0));
  if (latency > 0) {
    const ahead = E.cloneWorld(world, E.makeWorld({ rng: world.rng }));
    advanceFrames(ahead, latency);
    if (ahead.over) latency = 0;      // 光是等就输了 → 退回当前盘面
    else base = ahead;
  }

  const timing = opts.timing || 'auto';
  if (timing === 'now') {
    return { ...searchBest(base, opts), delayFrames: latency, choice: 'now' };
  }

  const quietSpeed = opts.quietSpeed ?? TIMING.quietSpeed;
  const maxWait = opts.maxWaitFrames ?? TIMING.maxWaitFrames;
  const penaltyPerFrame = opts.waitPenaltyPerFrame ?? TIMING.waitPenaltyPerFrame;

  /* 盘面本来就安静 → 没什么可等的 */
  if (E.maxSpeed(base) < quietSpeed) {
    return { ...searchBest(base, opts), delayFrames: latency, choice: 'quiet' };
  }

  const nowRes = searchBest(base, opts);

  /* 预算烧完了就别再算第二种 */
  if (opts.budgetMs && opts.budgetMs < 1e8 && now() - t0 > opts.budgetMs * 0.6) {
    return { ...nowRes, delayFrames: latency, choice: 'now' };
  }

  /* 让棋盘自己走一遍，看看「安静之后」长什么样 */
  const probe = E.cloneWorld(base, E.makeWorld({ rng: base.rng }));
  const frames = advanceUntilQuiet(probe, maxWait, quietSpeed);
  if (frames <= 0) return { ...nowRes, delayFrames: latency, choice: 'now' };

  if (probe.over) {
    /* 光等着就输了 —— 那说明现在必须动手 */
    return { ...nowRes, delayFrames: latency, choice: 'now' };
  }

  const gained = probe.score - base.score;   // 等待期间自己合出来的分
  const laterRes = searchBest(probe, opts);
  const laterValue = laterRes.value + gained - penaltyPerFrame * frames;

  if (laterValue > nowRes.value) {
    return {
      ...laterRes,
      value: laterValue,
      delayFrames: latency + frames,
      choice: 'settle',
      waitGain: gained,
      nowValue: nowRes.value,
      nowX: nowRes.x,
    };
  }
  return { ...nowRes, delayFrames: latency, choice: 'now', laterValue, laterX: laterRes.x };
}

/* 掉落权重小工具（原来的实现在重构时被覆盖了，补回来） */
function spawnProb(tier) {
  const i = E.SPAWN_TIERS.indexOf(tier);
  if (i < 0) return 0;
  let s = 0;
  for (const w of E.SPAWN_WEIGHTS) s += w;
  return E.SPAWN_WEIGHTS[i] / s;
}
function SPAWN_W(tier) {
  const i = E.SPAWN_TIERS.indexOf(tier);
  return i < 0 ? 0 : E.SPAWN_WEIGHTS[i];
}

return { DEFAULT_WEIGHTS, SOFT_TOP, features, DIAG, resetDiag, evaluate, tokenMass, now, mulberry32, candidateXs, SETTLE, runSettle, rolloutValue, stageScreen, stageLong, ply2Plan, stageInner, stageRecheck, ply2Best, ply2RecheckItems, ply2Assemble, stageRefine, STAGES, searchBest, planParallel, TIMING, advanceFrames, advanceUntilQuiet, plan };
})();

MODS['hud'] = (function () {
/* ============================================================================
 *  hud.js —— 页面上的「灵动岛」控制台
 *
 *  · 可拖动、可折叠：收起时只有一颗小胶囊（分数 + 状态灯）
 *  · 控制：暂停/继续、实时/快进、排行榜是否提交、自动复活、搜索强度、投掷时机
 *  · 全部就地生效，不需要重开页面
 * ========================================================================== */

const STRENGTH = {
  fast:   { label: '快',   step: 12, h1: 0.9, h2: 1.8, topK: 4,  lookahead: 1, innerTop: 3 },
  normal: { label: '标准', step: 8,  h1: 1.2, h2: 2.6, topK: 8,  lookahead: 2, innerTop: 4 },
  deep:   { label: '深',   step: 6,  h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, innerTop: 6 },
};

const CSS = `
#naiwa-island{position:fixed;z-index:2147483000;font:12px/1.45 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:#f2f2f7;user-select:none;-webkit-user-select:none;touch-action:none}
#naiwa-island *{box-sizing:border-box}
#naiwa-island .ni-pill{display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;cursor:grab;
  background:rgba(18,18,24,.82);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:0 6px 22px rgba(0,0,0,.38), inset 0 0 0 1px rgba(255,255,255,.09);transition:transform .18s ease}
#naiwa-island .ni-pill:active{cursor:grabbing}
#naiwa-island .ni-emoji{font-size:14px}
#naiwa-island .ni-score{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.3px}
#naiwa-island .ni-sub{opacity:.6;font-size:11px}
#naiwa-island .ni-dot{width:8px;height:8px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84}
#naiwa-island.ni-paused .ni-dot{background:#ffcc00;box-shadow:0 0 8px #ffcc00}
#naiwa-island.ni-wait .ni-dot{background:#5ac8fa;box-shadow:0 0 8px #5ac8fa}
#naiwa-island.ni-thinking .ni-dot{background:#ff9f0a;box-shadow:0 0 8px #ff9f0a;animation:ni-pulse 1s infinite}
@keyframes ni-pulse{0%,100%{opacity:1}50%{opacity:.35}}
#naiwa-island .ni-panel{margin-top:8px;width:268px;padding:12px;border-radius:16px;
  background:rgba(18,18,24,.9);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:0 10px 34px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08);display:none}
#naiwa-island.ni-open .ni-panel{display:block}
#naiwa-island .ni-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0}
#naiwa-island .ni-label{opacity:.62;font-size:11px}
#naiwa-island .ni-val{font-variant-numeric:tabular-nums}
#naiwa-island .ni-seg{display:flex;background:rgba(255,255,255,.08);border-radius:9px;padding:2px;gap:2px}
#naiwa-island .ni-seg button{border:0;background:transparent;color:#e9e9f2;font:inherit;font-size:11px;padding:4px 9px;
  border-radius:7px;cursor:pointer;transition:background .15s}
#naiwa-island .ni-seg button.on{background:rgba(255,255,255,.22)}
#naiwa-island .ni-actions{display:flex;gap:6px;margin-top:10px}
#naiwa-island .ni-actions button{flex:1;border:0;border-radius:10px;padding:7px 0;font:inherit;font-size:11.5px;cursor:pointer;
  background:rgba(255,255,255,.12);color:#fff;transition:background .15s}
#naiwa-island .ni-actions button:hover{background:rgba(255,255,255,.2)}
#naiwa-island .ni-actions button.ni-danger{background:rgba(255,69,58,.24)}
#naiwa-island .ni-actions button.ni-primary{background:rgba(10,132,255,.34)}
#naiwa-island .ni-tip{margin-top:8px;font-size:10.5px;opacity:.5;line-height:1.5}
`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function createIsland(bot) {
  const opts = bot.opts;
  if (!opts.hud) return null;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = el('div');
  root.id = 'naiwa-island';

  const pill = el('div', 'ni-pill');
  const emoji = el('span', 'ni-emoji', '🍉');
  const scoreEl = el('span', 'ni-score', '0');
  const subEl = el('span', 'ni-sub', '');
  const dot = el('span', 'ni-dot');
  pill.append(emoji, scoreEl, subEl, dot);

  const panel = el('div', 'ni-panel');

  /* ---- 状态行 ---- */
  const rowStat = el('div', 'ni-row');
  const statLabel = el('span', 'ni-label', '状态');
  const statVal = el('span', 'ni-val', '—');
  rowStat.append(statLabel, statVal);

  const rowInfo = el('div', 'ni-row');
  const infoVal = el('span', 'ni-val', '—');
  infoVal.style.fontSize = '11px';
  infoVal.style.opacity = '.72';
  rowInfo.append(infoVal);

  /* ---- 分段控件 ---- */
  function segment(label, options, get, set) {
    const row = el('div', 'ni-row');
    row.append(el('span', 'ni-label', label));
    const seg = el('div', 'ni-seg');
    const btns = options.map(o => {
      const b = el('button', null, o.label);
      b.onclick = (ev) => { ev.stopPropagation(); set(o.value); refresh(); bot.savePrefs && bot.savePrefs(); };
      seg.append(b);
      return { b, o };
    });
    row.append(seg);
    return { row, sync: () => { const cur = get(); for (const { b, o } of btns) b.classList.toggle('on', o.value === cur); } };
  }

  const segMode = segment('模式', [{ label: '实时', value: 'realtime' }, { label: '快进', value: 'turbo' }],
    () => opts.mode, (v) => bot.setMode(v));
  const segBoard = segment('排行榜', [{ label: '拦截提交', value: true }, { label: '允许上榜', value: false }],
    () => !!opts.blockLeaderboard, (v) => { opts.blockLeaderboard = v; });
  /* 「复活币打法」—— 语义：**不是**许不许用币（币由游戏结算、脚本照常点复活），
     而是危机时按哪种心态选落点：搏一把（手里有币 → 敢堆高换空间）or 保守（当没退路）。 */
  const segRevive = segment('复活币打法', [{ label: '搏一把', value: 'aggressive' }, { label: '保守', value: 'conservative' }],
    () => opts.reviveStyle || 'aggressive', (v) => { opts.reviveStyle = v; });
  const segStrength = segment('搜索', Object.keys(STRENGTH).map(k => ({ label: STRENGTH[k].label, value: k })),
    () => bot.strength || 'normal', (v) => { bot.strength = v; Object.assign(opts.think, STRENGTH[v]); });
  const segTiming = segment('投掷时机', [{ label: '自动', value: 'auto' }, { label: '立刻', value: 'now' }, { label: '等稳', value: 'settle' }],
    () => opts.think.timing, (v) => { opts.think.timing = v; });

  /* ---- 动作 ---- */
  const actions = el('div', 'ni-actions');
  const btnPause = el('button', 'ni-primary', '暂停');
  btnPause.onclick = (ev) => { ev.stopPropagation(); bot.setPaused(!bot.paused); refresh(); };
  const btnNew = el('button', null, '重开一局');
  btnNew.onclick = (ev) => { ev.stopPropagation(); bot.restartGame(); refresh(); };
  const btnOff = el('button', 'ni-danger', '关闭脚本');
  btnOff.onclick = (ev) => { ev.stopPropagation(); bot.stop('manual'); };
  actions.append(btnPause, btnNew, btnOff);

  const tip = el('div', 'ni-tip', '拖动胶囊可换位置 · 点一下就展开/收起');
  panel.append(rowStat, rowInfo, segMode.row, segStrength.row, segTiming.row, segBoard.row, segRevive.row, actions, tip);
  root.append(pill, panel);
  document.body.appendChild(root);

  /* ---- 拖动 + 展开 ---- */
  const saved = (() => { try { return JSON.parse(localStorage.getItem('danaiwa.bot.pos') || 'null'); } catch { return null; } })();
  let px = saved && Number.isFinite(saved.x) ? saved.x : null;
  let py = saved && Number.isFinite(saved.y) ? saved.y : 10;
  if (px === null) px = Math.max(10, window.innerWidth / 2 - 90);
  const place = () => { root.style.left = px + 'px'; root.style.top = py + 'px'; };
  place();

  let dragging = false, moved = 0, sx = 0, sy = 0;
  pill.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; sx = e.clientX - px; sy = e.clientY - py;
    pill.setPointerCapture && pill.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const nx = e.clientX - sx, ny = e.clientY - sy;
    moved = Math.max(moved, Math.abs(nx - px) + Math.abs(ny - py));
    px = Math.max(4, Math.min(window.innerWidth - 60, nx));
    py = Math.max(4, Math.min(window.innerHeight - 30, ny));
    place();
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 4) root.classList.toggle('ni-open');
    try { localStorage.setItem('danaiwa.bot.pos', JSON.stringify({ x: px, y: py })); } catch { }
  });

  /* ---- 刷新 ---- */
  let lastTick = 0;
  function refresh(force) {
    const t = performance.now();
    if (!force && t - lastTick < 120) return;
    lastTick = t;
    const st = bot.stats, S = bot.S;
    if (!S) return;
    scoreEl.textContent = S.score;
    const thinking = !!bot.inflight;
    const paused = bot.paused;
    const waiting = st.status === 'waiting-restart';
    root.classList.toggle('ni-thinking', thinking && !paused);
    root.classList.toggle('ni-paused', paused);
    root.classList.toggle('ni-wait', waiting);
    subEl.textContent = paused ? '已暂停' : waiting ? '等重开' : thinking ? '思考中' : `${st.drops} 手`;
    statVal.textContent = paused ? '暂停' : waiting ? '本局结束，等你重开' : thinking ? 'Worker 推演中' : '对局进行中';
    infoVal.textContent =
      `决策 ${st.lastPlanMs}ms / 均 ${st.planN ? (st.planMs / st.planN).toFixed(0) : 0}ms　候选 ${st.lastCand || '—'}\n` +
      `时机 ${(opts.think.holdForQuiet === false || opts.think.timing === 'now') ? '立刻出手' : '等盘面安静'}${st.holdFrames ? '（本手已等 ' + st.holdFrames + ' 帧）' : ''}　复活币 ${st.revivesLeft ?? 0}\n` +
      `最高分 ${st.bestScore ?? S.best ?? 0}　本局最大 ${st.maxTier ? (bot.fruitName(st.maxTier)) : '—'}\n` +
      `推演并行 ${st.workerCount || 1}x　${st.usingWorker ? 'Worker 线程' : '主线程'}`;
    btnPause.textContent = paused ? '继续' : '暂停';
    for (const s of [segMode, segBoard, segRevive, segStrength, segTiming]) s.sync();
  }
  bot.hud = { refresh, root };

  return { root, refresh, destroy: () => { root.remove(); style.remove(); } };
}



return { STRENGTH, createIsland };
})();

MODS['bot'] = (function () {
/* ============================================================================
 *  bot.js —— 浏览器里让 AI 自动打「合成大奶娃」
 *
 *  架构（v3）：
 *
 *    主线程                                   Worker 线程
 *    ─────────────────────────────            ────────────────────────────
 *    自己驱动游戏时钟（与原版主循环等价）       收到盘面快照
 *      rAF 每帧：update(1/60) + render          重建世界（移植物理引擎）
 *      每帧：该出手了吗 / 要不要发起决策        搜落点 + 同时决定「投掷时机」
 *    需要决策 → 发快照 ────────────────────▶   推演 40+ 个候选落点
 *    ◀──────────────────── 回传 {x, delayFrames}
 *    到点就派发一次真实 pointerdown 出手
 *
 *  v3 相对 v2 的变化：
 *    · 灵动岛控制台（可拖动/折叠）：暂停、实时/快进、排行榜开关、自动复活、搜索强度
 *    · 一局结束后不再「整个脚本停掉」—— 你点重开，它自动接着打
 *    · 关闭脚本时把游戏交还给你（用等价的主循环继续驱动，页面照常能玩）
 * ========================================================================== */

const E = MODS['engine'];
const P = MODS['planner'];
const { createIsland, STRENGTH } = MODS['hud'];

const DEFAULTS = {
  mode: 'realtime',        // 'realtime'（跟着游戏节奏）| 'turbo'（快进刷分）
  sliceMs: 24,             // turbo 每片最多跑多久，让出主线程
  renderEvery: 6,          // turbo 每多少物理帧重绘一次
  autoRevive: true,        // 判负时自动点复活（币由游戏结算，脚本只是替玩家点）
  /* 复活币打法（用户明确的需求，2026-10-14 重定义）：
       这个开关**不是**「许不许用币」—— 币在游戏里是自动消耗的。
       aggressive（搏一把）：手里有币 → 危机时敢用激进打法，推演里允许用币续命
                             （风险项按 riskScaleWithRevive=0.45 打折）
       conservative（保守）  ：推演里不许用币续命（越线=直接判死），风险项不打折 ——
                             危机时按「没有退路」来选落点 */
  reviveStyle: 'aggressive',
  blockLeaderboard: true,  // 拦截成绩自动提交
  seed: null,              // 给定 seed → 可复现随机数（turbo 刷分用）
  verbose: false,
  hud: true,               // 灵动岛
  useWorker: true,
  workers: 0,              // 推演用几个 Worker（0 = 自动：min(12, 核数-4)）
  think: {
    step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true,
    innerTop: 4,
    nextMode: 'known',     // 下一颗水果是已知的(state.next) → 当成两手连手棋来算
    budgetMs: 6000,
    timing: 'auto',        // 'auto' | 'now'（立刻丢）| 'settle'（等安静）—— 现在真的生效了
    holdForQuiet: true,    // 决策前先等盘面安静（实测 +2.5%，见 README 第十三节）
    quietSpeed: 60,        // 「安静」的判定：最大速度 <= 它
    maxWaitFrames: 180,    // 最多等 3 秒游戏时间
    waitPenaltyPerFrame: 0.02,
  },
};

const FIXED = E.CFG.FIXED;
const PREFS_KEY = 'danaiwa.bot.prefs.v1';

function createBot(userOpts = {}) {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } })();
  const opts = {
    ...DEFAULTS, ...prefs, ...userOpts,
    think: { ...DEFAULTS.think, ...(prefs.think || {}), ...(userOpts.think || {}) },
  };

  const bot = {
    opts,
    running: false,        // 驱动循环在跑
    aiEnabled: true,       // AI 是否在决策/出手
    paused: false,         // 暂停（连游戏一起冻住）
    driverMode: null,      // 'realtime' | 'turbo'
    strength: prefs.strength || 'normal',
    DNW: null,
    S: null,
    worker: null,
    frame: 0,
    plan: null,
    inflight: null,
    reqId: 0,
    overHandled: false,
    awaitingRestart: false,
    island: null,
    log: [],
    stats: {
      games: [], drops: 0, planMs: 0, planN: 0, lastPlanMs: 0, lastCand: null,
      lastChoice: null, lastDelayFrames: 0, lastValue: null,
      simFrames: 0, maxTier: 0, revivesUsed: 0, blockedSubmits: 0, revivesLeft: 0,
      bestScore: 0, startedAt: 0, elapsed: 0, status: 'idle', error: null,
      workerReady: false, usingWorker: false, workerCount: 0,
      holdFrames: 0,
      choices: { now: 0, settle: 0, quiet: 0 },
      gameStart: { drop: 0, plan: 0, planN: 0, revive: 0 },
    },
  };

  bot.fruitName = (t) => (E.FRUITS[t] ? E.FRUITS[t].name : String(t));
  bot.savePrefs = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        mode: opts.mode, blockLeaderboard: opts.blockLeaderboard, autoRevive: opts.autoRevive,
        reviveStyle: opts.reviveStyle, strength: bot.strength, think: opts.think,
      }));
    } catch { }
  };

  function say(...a) {
    const line = a.join(' ');
    bot.log.push(line);
    if (bot.log.length > 400) bot.log.shift();
    if (opts.verbose) console.log('[bot]', line);
  }

  /* ------------------------------------------------------------ 排行榜拦截 */
  function hookBoard() {
    const b = window.DanaiwaBoard;
    if (!b || typeof b.onGameOver !== 'function') return !!b;
    if (b.__naiwaOwner === bot) return true;
    /* 反复注入新实例时，旧实例留下的钩子必须被接管 ——
       否则开关会切到已经死掉的那个 bot 对象上（踩过这个坑） */
    const orig = b.__naiwaOrig || b.onGameOver;
    b.__naiwaOrig = orig;
    b.onGameOver = function (score) {
      const live = b.__naiwaOwner;
      if (live) {
        live.stats.lastScore = score;
        if (live.opts.blockLeaderboard) {
          live.stats.blockedSubmits++;
          live.say('拦下成绩自动提交（灵动岛里可改成「允许上榜」）：', score);
          return;
        }
      }
      return orig.apply(this, arguments);
    };
    b.__naiwaOwner = bot;
    return true;
  }

  /* ------------------------------------------------------------- Worker 池 --
   * 每个阶段的候选落点互相独立，切片丢给多个 Worker 各算各的，合并时按原顺序拼接
   * —— 数值与单线程逐位一致（tools/verify-parallel.mjs 守这条线），只是快了好几倍。
   */
  let pool = [];
  const waiters = new Map();     // id → resolve
  let nextId = 1;

  function ask(worker, msg) {
    const id = nextId++;
    msg.id = id;
    return new Promise((resolve, reject) => {
      waiters.set(id, { resolve, reject, t0: performance.now() });
      worker.postMessage(msg);
      setTimeout(() => {
        const w = waiters.get(id);
        if (w) { waiters.delete(id); reject(new Error('worker 超时：' + msg.type)); }
      }, 60000);
    });
  }

  function onWorkerMessage(e) {
    const m = e.data || {};
    if (m.type === 'ready') { bot.stats.workerReady = true; return; }
    const w = waiters.get(m.id);
    if (!w) return;
    waiters.delete(m.id);
    if (m.ok === false) { say('Worker 报错：', m.error); bot.stats.error = m.error; w.reject(new Error(m.error)); return; }
    w.resolve(m);
  }

  function startWorkers() {
    if (!opts.useWorker || typeof Worker === 'undefined' || typeof Blob === 'undefined') return false;
    if (typeof WORKER_SOURCE !== 'string') return false;
    const hw = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    /* 默认 min(12, 核数-4)。实测（tools/bench-workers.mjs，24 逻辑核）：
       normal 档 6→8→12 个 Worker 的决策耗时 387→264→223 ms；deep 档 6→10→12 为 745→475→406 ms，
       16 个反而回升（调度与消息开销），所以封顶 12；留 4 个核给页面与游戏本体。 */
    const want = opts.workers > 0 ? opts.workers : Math.max(1, Math.min(12, hw - 4));
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'application/javascript' }));
      const shapes = window.SUIKA_PARTS || (window.NaiwaBot && window.NaiwaBot.EMBEDDED_SHAPES) || null;
      for (let i = 0; i < want; i++) {
        const w = new Worker(url);
        w.onmessage = onWorkerMessage;
        w.onerror = (e) => say('Worker onerror：', (e && e.message) || e);
        w.postMessage({ type: 'init', shapes });
        pool.push(w);
      }
      bot.stats.usingWorker = true;
      bot.stats.workerCount = pool.length;
      say(`Worker 池就绪：${pool.length} 个（推演并行度 ${pool.length}x）`);
      return true;
    } catch (e) {
      say('Worker 起不来，退回同步推演：', String(e));
      pool = [];
      return false;
    }
  }

  /* 分片执行器：把一个阶段的候选落点摊到池里的每个 Worker 上 */
  function makeExec(state, thinkOpts) {
    const n = pool.length;
    return async (stage, xs) => {
      if (n <= 1 || xs.length <= 2) {
        const r = await ask(pool[0], { type: 'stage', stage, state, opts: thinkOpts, xs });
        return r.results;
      }
      const chunks = [];
      const per = Math.ceil(xs.length / n);
      for (let i = 0; i < xs.length; i += per) chunks.push(xs.slice(i, i + per));
      const parts = await Promise.all(chunks.map((c, i) => ask(pool[i], { type: 'stage', stage, state, opts: thinkOpts, xs: c })));
      /* 注意：ask() 返回的是整条消息，结果在 .results 里（这里曾经漏取，导致多 Worker 直接崩） */
      const merged = [];
      for (const p of parts) for (const r of p.results) merged.push(r);
      return merged;
    };
  }

  function solveInline(snap, thinkOpts) {
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, snap, null, snap.nowMs);
    const t0 = performance.now();
    const dec = P.plan(w, thinkOpts || opts.think);
    return {
      x: dec.x, value: dec.value, delayFrames: dec.delayFrames || 0,
      choice: dec.choice || 'now', candCount: dec.candCount,
      computeMs: performance.now() - t0,
    };
  }

  /* ------------------------------------------------------------- 出手 ----- */
  function dropAt(x) {
    const S = bot.S;
    const canvas = document.getElementById('game');
    const stage = document.getElementById('stage');
    if (!canvas || !stage) return false;
    const rect = canvas.getBoundingClientRect();
    const ev = new PointerEvent('pointerdown', {
      clientX: rect.left + (x / E.CFG.W) * rect.width,
      clientY: rect.top + rect.height * 0.35,
      bubbles: true, cancelable: true,
      pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1,
    });
    stage.dispatchEvent(ev);
    if (S.ready) { S.aimX = x; bot.DNW.tryDrop(); }
    return !S.ready;
  }

  function tryRevive() {
    const S = bot.S;
    const btn = document.getElementById('reviveBtn');
    if (btn && !btn.hidden && btn.offsetParent !== null) { btn.click(); return true; }
    if (S.revives > 0) return bot.DNW.revive() === true;
    return false;
  }

  /* ------------------------------------------------------- 决策请求/应用 -- */
  bot.avgPlanMs = () => (bot.stats.planN ? bot.stats.planMs / bot.stats.planN : 0);

  async function runPlan(snap, thinkOpts) {
    let state = snap;
    /* 实时模式下 Worker 思考时游戏还在跑：先把盘面推到「这一手真正落下」的那一刻 */
    if (thinkOpts.latencyFrames > 0 && pool.length) {
      const adv = await ask(pool[0], { type: 'advance', state, frames: thinkOpts.latencyFrames });
      if (adv && adv.state) state = adv.state;
    }
    if (!pool.length) return solveInline(state, thinkOpts);
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, state, null, state.nowMs);
    return await P.planParallel(w, thinkOpts, makeExec(state, thinkOpts));
  }

  /* 把「复活币打法」翻译成 planner 的两个开关（见 DEFAULTS.reviveStyle 的说明）：
       aggressive —— 推演里允许用币续命 + 风险项打折（敢在危机时搏一手）
       conservative —— 推演里不许用币续命（越线即判死）+ 风险项不打折（按没退路来选）
     ⚠️ 两者都会在真的判负时自动点复活（币是游戏结算的，打法开关不管这个）。 */
  function thinkWithStyle(base) {
    const conservative = opts.reviveStyle === 'conservative';
    const t = { ...base, allowRevive: !conservative };
    if (conservative) {
      t.weights = { ...(base.weights || {}), riskScaleWithRevive: 1.0 };
    }
    return t;
  }

  function requestPlan() {
    const S = bot.S;
    if (bot.inflight || !S.ready || S.over || !bot.aiEnabled) return;
    const id = ++bot.reqId;
    const snap = E.snapshotOf(S, performance.now());
    bot.inflight = { id, frame: bot.frame, t0: performance.now(), wall: performance.now() };
    const thinkOpts = thinkWithStyle(bot.driverMode === 'realtime'
      ? { ...opts.think, latencyFrames: Math.round(bot.avgPlanMs() / 1000 * 60) }
      : opts.think);
    runPlan(snap, thinkOpts).then(
      (dec) => onPlanResult(id, dec),
      (err) => {
        if (bot.inflight && bot.inflight.id === id) bot.inflight = null;
        say('决策失败：', String(err && err.message || err));
        bot.stats.error = String(err && err.message || err);
      },
    );
  }

  function onPlanResult(id, result) {
    const inf = bot.inflight;
    if (!inf || inf.id !== id) return;
    bot.inflight = null;
    const wallMs = performance.now() - inf.t0;
    bot.stats.planMs += wallMs; bot.stats.planN++;
    bot.stats.lastPlanMs = Math.round(wallMs);
    bot.stats.lastChoice = result.choice;
    bot.stats.lastDelayFrames = result.delayFrames;
    bot.stats.lastValue = result.value;
    bot.stats.lastCand = result.candCount;
    const c = bot.stats.choices;
    if (result.choice === 'settle') c.settle++;
    else if (result.choice === 'quiet') c.quiet++;
    else c.now++;
    const delayFrames = Math.max(0, result.delayFrames | 0);
    bot.plan = {
      x: result.x,
      /* 两种驱动方式各用各的坐标系：
         实时模式走墙钟（游戏自己按 rAF 跑，1 帧 ≈ 16.7ms）
         快进模式走帧号（时钟由我们自己推） */
      dropAtMs: inf.wall + delayFrames * (1000 / 60),
      dropFrame: inf.frame + delayFrames,
      value: result.value, choice: result.choice,
      delayFrames, snapFrame: inf.frame,
    };
  }

  /* ------------------------------------------------------------------------
   * 「等盘面安静再出手」——投掷时机（2026-10-14 修复）
   *
   * 背景：README 第九节 9.3-1 记过这个缺口 —— 时机比较只写在 planner.plan() 里，
   * 而浏览器走的是 planParallel()，那条路径没有时机逻辑，所以「投掷时机」开关
   * 一直是摆设（实测 185/185、292/292 全部记为「立刻」）。
   *
   * 现在改成在**驱动层**等待：盘面还在动就先不决策，等它安静下来（最多等
   * maxWaitFrames 帧 ≈ 3 秒游戏时间）再拍板。为什么不是 planner 里「算两遍比较」：
   *   · 算两遍要付一次完整推演，而「先等再算」只付一次；
   *   · 实测（tools/judge.mjs，live 协议 = 逐帧对齐浏览器 turbo）：
   *     等安静在两组独立种子上都是 +2.5%（32 个配对种子，见 README 第十三节）。
   * 快进模式下等待几乎不花墙钟时间 —— 每手真正花时间的是 Worker 思考（~250ms），
   * 而等待只是多推 40 来个物理帧（< 10ms）。
   *
   * 例外：已经压线（state.danger）就不等 —— 这时候任何拖延都可能直接判负。
   * ------------------------------------------------------------------------ */
  let holdFrames = 0, holdStart = 0;

  function shouldHoldForQuiet() {
    const th = opts.think;
    if (th.holdForQuiet === false || th.timing === 'now' || bot.driverMode === 'passive') return false;
    const S = bot.S;
    if (!S || S.over || S.danger) { holdFrames = 0; holdStart = 0; return false; }
    const quietSpeed = th.quietSpeed ?? 60;
    const maxWaitMs = (th.maxWaitFrames ?? 180) * (1000 / 60);
    if (maxSpeedOfGame() <= quietSpeed) { holdFrames = 0; holdStart = 0; return false; }
    if (!holdStart) holdStart = performance.now();
    holdFrames++;
    const waitedMs = (bot.driverMode === 'turbo') ? holdFrames * (1000 / 60) : (performance.now() - holdStart);
    if (waitedMs >= maxWaitMs) { holdFrames = 0; holdStart = 0; return false; }   // 等不到就照常出手
    return true;
  }
  function clearHold() { holdFrames = 0; holdStart = 0; }

  function planLifecycle() {
    const S = bot.S;
    if (S.over || !bot.aiEnabled) return;
    if (bot.plan && bot.frame >= bot.plan.dropFrame && S.ready) {
      const p = bot.plan;
      bot.plan = null;
      clearHold();
      if (dropAt(p.x)) {
        bot.stats.drops++;
        if (opts.verbose) say(`#${bot.stats.drops} x=${p.x.toFixed(1)} 时机=${p.choice} 决策${bot.stats.lastPlanMs}ms 分数${S.score}`);
      }
    }
    if (!bot.plan && !bot.inflight && S.ready) {
      if (shouldHoldForQuiet()) { bot.stats.holdFrames = holdFrames; return; }
      bot.stats.holdFrames = 0;
      requestPlan();
    }
  }

  /* -------------------------------------------------------- 局面/生命期 --- */
  function trackStats() {
    const S = bot.S;
    for (const b of S.balls) if (b.tier > bot.stats.maxTier) bot.stats.maxTier = b.tier;
    bot.stats.revivesLeft = S.revives;
    if (S.score > bot.stats.bestScore) bot.stats.bestScore = S.score;
  }

  function maxSpeedOfGame() {
    let m = 0;
    for (const b of bot.S.balls) {
      const v = b.vx * b.vx + b.vy * b.vy;
      if (v > m) m = v;
    }
    return Math.sqrt(m);
  }

  function beginNewGame(reason) {
    const st = bot.stats;
    bot.plan = null; bot.inflight = null;
    clearHold();
    bot.overHandled = false; bot.awaitingRestart = false;
    st.gameStart = { drop: st.drops, plan: st.planMs, planN: st.planN, revive: st.revivesUsed };
    st.maxTier = 0;
    st.status = 'running';
    say('新的一局开始（' + reason + '），接着打');
  }

  function finishGame(reason) {
    const S = bot.S, st = bot.stats, g0 = st.gameStart;
    const g = {
      score: S.score,
      drops: st.drops - g0.drop,
      maxTier: st.maxTier,
      revivesUsed: st.revivesUsed - g0.revive,
      planMsAvg: (st.planN - g0.planN) ? (st.planMs - g0.plan) / (st.planN - g0.planN) : 0,
      reason,
    };
    st.games.push(g);
    st.lastScore = g.score;
    st.status = 'waiting-restart';       // 不停止：等用户重开，脚本自动续打
    bot.awaitingRestart = true;
    say(`本局结束：${g.score} 分，${g.drops} 次投放，最大 ${bot.fruitName(g.maxTier)}，平均决策 ${g.planMsAvg.toFixed(0)}ms`);

    hookBoard();
    if (bot.DNW && typeof bot.DNW.settle === 'function') bot.DNW.settle();
  }

  function handleOver() {
    const S = bot.S;
    hookBoard();
    /* 判负就点复活 —— 这与 reviveStyle（打法）无关：币是游戏结算的，
       不用白不用；reviveStyle 只决定「危机时按不按有退路来选落点」。 */
    if (opts.autoRevive !== false && S.revives > 0) {
      if (tryRevive()) {
        bot.stats.revivesUsed++;
        bot.overHandled = false;         // 复活成功 → 继续打
        say('用了一枚复活币（还剩 ' + S.revives + '）');
        return;
      }
    }
    finishGame('game-over');
  }

  /* 处理「结束 → 重开」「中途手动重开」两种情况 */
  function checkGameState() {
    const S = bot.S, st = bot.stats;
    if (S.over) {
      if (!bot.overHandled) { bot.overHandled = true; handleOver(); }
      return;
    }
    if (bot.awaitingRestart) { beginNewGame('重开'); return; }
    if (bot.overHandled) { bot.overHandled = false; return; }   // 复活回到对局
    if (S.balls.length === 0 && S.score === 0 && (st.drops - st.gameStart.drop) > 0) {
      beginNewGame('中途重开');
    }
  }

  /* ------------------------------------------------------------ 主循环 ---- */
  let last = 0, acc = 0;

  function stepFrame() {
    bot.frame++;
    bot.DNW.update(FIXED);
    bot.stats.simFrames++;
    checkGameState();
    planLifecycle();
    trackStats();
  }

  /* 实时模式：完全不碰页面时钟。游戏自己按 rAF 跑，我们只是「每隔几十毫秒看一眼」：
     该出手就出手，该想就想 —— 想的过程在 Worker 里，主线程一点都不卡。 */
  function realtimeTick() {
    if (!bot.running || bot.driverMode !== 'realtime') return;
    const S = bot.S, nowMs = performance.now();
    checkGameState();
    if (bot.aiEnabled && !S.over && !bot.paused) {
      if (bot.plan && nowMs >= bot.plan.dropAtMs && S.ready) {
        const p = bot.plan;
        bot.plan = null;
        clearHold();
        if (dropAt(p.x)) {
          bot.stats.drops++;
          if (opts.verbose) say(`#${bot.stats.drops} x=${p.x.toFixed(1)} 时机=${p.choice} 决策${bot.stats.lastPlanMs}ms 分数${S.score}`);
        }
      }
      if (!bot.plan && !bot.inflight && S.ready) {
        if (shouldHoldForQuiet()) { bot.stats.holdFrames = holdFrames; }
        else { bot.stats.holdFrames = 0; requestPlan(); }
      }
    }
    trackStats();
    if (bot.island) bot.island.refresh();
  }

  function turboSlice() {
    if (!bot.running || bot.driverMode !== 'turbo') return;
    const deadline = performance.now() + opts.sliceMs;
    while (performance.now() < deadline) {
      if (bot.paused) break;
      if (bot.inflight) break;            // 等 Worker：一帧都不多跑，保证计划不过期
      stepFrame();
      if (bot.stats.simFrames % opts.renderEvery === 0) bot.DNW.render(FIXED);
    }
    if (bot.island) bot.island.refresh();
    if (!bot.running || bot.driverMode !== 'turbo') return;
    setTimeout(turboSlice, (bot.inflight || bot.paused) ? 8 : 0);
  }

  /* ------------------------------------------------------------- rAF ------
   * 游戏自己的主循环是一串「自我续排」的 requestAnimationFrame：
   *     function frame(now) { …update/render…; requestAnimationFrame(frame); }
   * 快进（turbo）要接管页面时钟，做法就是把这个函数换成不排队的空函数
   * —— 于是游戏的主循环在下一次回调之后就**断掉了**。
   *
   * 用户实测的 bug：从快进切回实时，只把 requestAnimationFrame 还原**不够**，
   * 那条链已经断了 —— 冷却不再递减、水果不再下落、S.ready 永远是 false，
   * 于是 bot 再也出不了手，看起来就是「切回实时直接卡死」。
   * 现在的做法：
   *   ① 劫持期间把所有排队的回调记下来（游戏主循环的下一环就在里面）；
   *   ② 切回来时把它们重新排上，等于把链接回游戏自己手里；
   *   ③ 万一一个都没记到（页面主循环本来就停着），退化成我们自己的等价主循环，
   *      照样不会冻住。
   * ------------------------------------------------------------------------ */
  let ownLoop = false;              // 我们自己替游戏推帧

  function hijackRaf() {
    if (bot._rafDisabled) return;
    bot._rafCaptured = [];
    window.requestAnimationFrame = function (cb) {
      if (typeof cb === 'function') bot._rafCaptured.push(cb);
      return 0;
    };
    bot._rafDisabled = true;
  }
  /* 返回「接回了几个回调」；0 = 没得接 */
  function unhijackRaf() {
    if (!bot._rafDisabled) return 0;
    window.requestAnimationFrame = bot._rafOrig;
    bot._rafDisabled = false;
    const pend = bot._rafCaptured || [];
    bot._rafCaptured = [];
    let resumed = 0;
    for (const cb of pend) { try { bot._rafOrig(cb); resumed++; } catch (e) { } }
    if (resumed) say('已把游戏自己的主循环接回（' + resumed + ' 个回调）');
    else startOwnLoop();
    return resumed;
  }

  /* 等价主循环：和 game.js 的 frame() 一样按墙钟累加、固定步长推物理 */
  function passiveFrame(t) {
    if (!bot.running || !ownLoop) return;
    if (!last) last = t;
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard < 5) { bot.DNW.update(FIXED); acc -= FIXED; guard++; }
    if (guard >= 5) acc = 0;
    bot.DNW.render(dt);
    bot._raf = bot._rafOrig(passiveFrame);
  }
  function startOwnLoop() {
    if (ownLoop || !bot.running) return;
    if (!bot._rafOrig) bot._rafOrig = window.requestAnimationFrame.bind(window);
    ownLoop = true; last = 0; acc = 0;
    bot._raf = bot._rafOrig(passiveFrame);
    say('页面主循环没在跑 → 由 bot 用等价主循环接管推帧');
  }
  function stopOwnLoop() {
    ownLoop = false;
    if (bot._raf != null && typeof cancelAnimationFrame === 'function') { try { cancelAnimationFrame(bot._raf); } catch (e) { } }
    bot._raf = null;
  }

  function startDriver(mode) {
    bot.driverMode = mode;
    last = 0; acc = 0;
    if (mode === 'turbo') setTimeout(turboSlice, 30);
    else if (mode === 'passive') startOwnLoop();
    else bot._timer = setInterval(realtimeTick, 30);
  }
  function stopDriver() {
    if (bot._timer) { clearInterval(bot._timer); bot._timer = null; }
    bot.driverMode = null;
  }

  /* ------------------------------------------------------------------------
   * 原地基准：用当前盘面跑一次完整决策，不落子、不影响对局。
   * 用于验证「并行 N 路 = 单路结果、但快 N 倍」。
   * ---------------------------------------------------------------------- */
  bot.benchDecision = async function (think = opts.think, n = null) {
    const want = n == null ? Math.max(1, pool.length) : Math.max(1, n | 0);
    const oldPool = pool;
    const oldWorkers = opts.workers;
    if (want !== oldPool.length) {
      for (const w of oldPool) { try { w.terminate(); } catch { } }
      pool = []; opts.workers = want;
      startWorkers();
      await new Promise(r => setTimeout(r, 150));       // 等池子热起来
    }
    const snap = E.snapshotOf(bot.S, performance.now());
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, snap, null, snap.nowMs);
    const t0 = performance.now();
    const dec = await P.planParallel(w, { ...think, latencyFrames: 0 }, makeExec(snap, think));
    const ms = performance.now() - t0;

    if (want !== oldPool.length) {                       // 还原原来的池子
      for (const x of pool) { try { x.terminate(); } catch { } }
      pool = []; opts.workers = oldWorkers;
      if (oldPool.length) {
        for (const x of oldPool) { try { x.terminate(); } catch { } }
        startWorkers();
      }
    }
    return { x: dec.x, value: dec.value, candCount: dec.candCount, ms: Math.round(ms), workers: want };
  };

  /* ---------------------------------------------------------- 对外控制 ---- */
  bot.setPaused = (v) => { bot.paused = !!v; say(v ? '暂停' : '继续'); return bot; };
  bot.setMode = (m) => {
    if (opts.mode === m && bot.driverMode === m) return bot;
    opts.mode = m;
    if (bot.running) {
      stopDriver();
      if (m === 'turbo') {
        stopOwnLoop();               // 快进由 bot 自己推帧，别两边一起推
        hijackRaf();
      } else if (m === 'passive') {
        if (bot._rafDisabled) unhijackRaf();
        startOwnLoop();
      } else {
        /* 实时：必须把游戏自己的主循环接回来（用户报的「切回实时卡死」就在这一步），
           接不回来时 unhijackRaf() 内部会退化成我们自己推帧，同样不会冻住 */
        unhijackRaf();
      }
      startDriver(m);
    }
    say('模式切换为 ' + m);
    bot.savePrefs();
    return bot;
  };
  bot.restartGame = () => {
    bot.plan = null; bot.inflight = null;
    bot.overHandled = false; bot.awaitingRestart = false;
    bot.DNW.reset();
    beginNewGame('手动重开');
    return bot;
  };

  /* ------------------------------------------------------------ 生命周期 -- */
  function start() {
    if (bot.running) return bot;
    bot.DNW = window.__DNW__;
    if (!bot.DNW) { say('没找到 window.__DNW__'); bot.stats.status = 'error'; return bot; }
    bot.S = bot.DNW.state;

    if (opts.seed != null) {
      const orig = Math.random;
      Math.random = P.mulberry32(opts.seed);
      bot.stats.restoreRandom = () => { Math.random = orig; };
      say('Math.random 换成可复现随机数 seed=' + opts.seed);
    }
    E.setShapes(window.SUIKA_PARTS || (window.NaiwaBot && window.NaiwaBot.EMBEDDED_SHAPES));
    if (STRENGTH[bot.strength]) {
      const { label, ...preset } = STRENGTH[bot.strength];
      Object.assign(opts.think, preset);
    }
    hookBoard();
    startWorkers();

    if (!bot._rafOrig) bot._rafOrig = window.requestAnimationFrame.bind(window);
    /* 只有快进模式才接管页面时钟（让原版主循环自然停掉，否则一帧会走两遍物理）；
       实时模式完全不碰它 —— 页面上的其它脚本照常跑。 */
    if (opts.mode === 'turbo') hijackRaf();

    bot.running = true;
    bot.aiEnabled = true;
    bot.paused = false;
    /* 如果注入时这局已经结束了（比如上一局刚打完），
       就当作「等重开」，不要记一次 0 投放的假成绩 */
    if (bot.S.over) { bot.overHandled = true; bot.awaitingRestart = true; bot.stats.status = 'waiting-restart'; }
    else bot.stats.status = 'running';
    bot.stats.startedAt = Date.now();
    bot.stats.maxTier = 0;
    bot.stats.gameStart = { drop: bot.stats.drops, plan: bot.stats.planMs, planN: bot.stats.planN, revive: bot.stats.revivesUsed };
    bot.island = createIsland(bot);
    startDriver(opts.mode);
    say(`启动：mode=${opts.mode} worker=${bot.stats.usingWorker} 强度=${bot.strength}`);
    return bot;
  }

  /* 关闭脚本 ≠ 关掉游戏：AI 停手，但用等价的主循环继续驱动，页面照常能玩 */
  function stop(reason = 'manual') {
    bot.aiEnabled = false;
    bot.stats.status = reason === 'done' ? 'done' : 'stopped';
    bot.stats.elapsed = (Date.now() - bot.stats.startedAt) / 1000;
    if (bot.island) { bot.island.destroy(); bot.island = null; }
    for (const w of pool) { try { w.terminate(); } catch { } }
    pool = [];
    /* 快进模式是我们把游戏主循环停掉的：关掉 AI 后必须继续驱动它，
       否则游戏会永远冻住。实时模式则什么都不用做（游戏本来就是自己在跑）。 */
    if (bot.running && bot.driverMode === 'turbo') {
      stopDriver();
      /* 把游戏自己的主循环接回去；接不回来（本来就停着）才用等价主循环自己推帧 */
      if (unhijackRaf() === 0) startDriver('passive');
      else startDriver('realtime');
    } else if (bot.running) {
      stopDriver();
      startDriver('realtime');
    }
    say('AI 已停止，游戏交回给你（页面照常可玩）');
    if (bot.onFinish) try { bot.onFinish(bot.stats); } catch { }
    return bot;
  }

  bot.start = start;
  bot.stop = stop;
  bot.say = say;
  bot.frameNow = () => bot.frame;
  return bot;
}

/* 一行启动：window.NaiwaBot.run({...}) */
function run(opts = {}) {
  const prev = window.__NAIWA_BOT__;
  if (prev && prev.running && prev.aiEnabled) {
    console.warn('[合成大奶娃 bot] 已经有一个在跑了，先 window.__NAIWA_BOT__.stop() 再开新的');
    return prev;
  }
  if (prev && prev.running) prev.stop('replaced');   // 之前 stop 过的实例，顺手收掉
  const bot = createBot(opts);
  window.__NAIWA_BOT__ = bot;
  bot.start();
  return bot;
}

return { createBot, run };
})();

window.NaiwaBot = { engine: MODS['engine'], planner: MODS['planner'], hud: MODS['hud'],
                    createBot: MODS['bot'].createBot, run: MODS['bot'].run, EMBEDDED_SHAPES };
console.log('%c[合成大奶娃 bot] 已装载 —— window.NaiwaBot.run({mode:"realtime"}) 开始',
  'color:#e91e63;font-weight:bold');
})();

/* 想直接开打就打开下面这行： */
// window.NaiwaBot.run({ mode: 'realtime' });

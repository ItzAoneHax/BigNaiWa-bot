(function () {
'use strict';
const MODS = {};
const EMBEDDED_SHAPES = [{"parts":[[-0.004,0.064,0.853],[-0.038,-0.79,0.217],[0.178,-0.773,0.199],[-0.259,-0.752,0.178],[-0.403,0.819,0.17],[0.395,0.819,0.169],[0.369,-0.705,0.136],[-0.425,-0.679,0.117],[0.238,0.883,0.106],[-0.246,0.887,0.106],[0.488,-0.637,0.088],[-0.14,0.909,0.085],[0.119,0.909,0.081],[0.539,0.722,0.081],[-0.522,-0.616,0.078],[-0.055,0.917,0.076]],"rb":1.083},{"parts":[[0,0.166,0.695],[-0.004,-0.531,0.412],[-0.306,0.79,0.2],[0.297,0.794,0.2],[0.14,-0.917,0.078],[-0.136,-0.921,0.076],[-0.688,0.267,0.074],[0.684,0.301,0.072],[0.212,-0.883,0.066],[0.055,-0.938,0.064],[-0.696,0.183,0.064],[-0.208,-0.892,0.06],[-0.047,-0.943,0.059],[0.692,0.229,0.059],[-0.675,0.344,0.058],[0.391,-0.412,0.055]],"rb":1.047},{"parts":[[-0.098,0.276,0.599],[-0.115,-0.323,0.369],[0.306,-0.705,0.282],[-0.535,-0.705,0.28],[-0.382,0.807,0.185],[0.174,0.811,0.183],[-0.633,-0.004,0.142],[-0.726,-0.115,0.129],[0.501,0.238,0.112],[0.594,0.306,0.08],[-0.531,0.692,0.064],[0.025,-0.667,0.061],[-0.582,0.628,0.06],[-0.467,-0.195,0.059],[-0.255,-0.667,0.055],[-0.616,0.577,0.053]],"rb":1.165},{"parts":[[0.276,0.276,0.57],[-0.437,-0.072,0.347],[0.344,-0.301,0.331],[-0.526,-0.408,0.278],[-0.297,0.246,0.244],[0.365,-0.633,0.226],[-0.008,0.773,0.195],[-0.255,0.488,0.138],[0.45,0.819,0.136],[-0.756,-0.246,0.118],[-0.187,0.611,0.114],[0.259,-0.832,0.1],[0.382,-0.858,0.099],[0.178,-0.76,0.094],[-0.539,0.28,0.09],[0.573,-0.543,0.089]],"rb":1.071},{"parts":[[-0.191,0.115,0.54],[0.344,0.204,0.422],[-0.331,-0.42,0.377],[-0.531,-0.743,0.177],[0.641,0.505,0.166],[-0.14,-0.747,0.164],[-0.526,0.539,0.155],[-0.059,0.641,0.154],[-0.098,0.836,0.14],[0.004,-0.828,0.132],[0.684,0.667,0.128],[-0.543,0.696,0.127],[-0.692,-0.819,0.126],[-0.361,-0.798,0.119],[0.34,0.628,0.118],[-0.582,0.819,0.116]],"rb":1.199},{"parts":[[0.323,0.047,0.472],[-0.301,0.132,0.406],[0.45,-0.408,0.342],[0.565,-0.73,0.272],[0.34,0.518,0.165],[-0.526,0.476,0.16],[0.701,0.331,0.159],[0.357,0.824,0.157],[-0.577,0.79,0.151],[0.811,0.446,0.149],[-0.709,0.119,0.145],[-0.594,0.624,0.144],[0.713,0.645,0.143],[-0.297,0.539,0.141],[-0.208,0.743,0.129],[-0.675,-0.03,0.114]],"rb":1.195},{"parts":[[0.093,0.195,0.329],[0.467,-0.157,0.262],[-0.187,0.013,0.149],[0.412,0.102,0.146],[-0.008,0.51,0.144],[-0.272,-0.11,0.121],[-0.017,0.654,0.119],[0.293,-0.357,0.118],[-0.391,-0.161,0.115],[-0.191,0.378,0.112],[0.476,-0.769,0.11],[0.119,-0.658,0.108],[0.446,-0.658,0.105],[0.055,-0.752,0.1],[-0.497,-0.221,0.096],[0.399,-0.412,0.094]],"rb":1.014},{"parts":[[0,0.306,0.63],[0.004,-0.327,0.388],[-0.021,-0.718,0.225],[0.374,-0.204,0.178],[-0.395,-0.187,0.172],[-0.514,-0.059,0.136],[0.505,-0.081,0.127],[-0.382,0.811,0.127],[0.378,0.811,0.127],[0.476,0.722,0.07],[-0.488,0.705,0.066],[0.2,-0.662,0.065],[-0.582,0.059,0.064],[-0.272,0.875,0.064],[0.263,0.879,0.059],[0.526,0.654,0.058]],"rb":1.024},{"parts":[[-0.127,0.284,0.694],[-0.081,-0.412,0.334],[0.556,0.034,0.33],[0.743,-0.242,0.252],[-0.183,-0.735,0.251],[-0.667,0.722,0.251],[0.386,0.752,0.229],[-0.819,0.335,0.18],[0.887,-0.034,0.11],[-0.565,-0.255,0.109],[0.892,-0.45,0.106],[-0.476,0.887,0.093],[0.068,-0.713,0.093],[-0.603,-0.361,0.09],[0.204,0.896,0.085],[0.514,0.56,0.084]],"rb":1.233},{"parts":[[-0.089,-0.051,0.743],[0.348,0.552,0.419],[-0.45,-0.701,0.305],[-0.14,0.692,0.301],[0.607,0.212,0.229],[-0.157,-0.794,0.118],[-0.374,0.883,0.115],[0.743,0.399,0.098],[0.654,-0.013,0.097]],"rb":1.138},{"parts":[[-0.025,-0.144,0.238],[-0.013,0.696,0.174],[-0.008,0.098,0.154],[-0.187,0.726,0.132],[-0.008,-0.386,0.117],[-0.004,0.255,0.104],[-0.323,0.722,0.099],[-0.004,0.361,0.091],[-0.008,0.522,0.089],[0.161,0.692,0.088],[0.251,0.705,0.084],[0.204,-0.212,0.072],[-0.429,0.705,0.072],[0.335,0.718,0.069],[0.106,-0.344,0.061],[-0.119,0.841,0.057]],"rb":0.906}];
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

  return {
    n, top, above, aboveMass, buried: buried / 10,
    bigPair: bigPair / 12,
    blocked: blocked / 12,
    stuck: stuck / 4,
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

/* 推演一次投放 → 返回评估值 */
function rolloutValue(src, x, h, wt, scratch, quiet) {
  const sim = E.cloneWorld(src, scratch);
  sim.mergedMaxTier = -1; sim.freed = 0;
  const before = sim.score;
  E.dropAt(sim, x);          // 若 !ready 会失败 → 调用方保证 ready
  runSettle(sim, h, quiet);
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
    const o = rolloutValue(world, xs[i], st.h1, st.wt, st.scratch, st.quiet);
    out[i] = { x: xs[i], v1: o.v };
  }
  return out;
}

/* ② 精选：长推演 h2 秒 */
function stageLong(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6);
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
    runSettle(s2, innerH, 0.7);
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
    runSettle(s3, st.h2, 1.2);
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
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6);
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

MODS['worker'] = (function () {
/* ============================================================================
 *  worker.js —— 推演工作线程
 *
 *  主线程只把「当前盘面快照 + 决策参数」丢过来，这里负责：
 *    ① 重建世界（移植物理引擎）
 *    ② 搜落点（候选 → 推演 → 评估 → 期望搜索 → 细化）
 *    ③ 顺带决定「投掷时机」（现在丢 or 等安静）
 *    ④ 把 {x, delayFrames, ...} 回传
 *
 *  这样主线程一秒都不会被阻塞：页面照常渲染、水果照常滚，
 *  bot 在后台线程里慢慢算。
 * ========================================================================== */

const E = MODS['engine'];
const P = MODS['planner'];

let shapesReady = false;

self.onmessage = (e) => {
  const m = e.data;
  if (!m || typeof m !== 'object') return;

  if (m.type === 'init') {
    if (m.shapes && m.shapes.length) { E.setShapes(m.shapes); shapesReady = true; }
    self.postMessage({ type: 'ready', tiers: shapesReady ? m.shapes.length : 0 });
    return;
  }

  /* 延迟补偿：把盘面往前推 n 帧，返回推进后的快照（实时模式下用） */
  if (m.type === 'advance') {
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      P.advanceFrames(w, m.frames | 0);
      self.postMessage({ type: 'advance', id: m.id, ok: true, state: E.snapshotOf(w, w.now) });
    } catch (err) {
      self.postMessage({ type: 'advance', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
    return;
  }

  /* 单个搜索阶段（并行版把候选落点切片丢过来，各算各的） */
  if (m.type === 'stage') {
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      const fn = P.STAGES[m.stage];
      const results = fn(w, m.opts || {}, m.xs);
      self.postMessage({ type: 'stage', id: m.id, ok: true, results });
    } catch (err) {
      self.postMessage({ type: 'stage', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
    return;
  }

  if (m.type === 'plan') {
    const t0 = performance.now();
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      const dec = P.plan(w, m.opts || {});
      self.postMessage({
        type: 'plan', id: m.id, ok: true,
        result: {
          x: dec.x, value: dec.value, delayFrames: dec.delayFrames || 0,
          choice: dec.choice || 'now', candCount: dec.candCount,
          computeMs: performance.now() - t0,
        },
      });
    } catch (err) {
      self.postMessage({ type: 'plan', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
  }
};

return {  };
})();

})();
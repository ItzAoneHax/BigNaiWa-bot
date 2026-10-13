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
export const DIAG = { updates: 0, clones: 0 };
export function resetDiag() { DIAG.updates = 0; DIAG.clones = 0; }

/* ---------------------------------------------------------------- 常量 ---- */

export const CFG = {
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
export const FRUITS = [
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
export const MERGE_SCORE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

/* 新水果掉落表 */
export const SPAWN_TIERS = [0, 1, 2, 3, 4];
export const SPAWN_WEIGHTS = [0.28, 0.24, 0.20, 0.16, 0.12];

/* 每个 tier 对应「合成它」的实际得分（含两只神奶蛙的特殊奖励） */
export const TIER_VALUE = MERGE_SCORE.slice();

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

export function setShapes(shapes) {
  if (shapes && shapes.length) {
    for (const sh of shapes) pack(sh);
    EXACT_SHAPES = shapes; SHAPES = shapes;
  }
}
export function getShapes() { return SHAPES; }
export function getExactShapes() { return EXACT_SHAPES; }

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
export function setShapeMode(mode) {
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

export function makeWorld(opts = {}) {
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
    stepCount: 0,        // 已经跑了多少物理帧（诊断用）
    mergeTrace: null,    // 诊断：把每次合成记下来（默认关闭，零开销）
  };
  return w;
}

export function resetWorld(w, opts = {}) {
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

function syncParts(b) {
  const c = b.pcos, s = b.psin;
  const f = b.flat || (b.flat = pack(shapeOfByParts(b.parts)).flat);
  const r = b.r, x = b.x, y = b.y;
  const wx = b.wx, wy = b.wy, ws = b.ws;
  const n = b.np;
  for (let i = 0, k = 0; i < n; i++, k += 3) {
    const ox = f[k] * r, oy = f[k + 1] * r;
    wx[i] = x + ox * c - oy * s;
    wy[i] = y + ox * s + oy * c;
    ws[i] = f[k + 2] * r;
  }
}

/* 兜底：给一个 parts 列表找回它的 packed 版本（正常情况下 ball.flat 一定存在） */
function shapeOfByParts(parts) {
  for (const list of [SHAPES, EXACT_SHAPES]) {
    if (!list) continue;
    for (const sh of list) if (sh && sh.parts === parts) return sh;
  }
  return pack({ rb: 1, parts });
}

export function makeBall(w, x, y, tier, vx, vy) {
  const r = FRUITS[tier].r;
  const m = r * r;
  const sh = shapeOf(tier);
  const n = sh.parts.length;
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
    flat: sh.flat || pack(sh).flat,
    np: n,
    pcos: 1, psin: 0,
    rb: sh.rb * r,
    rbe: (sh.ext || sh.rb) * r,
    wx: new Float32Array(n),
    wy: new Float32Array(n),
    ws: new Float32Array(n),
  };
  syncParts(b);
  return b;
}

/* 深拷贝一颗球（推演用；parts 是共享引用，不必复制） */
export function cloneBall(b, now) {
  const n = b.parts.length;
  const c = Object.create(null);
  c.x = b.x; c.y = b.y; c.vx = b.vx; c.vy = b.vy;
  c.px = b.px; c.py = b.py;
  c.r = b.r; c.tier = b.tier; c.angle = b.angle;
  c.mass = b.mass; c.invMass = b.invMass;
  c.bornAt = b.bornAt; c.overTime = b.overTime;
  c.landed = b.landed; c.dead = b.dead; c.contacts = b.contacts;
  c.pvx = b.pvx; c.pvy = b.pvy;
  c.sq = b.sq; c.sqA = b.sqA;
  c.parts = b.parts; c.flat = b.flat; c.np = b.np; c.rb = b.rb; c.rbe = b.rbe;
  c.pcos = b.pcos; c.psin = b.psin;
  c.wx = new Float32Array(n); c.wy = new Float32Array(n); c.ws = new Float32Array(n);
  c.wx.set(b.wx); c.wy.set(b.wy); c.ws.set(b.ws);
  return c;
}

/* ------------------------------------------------------------------ 投放 -- */

export function aimLimit(tier) {
  const r = FRUITS[tier].r * shapeOf(tier).rb;
  return [CFG.WALL + r + 0.5, CFG.W - CFG.WALL - r - 0.5];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function moveAim(w, x) {
  const [lo, hi] = aimLimit(w.pending);
  w.aimX = clamp(x, lo, hi);
}

export function tryDrop(w) {
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
export function dropAt(w, x) {
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

export function pickSpawnTier(w, avoid) {
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
export const PROF = { on: false, t: new Float64Array(8), n: 0 };
const _now = (typeof performance !== 'undefined' ? () => performance.now() : () => Date.now());

/* stepPhysics 收尾的合成处理从 stepsPerSubstep 中抽出来（保持原来的调用顺序） */

export function stepPhysics(w, dt) {
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
export function processMerges(w, merges) {
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

export function checkGameOver(w, dt) {
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

export function revive(w) {
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

export function update(w, dt) {
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
export function cloneWorld(src, dst) {
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
  w.lastMerges = src.lastMerges;
  w.lastMergeGain = src.lastMergeGain;
  w.lastMaxMergeTier = src.lastMaxMergeTier;
  return w;
}

/* 让世界跑 seconds 秒（固定步长），可选提前停止条件 */
export function runFor(w, seconds, opts = {}) {
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
export function maxSpeed(w) {
  let m = 0;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    const v = b.vx * b.vx + b.vy * b.vy;
    if (v > m) m = v;
  }
  return Math.sqrt(m);
}

/* 顶部高度（越小越高） */
export function stackTop(w) {
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
export function snapshotOf(g, nowMs) {
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
export function adoptFromGame(w, gameState, shapes, nowMs) {
  if (shapes) setShapes(shapes);
  const balls = [];
  for (let i = 0; i < gameState.balls.length; i++) {
    const g = gameState.balls[i];
    const sh = shapeOf(g.tier);
    const n = sh.parts.length;
    const b = {
      x: g.x, y: g.y, vx: g.vx, vy: g.vy, px: g.px, py: g.py,
      r: g.r, tier: g.tier, angle: g.angle,
      mass: g.mass, invMass: g.invMass,
      bornAt: g.bornAt, overTime: g.overTime,
      landed: g.landed, dead: !!g.dead, contacts: g.contacts || 0,
      pvx: g.pvx || 0, pvy: g.pvy || 0,
      sq: g.sq || 0, sqA: g.sqA || 0,
      parts: sh.parts, flat: sh.flat || pack(sh).flat, np: n, rb: sh.rb * g.r,
      rbe: (sh.ext || sh.rb) * g.r,
      pcos: 1, psin: 0,
      wx: new Float32Array(n), wy: new Float32Array(n), ws: new Float32Array(n),
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

export { syncParts };

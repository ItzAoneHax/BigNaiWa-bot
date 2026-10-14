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

import * as E from './engine.js';

/* ------------------------------------------------------------ 权重配置 ---- */

export const DEFAULT_WEIGHTS = {
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

export const SOFT_TOP = 330;   // 顶部从 y=330 开始算「接近警戒线」

/* -------------------------------------------------------- 盘面特征提取 ---- */

const N_BINS = 8;

export function features(w) {
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

export const DIAG = { evals: 0 };
export function resetDiag() { DIAG.evals = 0; }

export function evaluate(w, before, wt = DEFAULT_WEIGHTS) {
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

export function tokenMass(w) {
  let s = 0;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    if (!b.dead) s += Math.pow(2, b.tier);
  }
  return s;
}

/* ---------------------------------------------------------------- 工具 ---- */

export const now = (typeof performance !== 'undefined' && performance.now)
  ? () => performance.now() : () => Date.now();

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function candidateXs(tier, step, around = null, span = 0) {
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
export const SETTLE = {
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
export function runSettle(w, h, quiet, allowRevive = true) {
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
export function rolloutValue(src, x, h, wt, scratch, quiet, allowRevive = true) {
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
export function stageScreen(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h1, st.wt, st.scratch, st.quiet, st.allowRevive);
    out[i] = { x: xs[i], v1: o.v };
  }
  return out;
}

/* ② 精选：长推演 h2 秒 */
export function stageLong(world, opts, xs, ctx) {
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

export function ply2Plan(world, opts, outerXs) {
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

export function stageInner(world, opts, items, ctx) {
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
export function stageRecheck(world, opts, items, ctx) {
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
export function ply2Best(plan, innerVals) {
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
export function ply2RecheckItems(plan, best) {
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
export function ply2Assemble(world, plan, outerBase, best, rcItems, rcVals) {
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
export function stageRefine(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6, st.allowRevive);
    out[i] = { x: xs[i], v: o.v };
  }
  return out;
}

export const STAGES = {
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
export function searchBest(world, opts = {}) {
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
export async function planParallel(world, opts, exec) {
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

export const TIMING = {
  quietSpeed: 60,            // 盘面最大速度低于它就算「安静」
  maxWaitFrames: 180,        // 最多等 3 秒（游戏时间）
  waitPenaltyPerFrame: 0.02, // 每等一帧扣一点（纯粹用来打破平局）
};

/* 让世界自己前进 n 帧（不做任何投放） */
export function advanceFrames(w, n) {
  for (let i = 0; i < n; i++) {
    E.update(w, E.CFG.FIXED);
    if (w.over) return i + 1;
  }
  return n;
}

/* 让世界自己跑 maxFrames 帧，直到安静下来；返回实际跑了多少帧 */
export function advanceUntilQuiet(w, maxFrames, quietSpeed) {
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
export function plan(world, opts = {}) {
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

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

  return {
    n, top, above, aboveMass, buried: buried / 10,
    bigPair: bigPair / 12,
    blocked: blocked / 12,
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
  return v;
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

/* 跑到 h 秒；盘面静下来（且已跑够 quiet）就提前收工 */
export function runSettle(w, h, quiet, allowRevive = true) {
  const step = E.CFG.FIXED;
  const n = Math.round(h / step);
  const minSteps = quiet ? Math.round(quiet / step) : n;
  for (let i = 0; i < n; i++) {
    E.update(w, step);
    if (w.over) {
      /* 有币就花：推演里直接把复活做掉，继续往下跑。
         这样评估函数看到的是「用币之后的真实局面」，而不是一刀切判死 */
      if (allowRevive && w.revives > 0 && E.revive(w)) continue;
      return i + 1;
    }
    if (i >= minSteps && (i & 3) === 0 && E.maxSpeed(w) < 25) return i + 1;
  }
  return n;
}

/* 推演一次投放 → 返回评估值 */
export function rolloutValue(src, x, h, wt, scratch, quiet) {
  const sim = E.cloneWorld(src, scratch);
  sim.mergedMaxTier = -1;
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
export function stageScreen(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h1, st.wt, st.scratch, st.quiet);
    out[i] = { x: xs[i], v1: o.v };
  }
  return out;
}

/* ② 精选：长推演 h2 秒 */
export function stageLong(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6);
    out[i] = { x: xs[i], v2: o.v, gain: o.gain, top: E.stackTop(o.sim) };
  }
  return out;
}

/* ③ 第二层：先用已知的下一颗水果做「连手棋」内层搜索，再把内层最优值带回来 */
export function stagePly2(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const wt = st.wt;
  const known = opts.nextMode === 'known';
  const pAvoid = spawnProb(world.pending);
  const innerStep = known ? Math.max(4, st.step * 0.75) : Math.max(10, st.step * 1.5);
  const innerH = known ? st.h1 : Math.min(st.h1, 1.0);
  const tiers = known ? [world.next] : E.SPAWN_TIERS.filter(t => t !== world.pending);
  const out = new Array(xs.length);

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    /* 外层：投放后跑到稳定 */
    const sim1 = E.cloneWorld(world, st.scratch);
    sim1.mergedMaxTier = -1;
    const base0 = sim1.score;
    E.dropAt(sim1, x);
    runSettle(sim1, st.h2, st.quiet + 0.6);
    const base = evaluate(sim1, base0, wt);

    let exp = 0, wsum = 0;
    for (const t of tiers) {
      const p = known ? 1 : SPAWN_W(t) / (1 - pAvoid);
      const inner = E.cloneWorld(sim1, E.makeWorld({ rng: world.rng }));
      inner.pending = t;
      inner.ready = true;
      inner.cooldown = 0;
      let bestInner = -Infinity, bestX2 = null;
      for (const x2 of candidateXs(t, innerStep)) {
        const s2 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));
        s2.mergedMaxTier = -1;
        const b2 = s2.score;
        E.dropAt(s2, x2);
        runSettle(s2, innerH, 0.7);
        const v = evaluate(s2, b2, wt);
        if (v > bestInner) { bestInner = v; bestX2 = x2; }
      }
      /* 内层冠军再用长推演复核一次（连锁合成往往 1 秒后才发生） */
      if (bestX2 !== null && st.h2 > innerH) {
        const s3 = E.cloneWorld(inner, E.makeWorld({ rng: world.rng }));
        s3.mergedMaxTier = -1;
        const b3 = s3.score;
        E.dropAt(s3, bestX2);
        runSettle(s3, st.h2, 1.2);
        const v3 = evaluate(s3, b3, wt);
        if (v3 > bestInner) bestInner = v3;
      }
      exp += p * bestInner;
      wsum += p;
    }
    out[i] = { x, v3: base + (known ? 1.0 : 0.8) * (exp / (wsum || 1)) };
  }
  return out;
}

/* ④ 细化：冠军附近更细的落点在跑一遍长推演 */
export function stageRefine(world, opts, xs, ctx) {
  const st = stageCtx(world, opts, ctx);
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    const o = rolloutValue(world, xs[i], st.h2, st.wt, st.scratch, st.quiet + 0.6);
    out[i] = { x: xs[i], v: o.v };
  }
  return out;
}

export const STAGES = { screen: stageScreen, long: stageLong, ply2: stagePly2, refine: stageRefine };

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
    const p2 = stagePly2(world, opts, top.map(r => r.x));
    for (let i = 0; i < top.length; i++) top[i].v3 = p2[i].v3;
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
    const p2 = await exec('ply2', top.map(r => r.x));
    for (let i = 0; i < top.length; i++) top[i].v3 = p2[i].v3;
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

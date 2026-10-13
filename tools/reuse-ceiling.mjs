/* ============================================================================
 *  reuse-ceiling.mjs —— 「跨投掷复用预测结果」到底能省多少思考时间？
 *
 *  用户的直觉：上一步推演过的东西，下一步能不能直接用？
 *  这个工具把它量成三件事：
 *
 *  ① 一次决策的物理帧花在哪几个阶段（现状，live 协议：冷却一结束就投）
 *  ② 跨投掷复用的上限
 *     - 命中率：拿「第 N 步推演留下的状态」去对「第 N+1 步的真实起点」，
 *       有多少个是逐位相同的？（预期：0；但冠军轨迹在 +360ms 处的那个状态是相同的
 *       —— 这正说明复用的正确形态是「保留轨迹」，不是「查表」）
 *     - 天花板：哪些阶段的帧数在第 N+1 步能省掉？省不掉的又是哪些？
 *  ③ 不改任何数值就能拿到的复用（同一次决策内部的前缀复用）实测：
 *     粗筛 → 精选 续跑、精选 → 第二层的「外层盘面」直传
 *
 *  用法：
 *    node tools/reuse-ceiling.mjs                 # mid + dense 两个盘面
 *    node tools/reuse-ceiling.mjs --board dense
 *    node tools/reuse-ceiling.mjs --json out/reuse-ceiling.json
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
E.setShapes(JSON.parse(fs.readFileSync(path.join(__dirname, '../src/shapes.json'), 'utf8')));
const FIXED = E.CFG.FIXED;
const F = (sec) => Math.round(sec / FIXED);          // 秒 → 帧
const DROP_FRAMES = F(E.CFG.DROP_MS / 1000);         // 冷却结束 = 可以投下一颗的那一帧（22 帧）

/* 与 bot.js 的 think 默认值一致（浏览器里跑的就是这一套） */
const OPTS = {
  step: 8, h1: 1.2, h2: 2.6, topK: 8, innerTop: 4, lookahead: 2, refine: true,
  nextMode: 'known', quiet: 0.9, weights: P.DEFAULT_WEIGHTS,
};

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : (isNaN(Number(v)) ? v : Number(v));
}

/* ------------------------------------------------------------- 盘面构造 --- */

/* 中后期：随机乱丢，和 tools/bench-plan.mjs 用的同一个盘面 */
function randomBoard(seed, drops) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const rnd = P.mulberry32(seed + 3);
  let d = 0, guard = 0;
  while (d < drops && guard++ < drops * 4) {
    if (w.over && !E.revive(w)) break;
    E.moveAim(w, 30 + rnd() * 360);
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 34; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  for (let k = 0; k < 240; k++) E.update(w, FIXED);
  return w;
}

/* 密集：底部挤满大果（和 tools/dense-profile.mjs 用的同一套贪心堆高） */
function tallBoard(seed, targetBalls = 26) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const scratch = E.makeWorld({ rng: P.mulberry32(seed) });
  let d = 0;
  while (d < 400 && w.balls.length < targetBalls) {
    if (w.over) { if (w.revives > 0) { E.revive(w); continue; } break; }
    let g = 0;
    while (!w.ready && g++ < 600 && !w.over) E.update(w, FIXED);
    if (w.over) continue;
    /* 贪心：0.4s 窗口里挑分最高、顶最低的落点 */
    const xs = P.candidateXs(w.pending, 14);
    let bestX = xs[0], bestV = -Infinity;
    for (const x of xs) {
      const s = E.cloneWorld(w, scratch);
      s.mergedMaxTier = -1;
      const before = s.score;
      E.dropAt(s, x);
      P.runSettle(s, 0.4, 0.3);
      const v = (s.score - before) * 2 - Math.max(0, 330 - E.stackTop(s)) * 0.5;
      if (v > bestV) { bestV = v; bestX = x; }
    }
    E.moveAim(w, bestX);
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 30; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  for (let k = 0; k < 240; k++) E.update(w, FIXED);
  return w;
}

/* ---------------------------------------------------------------- 计时 ---- */

function timed(fn) {
  E.resetDiag();
  const t0 = performance.now();
  const out = fn();
  return { out, ms: performance.now() - t0, frames: E.DIAG.updates, clones: E.DIAG.clones };
}
const share = (part, total) => (total ? (part / total) * 100 : 0);

/* -------------------------------------------------- 一次决策（现状管线）--- */

/* 完全照 planParallel 的阶段顺序（turbo/快进模式下就是这条路径） */
function runDecision(w, opts = OPTS) {
  const rows = [];
  const ctx = { cache: new Map() };

  const xs = P.candidateXs(w.pending, opts.step);
  let r = timed(() => P.stageScreen(w, opts, xs));
  rows.push({ key: 'screen', name: '① 粗筛 screen', units: xs.length, ms: r.ms, frames: r.frames });

  const res = r.out.map(o => ({ x: o.x, v1: o.v1 })).sort((a, b) => b.v1 - a.v1);
  const shortlist = res.slice(0, Math.min(opts.topK, res.length));
  r = timed(() => P.stageLong(w, opts, shortlist.map(s => s.x)));
  rows.push({ key: 'long', name: '② 精选 long', units: shortlist.length, ms: r.ms, frames: r.frames });
  for (let i = 0; i < shortlist.length; i++) shortlist[i].v2 = r.out[i].v2;
  shortlist.sort((a, b) => b.v2 - a.v2);

  const innerTop = Math.min(opts.innerTop ?? 4, shortlist.length);
  const top = shortlist.slice(0, innerTop);
  const plan2 = P.ply2Plan(w, opts, top.map(s => s.x));
  r = timed(() => P.stageInner(w, opts, plan2.items, ctx));
  rows.push({ key: 'inner', name: '③ 第二层 inner', units: plan2.items.length, ms: r.ms, frames: r.frames });
  const best2 = P.ply2Best(plan2, r.out);
  const rcItems = P.ply2RecheckItems(plan2, best2);
  r = timed(() => P.stageRecheck(w, opts, rcItems, ctx));
  rows.push({ key: 'recheck', name: '④ 复核 recheck', units: rcItems.length, ms: r.ms, frames: r.frames });
  const v3 = P.ply2Assemble(w, plan2, top.map(s => s.v2), best2, rcItems, r.out);
  for (let i = 0; i < top.length; i++) top[i].v3 = v3[i];
  top.sort((a, b) => b.v3 - a.v3);
  let best = top[0];

  const fine = Math.max(2, Math.round(opts.step / 2));
  const probes = P.candidateXs(w.pending, fine, best.x, opts.step).filter(x => Math.abs(x - best.x) > 1e-6);
  r = timed(() => P.stageRefine(w, opts, probes, ctx));
  rows.push({ key: 'refine', name: '⑤ 细化 refine', units: probes.length, ms: r.ms, frames: r.frames });
  let bestV = best.v3, bx = best.x;
  for (const o of r.out) if (o.v > bestV) { bestV = o.v; bx = o.x; }

  return { rows, x: bx, value: bestV, xs, shortlist, plan2, innerXs: P.candidateXs(w.next, Math.max(4, opts.step * 0.75)) };
}

/* ------------------------------------------------------------ 状态比对 ---- */

function stateDiff(a, b) {
  if (a.balls.length !== b.balls.length) return { n: a.balls.length, n2: b.balls.length, maxPos: Infinity, maxVel: Infinity, dScore: Math.abs(a.score - b.score) };
  let maxPos = 0, maxVel = 0;
  for (let i = 0; i < a.balls.length; i++) {
    const p = a.balls[i], q = b.balls[i];
    if (p.tier !== q.tier) return { tierMismatch: true, maxPos: Infinity, maxVel: Infinity, dScore: Math.abs(a.score - b.score) };
    const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
    if (dx > maxPos) maxPos = dx;
    if (dy > maxPos) maxPos = dy;
    const dvx = Math.abs(p.vx - q.vx), dvy = Math.abs(p.vy - q.vy);
    if (dvx > maxVel) maxVel = dvx;
    if (dvy > maxVel) maxVel = dvy;
  }
  return { n: a.balls.length, maxPos, maxVel, dScore: Math.abs(a.score - b.score) };
}

/* 逐位指纹：分数 + 每颗的 (tier, x, y) 全精度 */
function fingerprint(w) {
  let s = w.score + '|' + w.balls.length;
  for (const b of w.balls) s += `|${b.tier}:${b.x}:${b.y}`;
  return s;
}

/* ------------------------------------------------- ② 跨投掷复用的命中率 -- */

/* 第 N 步：冠军落点 x* 的推演轨迹；第 N+1 步的真实起点；以及各种"缓存条目" */
function crossThrowProbe(w, dec, opts = OPTS) {
  const xStar = dec.x;

  /* 真实游戏：投下 x* → 跑到冷却结束（= 线上 bot 出手的节奏） */
  const real = E.cloneWorld(w);
  E.dropAt(real, xStar);
  for (let i = 0; i < DROP_FRAMES; i++) E.update(real, FIXED);
  const fpReal = fingerprint(real);

  /* 同一条轨迹在 +22 帧处的状态（推演过程中"顺手就能留下"的那个） */
  const traj = E.cloneWorld(w);
  E.dropAt(traj, xStar);
  for (let i = 0; i < DROP_FRAMES; i++) E.update(traj, FIXED);

  /* 第 N 步一条推演真正收工的状态：落子后跑到稳定（h2 + quiet） */
  const settled = E.cloneWorld(w);
  E.dropAt(settled, xStar);
  P.runSettle(settled, opts.h2, opts.quiet + 0.6);

  /* 粗筛那 45 条推演的"结束状态"，全部拿来当缓存条目 */
  const xs = P.candidateXs(w.pending, opts.step);
  const entries = [];
  for (const x of xs) {
    const sim = E.cloneWorld(w);
    E.dropAt(sim, x);
    P.runSettle(sim, opts.h1, opts.quiet);
    entries.push({ x, fp: fingerprint(sim), sim });
  }
  const hits = entries.filter(e => e.fp === fpReal).length;

  /* 最近的"未命中"到底差多远？给出最小位移与最小速度差 */
  let best = null;
  for (const e of entries) {
    const d = stateDiff(e.sim, real);
    if (!best || d.maxPos < best.d.maxPos) best = { x: e.x, d };
  }

  return {
    xStar, nEntries: entries.length, hits,
    trajDiff: stateDiff(traj, real),            // 期望：0（同一条轨迹 → 逐位相同）
    settledDiff: stateDiff(settled, real),      // 期望：明显不为 0（差了大半秒的物理）
    nearest: best,
  };
}

/* -------------------------------------- ③ 同一次决策内的前缀复用（精确）-- */

/* 复刻 planner.runSettle 的收工规则，但允许「从一个已经跑过 k 帧的状态续跑」
   —— 物理只被推进同样的次数，数值与从头跑逐位相同 */
function resumeSettle(w, k, n, minSteps, allowRevive = true) {
  for (let j = k; j < n; j++) {
    E.update(w, FIXED);
    if (w.over) {
      if (allowRevive && w.revives > 0 && E.revive(w)) continue;
      return j + 1;
    }
    if (j < minSteps || (j & 3) !== 0) continue;
    if (E.maxSpeed(w) < 25) return j + 1;
  }
  return n;
}

function prefixReuseProbe(w, opts = OPTS) {
  const xs = P.candidateXs(w.pending, opts.step);
  const n1 = F(opts.h1), n2 = F(opts.h2);
  const min1 = F(opts.quiet), min2 = F(opts.quiet + 0.6);

  /* --- 现状：粗筛 45 条 → 入库的 8 条再从 0 跑 2.6s --- */
  let a = timed(() => {
    const sims = [];
    for (const x of xs) { const s = E.cloneWorld(w); s.mergedMaxTier = -1; E.dropAt(s, x); P.runSettle(s, opts.h1, opts.quiet); sims.push({ x, s }); }
    return sims;
  });
  const screenNow = a;
  /* 用评估值排序（与管线一致） */
  const wt = opts.weights || P.DEFAULT_WEIGHTS;
  const scored = a.out.map(o => ({ x: o.x, v: P.evaluate(o.s, o.s.score, wt) })).sort((p, q) => q.v - p.v);
  const top8 = scored.slice(0, Math.min(opts.topK, scored.length)).map(o => o.x);
  const longNow = timed(() => {
    for (const x of top8) { const s = E.cloneWorld(w); s.mergedMaxTier = -1; E.dropAt(s, x); P.runSettle(s, opts.h2, opts.quiet + 0.6); }
  });

  /* --- 变体：粗筛的状态留住，精选从收工那一刻续跑（总帧数完全相同） --- */
  const kept = timed(() => {
    const m = new Map();
    for (const x of xs) {
      const s = E.cloneWorld(w); s.mergedMaxTier = -1;
      E.dropAt(s, x);
      const k = P.runSettle(s, opts.h1, opts.quiet);
      /* 粗筛的评估值照常算（evaluate 不改状态），留在这里给下一步排序用 */
      m.set(x, { s, k, v: P.evaluate(s, s.score, wt) });
    }
    return m;
  });
  const top8b = [...kept.out.entries()].sort((p, q) => q[1].v - p[1].v).slice(0, top8.length).map(([x]) => x);
  const longResume = timed(() => {
    const outSims = [];
    for (const x of top8b) { const e = kept.out.get(x); resumeSettle(e.s, e.k, n2, min2); outSims.push(e.s); }
    return outSims;
  });
  /* 逐位校验：续跑出来的盘面必须和从头跑一模一样 */
  const fresh = [];
  for (const x of top8b) { const s = E.cloneWorld(w); s.mergedMaxTier = -1; E.dropAt(s, x); P.runSettle(s, opts.h2, opts.quiet + 0.6); fresh.push(s); }
  const check = longResume.out.map((s, i) => stateDiff(s, fresh[i]));
  const sameOrder = top8.join(',') === top8b.join(',');

  /* --- 第二层的「外层盘面」：现状重复跑了一遍精选里算过的落子 --- */
  const nOuter = Math.min(4, top8.length);
  const dupNow = timed(() => {
    for (let i = 0; i < nOuter; i++) { const s = E.cloneWorld(w); s.mergedMaxTier = -1; E.dropAt(s, top8[i]); P.runSettle(s, opts.h2, opts.quiet + 0.6); }
  });
  const dupReuse = timed(() => {
    for (let i = 0; i < nOuter; i++) { const s = E.cloneWorld(fresh[i]); void s; }
  });

  return {
    screenNow: { ms: screenNow.ms, frames: screenNow.frames },
    longNow: { ms: longNow.ms, frames: longNow.frames },
    screenKeep: { ms: kept.ms, frames: kept.frames },
    longResume: { ms: longResume.ms, frames: longResume.frames },
    exactBits: check.every(d => d.maxPos === 0 && d.maxVel === 0 && d.dScore === 0),
    sameShortlist: sameOrder,
    outerDup: { now: { ms: dupNow.ms, frames: dupNow.frames }, reuse: { ms: dupReuse.ms, frames: dupReuse.frames } },
  };
}

/* ------------------------------------------------------------------ CLI --- */

const whichArg = String(arg('board', 'both'));
const which = whichArg === 'both' ? ['mid', 'dense'] : whichArg.split(',');
const us = [];
const out = { opts: OPTS, boards: [] };

function report(board, label) {
  console.log(`\n================ 盘面：${label} —— ${board.balls.length} 颗，分数 ${board.score}，pending=${E.FRUITS[board.pending].name} next=${E.FRUITS[board.next].name}`);

  /* 单帧成本（决定帧数 → 毫秒的换算） */
  for (let i = 0; i < 200; i++) E.update(board, FIXED);
  const t0 = performance.now();
  const N = 1500;
  for (let i = 0; i < N; i++) E.update(board, FIXED);
  const usFrame = (performance.now() - t0) * 1000 / N;

  const dec = runDecision(board, OPTS);
  const totalFrames = dec.rows.reduce((s, r) => s + r.frames, 0);
  const totalMs = dec.rows.reduce((s, r) => s + r.ms, 0);

  console.log(`  单帧 ${usFrame.toFixed(1)} µs（静态）· 决策合计 ${totalMs.toFixed(0)} ms / ${totalFrames} 物理帧`);
  console.log('  阶段            单元数   物理帧   占比     帧/单元   单线程ms');
  for (const r of dec.rows) {
    console.log(`  ${r.name.padEnd(14)} ${String(r.units).padStart(5)} ${String(r.frames).padStart(8)} ${share(r.frames, totalFrames).toFixed(1).padStart(6)}% ${(r.frames / Math.max(1, r.units)).toFixed(1).padStart(9)} ${r.ms.toFixed(0).padStart(9)}`);
  }

  /* 12 Worker 的口径（浏览器默认 min(12, 核数-4)）：每阶段的关键路径 ≈ ceil(单元/12) × 帧/单元 × 单帧成本 */
  const W = 12;
  const lane23 = dec.rows.map(r => ({
    key: r.key, path: Math.ceil(Math.max(1, r.units) / W) * (r.frames / Math.max(1, r.units)),
  }));
  const pathFrames = lane23.reduce((s, r) => s + r.path, 0);
  console.log(`  → 12 Worker 关键路径估算：${(pathFrames * usFrame / 1000).toFixed(0)} ms（帧数口径 ${pathFrames.toFixed(0)}）`);

  /* ② 跨投掷复用 */
  const probe = crossThrowProbe(board, dec);
  console.log(`  ② 跨投掷：粗筛 ${probe.nEntries} 条推演留下的状态里，命中下一步真实起点的 ${probe.hits} 条`);
  console.log(`     冠军轨迹 +${DROP_FRAMES} 帧处 vs 下一步真实起点：位移 ${probe.trajDiff.maxPos.toFixed(3)} px，速度差 ${probe.trajDiff.maxVel.toFixed(3)} px/s（同一条轨迹）`);
  console.log(`     推演收工（落子后跑到稳定）vs 下一步真实起点：位移 ${fmt(probe.settledDiff.maxPos)} px，速度差 ${fmt(probe.settledDiff.maxVel)} px/s，分数差 ${probe.settledDiff.dScore}`);
  console.log(`     最近的未命中条目 x=${probe.nearest.x.toFixed(1)}：位移差 ${fmt(probe.nearest.d.maxPos)} px，速度差 ${fmt(probe.nearest.d.maxVel)} px/s`);

  const gridNow = dec.xs, gridInner = dec.innerXs;
  let gridHits = 0;
  for (const a of gridNow) for (const b of gridInner) if (Math.abs(a - b) < 1e-9) gridHits++;
  console.log(`  ② 候选栅格：粗筛 ${gridNow.length} 个（step=${OPTS.step}）+ 第二层内层 ${gridInner.length} 个（step=${Math.max(4, OPTS.step * 0.75)}）→ 位置完全相同的 ${gridHits} 个`);

  /* ③ 精确前缀复用 */
  const pre = prefixReuseProbe(board, OPTS);
  console.log(`  ③ 前缀复用（同一次决策内，逐位一致=${pre.exactBits}，shortlist 一致=${pre.sameShortlist}）：`);
  console.log(`     精选阶段：现状 ${pre.longNow.frames} 帧 / ${pre.longNow.ms.toFixed(0)} ms  →  续跑 ${pre.longResume.frames} 帧 / ${pre.longResume.ms.toFixed(0)} ms`);
  console.log(`     第二层外层盘面：现状 ${pre.outerDup.now.frames} 帧 / ${pre.outerDup.now.ms.toFixed(0)} ms  →  直传 ${pre.outerDup.reuse.frames} 帧 / ${pre.outerDup.reuse.ms.toFixed(0)} ms`);

  const saved = (pre.longNow.frames - pre.longResume.frames) + (pre.outerDup.now.frames - pre.outerDup.reuse.frames);
  console.log(`     → 合计省 ${saved} 帧 = 一次决策的 ${share(saved, totalFrames).toFixed(1)}%`);

  out.boards.push({
    label, balls: board.balls.length, score: board.score, usFrame,
    rows: dec.rows.map(r => ({ ...r, shareFrames: share(r.frames, totalFrames), shareMs: share(r.ms, totalMs) })),
    totalFrames, totalMs, pathFrames,
    probe: { xStar: probe.xStar, hits: probe.hits, nEntries: probe.nEntries, trajDiff: probe.trajDiff, settledDiff: probe.settledDiff, nearest: { x: probe.nearest.x, ...probe.nearest.d } },
    gridNow: gridNow.length, gridInner: gridInner.length, gridHits,
    prefix: { ...pre, saved, savedShare: share(saved, totalFrames) },
  });
}

function fmt(v) {
  if (!isFinite(v)) return String(v);
  return v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4);
}

if (which.includes('mid')) report(randomBoard(4242, 170), 'mid（170 手随机）');
if (which.includes('dense')) report(tallBoard(4091), 'dense（贪心堆到 26 颗）');

const jsonOut = arg('json', null);
if (jsonOut && jsonOut !== true) {
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
  console.log('\nwrote', jsonOut);
}

/* ============================================================================
 *  impact-probe.mjs —— 「这一手到底影响了场上什么」的实测探针
 *
 *  回答两个问题：
 *   ① 投下的奶蛙落下之后，对场上其它奶蛙有没有影响？算法算进去了吗？
 *   ② 合成时的「爆裂」会不会把周围击退？算法算进去了吗？
 *
 *  做法：把每个候选落点真跑一遍（用的就是线上同一套物理），然后统计
 *    · 直接合成（gen 0：和被投下的那颗合成） vs 连锁合成（gen>=1：被别人带出来的）
 *    · 开局就在场上的水果里，有多少颗因为这一手被推动了 / 推了多远
 *    · 合成发生的那一帧，远处水果的速度有没有「瞬间」跳变（检验有没有爆裂冲量）
 *
 *  用法：npm run probe:impact      （或 node tools/impact-probe.mjs）
 * ========================================================================== */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));

const FIXED = E.CFG.FIXED;
const H = 1.2;          // 每个候选项推演时长
const QUIET = 1.0;

/* 造一个中后期盘面（手上有点货，才谈得上连锁） */
function makeBoard(seed, drops) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const rnd = P.mulberry32(seed + 3);
  let d = 0, guard = 0;
  while (d < drops && guard++ < drops * 4) {
    if (w.over) { if (!E.revive(w)) break; }      // 币用完了就认输，别死循环
    E.moveAim(w, 30 + rnd() * 360);
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 34; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  for (let k = 0; k < 240; k++) E.update(w, FIXED);
  return w;
}

/* 跑一个候选落点，返回它引发的全部影响 */
function trace(board, x) {
  const w = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
  w.mergeTrace = [];
  const baseline = w.balls.map(b => ({ ref: b, x: b.x, y: b.y, tier: b.tier }));
  const score0 = w.score;

  E.dropAt(w, x);
  const dropped = w.balls[w.balls.length - 1];
  dropped.gen = 0;                       // 被投下的那颗 = 第 0 代

  /* 逐步跑，同时盯住「合成那一帧远处水果的速度有没有跳变」 */
  const farJumps = [];
  let prevV = [];                                   // [{ref, v}]，只在需要时同步
  let synced = -1;
  const n = Math.round(H / FIXED);
  for (let i = 0; i < n; i++) {
    const before = w.mergeTrace.length;
    E.update(w, FIXED);
    const newEvents = w.mergeTrace.length - before;
    if (newEvents) {
      if (synced !== i - 1) {                       // 上一帧的速度快照
        prevV.length = 0;
        for (const b of w.balls) prevV.push({ ref: b, v: Math.hypot(b.vx, b.vy) });
      }
      for (const ev of w.mergeTrace.slice(before)) {
        for (const pv of prevV) {
          const b = pv.ref;
          if (b.dead) continue;
          const d = Math.hypot(b.x - ev.x, b.y - ev.y);
          if (d < 150) continue;                    // 只关心「远处」
          const vNow = Math.hypot(b.vx, b.vy);
          if (Math.abs(vNow - pv.v) > 30) farJumps.push({ dist: Math.round(d), dv: Math.round(vNow - pv.v) });
        }
      }
    }
    if (w.over) break;
    if (i >= Math.round(QUIET / FIXED) && (i & 3) === 0 && E.maxSpeed(w) < 25) break;
  }

  /* 位移统计：只看「开局就在场上、且活到最后」的水果 */
  let displaced = 0, movedFar = 0, maxMove = 0, sumMove = 0;
  const survivors = [];
  for (const s of baseline) {
    if (s.ref.dead) continue;
    const d = Math.hypot(s.ref.x - s.x, s.ref.y - s.y);
    survivors.push(d);
    if (d > 3) displaced++;
    if (d > 15) movedFar++;
    if (d > maxMove) maxMove = d;
    sumMove += d;
  }

  const merges = w.mergeTrace || [];
  return {
    scoreGain: w.score - score0,
    merges: merges.length,
    gen0: merges.filter(m => m.gen === 0).length,       // 直接由落子引发
    chain: merges.filter(m => m.gen >= 1).length,       // 落子引发的连锁（含 2 代以上）
    chainDeep: merges.filter(m => m.gen >= 2).length,
    chainTiers: merges.filter(m => m.gen >= 1).map(m => m.tier),
    survivors: survivors.length,
    displaced, movedFar, maxMove: +maxMove.toFixed(1),
    avgMove: +(sumMove / Math.max(1, survivors.length)).toFixed(2),
    farJumps,
  };
}

/* ------------------------------------------------------------------ 主流程 */
const BOARDS = [11, 22, 33, 44];
const totals = { boards: 0, cands: 0, merges: 0, gen0: 0, chain: 0, chainDeep: 0, displaced: 0, survivors: 0, movedFar: 0, jumps: 0 };
const perBoard = [];

for (const seed of BOARDS) {
  const board = makeBoard(1000 + seed, 120 + (seed % 40));
  const xs = P.candidateXs(board.pending, 16);
  const rows = xs.map(x => trace(board, x));

  const t = {
    seed, balls: board.balls.length, cands: rows.length,
    merges: rows.reduce((a, r) => a + r.merges, 0),
    gen0: rows.reduce((a, r) => a + r.gen0, 0),
    chain: rows.reduce((a, r) => a + r.chain, 0),
    chainDeep: rows.reduce((a, r) => a + r.chainDeep, 0),
    displaced: rows.reduce((a, r) => a + r.displaced, 0),
    survivors: rows.reduce((a, r) => a + r.survivors, 0),
    movedFar: rows.reduce((a, r) => a + r.movedFar, 0),
    maxMove: Math.max(...rows.map(r => r.maxMove)),
    jumps: rows.reduce((a, r) => a + r.farJumps.length, 0),
  };
  perBoard.push(t);
  totals.boards++; totals.cands += t.cands; totals.merges += t.merges;
  totals.gen0 += t.gen0; totals.chain += t.chain; totals.chainDeep += t.chainDeep;
  totals.displaced += t.displaced; totals.survivors += t.survivors; totals.movedFar += t.movedFar;
  totals.jumps += t.jumps;
  console.log(`盘面 seed=${seed}: ${board.balls.length} 颗 · ${t.cands} 个候选 · ` +
    `合成 ${t.merges} 次（其中连锁 ${t.chain} 次，2 代以上 ${t.chainDeep} 次）· ` +
    `${t.displaced}/${t.survivors} 颗老水果被推动（>15px 的 ${t.movedFar} 颗，最远 ${t.maxMove.toFixed(0)}px）`);
}

const pct = (a, b) => (100 * a / Math.max(1, b)).toFixed(0) + '%';
console.log('\n────────── 汇总 ──────────');
console.log(`候选落点总数           ${totals.cands}`);
console.log(`这些落子一共触发合成   ${totals.merges} 次`);
console.log(`  · 落子本体直接合成   ${totals.gen0} 次（占 ${pct(totals.gen0, totals.merges)}）`);
console.log(`  · 连锁合成(gen>=1)   ${totals.chain} 次（占 ${pct(totals.chain, totals.merges)}）`);
console.log(`     其中 2 代以上     ${totals.chainDeep} 次（占 ${pct(totals.chainDeep, totals.merges)}）`);
console.log(`场上老水果被这一手推动 ${totals.displaced}/${totals.survivors}（占 ${pct(totals.displaced, totals.survivors)}）`);
console.log(`  推动超过 15px 的     ${totals.movedFar} 颗`);
console.log(`合成瞬间「远处水果速度突变」次数 ${totals.jumps}  ← 若有爆裂冲量，这里会是个大数字`);

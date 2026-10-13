/* ============================================================================
 *  settle-ab.mjs —— 「抖动收敛判定」的决策级 A/B
 *
 *  对比两种收工规则（物理完全一样，只有「跑多少帧」不同）：
 *    legacy   ：瞬时速度 < 25 就收工（原有规则，抖动盘面永远不触发 → 跑满时间窗）
 *    vibrate  ：再加一条「整盘净位移」判定（连续两个窗口位移 < 0.6px 才算冻住）
 *
 *  关心两件事：① 省了多少物理帧 / 多少毫秒；② **选中的落点是否相同**、评估值差多少。
 *  第②项才是「有没有降低模拟正确率」的直接证据。
 *
 *  用法：node tools/settle-ab.mjs [盘面数]
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

const PROFILE = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' };

/* 稳定盘面（真实中后期） */
function makeBoard(seed, drops) {
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

/* 抖动盘面：用便宜贪心堆到「底部挤满大果」 */
function greedyDrop(w, scratch) {
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
  return bestX;
}
function buildTall(seed, maxDrops = 260, targetBalls = 26) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const scratch = E.makeWorld({ rng: P.mulberry32(seed) });
  let d = 0, revives = 0;
  while (d < maxDrops && w.balls.length < targetBalls) {
    if (w.over) { if (w.revives > 0) { E.revive(w); revives++; continue; } break; }
    let g = 0;
    while (!w.ready && g++ < 600 && !w.over) E.update(w, FIXED);
    if (w.over) continue;
    E.moveAim(w, greedyDrop(w, scratch));
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 30; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  return w;
}

const N = Number(process.argv[2] || 3);
const boards = [];
boards.push(['中后期 18 颗', makeBoard(4242, 170)]);
boards.push(['中后期 25 颗', makeBoard(5137, 120)]);
for (let i = 0; i < N; i++) boards.push([`挤压抖动 ${i + 1}`, buildTall(4000 + i * 91)]);

/* 决策前先把盘面推到「运动中」，模拟真实出手时机 */
function perturb(w) {
  const s = E.cloneWorld(w, E.makeWorld({ rng: w.rng }));
  for (let k = 0; k < 6; k++) E.update(s, FIXED);
  return s;
}

console.log('落点是否相同 = 决策有没有被改动；帧数比 = 省了多少推演\n');
let sameX = 0, total = 0;
const rows = [];
for (const [label, base] of boards) {
  const board = perturb(base);
  E.resetDiag(); P.resetDiag();
  P.SETTLE.vibrate = false;
  let t0 = performance.now();
  const a = P.searchBest(board, PROFILE);
  const msA = performance.now() - t0;
  const framesA = E.DIAG.updates;

  E.resetDiag(); P.resetDiag();
  P.SETTLE.vibrate = true;
  t0 = performance.now();
  const b = P.searchBest(board, PROFILE);
  const msB = performance.now() - t0;
  const framesB = E.DIAG.updates;
  P.SETTLE.vibrate = false;

  const same = Object.is(a.x, b.x);
  if (same) sameX++;
  total++;
  const dv = b.value - a.value;
  rows.push({ label, balls: board.balls.length, xA: a.x, xB: b.x, vA: a.value, vB: b.value, framesA, framesB, msA, msB, same });
  console.log(`${label.padEnd(14)} 球数 ${String(board.balls.length).padStart(2)}  ` +
    `落点 ${same ? '相同 ✅' : '不同 ❌'}  ` +
    `帧 ${framesA} → ${framesB}（${(framesA / framesB).toFixed(2)}x）  ` +
    `耗时 ${msA.toFixed(0)} → ${msB.toFixed(0)} ms  Δ值 ${dv >= 0 ? '+' : ''}${dv.toFixed(3)}`);
}

const sumA = rows.reduce((s, r) => s + r.framesA, 0);
const sumB = rows.reduce((s, r) => s + r.framesB, 0);
console.log(`\n落点相同：${sameX}/${total}；物理帧总数 ${sumA} → ${sumB}（${(sumA / sumB).toFixed(2)}x）`);
const maxDv = Math.max(...rows.map(r => Math.abs(r.vB - r.vA)));
console.log(`最大评估值差异：${maxDv.toFixed(4)}（评估值量级约 ${Math.abs(rows[0].vA).toFixed(1)} 上下）`);
process.exit(sameX === total ? 0 : 2);

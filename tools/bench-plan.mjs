/* ============================================================================
 *  bench-plan.mjs —— 「一次决策」到底把时间花在哪
 *
 *  用固定盘面 + 固定参数跑 P.plan()，报告：
 *    · 每次决策的耗时（中位数）
 *    · 各阶段的调用次数：rollout 数 / 物理帧数 / cloneWorld 次数 / 评估次数
 *    · 引擎单帧成本（微基准）
 *
 *  用法：node tools/bench-plan.mjs [deep|normal|fast]
 * ========================================================================== */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

/* ---- 计数：用引擎/规划器自带的诊断计数器 ---- */
const counter = { updates: 0, clones: 0, evals: 0 };
function syncCounter() {
  counter.updates = E.DIAG.updates;
  counter.clones = E.DIAG.clones;
  counter.evals = P.DIAG.evals;
}
function resetCounter() { E.resetDiag(); P.resetDiag(); syncCounter(); }

/* ---- 造一个中后期盘面 ---- */
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

const PROFILES = {
  deep:   { step: 6,  h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, refine: true, innerTop: 6, nextMode: 'known' },
  normal: { step: 8,  h1: 1.2, h2: 2.6, topK: 8,  lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' },
  fast:   { step: 12, h1: 0.9, h2: 1.8, topK: 4,  lookahead: 1, refine: true, innerTop: 3, nextMode: 'known' },
};

const which = process.argv[2] || 'deep';
const opts = PROFILES[which];

const board = makeBoard(4242, 170);
console.log(`盘面：${board.balls.length} 颗水果，分数 ${board.score}，模式=${which}`);
console.log(`参数：${JSON.stringify(opts)}\n`);

/* ---- 引擎单帧成本 ---- */
resetCounter();
for (let i = 0; i < 200; i++) E.update(board, FIXED);
let t0 = performance.now();
const N = 2000;
for (let i = 0; i < N; i++) E.update(board, FIXED);
const usPerFrame = (performance.now() - t0) * 1000 / N;
console.log(`引擎单帧：${usPerFrame.toFixed(1)} µs  （${(1000 / usPerFrame).toFixed(0)} 帧/ms）`);

/* ---- cloneWorld 成本 ---- */
resetCounter();
t0 = performance.now();
const M = 3000;
for (let i = 0; i < M; i++) E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
console.log(`cloneWorld：${((performance.now() - t0) * 1000 / M).toFixed(1)} µs\n`);

/* ---- 决策成本 ---- */
const runs = Number(process.argv[3] || 6);
const times = [];
let last = null;
for (let i = 0; i < runs; i++) {
  resetCounter();
  const t = performance.now();
  last = P.plan(board, { ...opts, weights: P.DEFAULT_WEIGHTS });
  const ms = performance.now() - t;
  syncCounter();
  times.push(ms);
  console.log(`  第 ${i + 1} 次：${ms.toFixed(0)} ms  （物理帧 ${counter.updates}，clone ${counter.clones}，评估 ${counter.evals}）`);
}
times.sort((a, b) => a - b);
const med = times[Math.floor(times.length / 2)];
console.log(`\n决策耗时中位数：${med.toFixed(0)} ms`);
console.log(`其中物理占比 ≈ ${(counter.updates * usPerFrame / med / 1000 * 100).toFixed(0)}%（${counter.updates} 帧 × ${usPerFrame.toFixed(1)} µs）`);
console.log(`cloneWorld 占比 ≈ ${(counter.clones * 8 / med / 1000 * 100).toFixed(0)}%`);
console.log(`选中的落点 x=${last.x.toFixed(2)}  value=${last.value.toFixed(3)}`);

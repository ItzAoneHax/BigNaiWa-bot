/* ============================================================================
 *  verify-parallel.mjs —— 证明「并行版 = 顺序版」（同样的落点、同样的评估值）
 *
 *  并行版把每个阶段切成若干片并发执行，合并时按原顺序拼接 + 稳定排序，
 *  所以结果必须和顺序版逐位一致。这个测试就是拿一堆真实盘面来对答案。
 *
 *  用法：node tools/verify-parallel.mjs [盘面数]
 * ========================================================================== */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

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

/* 本地执行器：把切片再切细一点，模拟「多片合并」的路径 */
function makeLocalExec(world, opts, slices) {
  return async (stage, xs) => {
    const fn = P.STAGES[stage];
    const chunks = [];
    for (let i = 0; i < xs.length; i += slices) chunks.push(xs.slice(i, i + slices));
    const parts = await Promise.all(chunks.map(c => Promise.resolve().then(() => fn(world, opts, c))));
    return parts.flat();
  };
}

const PROFILE = { step: 6, h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, refine: true, innerTop: 6, nextMode: 'known' };
const N = Number(process.argv[2] || 6);
let same = 0;

for (let i = 0; i < N; i++) {
  const board = makeBoard(5000 + i * 137, 90 + i * 25);
  const seq = P.searchBest(board, PROFILE);
  const par = await P.planParallel(board, PROFILE, makeLocalExec(board, PROFILE, 7));
  const ok = seq.x === par.x && Math.abs(seq.value - par.value) < 1e-9 && seq.candCount === par.candCount;
  if (ok) same++;
  console.log(`盘面 ${i + 1}（${board.balls.length} 颗）：顺序 x=${seq.x.toFixed(4)} v=${seq.value.toFixed(6)} | ` +
    `并行 x=${par.x.toFixed(4)} v=${par.value.toFixed(6)}  → ${ok ? '✅ 一致' : '❌ 不一致'}`);
}

console.log(`\n${same}/${N} 个盘面完全一致`);
process.exit(same === N ? 0 : 2);

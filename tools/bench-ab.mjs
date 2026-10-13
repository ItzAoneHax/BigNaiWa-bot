/* ============================================================================
 *  bench-ab.mjs —— 同进程 A/B 对比：优化前的参考副本 vs 当前 src
 *
 *  两边在同一个进程里、同样的盘面上交替计时（A B A B …），
 *  这样机器负载的波动会同时落在两边上，比较结果才可信。
 *  同时核对两边的结果（落点 / 评估值）逐位相同，否则直接报错退出。
 *
 *  用法：node tools/bench-ab.mjs [normal|deep|fast] [轮数]
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';
import * as ER from './ref/engine-ref.js';
import * as PR from './ref/planner-ref.js';

const SHAPES = JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8'));
E.setShapes(JSON.parse(JSON.stringify(SHAPES)));
ER.setShapes(JSON.parse(JSON.stringify(SHAPES)));
const FIXED = E.CFG.FIXED;

const PROFILES = {
  deep:   { step: 6,  h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, refine: true, innerTop: 6, nextMode: 'known' },
  normal: { step: 8,  h1: 1.2, h2: 2.6, topK: 8,  lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' },
  fast:   { step: 12, h1: 0.9, h2: 1.8, topK: 4,  lookahead: 1, refine: true, innerTop: 3, nextMode: 'known' },
};
const which = process.argv[2] || 'normal';
const ROUNDS = Number(process.argv[3] || 3);
const opts = PROFILES[which];

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

/* 与 bench-plan / verify-parallel 相同的中后期盘面（都是还没结束的局） */
const boards = [makeBoard(4242, 170), makeBoard(5137, 120), makeBoard(5274, 90)];
console.log('盘面球数：' + boards.map(b => b.balls.length + (b.over ? '(已结束)' : '')).join(' / '));

/* 同一快照分别搬进两个引擎 */
function twin(w) {
  const snap = E.snapshotOf(w, 1000);
  const a = E.makeWorld({ rng: P.mulberry32(9) });
  E.adoptFromGame(a, snap, null, snap.nowMs);
  const b = ER.makeWorld({ rng: PR.mulberry32(9) });
  ER.adoptFromGame(b, snap, null, snap.nowMs);
  return { a, b };
}

const tA = [], tB = [];
let mismatch = 0;
const rows = [];
for (let r = 0; r < ROUNDS; r++) {
  for (let bi = 0; bi < boards.length; bi++) {
    const { a, b } = twin(boards[bi]);
    let t0 = performance.now();
    const ra = PR.searchBest(b, opts);              // A：参考版（优化前）
    const msA = performance.now() - t0;
    t0 = performance.now();
    const rb = P.searchBest(a, opts);               // B：当前版
    const msB = performance.now() - t0;
    if (!Object.is(ra.x, rb.x) || !Object.is(ra.value, rb.value)) mismatch++;
    tA.push(msA); tB.push(msB);
    rows.push({ board: bi + 1, round: r + 1, refMs: msA, newMs: msB, x: rb.x, value: rb.value });
  }
}

const med = (xs) => { const s = [...xs].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const sumA = tA.reduce((p, q) => p + q, 0), sumB = tB.reduce((p, q) => p + q, 0);
console.log(`档位 ${which}，${boards.length} 个盘面 × ${ROUNDS} 轮，同进程交替计时`);
for (const row of rows) {
  console.log(`  盘面${row.board} 第${row.round}轮：参考 ${row.refMs.toFixed(0).padStart(6)} ms | 当前 ${row.newMs.toFixed(0).padStart(6)} ms | x=${row.x.toFixed(3)}`);
}
console.log(`中位数：参考 ${med(tA).toFixed(0)} ms，当前 ${med(tB).toFixed(0)} ms，单线程加速 ${(med(tA) / med(tB)).toFixed(2)}x`);
console.log(`总和加速 ${(sumA / sumB).toFixed(2)}x`);
console.log(mismatch ? `❌ ${mismatch} 个盘面结果不一致` : '✅ 所有盘面的落点与评估值逐位一致');
process.exit(mismatch ? 2 : 0);

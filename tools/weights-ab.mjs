/* ============================================================================
 *  weights-ab.mjs —— 权重改动的「决策级」体检
 *
 *  跑分实验（tune.mjs）单局方差很大，几十局才看得出 4% 的差别。这里先回答一个更
 *  基本的问题：新权重到底有没有改变落点？如果落点几乎不变，说明权重太小、是惰性的，
 *  那跑分结果自然是「没有差别」；如果落点大面积改变，才值得花几十局去比强弱。
 *
 *  用法：node tools/weights-ab.mjs [盘面数]
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

const PROFILE = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' };
const VARIANTS = [
  ['stuck20-space60', { stuck: 20, space: 60 }],
  ['stuck50-space150', { stuck: 50, space: 150 }],
  ['stuck200-space600', { stuck: 200, space: 600 }],
];

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
function greedyDrop(w, scratch) {
  const xs = P.candidateXs(w.pending, 14);
  let bestX = xs[0], bestV = -Infinity;
  for (const x of xs) {
    const s = E.cloneWorld(w, scratch);
    s.mergedMaxTier = -1; s.freed = 0;
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
  let d = 0;
  while (d < maxDrops && w.balls.length < targetBalls) {
    if (w.over) { if (w.revives > 0) { E.revive(w); continue; } break; }
    let g = 0;
    while (!w.ready && g++ < 600 && !w.over) E.update(w, FIXED);
    if (w.over) continue;
    E.moveAim(w, greedyDrop(w, scratch));
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 30; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  return w;
}

const N = Number(process.argv[2] || 4);
const boards = [['中后期18', makeBoard(4242, 170)], ['中后期25', makeBoard(5137, 120)]];
for (let i = 0; i < N; i++) boards.push([`挤压抖动${i + 1}`, buildTall(4000 + i * 91)]);

const tally = VARIANTS.map(() => ({ same: 0, total: 0, sumDv: 0 }));
console.log('每个盘面对比：base 权重 vs 新权重，看落点改没改\n');
for (const [label, base] of boards) {
  const board = E.cloneWorld(base, E.makeWorld({ rng: base.rng }));
  E.update(board, FIXED); E.update(board, FIXED);      // 推两帧，模拟运动中出手
  const ref = P.searchBest(board, PROFILE);
  const line = [];
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const [vname, w] = VARIANTS[vi];
    const r = P.searchBest(board, { ...PROFILE, weights: { ...P.DEFAULT_WEIGHTS, ...w } });
    const same = Object.is(r.x, ref.x);
    tally[vi].total++;
    if (same) tally[vi].same++;
    tally[vi].sumDv += Math.abs(r.value - ref.value);
    line.push(`${vname}: ${same ? '相同' : `改了(${(r.x - ref.x).toFixed(1)}px)`}`);
  }
  console.log(`${label.padEnd(10)} base x=${ref.x.toFixed(1).padStart(6)} | ${line.join(' | ')}`);
}
console.log('');
for (let vi = 0; vi < VARIANTS.length; vi++) {
  const t = tally[vi];
  console.log(`${VARIANTS[vi][0].padEnd(18)} 落点相同 ${t.same}/${t.total}，平均 |Δ评估值| ${(t.sumDv / t.total).toFixed(1)}`);
}

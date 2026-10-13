/* 密集盘面（底部挤满大果）的物理成本剖析：跑一段推演，供 --cpu-prof 采样 */
import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

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

const mode = process.argv[2] || 'dense';
const board = mode === 'dense' ? buildTall(4091) : (() => {
  const w = E.makeWorld({ rng: P.mulberry32(4242) });
  E.resetWorld(w, { rng: P.mulberry32(4242) });
  const rnd = P.mulberry32(4245);
  let d = 0;
  while (d < 170) { if (w.over && !E.revive(w)) break; E.moveAim(w, 30 + rnd() * 360); if (E.tryDrop(w)) d++; for (let k = 0; k < 34; k++) { E.update(w, FIXED); if (w.over) break; } }
  for (let k = 0; k < 240; k++) E.update(w, FIXED);
  return w;
})();

console.log(`盘面：${board.balls.length} 颗（${mode}）`);

/* ① 单帧成本 */
E.resetDiag();
for (let i = 0; i < 200; i++) E.update(board, FIXED);
let t0 = performance.now();
const N = 1500;
for (let i = 0; i < N; i++) E.update(board, FIXED);
const us = (performance.now() - t0) * 1000 / N;
console.log(`静止单帧：${us.toFixed(1)} µs`);

/* ② 活跃帧成本：每次投放后跑 72 帧 */
t0 = performance.now();
let frames = 0;
for (let r = 0; r < 12; r++) {
  const s = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
  E.dropAt(s, 60 + (r * 31) % 300);
  for (let i = 0; i < 72; i++) { E.update(s, FIXED); frames++; }
}
const usAct = (performance.now() - t0) * 1000 / frames;
console.log(`活跃单帧：${usAct.toFixed(1)} µs（${frames} 帧）`);

/* ③ 一次完整决策（供 profiler 采样主体） */
const opts = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' };
E.resetDiag();
t0 = performance.now();
const dec = P.searchBest(board, opts);
console.log(`一次决策：${(performance.now() - t0).toFixed(0)} ms，物理帧 ${E.DIAG.updates}，落点 x=${dec.x.toFixed(2)}`);

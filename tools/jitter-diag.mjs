/* 抖动诊断：在抖动盘面上，逐窗口打印「最大速度 / 整盘最大位移」，找出规则为什么没触发 */
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

const board = buildTall(4091);
console.log(`抖动盘面：${board.balls.length} 颗`);

/* 模拟一次内层推演：投放一颗已知水果，然后看 156 帧 */
const w = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
E.dropAt(w, 210);

const W = 16;
console.log(`\n每 ${W} 帧一个窗口：`);
console.log('窗口末帧 | 最大速度 | 相对上一窗口的最大位移 | 球数');
let prev = null;
for (let i = 0; i < 160; i++) {
  E.update(w, FIXED);
  if ((i + 1) % W !== 0) continue;
  const pose = w.balls.map(b => [b.tier, b.x, b.y]);
  let shift = 0;
  if (prev && prev.length === pose.length) {
    for (let k = 0; k < pose.length; k++) {
      if (prev[k][0] !== pose[k][0]) { shift = Infinity; break; }
      shift = Math.max(shift, Math.abs(prev[k][1] - pose[k][1]), Math.abs(prev[k][2] - pose[k][2]));
    }
  }
  const sp = E.maxSpeed(w);
  console.log(`${String(i + 1).padStart(8)} | ${sp.toFixed(1).padStart(8)} | ${(prev ? shift.toFixed(3) : '-').padStart(22)} | ${pose.length}`);
  prev = pose;
}

/* ============================================================================
 *  bench-engine.mjs —— 物理内核的「活跃盘面」微基准
 *
 *  静止盘面测出来的单帧成本会严重低估真实推演（接触少、没有修正）。
 *  这里用「刚投下一颗、整盘都在动」的状态来量，才是推演里的真实成本。
 *
 *  用法：node tools/bench-engine.mjs [轮数]
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

const board = makeBoard(4242, 170);
console.log(`盘面：${board.balls.length} 颗，分数 ${board.score}`);

/* 静止态 */
E.resetDiag();
for (let i = 0; i < 500; i++) E.update(board, FIXED);
let t0 = performance.now();
for (let i = 0; i < 3000; i++) E.update(board, FIXED);
const settled = (performance.now() - t0) * 1000 / 3000;

/* 活跃态：每帧都处于「刚丢下一颗、整盘在动」的窗口里 */
const REPS = Number(process.argv[2] || 40);
let frames = 0;
t0 = performance.now();
for (let r = 0; r < REPS; r++) {
  const w = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
  E.moveAim(w, 40 + (r * 29) % 340);
  E.tryDrop(w);
  for (let i = 0; i < 60; i++) { E.update(w, FIXED); frames++; }
}
const active = (performance.now() - t0) * 1000 / frames;

console.log(`静止态单帧：${settled.toFixed(1)} µs`);
console.log(`活跃态单帧：${active.toFixed(1)} µs   ← 推演里用的是这个`);
console.log(`倍数：${(active / settled).toFixed(1)}x`);
console.log(`\n一次 deep 决策约 32000 帧 → 约 ${(32000 * active / 1e6).toFixed(1)} 秒（与 bench-plan 的实测对得上）`);

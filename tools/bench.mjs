/* 微基准：量一下 update() 每秒能跑多少步，顺便给出盘面规模 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
E.setShapes(JSON.parse(fs.readFileSync(path.join(__dirname, '../src/shapes.json'), 'utf8')));

const w = E.makeWorld({ rng: P.mulberry32(7) });
E.resetWorld(w, { rng: P.mulberry32(7) });
/* 造一个中等规模的盘面：随机丢 40 颗，让它自然堆积 */
for (let i = 0; i < 40; i++) {
  E.moveAim(w, 40 + (i * 37) % 340);
  E.tryDrop(w);
  for (let k = 0; k < 40; k++) { E.update(w, E.CFG.FIXED); if (w.over) break; }
  if (w.over) { E.revive(w); }
}
for (let k = 0; k < 240; k++) E.update(w, E.CFG.FIXED);

console.log('balls =', w.balls.length, 'score =', w.score);

const N = 3000;
const t0 = performance.now();
for (let i = 0; i < N; i++) E.update(w, E.CFG.FIXED);
const t1 = performance.now();
const us = (t1 - t0) * 1000 / N;
console.log(`update(): ${us.toFixed(1)} µs/step  →  ${(1e6 / us / 60).toFixed(2)} 倍实时`);

/* 克隆成本 */
const t2 = performance.now();
const M = 2000;
for (let i = 0; i < M; i++) E.cloneWorld(w, E.makeWorld({ rng: w.rng }));
const t3 = performance.now();
console.log(`cloneWorld(): ${((t3 - t2) * 1000 / M).toFixed(1)} µs`);

/* 一次典型推演的成本 */
const t4 = performance.now();
const R = 20;
for (let i = 0; i < R; i++) {
  const s = E.cloneWorld(w, E.makeWorld({ rng: w.rng }));
  E.dropAt(s, 100 + i * 5);
  for (let k = 0; k < 72; k++) E.update(s, E.CFG.FIXED);
}
const t5 = performance.now();
console.log(`一次 1.2s 推演: ${((t5 - t4) / R).toFixed(1)} ms`);

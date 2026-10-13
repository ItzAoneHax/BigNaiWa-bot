/* 微基准：测每档「外形保真度」的 update() 成本，以及 28 球盘面的推演成本 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));

/* 造一个 28 球的中后期盘面（固定种子，各档位共用同一初始局面） */
function makeBoard(seed, target) {
  E.setShapeMode('exact');
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  let drops = 0;
  const rnd = P.mulberry32(seed + 1);
  while (drops < 900 && w.balls.length < target) {
    E.moveAim(w, 30 + rnd() * 360);
    if (E.tryDrop(w)) drops++;
    for (let k = 0; k < 34; k++) { E.update(w, E.CFG.FIXED); if (w.over) break; }
    if (w.over) E.revive(w);
  }
  for (let k = 0; k < 300; k++) E.update(w, E.CFG.FIXED);
  return w;
}

const board = makeBoard(11, 28);
console.log('board balls:', board.balls.length, 'score:', board.score);

const modes = [
  ['exact', 'exact'],
  ['parts=8', { parts: 8 }],
  ['parts=4', { parts: 4 }],
  ['parts=2', { parts: 2 }],
  ['parts=1', { parts: 1 }],
  ['circle r=1.0', { circle: 1.0 }],
  ['circle r=0.92', { circle: 0.92 }],
];

console.log('\n模式            静止成本    推演1.2s(单次)  相对速度');
for (const [label, mode] of modes) {
  E.setShapeMode(mode);
  const w = E.cloneWorld(board, E.makeWorld({ rng: P.mulberry32(1) }));
  /* 把球换成当前档位的外形 */
  const balls = [];
  for (const b of w.balls) {
    const nb = E.makeBall(w, b.x, b.y, b.tier, b.vx, b.vy);
    nb.angle = b.angle; nb.px = b.px; nb.py = b.py; nb.landed = true; nb.overTime = b.overTime;
    balls.push(nb);
  }
  w.balls = balls;
  for (let k = 0; k < 120; k++) E.update(w, E.CFG.FIXED);

  const N = 600;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) E.update(w, E.CFG.FIXED);
  const us = (performance.now() - t0) * 1000 / N;

  const R = 10;
  const t1 = performance.now();
  for (let i = 0; i < R; i++) {
    const s = E.cloneWorld(w, E.makeWorld({ rng: P.mulberry32(2) }));
    E.dropAt(s, 100 + i * 12);
    for (let k = 0; k < 72; k++) E.update(s, E.CFG.FIXED);
  }
  const ms = (performance.now() - t1) / R;
  console.log(`${label.padEnd(14)} ${us.toFixed(0).padStart(6)} µs   ${ms.toFixed(1).padStart(8)} ms     ${(1e6 / us / 60).toFixed(0)}x 实时`);
}

E.setShapeMode('exact');

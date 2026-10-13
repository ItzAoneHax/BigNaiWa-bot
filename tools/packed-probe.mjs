/* ============================================================================
 *  packed-probe.mjs —— 构造「像截图那样被塞满、上下挤压」的盘面，量两件事：
 *    ① 推演里有多少帧是「盘面其实已经冻住、只是规则看不出来」的；
 *    ② 新规则（整盘净位移）能省多少帧，且会不会改变落点。
 *  用法：node tools/packed-probe.mjs
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

/* 把盘面塞满：大果交错堆放（同级不相邻，避免立刻合成），带一点重叠制造挤压 */
function packedBoard(seed, rows = 4, perRow = 8) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const rnd = P.mulberry32(seed * 13 + 5);
  const order = [9, 7, 8, 6, 9, 8, 7, 6, 5, 9, 8, 7, 6, 5, 4];
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    const y = 660 - row * 105;
    for (let i = 0; i < perRow; i++) {
      const t = order[(idx * 3 + row) % order.length];
      idx++;
      const r = E.FRUITS[t].r;
      const x = 32 + (i + (row % 2) * 0.5) * ((420 - 64) / perRow);
      if (x - r < 0 || x + r > 420) continue;
      const b = E.makeBall(w, x + (rnd() - 0.5) * 6, y, t, 0, 0);
      b.landed = true;
      w.balls.push(b);
    }
  }
  return w;
}

function run(w0, frames, label) {
  const w = E.cloneWorld(w0, E.makeWorld({ rng: w0.rng }));
  const W = 16;
  let prev = null, frozen = 0, stopAt = -1, maxSp = 0, minSp = Infinity;
  const speeds = [];
  for (let i = 0; i < frames; i++) {
    E.update(w, FIXED);
    if (w.over) { console.log(`  [${label}] 第 ${i} 帧判负`); break; }
    const sp = E.maxSpeed(w);
    speeds.push(sp);
    if (sp > maxSp) maxSp = sp;
    if (sp < minSp) minSp = sp;
    if ((i + 1) % W !== 0) continue;
    const pose = w.balls.map(b => [b.tier, b.x, b.y]);
    if (prev && prev.length === pose.length) {
      let shift = 0, ok = true;
      for (let k = 0; k < pose.length; k++) {
        if (prev[k][0] !== pose[k][0]) { ok = false; break; }
        shift = Math.max(shift, Math.abs(prev[k][1] - pose[k][1]), Math.abs(prev[k][2] - pose[k][2]));
      }
      if (ok && shift < 1.5) { frozen++; if (frozen >= 2 && stopAt < 0) stopAt = i + 1; }
      else frozen = 0;
    } else frozen = 0;
    prev = pose;
  }
  const legacy = speeds.findIndex((s, i) => i >= 42 && (i & 3) === 0 && s < 25);
  console.log(`  [${label}] ${speeds.length} 帧：速度 ${minSp.toFixed(1)}~${maxSp.toFixed(1)} px/s；` +
    `末帧速度 ${speeds[speeds.length - 1].toFixed(1)}`);
  console.log(`      旧规则最早收工帧：${legacy < 0 ? '从未触发（跑满）' : legacy + 1}；` +
    `新规则最早收工帧：${stopAt < 0 ? '未触发' : stopAt}`);
  return { stopAt, legacy };
}

console.log('构造被塞满的盘面（模拟截图那种挤压局面）:\n');
for (let s = 0; s < 3; s++) {
  const board = packedBoard(100 + s * 7, 4, 8);
  console.log(`盘面 ${s + 1}：${board.balls.length} 颗，顶高 ${E.stackTop(board).toFixed(0)}，分数 ${board.score}`);
  /* 原地观察 */
  run(board, 200, '原地');
  /* 推演观察：投放后跑满 h1 / h2 */
  for (const [tier, x] of [[1, 210], [3, 120]]) {
    const s1 = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
    s1.pending = tier;
    E.dropAt(s1, x);
    run(s1, 72, `投放t${tier}@${x} h1=72`);
    const s2 = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
    s2.pending = tier;
    E.dropAt(s2, x);
    run(s2, 156, `投放t${tier}@${x} h2=156`);
  }
  console.log('');
}

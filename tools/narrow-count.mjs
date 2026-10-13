/* 窄相位计数：一次球球判定里，各层过滤各放行多少、有多少次真正改进了 minGap。
   用来判断「推迟 sqrt」值不值得做（sqrt 只在能改进 minGap 时才需要算）。
   只读，不改物理。 */
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
console.log(`抖动盘面 ${board.balls.length} 颗`);

/* 在一个真实帧序列上统计（用引擎跑，统计每次 stepPhysics 里的判定层） */
const w = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
E.dropAt(w, 210);

let broad = 0, farPass = 0, overlap = 0, improve = 0, partsScanned = 0;
for (let f = 0; f < 72; f++) {
  E.update(w, FIXED);
  /* 只对「当前帧」的状态统计一次（3 子步 × 6 迭代的真实调用由引擎内部完成，
     这里统计的是同一份代码路径在单次迭代下的比例） */
  const balls = w.balls;
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.dead) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.dead) continue;
      const cdx = b.x - a.x, cdy = b.y - a.y;
      const rbSum = a.rb + b.rb;
      if (cdx * cdx + cdy * cdy >= rbSum * rbSum) continue;
      broad++;
      let minGap = 1e9;
      for (let m = 0; m < a.np; m++) {
        const ax = a.wx[m], ay = a.wy[m], ar = a.ws[m];
        const ddx = b.x - ax, ddy = b.y - ay;
        const far = b.rb + ar;
        if (ddx * ddx + ddy * ddy >= far * far) continue;
        farPass++;
        for (let k = 0; k < b.np; k++) {
          const bx = b.wx[k], by = b.wy[k], br = b.ws[k];
          const dx = bx - ax, dy = by - ay;
          const sum = ar + br;
          const d2 = dx * dx + dy * dy;
          partsScanned++;
          if (d2 >= sum * sum) continue;
          overlap++;
          const d = Math.sqrt(d2);
          const gap = d - sum;
          if (gap < minGap) { minGap = gap; improve++; }
        }
      }
    }
  }
}
console.log(`72 帧合计（单次迭代口径）：
  包围圆粗筛通过（球球对）     ${broad}
  小圆对扫描（m 层过滤后）     ${partsScanned}
  真正重叠（需要 minGap 判定） ${overlap}   ← 这些都要算 Math.sqrt
  真正改进 minGap 的次数       ${improve}
  sqrt 可省比例：${(100 * (1 - improve / Math.max(1, overlap))).toFixed(1)}%`);

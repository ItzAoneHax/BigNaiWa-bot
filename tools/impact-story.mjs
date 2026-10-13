/* ============================================================================
 *  impact-story.mjs —— 挑一手「连锁最猛」的落子，把它引发的全过程打印成时间线
 *
 *  用途：证明（而不是声称）推演里确实算了
 *    · 落下的奶蛙把场上水果撞动、撞动的水果又触发别处的合成
 *    · 合成本体消失后腾出的空间、以及新果带的 -60px/s 上抛初速
 *
 *  用法：node tools/impact-story.mjs [seed]
 * ========================================================================== */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;
const SEED = Number(process.argv[2] || 1133);

/* ---- 造盘 ---- */
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

/* ---- 跑一个候选，记录时间线 + 每颗老水果的位移 ---- */
function run(board, x, H = 2.0) {
  const w = E.cloneWorld(board, E.makeWorld({ rng: board.rng }));
  w.mergeTrace = [];
  const base = board.balls.map(b => ({ ref: b, x: b.x, y: b.y }));
  const score0 = w.score;
  E.dropAt(w, x);
  const droppedTier = w.balls[w.balls.length - 1].tier;
  w.balls[w.balls.length - 1].gen = 0;

  const n = Math.round(H / FIXED);
  for (let i = 0; i < n; i++) {
    E.update(w, FIXED);
    if (w.over) break;
    if (i > 60 && (i & 3) === 0 && E.maxSpeed(w) < 25) break;
  }

  const moves = [];
  for (const s of base) {
    if (s.ref.dead) continue;
    const d = Math.hypot(s.ref.x - s.x, s.ref.y - s.y);
    if (d > 3) moves.push({ tier: s.ref.tier, name: E.FRUITS[s.ref.tier].name, d: +d.toFixed(1), x: +s.x.toFixed(0), y: +s.y.toFixed(0) });
  }
  moves.sort((a, b) => b.d - a.d);
  return { x, droppedTier, events: (w.mergeTrace || []).slice(), gain: w.score - score0, moves, balls: w.balls.length };
}

/* ---- 找一个「看着会有戏」的盘面 + 连锁最多的落点 ---- */
let board = null, best = null;
for (const seed of [SEED, SEED + 7, SEED + 21, SEED + 55]) {
  const b = makeBoard(seed, 170);
  for (const x of P.candidateXs(b.pending, 20)) {
    const r = run(b, x, 2.0);
    const chain = r.events.filter(e => e.gen >= 1).length;
    if (!best || chain > best.chain || (chain === best.chain && r.events.length > best.r.events.length)) {
      best = { chain, r, seed };
      board = b;
    }
  }
}

const r = best.r;
console.log(`盘面：seed=${best.seed}，${board.balls.length} 颗水果，最高分处 ${board.score}`);
console.log(`这一手：投下【${E.FRUITS[r.droppedTier].name}】到 x=${r.x.toFixed(1)}\n`);
console.log('时间线：');
let last = 0;
for (const ev of r.events) {
  const t = (ev.step * FIXED).toFixed(2);
  const who = ev.gen === 0 ? '← 直接和刚落下的那颗合成' : `← 连锁！第 ${ev.gen} 代（不是落子本体，是被它撞动/腾出空间带出来的）`;
  const gap = ev.step - last;
  console.log(`  t=${t}s  ${E.FRUITS[ev.tier].name.padEnd(4)} 在 (${ev.x.toFixed(0)}, ${ev.y.toFixed(0)}) 合成  ${who}` +
    (gap > 6 ? `   （距上一跳 ${(gap * FIXED).toFixed(2)}s）` : ''));
  last = ev.step;
}
console.log(`\n这一手净得 ${r.gain} 分，共引发 ${r.events.length} 次合成（连锁 ${r.events.filter(e => e.gen >= 1).length} 次）`);
if (r.moves.length) {
  console.log('\n被这一手推动的老水果（前 6 个）：');
  for (const m of r.moves.slice(0, 6)) {
    console.log(`  ${m.name.padEnd(4)} 从 (${m.x}, ${m.y}) 被推了 ${m.d}px`);
  }
}

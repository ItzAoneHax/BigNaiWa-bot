/* 探针：看「投掷时机」到底怎么选、值不值 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));

function play(seed, timing, maxDrops = 120, opts = {}) {
  const rng = P.mulberry32(seed);
  const w = E.makeWorld({ rng });
  E.resetWorld(w, { rng });
  const stats = { now: 0, settle: 0, quiet: 0, waitFrames: 0, settleBetter: 0, nowBetter: 0 };
  const planOpts = { step: 10, h1: 0.9, h2: 1.8, topK: 4, lookahead: 1, timing, ...opts };
  while (w.drops < maxDrops) {
    let g2 = 0;
    while (!w.ready && !w.over && g2 < 60) { E.update(w, E.CFG.FIXED); g2++; }
    if (w.over) { if (w.revives > 0) { E.revive(w); continue; } break; }
    const speedBefore = E.maxSpeed(w);
    const dec = P.plan(w, planOpts);
    stats[dec.choice] = (stats[dec.choice] || 0) + 1;
    if (dec.choice === 'settle') {
      stats.waitFrames += dec.delayFrames;
      if (speedBefore > 60) stats.settleBetter++;
    } else if (speedBefore > 60) stats.nowBetter++;
    E.dropAt(w, dec.x);
  }
  return { seed, timing, score: w.score, drops: w.drops, stats };
}

const rows = [];
for (const timing of ['now', 'auto']) {
  for (let i = 0; i < 3; i++) rows.push(play(3000 + i, timing));
}
for (const r of rows) {
  console.log(`${r.timing.padEnd(5)} seed=${r.seed} 分数=${String(r.score).padStart(5)} 投放=${String(r.drops).padStart(4)}  ` +
    `选择：立刻=${r.stats.now || 0} 等待=${r.stats.settle || 0} 本来安静=${r.stats.quiet || 0}  平均等待帧=${r.stats.settle ? (r.stats.waitFrames / r.stats.settle).toFixed(0) : 0}`);
}
const avg = t => rows.filter(r => r.timing === t).reduce((a, b) => a + b.score, 0) / rows.filter(r => r.timing === t).length;
console.log(`\n平均分：now=${avg('now').toFixed(1)}  auto=${avg('auto').toFixed(1)}`);

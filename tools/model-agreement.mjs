/* ============================================================================
 *  model-agreement.mjs —— 「外形保真度」对决策质量的影响
 *
 *  做法：取若干真实盘面，对同一批候选落点分别用不同保真度推演，
 *        以 exact（=线上物理）的排序为基准，比较：
 *          · top1 命中率：低精度模型挑的落点和 exact 挑的是不是同一个
 *          · top3 召回：exact 的前三名有没有被低精度模型留在前三
 *          · Spearman 秩相关：整条排序的一致性
 *
 *  用法：node tools/model-agreement.mjs --boards 12 --step 6
 * ========================================================================== */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : (isNaN(Number(v)) ? v : Number(v));
}
const N_BOARDS = arg('boards', 12);
const STEP = arg('step', 6);
const H = arg('h', 1.2);

/* 造若干不同阶段的真实盘面 */
function makeBoard(seed, drops) {
  E.setShapeMode('exact');
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const rnd = P.mulberry32(seed + 7);
  let d = 0;
  while (d < drops) {
    E.moveAim(w, 30 + rnd() * 360);
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 34; k++) { E.update(w, E.CFG.FIXED); if (w.over) break; }
    if (w.over) E.revive(w);
  }
  for (let k = 0; k < 300; k++) E.update(w, E.CFG.FIXED);
  return w;
}

function rolloutValues(board, mode, xs) {
  E.setShapeMode(mode);
  const scratch = E.makeWorld({ rng: P.mulberry32(1) });
  const out = [];
  for (const x of xs) {
    const s = E.cloneWorld(board, scratch);
    /* 让新球的形状跟随当前档位 */
    const b0 = s.balls.slice();
    s.balls = b0.map(b => {
      const nb = E.makeBall(s, b.x, b.y, b.tier, b.vx, b.vy);
      nb.angle = b.angle; nb.px = b.px; nb.py = b.py; nb.landed = true; nb.overTime = b.overTime;
      return nb;
    });
    const before = s.score;
    E.dropAt(s, x);
    for (let k = 0; k < Math.round(H / E.CFG.FIXED); k++) { E.update(s, E.CFG.FIXED); if (s.over) break; }
    out.push(P.evaluate(s, before));
  }
  E.setShapeMode('exact');
  return out;
}

function spearman(a, b) {
  const n = a.length;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(n);
    idx.forEach(([_, i], k) => { r[i] = k; });
    return r;
  };
  const ra = rank(a), rb = rank(b);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const MODES = [
  ['exact', 'exact'],
  ['parts=8', { parts: 8 }],
  ['parts=4', { parts: 4 }],
  ['parts=2', { parts: 2 }],
  ['circle 1.00', { circle: 1.0 }],
  ['circle 0.92', { circle: 0.92 }],
];

const stats = {};
for (const [label] of MODES) stats[label] = { top1: 0, top3: 0, rho: 0, n: 0, time: 0 };

const t0 = Date.now();
for (let bi = 0; bi < N_BOARDS; bi++) {
  const drops = 30 + bi * 12;
  const board = makeBoard(2000 + bi, drops);
  const xs = P.candidateXs(board.pending, STEP);

  const values = {};
  for (const [label, mode] of MODES) {
    const tt = performance.now();
    const vals = rolloutValues(board, mode, xs);
    stats[label].time += performance.now() - tt;
    values[label] = vals;
  }
  const truth = values['exact'];
  const bestIdx = (arr) => arr.indexOf(Math.max(...arr));
  const t1 = bestIdx(truth);
  const top3Truth = new Set(truth.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i));

  for (const [label] of MODES) {
    const vals = values[label];
    const s = stats[label];
    const b1 = bestIdx(vals);
    if (b1 === t1) s.top1++;
    const top3 = vals.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i);
    if (top3.some(i => top3Truth.has(i))) s.top3++;
    s.rho += spearman(truth, vals);
    s.n++;
  }
  process.stdout.write(`\r盘面 ${bi + 1}/${N_BOARDS} (drops=${drops}, balls=${board.balls.length}, 候选=${xs.length})   `);
}
console.log('\n');

console.log('模型          top1 命中   top3 召回   秩相关ρ     总耗时');
for (const [label] of MODES) {
  const s = stats[label];
  console.log(`${label.padEnd(12)} ${(100 * s.top1 / s.n).toFixed(0).padStart(6)}%   ${(100 * s.top3 / s.n).toFixed(0).padStart(7)}%   ${(s.rho / s.n).toFixed(3).padStart(7)}   ${(s.time / 1000).toFixed(1)}s`);
}
console.log(`\n总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s   (基准 = exact 保真度)`);

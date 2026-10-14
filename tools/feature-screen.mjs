/* ============================================================================
 *  feature-screen.mjs —— 新特征/新权重改动的「决策级」体检（跑分实验之前先做）
 *
 *  跑分实验很贵（一局 6 分钟），先用便宜的方式回答三件事：
 *    ① 这个特征在真实盘面上、各个候选落点之间的**跨度**有多大
 *       （跨度太小的项，权重给多大都是惰性的 —— 这就是过去 stuck/space 白测的原因）
 *    ② 按「让它的跨度 ≈ k × 合成分跨度」自动标定权重后，落点会改多少
 *    ③ 落点改动的方向合不合理（打印改前改后的 x 和各项取值）
 *
 *  用法：
 *    node tools/feature-screen.mjs --scales 0.25,0.5,1 --boards 4
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
E.setShapes(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/shapes.json'), 'utf8')));

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

/* 要体检的特征（0 = 现有但是关着的，其余是本轮新增） */
const FEATURES = ['flat', 'pool', 'ground', 'strand', 'mono', 'bump', 'stuck'];
const SCALES = String(arg('scales', '0.25,0.5,1')).split(',').map(Number);
const NB = Number(arg('boards', 4));
const THINK = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };

/* ---- 造真实盘面：按 live 协议真打若干手，取那一刻的盘面 ---- */
function makeBoards() {
  const boards = [];
  const seeds = [9401, 9402, 9403];
  const wants = [70, 140, 210, 260];
  for (let i = 0; i < seeds.length && boards.length < NB + 1; i++) {
    const seed = seeds[i];
    const gameRng = P.mulberry32(seed >>> 0);
    const planRng = P.mulberry32(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
    const w = E.makeWorld({ rng: gameRng });
    E.resetWorld(w, { rng: gameRng });
    const target = wants[Math.min(i, wants.length - 1)];
    while (w.drops < target) {
      let g = 0;
      for (;;) { if (w.over) break; if (w.ready) break; if (g++ > 3000) break; E.update(w, E.CFG.FIXED); }
      if (w.over) { if (w.revives > 0) { E.revive(w); continue; } break; }
      const saved = w.rng; w.rng = planRng;
      const dec = P.searchBest(w, THINK);
      w.rng = saved;
      E.update(w, E.CFG.FIXED);
      if (!w.over) E.dropAt(w, dec.x);
    }
    /* 收尾：必须停在「可以投放」且盘面已静止的状态 ——
       否则 rolloutValue 里的 E.dropAt 会因为 !ready 直接失败，
       46 个候选会推演出**同一个盘面**（第一次跑就是这么被坑的） */
    let g2 = 0;
    while (!w.ready && g2++ < 3000 && !w.over) E.update(w, E.CFG.FIXED);
    g2 = 0;
    while (E.maxSpeed(w) > 60 && g2++ < 180 && !w.over) E.update(w, E.CFG.FIXED);
    E.update(w, E.CFG.FIXED); E.update(w, E.CFG.FIXED);
    boards.push({ label: `seed${seed}#${w.drops}手(${w.balls.length}颗,${w.score}分)`, w, planRng });
  }
  return boards;
}

const boards = makeBoards();
console.log('盘面：' + boards.map(b => b.label).join(' | '));

/* ---- ① 逐候选推演一次，量各特征的跨度 ---- */
const spans = {};
const perBoard = [];
for (const bd of boards) {
  const w = bd.w;
  const xs = P.candidateXs(w.pending, THINK.step);
  const rows = [];
  for (const x of xs) {
    const o = P.rolloutValue(w, x, THINK.h2, P.DEFAULT_WEIGHTS, E.makeWorld({ rng: bd.planRng }), 0.9 + 0.6);
    const f = P.features(o.sim);
    rows.push({ x, gain: o.gain, v: o.v, f });
  }
  for (const k of ['flat', 'pool', 'ground', 'strand', 'strandN', 'strandTrapped', 'mono', 'bump', 'stuck', 'merge', 'adj', 'bigPair', 'blocked', 'bigHigh', 'buried']) {
    let lo = Infinity, hi = -Infinity;
    for (const r of rows) {
      const val = (k === 'merge') ? r.gain : r.f[k];
      if (val === undefined) continue;
      if (val < lo) lo = val; if (val > hi) hi = val;
    }
    if (hi >= lo) { spans[k] = spans[k] || []; spans[k].push(hi - lo); }
  }
  perBoard.push({ bd, rows });
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log('\n① 各特征在候选落点之间的跨度（中位数，只有跨度足够大的项才可能改变决策）');
const mergeSpan = med(spans['merge'] || [0]);
for (const k of ['merge', 'adj', 'bigPair', 'blocked', 'bigHigh', 'buried', 'bump', 'mono', 'flat', 'pool', 'ground', 'stuck']) {
  if (!spans[k]) { console.log(`   ${k.padEnd(9)} —（该项在各盘面上恒为 0）`); continue; }
  const m = med(spans[k]);
  console.log(`   ${k.padEnd(9)} 跨度中位 ${m.toFixed(4).padStart(10)}   ÷合成分跨度 ${(m / (mergeSpan || 1)).toFixed(3)}`);
}

/* ---- ② 自动标定权重 + 决策级 A/B ---- */
console.log(`\n② 自动标定权重（让新项跨度 ≈ scale × 合成分跨度）后，落点改变情况`);
console.log('特征'.padEnd(9) + 'scale'.padStart(7) + '权重'.padStart(10) + '落点改变'.padStart(10) + '平均|x差|'.padStart(11) + '评估值变化'.padStart(11));
for (const k of FEATURES) {
  if (!spans[k]) continue;
  const span = med(spans[k]);
  if (!(span > 0)) { console.log(`${k.padEnd(9)} 惰性（各候选完全相同）`); continue; }
  for (const s of SCALES) {
    const weight = +(s * mergeSpan / span).toPrecision(3);
    let changed = 0, dx = 0, dv = 0;
    const detail = [];
    for (const { bd, rows } of perBoard) {
      const ref = P.searchBest(bd.w, THINK);
      const r2 = P.searchBest(bd.w, { ...THINK, weights: { ...P.DEFAULT_WEIGHTS, [k]: weight } });
      if (!Object.is(ref.x, r2.x)) { changed++; dx += Math.abs(r2.x - ref.x); }
      dv += Math.abs(r2.value - ref.value);
      detail.push(`${ref.x.toFixed(0)}→${r2.x.toFixed(0)}`);
    }
    console.log(k.padEnd(9) + String(s).padStart(7) + String(weight).padStart(10) +
      `${changed}/${perBoard.length}`.padStart(10) + (changed ? (dx / changed).toFixed(1) : '—').padStart(11) +
      (dv / perBoard.length).toFixed(1).padStart(11) + '   ' + detail.join(' '));
  }
}

/* ---- ③ 打印冠军落点处各新项的实际取值，判断方向 ---- */
console.log('\n③ 冠军落点处的新项取值（看方向：flat 应该更小、pool/ground 应该更大才有意义）');
console.log('盘面'.padEnd(28) + 'x'.padStart(7) + 'flat'.padStart(9) + 'pool'.padStart(9) + 'ground'.padStart(9) + 'bump'.padStart(9) + 'mono'.padStart(9));
for (const { bd, rows } of perBoard) {
  const best = rows.reduce((a, b) => (b.v > a.v ? b : a), rows[0]);
  console.log(bd.label.padEnd(28) + best.x.toFixed(0).padStart(7) +
    best.f.flat.toFixed(3).padStart(9) + best.f.pool.toFixed(3).padStart(9) + best.f.ground.toFixed(3).padStart(9) +
    best.f.bump.toFixed(3).padStart(9) + best.f.mono.toFixed(3).padStart(9));
}

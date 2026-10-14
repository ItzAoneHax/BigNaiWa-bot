/* ============================================================================
 *  tie-probe.mjs —— 落点搜索里「并列」有多普遍？并列时 bot 挑的是哪一个？
 *
 *  背景：tools/eval-breakdown.mjs 发现早期盘面所有候选落点的评估值完全一样
 *  （跨度 0.02）。而 searchBest 的排序是稳定排序 → 并列时保留最左边的候选。
 *  本工具量化三件事：
 *    ① 每一手里「前 8 名评价值的极差」有多大（越小越说明搜索没有分辨力）
 *    ② 并列时实际落点 x 的分布（是不是永远贴着左墙）
 *    ③ 换一个并列打破规则（比如「往堆得低的一侧丢」）会改变多少落点
 *
 *  用法：node tools/tie-probe.mjs --seed 9200 --drops 200
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

const SEED = Number(arg('seed', 9200));
const MAXDROPS = Number(arg('drops', 200));
const THINK = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };

const gameRng = P.mulberry32(SEED >>> 0);
const planRng = P.mulberry32(((SEED >>> 0) ^ 0x9e3779b9) >>> 0);
const w = E.makeWorld({ rng: gameRng });
E.resetWorld(w, { rng: gameRng });

/* 「往堆得低的地方丢」这个启发式：算出每个候选落点处的堆顶高度 */
function profileAt(world, x) {
  const rb = E.FRUITS[world.pending].r;
  let top = E.CFG.H - E.CFG.WALL;
  for (const b of world.balls) {
    if (b.dead) continue;
    const dx = Math.abs(b.x - x);
    if (dx > b.r + rb) continue;
    const t = b.y - b.r;
    if (t < top) top = t;
  }
  return top;
}

const rec = [];
while (w.drops < MAXDROPS) {
  let guard = 0;
  for (;;) {
    if (w.over) break;
    if (w.ready) break;
    if (guard++ > 3000) break;
    E.update(w, E.CFG.FIXED);
  }
  if (w.over) { if (w.revives > 0) { E.revive(w); continue; } break; }

  const xs = P.candidateXs(w.pending, THINK.step);
  const vals = xs.map(x => P.rolloutValue(w, x, THINK.h1, P.DEFAULT_WEIGHTS, E.makeWorld({ rng: planRng }), 0.9).v);
  const order = xs.map((x, i) => ({ x, v: vals[i] })).sort((a, b) => b.v - a.v);
  const span8 = order[0].v - order[Math.min(7, order.length - 1)].v;
  const spanAll = order[0].v - order[order.length - 1].v;

  /* 前 8 名里「价值并列」的候选，用「堆顶更低」打破；看会不会和 searchBest 的落点不同 */
  const eps = 0.5;
  const tied = order.filter(o => order[0].v - o.v <= eps);
  let lowPick = tied[0].x, lowTop = -Infinity;
  for (const o of tied) { const t = profileAt(w, o.x); if (t > lowTop) { lowTop = t; lowPick = o.x; } }

  const saved = w.rng; w.rng = planRng;
  const dec = P.searchBest(w, THINK);
  w.rng = saved;

  rec.push({
    drops: w.drops, tier: w.pending, x: dec.x, xlo: xs[0], xhi: xs[xs.length - 1],
    span8, spanAll, nTied: tied.length, lowPick, nBalls: w.balls.length,
  });

  E.update(w, E.CFG.FIXED);
  if (!w.over) E.dropAt(w, dec.x);
}

const n = rec.length;
const tiedRows = rec.filter(r => r.span8 <= 0.5);
const mid = E.CFG.W / 2;
const nearLo = rec.filter(r => Math.abs(r.x - r.xlo) < 1e-6).length;
const meanAbsDev = rec.reduce((a, r) => a + Math.abs(r.x - mid), 0) / n;
const lowDiff = rec.filter(r => Math.abs(r.lowPick - r.x) > 1e-6).length;

console.log(`seed=${SEED} 共 ${n} 手（结束 ${w.drops} 手 ${w.score} 分）`);
console.log(`① 前 8 名极差 ≤0.5 的手数（= 搜索没有分辨力）：${tiedRows.length}/${n} = ${(tiedRows.length / n * 100).toFixed(1)}%`);
console.log(`   极差中位数 ${[...rec].sort((a, b) => a.span8 - b.span8)[Math.floor(n / 2)].span8.toFixed(3)}  全部候选极差中位数 ${[...rec].sort((a, b) => a.spanAll - b.spanAll)[Math.floor(n / 2)].spanAll.toFixed(2)}`);
console.log(`② 落点贴左极限（x == 可投最左）的手数：${nearLo}/${n} = ${(nearLo / n * 100).toFixed(1)}%；落点离中线平均 ${meanAbsDev.toFixed(1)}px`);
console.log(`   落点 x 分布（每 42px 一档）：` + Array.from({ length: 10 }, (_, k) => rec.filter(r => r.x >= 10 + k * 40 && r.x < 10 + (k + 1) * 40).length).join(' '));
console.log(`③ 若用「往堆得低的一侧丢」打破并列，落点会变的手数：${lowDiff}/${n} = ${(lowDiff / n * 100).toFixed(1)}%`);
console.log('   前后各 6 手明细：');
for (const r of rec.slice(0, 6).concat(rec.slice(-6))) {
  console.log(`     #${String(r.drops).padStart(3)} tier=${r.tier} balls=${String(r.nBalls).padStart(2)} x=${r.x.toFixed(1).padStart(6)} (可投 ${r.xlo.toFixed(0)}~${r.xhi.toFixed(0)}) 前8极差=${r.span8.toFixed(2).padStart(7)} 并列数=${r.nTied} 低侧落点=${r.lowPick.toFixed(1)}`);
}

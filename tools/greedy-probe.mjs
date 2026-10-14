/* ============================================================================
 *  greedy-probe.mjs —— 「只最大化合成、完全不管高度」能打多久？
 *
 *  起因：造危机盘面时发现，纯贪心（每个候选跑 0.6s 推演，取合成分最高的落点）
 *  一路打到上千手，盘面却一直只有 4~7 颗球、堆顶离警戒线很远。
 *  如果这是真的，那说明「堆高→判负」并不是材料流量的必然结果，
 *  而是当前风险项（top/above/overT）把落点推到边角造成的。
 *
 *  用法：node tools/greedy-probe.mjs --drops 600 --mode greedy|base
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

const MAXDROPS = Number(arg('drops', 600));
const MODE = String(arg('mode', 'greedy'));
const SEED = Number(arg('seed', 9700));
const BASE_THINK = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };

const w = E.makeWorld({ rng: P.mulberry32(SEED >>> 0) });
E.resetWorld(w, { rng: P.mulberry32(SEED >>> 0) });
const planRng = P.mulberry32(((SEED >>> 0) ^ 0x9e3779b9) >>> 0);
const scratch = E.makeWorld({ rng: P.mulberry32(SEED + 5) });

function greedyX(world) {
  const xs = P.candidateXs(world.pending, 16);
  let bx = xs[0], bv = -Infinity;
  for (const x of xs) {
    const o = P.rolloutValue(world, x, 0.6, P.DEFAULT_WEIGHTS, scratch, 0.3, false);
    if (o.gain > bv) { bv = o.gain; bx = x; }
  }
  return bx;
}

console.log(`mode=${MODE} seed=${SEED} 最多 ${MAXDROPS} 手\n`);
console.log('手数'.padStart(6) + '分数'.padStart(9) + '球数'.padStart(6) + '堆顶y'.padStart(7) + '最大级'.padStart(8) + '币'.padStart(4));
let next = 0, revives = 0;
/* 打到「真的压线」的那一刻，顺便做一次「复活币打法」A/B（两种打法只在危机/有币时才分叉） */
const STYLES = {
  '搏一把': { ...BASE_THINK, allowRevive: true },
  '保守': { ...BASE_THINK, allowRevive: false, weights: { ...P.DEFAULT_WEIGHTS, riskScaleWithRevive: 1.0 } },
};
let compared = 0;
function crisisCompare(world, why) {
  if (compared++ > 9) return;
  const savedRev = world.revives;
  let line = `${why}：`;
  const xs = {};
  for (const [name, th] of Object.entries(STYLES)) {
    const saved = world.rng; world.rng = planRng;
    let dec; try { dec = P.searchBest(world, th); } finally { world.rng = saved; }
    xs[name] = dec.x;
    line += ` ${name} x=${dec.x.toFixed(1)}(v=${dec.value.toFixed(0)})`;
  }
  const same = Math.abs(xs['搏一把'] - xs['保守']) < 1e-9;
  /* 顺便量一下「这一手推演收工后，盘面还在不在危险区」——
     风险项只在推演结束时的盘面仍然压线时才有影响，这也是开关会不会生效的前提 */
  const probe = P.rolloutValue(world, xs['搏一把'], BASE_THINK.h2, P.DEFAULT_WEIGHTS, E.makeWorld({ rng: planRng }), 1.5, true);
  const pf = P.features(probe.sim);
  world.revives = savedRev;
  console.log('  ★ 危机 A/B（币 ' + savedRev + (borrowed ? '·借来的' : '·真币') + '）' + line +
    (same ? '  → 相同' : `  → 改了 ${(xs['保守'] - xs['搏一把']).toFixed(1)}px`) +
    `  [推演后 topRisk²=${pf.topRisk2.toFixed(2)} overN=${pf.overN.toFixed(2)}]`);
}
let borrowed = false;
while (w.drops < MAXDROPS) {
  let g = 0;
  for (;;) { if (w.over) break; if (w.ready) break; if (g++ > 3000) break; E.update(w, E.CFG.FIXED); }
  if (w.over) {
    if (w.revives > 0) { E.revive(w); revives++; console.log('   判负 → 用币复活（已用 ' + revives + '）'); continue; }
    console.log(`   判负结束（第 ${w.drops} 手，${w.score} 分）`);
    break;
  }
  /* 压线判定（排除刚投放、还悬在 y=74 的那颗） */
  {
    let top = E.CFG.H;
    for (const b of w.balls) { const t = b.y - b.r; if (t > E.CFG.DROP_Y + 20 && t < top) top = t; }
    if (top < E.CFG.DANGER_Y + 25) {
      borrowed = (w.revives === 0);
      if (borrowed) w.revives = 1;                 // 没币就借一枚，专门用来验开关
      crisisCompare(w, `第 ${w.drops} 手压线（堆顶 y=${Math.round(top)}，分数 ${w.score}）`);
    }
  }
  let dec;
  const saved = w.rng; w.rng = planRng;
  try {
    dec = (MODE === 'greedy') ? { x: greedyX(w) } : P.searchBest(w, BASE_THINK);
  } finally { w.rng = saved; }
  E.update(w, E.CFG.FIXED);
  if (w.over) continue;
  E.dropAt(w, dec.x);
  if (w.drops >= next) {
    let mt = 0; for (const b of w.balls) if (b.tier > mt) mt = b.tier;
    let top = E.CFG.H; for (const b of w.balls) { const t = b.y - b.r; if (t > E.CFG.DROP_Y + 20 && t < top) top = t; }
    console.log(String(w.drops).padStart(6) + String(w.score).padStart(9) + String(w.balls.length).padStart(6) +
      String(Math.round(top)).padStart(7) + String(mt).padStart(8) + String(w.revives).padStart(4));
    next += 50;
  }
}
let mt = 0; for (const b of w.balls) if (b.tier > mt) mt = b.tier;
console.log(`\n结束：${w.drops} 手 ${w.score} 分（${(w.score / Math.max(1, w.drops)).toFixed(2)} 分/手），最大 ${E.FRUITS[mt].name}，用币 ${revives}`);

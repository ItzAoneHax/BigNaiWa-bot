/* ============================================================================
 *  eval-breakdown.mjs —— 把 evaluate() 拆成每一项，看是谁在真正决定落点
 *
 *  做法：先按 live 协议打一局到指定手数（拿到真实的中后期盘面），
 *  然后在那个盘面上对每个候选落点做一次 h2 推演，逐项打印：
 *    · 该项在各候选之间的**跨度**（max-min）—— 只有跨度大的项才可能改变决策
 *    · 冠军落点处该项的实际值
 *    · 各项跨度与「总分跨度」的比例
 *
 *  用法：
 *    node tools/eval-terms.mjs --seed 9200 --drops 60,120,180,220 --config base
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
const PROTOCOL = String(arg('protocol', 'live'));
const CONFIG = String(arg('config', 'base'));
const DROPS = String(arg('drops', '60,120,180')).split(',').map(Number);

const CONFIGS = {
  base: { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' },
  deep: { step: 6, h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, innerTop: 6, nextMode: 'known' },
  ply1: { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 1, nextMode: 'known' },
};
const think = CONFIGS[CONFIG] || CONFIGS.base;
const wt = P.DEFAULT_WEIGHTS;

/* 与 planner.evaluate() 逐项等价（同顺序、同系数），只是把每一项单独返回 */
function terms(w, before) {
  const f = P.features(w);
  const risk = (w.revives > 0) ? (wt.riskScaleWithRevive ?? 1) : 1;
  const t = {
    merge: wt.merge * (w.score - before),
    mergeW: wt.mergeW * Math.max(0, (w.mergedMaxTier ?? -1) - 3),
    top: -wt.top * f.topRisk2 * 24 * risk,
    above: -wt.above * f.aboveMass * risk,
    overT: -wt.overT * f.overN * 20 * risk,
    bump: -wt.bump * f.bump * 20,
    adj: wt.adj * f.adj,
    bigPair: (wt.bigPair || 0) * f.bigPair,
    blocked: -(wt.blocked || 0) * f.blocked,
    mono: (wt.mono || 0) * f.mono * 4,
    bigHigh: -wt.bigHigh * f.bigHigh,
    buried: -(wt.buried || 0) * f.buried,
    frag: -wt.frag * f.n * 0.15,
    stuck: -(wt.stuck || 0) * f.stuck,
    space: (wt.space || 0) * f.space,
  };
  let sum = 0;
  for (const k in t) sum += t[k];
  return { t, sum, f, n: w.balls.length };
}

/* ---- 打一局，在若干手数处停下做解剖 ---- */
const gameRng = P.mulberry32(SEED >>> 0);
const w = E.makeWorld({ rng: gameRng });
E.resetWorld(w, { rng: gameRng });
const planRng = P.mulberry32(((SEED >>> 0) ^ 0x9e3779b9) >>> 0);

const wanted = new Set(DROPS);
const rows = [];

while (w.drops < Math.max(...DROPS) + 1) {
  let guard = 0;
  for (;;) {
    if (w.over) break;
    if (w.ready && (PROTOCOL === 'live' || E.maxSpeed(w) <= 60)) break;
    if (guard++ > 60 * 30) break;
    E.update(w, E.CFG.FIXED);
  }
  if (w.over) {
    if (w.revives > 0) { E.revive(w); continue; }
    console.log(`游戏在第 ${w.drops} 手结束（${w.score} 分）`);
    break;
  }
  if (guard > 60 * 30) break;

  if (wanted.has(w.drops)) {
    /* 解剖当前盘面：每个候选落点各推演一次 h2 */
    const xs = P.candidateXs(w.pending, think.step);
    const list = [];
    for (const x of xs) {
      const o = P.rolloutValue(w, x, think.h2, wt, E.makeWorld({ rng: planRng }), 0.9 + 0.6);
      const t = terms(o.sim, o.sim.score - o.gain);
      list.push({ x, ...t, gain: o.gain, top: E.stackTop(o.sim) });
    }
    list.sort((a, b) => b.sum - a.sum);
    const best = list[0], worst = list[list.length - 1];
    const keys = Object.keys(best.t);
    const span = {};
    for (const k of keys) {
      let lo = Infinity, hi = -Infinity;
      for (const r of list) { if (r.t[k] < lo) lo = r.t[k]; if (r.t[k] > hi) hi = r.t[k]; }
      span[k] = hi - lo;
    }
    const totalSpan = best.sum - worst.sum;
    const sorted = keys.map(k => [k, span[k]]).sort((a, b) => b[1] - a[1]);

    console.log(`\n=== seed=${SEED} ${PROTOCOL} 第 ${w.drops} 手（${list[0].n} 颗，分数 ${w.score}，pending=${w.pending}）===`);
    console.log('  候选落点跨度：总评价跨度 ' + totalSpan.toFixed(2) + '；冠军 x=' + best.x.toFixed(1) + ' 价值 ' + best.sum.toFixed(2) + '，最差 x=' + worst.x.toFixed(1) + ' 价值 ' + worst.sum.toFixed(2));
    console.log('  项目'.padEnd(10) + '候选间跨度'.padStart(12) + '占比'.padStart(9) + '冠军处值'.padStart(11) + '5名内前三'.padStart(12));
    for (const [k, v] of sorted) {
      const share = totalSpan ? (v / totalSpan * 100) : 0;
      const top5 = list.slice(0, 5).map(r => r.t[k]);
      console.log(
        ('  ' + k).padEnd(10) + v.toFixed(2).padStart(12) + (share.toFixed(1) + '%').padStart(9) +
        best.t[k].toFixed(2).padStart(11) + ('[' + top5.map(x => x.toFixed(1)).join(' ') + ']').padStart(12),
      );
    }
    /* 决策置信度：前 8 名之间差多少 */
    console.log('  前 8 名评价：' + list.slice(0, 8).map(r => r.sum.toFixed(1)).join(' | '));
    const gaps = [];
    for (let i = 0; i + 1 < list.length; i++) gaps.push(list[i].sum - list[i + 1].sum);
    console.log(`  与第 2 名的差距 ${gaps[0].toFixed(2)}；判定「并列」需要多大精度：前 10 名极差 ${(list[0].sum - list[9].sum).toFixed(2)}`);
    rows.push({ drops: w.drops, best: best.x, totalSpan, sorted });
  }

  const saved = w.rng; w.rng = planRng;
  const dec = P.searchBest(w, think);
  w.rng = saved;
  E.update(w, E.CFG.FIXED);
  if (!w.over) E.dropAt(w, dec.x);
}

console.log(`\n结束：${w.drops} 手，${w.score} 分，${w.score / Math.max(1, w.drops)} 分/手`);

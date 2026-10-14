/* ============================================================================
 *  revive-ab.mjs —— 「复活币打法」开关的决策级体检（**危机盘面**版）
 *
 *  背景（用户重申的需求）：这个开关**不是**「许不许用币」——币是游戏结算消耗的。
 *    aggressive（搏一把）：危机时敢堆高换空间（推演里允许用币续命 + 风险项 ×0.45）
 *    conservative（保守）  ：危机时当作没退路（推演里越线即判死 + 风险项不打折）
 *
 *  两种打法**只在危机/手里有币时**才会分叉，所以必须拿真·危机盘面来验：
 *  这里用「乱丢」策略把盘面推到警戒线上方（stackTop < DANGER_Y + 30），
 *  再看两种打法选出来的落点是否不同。
 *
 *  用法：node tools/revive-ab.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
E.setShapes(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/shapes.json'), 'utf8')));

const THINK = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };
const AGGRESSIVE = { ...THINK, allowRevive: true };
const CONSERVATIVE = { ...THINK, allowRevive: false, weights: { ...P.DEFAULT_WEIGHTS, riskScaleWithRevive: 1.0 } };

/* ⚠️ 堆顶要排除「刚从投放点丢下来、还悬在 y=74 的那颗」，
   否则一落子 stackTop 就变成 40~57，造盘器会立刻以为「已经压线」而收工（踩过） */
function settledTop(w) {
  let top = E.CFG.H;
  for (const b of w.balls) {
    const t = b.y - b.r;
    if (t < E.CFG.DROP_Y + 20) continue;      // 还在高处/正在掉 → 不算堆顶
    if (t < top) top = t;
  }
  return top;
}

/* 合成危机盘面：先用「纯贪心」（只看这一手能合多少分、完全不管高度）把盘面顶上去，
   一直顶到堆顶越过警戒线 —— 实测这才是能自然堆到危机的打法：
     · 随机乱丢 → 自持在 6~9 颗，永远堆不高
     · 左右各丢一柱 → 也一样
     · 手码交错大果 → 会塌成 3~4 颗高
   纯贪心则会一直堆到线以上（因为合成速度追不上投放速度，这正是真实死法）。 */
function syntheticCrisis(seed, coins) {
  const w = E.makeWorld({ rng: P.mulberry32(seed >>> 0) });
  E.resetWorld(w, { rng: P.mulberry32(seed >>> 0) });
  const scratch = E.makeWorld({ rng: P.mulberry32(seed + 11) });
  let guard = 0;
  while (!w.over && guard++ < 40000) {
    if (w.balls.length > 6 && settledTop(w) < E.CFG.DANGER_Y + 25) break;
    if (w.ready) {
      const xs = P.candidateXs(w.pending, 16);
      let bx = xs[0], bv = -Infinity;
      for (const x of xs) {
        const o = P.rolloutValue(w, x, 0.6, { ...P.DEFAULT_WEIGHTS }, scratch, 0.3, false);
        if (o.gain > bv) { bv = o.gain; bx = x; }
      }
      E.dropAt(w, bx);
    }
    E.update(w, E.CFG.FIXED);
  }
  if (w.over) return null;
  let g = 0;
  while (E.maxSpeed(w) > 60 && g++ < 120 && !w.over) E.update(w, E.CFG.FIXED);
  if (w.over) return null;
  w.revives = coins;
  return w;
}

const CASES = [
  [9601, 0, '危机 · 手里没币'],
  [9602, 1, '危机 · 手里 1 枚币'],
  [9603, 2, '危机 · 手里 2 枚币'],
  [9604, 1, '危机 · 手里 1 枚币'],
  [9605, 0, '危机 · 手里没币'],
  [9606, 1, '危机 · 手里 1 枚币'],
  [9607, 2, '危机 · 手里 2 枚币'],
  [9608, 1, '危机 · 手里 1 枚币'],
];

console.log('复活币打法 A/B（真·危机盘面，同一盘面只换打法）\n');
console.log('盘面'.padEnd(30) + '堆顶 y'.padStart(8) + '球数'.padStart(6) + '搏一把 x'.padStart(10) + '保守 x'.padStart(9) + '位移'.padStart(8) + '  说明');
let changed = 0, nCase = 0;
for (const [seed, coins, label] of CASES) {
  const w = syntheticCrisis(seed, coins);
  if (!w) { console.log(`${label} 没能造出来（seed=${seed}）`); continue; }
  nCase++;
  const a = P.searchBest(w, AGGRESSIVE);
  const b = P.searchBest(w, CONSERVATIVE);
  const same = Object.is(a.x, b.x);
  if (!same) changed++;
  console.log(label.padEnd(30) + String(Math.round(settledTop(w))).padStart(8) + String(w.balls.length).padStart(6) +
    a.x.toFixed(1).padStart(10) + b.x.toFixed(1).padStart(9) +
    (same ? '—' : (b.x - a.x).toFixed(1)).padStart(8) + '  ' + (same ? '相同' : '改了') +
    `   (评价值 ${a.value.toFixed(0)} vs ${b.value.toFixed(0)})`);
}
console.log(`\n落点被改变：${changed}/${nCase}`);
console.log('（不动的地方说明两种打法在该盘面上本来就选同一个 —— 开关只在有币 + 真危机时才分叉）');


/* ============================================================================
 *  value-probe.mjs —— 「这些特征到底能不能预测未来？」
 *
 *  做法（便宜的离在线诊断，不开整局）：在真实盘面上枚举候选落点，每个候选
 *    ① 做一次 h2 推演，拿到当前评估值 v、窗口内合成分 gain、以及落点后盘面的各特征
 *    ② 从这个盘面**继续往下真打 K 手**（用同一套粗策略、同一串随机水果），
 *       记录接下来 K 手真正拿到的分 → 这就是"这一手的长期价值"的实测值
 *  然后把 ① 的各项与 ② 求相关（每个盘面内跨候选做，样本 = 候选数）。
 *
 *  意义：整局跑分测不出 1~2% 的差别，但这里能直接回答
 *    「形状项与未来得分的相关，是不是显著大于 0」——
 *    如果相关≈0，那么任何以它为主的新权重都不可能有用（这解释了跑分实验的负结果）。
 *
 *  用法：node tools/value-probe.mjs --drops 80,160,240 --k 6
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

const DROPS = String(arg('drops', '80,160,240')).split(',').map(Number);
const K = Number(arg('k', 6));              // 继续打几手当作"未来"
const SEED0 = Number(arg('seed', 9500));
const THINK = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };
const CONT_STEP = 16;                       // 续打用的粗栅格（便宜）
const CONT_H1 = 0.6;

/* 造盘面：live 协议真打到指定手数 */
function buildBoard(seed, target) {
  const gameRng = P.mulberry32(seed >>> 0);
  const planRng = P.mulberry32(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  const w = E.makeWorld({ rng: gameRng });
  E.resetWorld(w, { rng: gameRng });
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
  let g = 0;
  while (!w.ready && g++ < 3000 && !w.over) E.update(w, E.CFG.FIXED);
  g = 0;
  while (E.maxSpeed(w) > 60 && g++ < 180 && !w.over) E.update(w, E.CFG.FIXED);
  return w;
}

/* 从当前盘面继续打 K 手（粗策略 + 固定随机流），返回净得分 */
function futureScore(w0, k, contRng) {
  const w = E.cloneWorld(w0, E.makeWorld({ rng: contRng }));
  const before = w.score;
  w.mergedMaxTier = -1; w.freed = 0;
  for (let i = 0; i < k; i++) {
    if (w.over) break;
    if (!w.ready) { let g = 0; while (!w.ready && g++ < 600 && !w.over) E.update(w, E.CFG.FIXED); }
    if (w.over) break;
    const xs = P.candidateXs(w.pending, CONT_STEP);
    let bx = xs[0], bv = -Infinity;
    const scratch = E.makeWorld({ rng: contRng });
    for (const x of xs) {
      const o = P.rolloutValue(w, x, CONT_H1, P.DEFAULT_WEIGHTS, scratch, 0.3, true);
      if (o.v > bv) { bv = o.v; bx = x; }
    }
    E.dropAt(w, bx);
    P.runSettle(w, 1.2, 0.9, true);
  }
  return w.score - before;
}

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
  return (sa > 0 && sb > 0) ? sab / Math.sqrt(sa * sb) : 0;
}
function spearman(a, b) {
  const rank = (arr) => { const idx = arr.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(arr.length); idx.forEach(([, i], k) => r[i] = k); return r; };
  return pearson(rank(a), rank(b));
}

const KEYS = ['v', 'gain', 'flat', 'pool', 'ground', 'bump', 'mono', 'adj', 'bigPair', 'blocked', 'bigHigh', 'buried', 'topRisk2', 'n'];
const acc = new Map();      // key → {pearson:[], spearman:[]}
let totalCands = 0;

for (let i = 0; i < DROPS.length; i++) {
  const seed = SEED0 + i;
  const w = buildBoard(seed, DROPS[i]);
  if (w.over) { console.log(`盘面 seed${seed} 在 ${DROPS[i]} 手前就结束了，跳过`); continue; }
  const xs = P.candidateXs(w.pending, THINK.step);
  const planRng = P.mulberry32(((seed >>> 0) ^ 0x5bf03635) >>> 0);
  const rows = [];
  for (const x of xs) {
    const o = P.rolloutValue(w, x, THINK.h2, P.DEFAULT_WEIGHTS, E.makeWorld({ rng: planRng }), 0.9 + 0.6, true);
    const f = P.features(o.sim);
    /* 续打：所有候选共用同一串随机（公共随机数，跨候选配对） */
    const fut = futureScore(o.sim, K, P.mulberry32(0x1234abcd));
    rows.push({ v: o.v, gain: o.gain, ...f, fut });
  }
  totalCands += rows.length;
  const futArr = rows.map(r => r.fut);
  const line = [];
  for (const k of KEYS) {
    const arr = rows.map(r => r[k]).filter(v => v !== undefined);
    if (arr.length !== rows.length) continue;
    const p = pearson(arr, futArr), s = spearman(arr, futArr);
    if (!acc.has(k)) acc.set(k, { pearson: [], spearman: [] });
    acc.get(k).pearson.push(p); acc.get(k).spearman.push(s);
    line.push(`${k}=${p >= 0 ? '+' : ''}${p.toFixed(2)}`);
  }
  console.log(`盘面 #${DROPS[i]}（${w.balls.length}颗 ${w.score}分，候选 ${rows.length}）：未来 ${K} 手净得 ${Math.min(...futArr)}~${Math.max(...futArr)} 分`);
  console.log('   ' + line.join('  '));
}

const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`\n各特征与「未来 ${K} 手净得分」的相关（中位数，跨 ${DROPS.length} 个盘面 / 共 ${totalCands} 个候选）`);
console.log('特征'.padEnd(11) + 'Pearson'.padStart(10) + 'Spearman'.padStart(11) + '  解读');
const sorted = [...acc.entries()].sort((a, b) => Math.abs(med(b[1].pearson)) - Math.abs(med(a[1].pearson)));
for (const [k, v] of sorted) {
  const p = med(v.pearson), s = med(v.spearman);
  const note = k === 'v' ? '← 现在用的评估值' : (k === 'gain' ? '← 窗口内合成分' : (k === 'n' ? '← 球数' : ''));
  console.log(k.padEnd(11) + p.toFixed(3).padStart(10) + s.toFixed(3).padStart(11) + '  ' + note);
}

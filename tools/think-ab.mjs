/* ============================================================================
 *  think-ab.mjs —— 搜索参数改动的「决策级」体检（比跑整局便宜得多）
 *
 *  用法：
 *    node tools/think-ab.mjs --a "{}" --b "{\"ply2Frames\":22}" --drops 120,200,260
 *    node tools/think-ab.mjs --b "{\"step\":6,\"h1\":1.6,\"h2\":3.4,\"topK\":12,\"innerTop\":6}"
 *
 *  做的事：按 live 协议真打到指定手数拿到真实盘面，然后在同一盘面上分别用
 *  A/B 两套搜索参数各算一次，比较「落点改不改、评价值差多少、耗时差多少」。
 *  落点几乎不变 = 这个参数是惰性的（不用跑整局）；改动大才值得上 judge 跑配对。
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

/* 参数用 k=v,k=v 形式（避免在 PowerShell 里跟 JSON 引号打架）：
   例：--b ply2Frames=22,topK=12   --a step=6,h2=3.4 */
function parseOpts(s) {
  const o = {};
  if (!s || s === true) return o;
  for (const kv of String(s).split(',')) {
    const [k, v] = kv.split('=');
    if (!k) continue;
    o[k.trim()] = isNaN(Number(v)) ? v.trim() : Number(v);
  }
  return o;
}

const BASE = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, innerTop: 4, nextMode: 'known' };
const A = { ...BASE, ...parseOpts(arg('a', '')) };
const B = { ...BASE, ...parseOpts(arg('b', '')) };
const DROPS = String(arg('drops', '120,200,260')).split(',').map(Number);
const SEEDS = String(arg('seeds', '9401,9402,9403')).split(',').map(Number);

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
    const dec = P.searchBest(w, BASE);
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

console.log(`A = ${JSON.stringify(A)}\nB = ${JSON.stringify(B)}\n`);
console.log('盘面'.padEnd(26) + 'A 落点'.padStart(9) + 'B 落点'.padStart(9) + '位移'.padStart(9) + '值A→值B'.padStart(16) + '耗时A→B(ms)'.padStart(16));
let changed = 0, n = 0, sumDx = 0, sumDv = 0;
for (let i = 0; i < DROPS.length; i++) {
  const seed = SEEDS[i % SEEDS.length];
  const w = buildBoard(seed, DROPS[i]);
  if (w.over || w.balls.length < 5) { console.log(`seed${seed}#${DROPS[i]} 盘面没造出来，跳过`); continue; }
  const t0 = Date.now(); const ra = P.searchBest(w, A); const ta = Date.now() - t0;
  const t1 = Date.now(); const rb = P.searchBest(w, B); const tb = Date.now() - t1;
  n++;
  const same = Object.is(ra.x, rb.x);
  if (!same) { changed++; sumDx += Math.abs(rb.x - ra.x); }
  sumDv += Math.abs(rb.value - ra.value);
  console.log(
    (`seed${seed}#${w.drops}手(${w.balls.length}颗)`).padEnd(26) +
    ra.x.toFixed(1).padStart(9) + rb.x.toFixed(1).padStart(9) +
    (same ? '—' : (rb.x - ra.x).toFixed(1)).padStart(9) +
    `${ra.value.toFixed(0)}→${rb.value.toFixed(0)}`.padStart(16) +
    `${ta}→${tb}`.padStart(16) + (same ? '' : '  ← 改了'),
  );
}
console.log(`\n落点被改变：${changed}/${n}；平均位移 ${changed ? (sumDx / changed).toFixed(1) : 0}px；平均 |Δ评估值| ${(sumDv / Math.max(1, n)).toFixed(1)}`);

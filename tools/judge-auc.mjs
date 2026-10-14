/* ============================================================================
 *  judge-auc.mjs —— 用「第 50→250 手分数曲线的面积」做单指标比较
 *
 *  为什么：单看某一档（第 200 手）容易变成挑档位。把 50/100/150/200/250 几个
 *  采样点做梯形积分，得到一条与「每手得分率」等价、但方差更小的汇总指标，
 *  再用配对 bootstrap 比较两臂。中途判负的局按最后一个采样点截断。
 *
 *  用法：node tools/judge-auc.mjs --a wait --b base --tags r2,r3
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'out');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

const A = String(arg('a', 'wait'));
const B = String(arg('b', 'base'));
const TAGS = String(arg('tags', 'r2,r3')).split(',');

const rows = [];
const seen = new Set();
for (const tag of TAGS) {
  for (const f of fs.readdirSync(OUT)) {
    if (!f.startsWith(`judge-${tag}-s`) || !f.endsWith('.jsonl')) continue;
    for (const line of fs.readFileSync(path.join(OUT, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      const key = r.seed + '|' + r.name;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
    }
  }
}

const SAMPLES = [50, 100, 150, 200, 250];
function auc(r) {
  let a = 0, prev = null;
  for (const m of SAMPLES) {
    const v = r.marks[m];
    if (v === undefined) break;               // 判负了 → 到上一个采样点为止
    if (prev) a += (prev[1] + v) / 2 * (m - prev[0]);
    prev = [m, v];
  }
  return a;                                   // 单位：分·手
}

const byArm = new Map();
for (const r of rows) {
  if (!byArm.has(r.name)) byArm.set(r.name, new Map());
  byArm.get(r.name).set(r.seed, r);
}
const A_ = byArm.get(A), B_ = byArm.get(B);
if (!A_ || !B_) { console.error('缺少臂：' + A + ' / ' + B); process.exit(1); }

const d = [], da = [], db = [];
let deadA = 0, deadB = 0;
for (const [seed, ra] of A_) {
  const rb = B_.get(seed); if (!rb) continue;
  d.push(auc(ra) - auc(rb)); da.push(auc(ra)); db.push(auc(rb));
  if (ra.ended === 'over') deadA++;
  if (rb.ended === 'over') deadB++;
}
const mean = (x) => x.reduce((p, q) => p + q, 0) / x.length;
const rnd = P.mulberry32(20261014);
const boots = [];
for (let i = 0; i < 8000; i++) { let s = 0; for (let k = 0; k < d.length; k++) s += d[Math.floor(rnd() * d.length)]; boots.push(s / d.length); }
boots.sort((x, y) => x - y);
const lo = boots[Math.floor(boots.length * 0.025)], hi = boots[Math.floor(boots.length * 0.975)];

console.log(`${A} vs ${B}   n=${d.length} 配对种子（${TAGS.join('+')}）`);
console.log(`  AUC 均值：${A} ${mean(da).toFixed(0)} vs ${B} ${mean(db).toFixed(0)} 分·手`);
console.log(`  平均差 ${(mean(d) >= 0 ? '+' : '') + mean(d).toFixed(0)} 分·手，等价于每手 ${(mean(d) / (SAMPLES[SAMPLES.length - 1] - SAMPLES[0])).toFixed(2)} 分`);
console.log(`  95% CI [${lo.toFixed(0)}, ${hi.toFixed(0)}]  相对 ${(mean(d) / mean(db) * 100).toFixed(2)}%`);
console.log(`  胜负：${d.filter(x => x > 0).length}胜 ${d.filter(x => x < 0).length}负`);
console.log(`  判负局：${A} ${deadA}/${d.length}，${B} ${deadB}/${d.length}`);

/* 分轮次看，检查是否是某一轮的偶然 */
for (const tag of TAGS) {
  const dd = [];
  for (const f of fs.readdirSync(OUT)) {
    if (!f.startsWith(`judge-${tag}-s`) || !f.endsWith('.jsonl')) continue;
    const m = new Map();
    for (const line of fs.readFileSync(path.join(OUT, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      m.set(r.name, r);
    }
    if (m.has(A) && m.has(B)) dd.push(auc(m.get(A)) - auc(m.get(B)));
  }
  if (dd.length) console.log(`  ${tag}: n=${dd.length} 平均差 ${(mean(dd) >= 0 ? '+' : '') + mean(dd).toFixed(0)} 分·手（每手 ${(mean(dd) / 200).toFixed(2)} 分）`);
}

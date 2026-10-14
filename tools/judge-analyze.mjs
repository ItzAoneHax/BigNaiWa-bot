/* ============================================================================
 *  judge-analyze.mjs —— 汇总 judge 的分片结果，用「低方差指标」做配对比较
 *
 *  为什么不用最终分数做主指标：
 *    实测同一套配置不同种子：第 200 手时分数 1636~1844（CV≈3.5%），
 *    而最终分数 1982~6441（CV≈36%）—— 最终分数的方差几乎全来自「活多久」，
 *    配置之间几个百分点的差别会被生存噪声完全淹没。
 *    所以主指标 = 第 N 手时的分数（同样手数下比得分率），
 *    生存则单独用「第 N 手前就判负的局数」来比。
 *
 *  用法：node tools/judge-analyze.mjs --tag r2 --mark 200
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

const TAGS = String(arg('tag', 'r2')).split(',');
const MARK = Number(arg('mark', 200));
const MARKS = [50, 100, 150, 200, 250, 300];

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
if (!rows.length) { console.error('没有找到结果'); process.exit(1); }

const byArm = new Map();
for (const r of rows) {
  if (!byArm.has(r.name)) byArm.set(r.name, []);
  byArm.get(r.name).push(r);
}
const arms = [...byArm.keys()];
const base = arms[0];

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)); };

console.log(`样本：${rows.length} 局，配置 ${arms.length} 个\n`);
console.log('配置'.padEnd(10) + 'n'.padStart(3) + MARKS.map(m => ('@' + m).padStart(9)).join('') + '判负率'.padStart(9) + '  最终分(仅判负局)');
for (const a of arms) {
  const rs = byArm.get(a);
  const cells = MARKS.map(m => {
    const v = rs.map(r => r.marks[m]).filter(x => x !== undefined);
    return (v.length ? `${mean(v).toFixed(0)}(${v.length})` : '—').padStart(9);
  }).join('');
  const dead = rs.filter(r => r.ended === 'over').length;
  const finals = rs.filter(r => r.ended === 'over').map(r => r.score);
  console.log(String(a).padEnd(10) + String(rs.length).padStart(3) + cells +
    ((dead / rs.length * 100).toFixed(0) + '%').padStart(9) +
    (finals.length ? `  ${mean(finals).toFixed(0)}（min ${Math.min(...finals)}）` : ''));
}

/* ---- 配对比较（同一 seed 下两臂都有第 MARK 手数据才计入） ---- */
function paired(armA, armB) {
  const A = new Map(byArm.get(armA).map(r => [r.seed, r]));
  const B = new Map(byArm.get(armB).map(r => [r.seed, r]));
  const d = [], ds = [], deaths = { a: 0, b: 0, n: 0 };
  for (const [s, ra] of A) {
    const rb = B.get(s); if (!rb) continue;
    deaths.n++;
    if (ra.ended === 'over') deaths.a++;
    if (rb.ended === 'over') deaths.b++;
    const va = ra.marks[MARK], vb = rb.marks[MARK];
    if (va !== undefined && vb !== undefined) { d.push(va - vb); ds.push(va); }
  }
  if (!d.length) return null;
  const m = mean(d), s = sd(d);
  const rnd = P.mulberry32(777);
  const boots = [];
  for (let b = 0; b < 4000; b++) { let acc = 0; for (let k = 0; k < d.length; k++) acc += d[Math.floor(rnd() * d.length)]; boots.push(acc / d.length); }
  boots.sort((x, y) => x - y);
  return {
    n: d.length, mean: m, sd: s, se: s / Math.sqrt(d.length),
    lo: boots[Math.floor(boots.length * 0.025)], hi: boots[Math.floor(boots.length * 0.975)],
    wins: d.filter(x => x > 0).length, losses: d.filter(x => x < 0).length,
    meanA: mean(ds), deaths,
  };
}

console.log(`\n---------------- 配对比较（第 ${MARK} 手时的分数，同 seed） ----------------`);
console.log('配置'.padEnd(10) + 'n'.padStart(3) + '平均差'.padStart(10) + '标准差'.padStart(9) + '95%CI'.padStart(20) + '胜负'.padStart(9) + '相对'.padStart(8) + '判负(该臂/基准)'.padStart(16));
for (const a of arms) {
  if (a === base) continue;
  const p = paired(a, base);
  if (!p) { console.log(String(a).padEnd(10) + '  （无共同 seed 数据）'); continue; }
  console.log(
    String(a).padEnd(10) + String(p.n).padStart(3) +
    ((p.mean >= 0 ? '+' : '') + p.mean.toFixed(1)).padStart(10) +
    p.sd.toFixed(0).padStart(9) +
    `[${p.lo.toFixed(0)}, ${p.hi.toFixed(0)}]`.padStart(20) +
    `${p.wins}胜${p.losses}负`.padStart(9) +
    ((p.mean / p.meanA) * 100).toFixed(1).padStart(7) + '%' +
    `${p.deaths.a}/${p.deaths.b} of ${p.deaths.n}`.padStart(16));
}

/* ---- 每手得分率曲线（把「得分率」和「生存」分开看） ---- */
console.log('\n---------------- 每手得分率（该手数区间内 分数增量/手数） ----------------');
console.log('配置'.padEnd(10) + MARKS.slice(1).map(m => ('到' + m).padStart(9)).join(''));
const base0 = {};
for (const a of arms) {
  const rs = byArm.get(a);
  const cells = MARKS.slice(1).map(m => {
    const prev = MARKS[MARKS.indexOf(m) - 1];
    const v = rs.map(r => (r.marks[m] !== undefined && r.marks[prev] !== undefined) ? (r.marks[m] - r.marks[prev]) / (m - prev) : undefined).filter(x => x !== undefined);
    if (!v.length) return '—'.padStart(9);
    if (!(a in base0)) base0[a] = {};
    base0[a][m] = mean(v);
    return mean(v).toFixed(2).padStart(9);
  }).join('');
  console.log(String(a).padEnd(10) + cells);
}

/* ---- 盘面健康度（低方差的「还能活多久」代理指标；老结果没有这个字段） ---- */
const hasBoard = rows.some(r => r.board);
if (hasBoard) {
  console.log('\n---------------- 第 N 手时的盘面健康度（堆顶 y，越小越危险；球数） ----------------');
  console.log('配置'.padEnd(10) + MARKS.map(m => ('@' + m).padStart(14)).join(''));
  for (const a of arms) {
    const rs = byArm.get(a);
    const cells = MARKS.map(m => {
      const v = rs.map(r => r.board && r.board[m]).filter(Boolean);
      if (!v.length) return '—'.padStart(14);
      return `${Math.round(mean(v.map(b => b.top)))},${mean(v.map(b => b.n)).toFixed(0)}只`.padStart(14);
    }).join('');
    console.log(String(a).padEnd(10) + cells);
  }
}

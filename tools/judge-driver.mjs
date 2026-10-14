/* ============================================================================
 *  judge-driver.mjs —— 并行跑 judge.mjs 的多个分片，然后做配对统计
 *
 *  用法：
 *    node tools/judge-driver.mjs --spec out/judge-spec.json --par 14 --tag depth
 *
 *  沙箱注意：子进程用 stdio 重定向到**文件**（不是管道），
 *  因为本机沙箱禁止匿名管道，spawn(..., {stdio:'pipe'}) 会 EPERM。
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

const specFile = arg('spec', null);
if (!specFile) { console.error('需要 --spec'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const PAR = Number(arg('par', 12));
const TAG = String(arg('tag', 'judge'));
const MAXDROPS = arg('maxDrops', null);
const PROTOCOL = arg('protocol', null);

const seedList = spec.seeds.slice();
/* 分片：每个分片单独跑自己那批 seed（同 seed 的配置在同一个进程里，保证配对） */
const shards = seedList.map((_, i) => i);
const shardCount = shards.length;

function spawnShard(i) {
  const outFile = path.join(OUT, `judge-${TAG}-s${i}.json`);
  const logFile = path.join(OUT, `judge-${TAG}-s${i}.log`);
  const args = [path.join(__dirname, 'judge.mjs'), '--spec', specFile, '--shard', `${i}/${shardCount}`, '--out', outFile];
  if (MAXDROPS !== null) { args.push('--maxDrops', String(MAXDROPS)); }
  if (PROTOCOL !== null) { args.push('--protocol', String(PROTOCOL)); }
  const fd = fs.openSync(logFile, 'a');
  return new Promise((resolve) => {
    const c = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', fd, fd], detached: false });
    c.on('close', (code) => { try { fs.closeSync(fd); } catch { } resolve({ i, code, outFile, logFile }); });
  });
}

/* 简单并发闸门 */
async function runAll() {
  let next = 0, running = 0, done = 0;
  const finished = [];
  return new Promise((resolve) => {
    const tick = () => {
      while (running < PAR && next < shardCount) {
        const i = next++;
        running++;
        spawnShard(i).then((r) => {
          running--; done++;
          finished.push(r);
          process.stdout.write(`[shard ${r.i}] 完成 code=${r.code} (${done}/${shardCount})\n`);
          if (done === shardCount) resolve(finished); else tick();
        });
      }
      if (shardCount === 0) resolve(finished);
    };
    tick();
  });
}

const finished = await runAll();
const results = [];
for (const f of finished) {
  /* 优先读增量文件（.jsonl，每局一行）：分片被中断也能拿到已完成的局 */
  const jsonl = f.outFile + '.jsonl';
  if (fs.existsSync(jsonl)) {
    for (const line of fs.readFileSync(jsonl, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { results.push(JSON.parse(line)); } catch { }
    }
    continue;
  }
  if (!fs.existsSync(f.outFile)) { console.error('缺少结果文件', f.outFile); continue; }
  const j = JSON.parse(fs.readFileSync(f.outFile, 'utf8'));
  results.push(...j.results);
}

if (!results.length) { console.error('没有任何结果'); process.exit(1); }

/* --------------------------------------------------------------- 统计 ---- */

const byName = new Map();
for (const r of results) {
  if (!byName.has(r.name)) byName.set(r.name, []);
  byName.get(r.name).push(r);
}
const names = [...byName.keys()];
const base = names[0];

function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

function pairedDiff(name, other) {
  const A = new Map(byName.get(name).map(r => [r.seed, r.score]));
  const B = new Map(byName.get(other).map(r => [r.seed, r.score]));
  const d = [], dd = [];
  for (const [s, v] of A) { if (B.has(s)) { d.push(v - B.get(s)); dd.push(v); } }
  const sd = mean(d), sdv = Math.sqrt(d.reduce((a, x) => a + (x - sd) * (x - sd), 0) / Math.max(1, d.length - 1));
  /* bootstrap 95% CI */
  const rnd = P.mulberry32(12345);
  const boots = [];
  for (let b = 0; b < 4000; b++) {
    let s = 0;
    for (let k = 0; k < d.length; k++) s += d[Math.floor(rnd() * d.length)];
    boots.push(s / d.length);
  }
  boots.sort((a, b) => a - b);
  const lo = boots[Math.floor(boots.length * 0.025)], hi = boots[Math.floor(boots.length * 0.975)];
  const wins = d.filter(x => x > 0).length, losses = d.filter(x => x < 0).length, ties = d.filter(x => x === 0).length;
  return { name, n: d.length, meanDiff: sd, sdDiff: sdv, lo, hi, wins, losses, ties, meanOther: dd.length ? mean(dd) : 0 };
}

console.log('\n================ 结果 ================');
console.log('配置'.padEnd(22), 'n'.padStart(3), '平均分'.padStart(8), '中位'.padStart(7), '最低'.padStart(6), '最高'.padStart(6), '平均手数'.padStart(8), '场均耗时'.padStart(9), 'cap率'.padStart(6));
for (const n of names) {
  const rs = byName.get(n);
  const scores = rs.map(r => r.score);
  const caps = rs.filter(r => r.ended === 'cap').length;
  console.log(
    String(n).padEnd(22), String(rs.length).padStart(3),
    mean(scores).toFixed(1).padStart(8), String(median(scores)).padStart(7),
    String(Math.min(...scores)).padStart(6), String(Math.max(...scores)).padStart(6),
    mean(rs.map(r => r.drops)).toFixed(0).padStart(8),
    (mean(rs.map(r => r.wallMs)) / 1000).toFixed(0).padStart(9),
    ((caps / rs.length * 100).toFixed(0) + '%').padStart(6),
  );
}

console.log('\n---------------- 配对差（vs ' + base + '） ----------------');
console.log('配置'.padEnd(22), 'n'.padStart(3), '平均差'.padStart(9), '95%CI'.padStart(20), '胜负'.padStart(9), '相对'.padStart(8));
const baseMean = mean(byName.get(base).map(r => r.score));
for (const n of names) {
  if (n === base) continue;
  const d = pairedDiff(n, base);
  console.log(
    String(n).padEnd(22), String(d.n).padStart(3),
    (d.meanDiff >= 0 ? '+' : '') + d.meanDiff.toFixed(1).padStart(8),
    `[${d.lo.toFixed(0)}, ${d.hi.toFixed(0)}]`.padStart(20),
    `${d.wins}胜${d.losses}负`.padStart(9),
    ((d.meanDiff / (baseMean || 1)) * 100).toFixed(1).padStart(7) + '%',
  );
}

/* 分段分（对「被 cap 截断」的稳健性检查） */
const markKeys = Object.keys(results[0].marks || {}).map(Number).sort((a, b) => a - b);
if (markKeys.length) {
  console.log('\n---------------- 第 N 手时的分数（消除存活时长差异） ----------------');
  console.log('配置'.padEnd(22) + markKeys.map(k => ('#' + k).padStart(9)).join(''));
  for (const n of names) {
    const rs = byName.get(n);
    const row = markKeys.map(k => {
      const vals = rs.map(r => r.marks[k]).filter(v => v !== undefined);
      return (vals.length ? mean(vals).toFixed(0) : '—').padStart(9);
    }).join('');
    console.log(String(n).padEnd(22) + row);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = path.join(OUT, `judge-${TAG}-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify({
  tag: TAG, protocol: PROTOCOL || spec.protocol, maxDrops: MAXDROPS ?? spec.maxDrops, spec, seeds: seedList,
  summary: names.map(n => {
    const rs = byName.get(n);
    return { name: n, n: rs.length, avg: mean(rs.map(r => r.score)), median: median(rs.map(r => r.score)),
      avgDrops: mean(rs.map(r => r.drops)), capRate: rs.filter(r => r.ended === 'cap').length / rs.length,
      avgPlanMs: mean(rs.map(r => r.planMsAvg)) };
  }),
  paired: names.filter(n => n !== base).map(n => pairedDiff(n, base)),
  results,
}, null, 2));
console.log('\n结果已写入', file);

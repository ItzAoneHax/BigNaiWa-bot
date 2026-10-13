/* ============================================================================
 *  tune.mjs —— 并行调参：多进程跑自我对弈，比较不同权重/搜索配置的强度
 *
 *  用法：
 *    node tools/tune.mjs --configs out/configs.json --games 12 --workers 10
 *    node tools/tune.mjs --random 40 --games 8 --workers 10        # 随机搜索
 *    node tools/tune.mjs --search                  # 预设的坐标下降
 *
 *  configs.json 形如：
 *    [ {"name":"base"}, {"name":"noAdj","weights":{"adj":0}} , ... ]
 *
 *  评估口径：同一批随机种子（配对比较），报告平均分 / 中位数 / 最高分。
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
  return (v === undefined || v.startsWith('--')) ? true : (isNaN(Number(v)) ? v : Number(v));
}

const GAMES = Number(arg('games', 8));
const WORKERS = Number(arg('workers', Math.max(2, Math.min(12, os.cpus().length - 4))));
const SEED0 = Number(arg('seed', 5000));
const TUNE = arg('tune', null);           // 联调参数：planner 的 step/h1/h2/topK/lookahead
const BASE = arg('base', null);           // 额外覆盖的权重（JSON 文件）

function runOne(config, seeds, plannerOpts) {
  return new Promise((resolve) => {
    const wf = path.join(OUT, `.w-${config.name}-${seeds[0]}.json`);
    fs.writeFileSync(wf, JSON.stringify(config.weights || {}));
    const seedsStr = seeds.join(',');
    const args = [
      path.join(__dirname, 'selfplay.mjs'),
      '--games', String(seeds.length),
      '--seed', String(seeds[0]),
      '--weights', wf,
      '--quiet',
      '--maxDrops', String(Number(arg('maxDrops', 900))),
    ];
    const m = /^(\d+):(\d+):(\d+)$/.exec(String(seedsStr).slice(0, 0) || '') || null;
    void m;
    const merged = { ...(plannerOpts || {}), ...(config.opts || {}) };
    for (const [k, v] of Object.entries(merged)) args.push('--' + k, String(v));
    args.push('--seedlist', seedsStr);
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', (code) => {
      try { fs.unlinkSync(wf); } catch { }
      if (code !== 0) { console.error('[worker failed]', err.slice(-800)); resolve([]); return; }
      const line = out.split('\n').filter(l => l.startsWith('{JSON}')).pop();
      if (!line) { console.error('[no json]', out.slice(-500)); resolve([]); return; }
      resolve(JSON.parse(line.slice(6)).results);
    });
  });
}

/* 把一批种子切成 WORKERS 份并发跑 */
async function evalConfig(config, seeds, plannerOpts) {
  const chunks = Array.from({ length: WORKERS }, () => []);
  seeds.forEach((s, i) => chunks[i % WORKERS].push(s));
  const t0 = Date.now();
  const parts = await Promise.all(chunks.filter(c => c.length).map(c => runOne(config, c, plannerOpts)));
  const results = parts.flat();
  const scores = results.map(r => r.score).sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    name: config.name,
    n: scores.length,
    avg: sum / scores.length,
    median: scores[Math.floor(scores.length / 2)],
    min: scores[0],
    max: scores[scores.length - 1],
    wall: (Date.now() - t0) / 1000,
    sqrtAvg: Math.sqrt(scores.reduce((a, b) => a + b * b, 0) / scores.length),
    results,
  };
}

function report(rows) {
  const sorted = [...rows].sort((a, b) => b.avg - a.avg);
  console.log('\n配置'.padEnd(26), 'n'.padStart(3), '平均'.padStart(8), '中位'.padStart(7), '最低'.padStart(7), '最高'.padStart(7), '耗时'.padStart(8));
  for (const r of sorted) {
    console.log(String(r.name).padEnd(26), String(r.n).padStart(3),
      r.avg.toFixed(1).padStart(8), String(r.median).padStart(7),
      String(r.min).padStart(7), String(r.max).padStart(7),
      (r.wall.toFixed(0) + 's').padStart(8));
  }
  return sorted;
}

/* ------------------------------------------------------------------ 主流程 -- */

const plannerOpts = {};
if (TUNE) for (const kv of String(TUNE).split(',')) { const [k, v] = kv.split('='); plannerOpts[k] = isNaN(Number(v)) ? v : Number(v); }

let configs = null;
const cf = arg('configs', null);
if (cf) configs = JSON.parse(fs.readFileSync(cf, 'utf8'));
else if (arg('random', false)) {
  const n = Number(arg('random'));
  const rnd = P.mulberry32(Number(arg('rseed', 42)));
  configs = [{ name: 'default', weights: {} }];
  const keys = ['merge', 'mergeW', 'top', 'above', 'overT', 'bump', 'adj', 'bigHigh', 'frag'];
  for (let i = 0; i < n; i++) {
    const w = {};
    for (const k of keys) w[k] = +(P.DEFAULT_WEIGHTS[k] * (0.4 + rnd() * 1.8)).toFixed(3);
    configs.push({ name: 'rnd' + i, weights: w });
  }
} else {
  configs = [{ name: 'default', weights: {} }];
}

if (BASE) {
  const b = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  for (const c of configs) c.weights = { ...b, ...(c.weights || {}) };
}

console.log(`并行调参：${configs.length} 个配置 × ${GAMES} 局，worker=${WORKERS}，planner=${JSON.stringify(plannerOpts) || '默认'}`);

const seeds = Array.from({ length: GAMES }, (_, i) => SEED0 + i);
const rows = [];
for (const c of configs) {
  process.stdout.write(`跑 ${c.name} ... `);
  const r = await evalConfig(c, seeds, plannerOpts);
  rows.push(r);
  console.log(`avg=${r.avg.toFixed(1)} max=${r.max} (${r.wall.toFixed(0)}s)`);
}

const sorted = report(rows);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = path.join(OUT, `tune-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify({ plannerOpts, seeds, rows: sorted, configs }, null, 2));
console.log('\n结果已写入', file);

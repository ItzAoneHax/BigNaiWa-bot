/* ============================================================================
 *  selfplay.mjs —— Node 内高速自我对弈（不打开浏览器）
 *
 *  用移植引擎跑完整对局，用来：
 *    · 测算法强度（平均分 / 最好分 / 分布）
 *    · 调参（权重、搜索深度、候选步长）
 *    · 回归测试（改代码后分数别掉）
 *
 *  用法：
 *    node tools/selfplay.mjs --games 20 --seed 1
 *    node tools/selfplay.mjs --games 10 --lookahead 2 --step 6 --json out.json
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shapes = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/shapes.json'), 'utf8'));
E.setShapes(shapes);

/* ------------------------------------------------------------- 参数解析 --- */

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

const GAMES = arg('games', 10);
const SEED0 = arg('seed', 1000);
const MAX_DROPS = arg('maxDrops', 1200);
const VERBOSE = !!arg('verbose', false);
const weightsFile = arg('weights', null);
const weights = weightsFile
  ? { ...P.DEFAULT_WEIGHTS, ...JSON.parse(fs.readFileSync(weightsFile, 'utf8')) }
  : P.DEFAULT_WEIGHTS;

const planOpts = {
  weights,
  step: arg('step', 8),
  h1: arg('h1', 1.2),
  h2: arg('h2', 3.0),
  topK: arg('topK', 10),
  lookahead: arg('lookahead', 1),
  budgetMs: arg('budget', 1e9),
};
if (arg('nextMode', null)) planOpts.nextMode = arg('nextMode', null);
if (arg('timing', null)) planOpts.timing = arg('timing', null);
if (arg('latencyFrames', null)) planOpts.latencyFrames = Number(arg('latencyFrames', 0));

/* ------------------------------------------------------------ 对局循环 --- */

export function playGame(seed, opts = {}) {
  const planOpts2 = opts.planOpts || planOpts;
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const maxDrops = opts.maxDrops ?? MAX_DROPS;
  let planMs = 0, planCount = 0, revives = 0, bestTier = 0;

  while (w.drops < maxDrops) {
    /* 等到可以投放，并且盘面基本稳定（模拟真人看着盘面出手） */
    let guard = 0;
    while ((!w.ready || E.maxSpeed(w) > 60) && !w.over && guard < 60 * 30) { E.update(w, E.CFG.FIXED); guard++; }
    if (w.over) {
      if (w.revives > 0) { E.revive(w); revives++; continue; }
      break;
    }
    if (guard >= 60 * 30) break;

    const t0 = P.now();
    const dec = P.plan(w, planOpts2);
    planMs += P.now() - t0; planCount++;
    E.dropAt(w, dec.x);

    for (const b of w.balls) if (b.tier > bestTier) bestTier = b.tier;
    if (VERBOSE) {
      console.log(`  drop#${w.drops} tier=${w.pending} x=${dec.x.toFixed(1)} -> score=${w.score} top=${E.stackTop(w).toFixed(0)} ms=${dec.ms}`);
    }
  }

  let maxTier = 0;
  for (const b of w.balls) if (b.tier > maxTier) maxTier = b.tier;

  /* 诊断指标：后期「大果分居两地、永远合不到一起」的严重程度。
     统计同级大果(tier>=7)中，间距超过 3 倍半径和的对数。 */
  let stranded = 0, bigPairs = 0;
  for (let i = 0; i < w.balls.length; i++) {
    const a = w.balls[i];
    if (a.tier < 7) continue;
    for (let j = i + 1; j < w.balls.length; j++) {
      const b = w.balls[j];
      if (b.tier !== a.tier) continue;
      bigPairs++;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > (a.r + b.r) * 3) stranded++;
    }
  }

  return {
    seed, score: w.score, drops: w.drops, revives, stranded, bigPairs,
    maxTier, maxTierName: E.FRUITS[maxTier].name,
    planMsAvg: planCount ? planMs / planCount : 0,
    over: w.over,
  };
}

/* ------------------------------------------------------------------ CLI --- */

const isMain = process.argv[1] && process.argv[1].endsWith('selfplay.mjs');
if (isMain) {
  const seedList = arg('seedlist', null);
  const seeds = seedList
    ? String(seedList).split(',').map(Number)
    : Array.from({ length: GAMES }, (_, i) => SEED0 + i);

  const results = [];
  const t0 = Date.now();
  for (let i = 0; i < seeds.length; i++) {
    const r = playGame(seeds[i]);
    results.push(r);
    if (VERBOSE) {
      console.log(`#${String(i + 1).padStart(3)} seed=${r.seed} score=${String(r.score).padStart(6)} drops=${String(r.drops).padStart(4)} max=${r.maxTierName} revives=${r.revives} plan=${r.planMsAvg.toFixed(0)}ms`);
    }
  }
  const scores = results.map(r => r.score).sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = sum / scores.length;
  const median = scores[Math.floor(scores.length / 2)];
  const p90 = scores[Math.min(scores.length - 1, Math.floor(scores.length * 0.9))];
  const wall = (Date.now() - t0) / 1000;

  if (!arg('quiet', false)) {
    console.log('─'.repeat(64));
    console.log(`games=${seeds.length} avg=${avg.toFixed(1)} median=${median} min=${scores[0]} max=${scores[scores.length - 1]} p90=${p90}`);
    console.log(`wall=${wall.toFixed(1)}s  (${(wall / seeds.length).toFixed(2)}s/局)  planOpts=${JSON.stringify({ step: planOpts.step, h1: planOpts.h1, h2: planOpts.h2, topK: planOpts.topK, lookahead: planOpts.lookahead })}`);
  }

  const strandedAvg = results.reduce((a, b) => a + (b.stranded || 0), 0) / Math.max(1, results.length);
  if (!arg('quiet', false)) console.log(`末局「分居同级大果」平均 ${strandedAvg.toFixed(2)} 对（越少越好）`);

  const jsonOut = arg('json', null);
  const payload = { planOpts, weights, results, avg, median, p90, max: scores[scores.length - 1], min: scores[0], wall };
  if (jsonOut && jsonOut !== true) {
    fs.writeFileSync(jsonOut, JSON.stringify(payload, null, 2));
    if (!arg('quiet', false)) console.log('wrote', jsonOut);
  }
  /* 给并行驱动器用的单行机器可读输出 */
  console.log('{JSON}' + JSON.stringify(payload));
}

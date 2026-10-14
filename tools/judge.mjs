/* ============================================================================
 *  judge.mjs —— 配对种子评估器：把「浏览器里 bot 真正的打法」搬进 Node
 *
 *  为什么需要它：
 *    tools/selfplay.mjs 的对局协议是「等盘面安静（maxSpeed<=60）再决定落点」，
 *    而浏览器里的 bot 走的是 planParallel —— 冷却一结束就出手，盘面往往还在动。
 *    过去所有调参结论都建立在那个协议上，与线上打法并不一致。
 *
 *  本工具的 live 协议逐帧对齐 src/bot.js 的 turbo 路径：
 *    ① 每帧 update()；cooldown 一结束（state.ready）就发起决策
 *    ② 决策期间游戏时钟是冻住的（turbo：inflight 时不推帧）
 *    ③ 决策完成后**再过一帧**才落子（planLifecycle 在下一帧检查 dropFrame）
 *    ④ 判负时先花复活币，没币才结束
 *  wait 协议（= 项目里 TIMING 的「等安静再出手」策略）：落子前最多等 3 秒游戏
 *  时间（对应 TIMING.maxWaitFrames），安静就立刻出手，等不到也照常出手。
 *
 *  配对：同 seed 下所有配置共用同一条「游戏随机数流」（plan 用独立随机流），
 *  因此各配置面对的新水果序列一致（rollout 取数不会扰动对局）。
 *
 *  断点续跑：每跑完一局就向 <out>.jsonl 追加一行；重跑同一命令会自动跳过
 *  已完成的 (seed, config)，被中断也不必从头再来。
 *
 *  用法：
 *    node tools/judge.mjs --spec out/judge-spec.json --shard 0/8 --out out/judge-s0.json
 *    node tools/judge.mjs --spec out/judge-spec.json            # 全部 seed，单进程
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const shapes = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/shapes.json'), 'utf8'));
E.setShapes(shapes);

const MARKS = [50, 100, 150, 200, 250, 300, 350, 400, 500, 600];
const WAIT_CAP_FRAMES = 180;      // 3 秒游戏时间（= planner.TIMING.maxWaitFrames）

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

/* --------------------------------------------------------------- 单局 ----- */

export function playGame(seed, cfg, opts = {}) {
  const protocol = cfg.protocol || opts.protocol || 'live';   // 'live' | 'wait'
  const maxDrops = opts.maxDrops ?? 600;
  if (opts.shapeMode) E.setShapeMode(opts.shapeMode);

  const gameRng = P.mulberry32(seed >>> 0);
  const planRng = P.mulberry32(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  const w = E.makeWorld({ rng: gameRng });
  E.resetWorld(w, { rng: gameRng });

  const think = { ...(cfg.think || {}) };
  if (cfg.weights) think.weights = { ...P.DEFAULT_WEIGHTS, ...cfg.weights };

  const marks = {};
  const board = {};          // 第 N 手时的「盘面健康度」：堆顶高度 / 球数 / 最大等级
  let planMs = 0, planN = 0, revives = 0, deaths = 0, waitSum = 0;

  while (w.drops < maxDrops) {
    /* ① 推进到「可以并且应该出手」的时刻 */
    let waited = 0;
    for (;;) {
      if (w.over) break;
      const quietOk = (protocol === 'live') || (E.maxSpeed(w) <= 60);
      if (w.ready && quietOk) break;
      if (waited >= WAIT_CAP_FRAMES) break;              // 等不到安静 → 照常出手
      E.update(w, E.CFG.FIXED);
      waited++;
    }
    waitSum += waited;

    if (w.over) {
      deaths++;
      if (w.revives > 0) { E.revive(w); revives++; continue; }
      break;
    }

    /* ② 决策（时钟冻住 —— turbo 里 inflight 时不推帧）；
          plan 用独立随机流，免得 rollout 的取数扰动对局的新水果序列 */
    const savedRng = w.rng;
    w.rng = planRng;
    const tp = P.now();
    let dec;
    try {
      dec = P.searchBest(w, think);
    } finally {
      w.rng = savedRng;
    }
    planMs += P.now() - tp; planN++;

    /* ③ 下一帧才真正落子（对应 planLifecycle 里 frame >= dropFrame 的判断） */
    const preTop = E.stackTop(w), preN = w.balls.length;   // 落子前的盘面（见下）
    E.update(w, E.CFG.FIXED);
    if (w.over) {
      deaths++;
      if (w.revives > 0) { E.revive(w); revives++; continue; }
      break;
    }
    E.dropAt(w, dec.x);
    for (const m of MARKS) {
      if (marks[m] === undefined && w.drops >= m) {
        marks[m] = w.score;
        /* ⚠️ 必须记**落子前**的堆顶：落子后那颗球悬在 y=74 的投放点，
           stackTop 会被它顶到 40~57，量出来的是投放点而不是盘面（第一版踩过） */
        board[m] = { top: Math.round(preTop), n: preN };
      }
    }
  }

  let maxTier = 0;
  for (const b of w.balls) if (b.tier > maxTier) maxTier = b.tier;

  return {
    seed, name: cfg.name, protocol,
    score: w.score, drops: w.drops, maxTier, revives, deaths,
    ended: w.over ? 'over' : (w.drops >= maxDrops ? 'cap' : 'stop'),
    marks, board,
    waitAvgFrames: planN ? waitSum / Math.max(1, planN) : 0,
    planMsAvg: planN ? planMs / planN : 0,
    wallMs: 0,
  };
}

/* ------------------------------------------------------------------ CLI --- */

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/judge.mjs');
if (isMain) {
  const specFile = arg('spec', null);
  if (!specFile) { console.error('需要 --spec <json>'); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const protocol = arg('protocol', spec.protocol || 'live');
  const maxDrops = Number(arg('maxDrops', spec.maxDrops ?? 600));
  const shapeMode = arg('shapeMode', spec.shapeMode || null);
  const outFile = arg('out', null);

  let seeds = spec.seeds.slice();
  const shard = arg('shard', null);
  if (shard) {
    const [i, n] = String(shard).split('/').map(Number);
    seeds = seeds.filter((_, k) => k % n === i);
  } else if (arg('seeds', null)) {
    seeds = String(arg('seeds')).split(',').map(Number);
  }

  const jsonl = (outFile && outFile !== true) ? outFile + '.jsonl' : null;
  const results = [];
  const done = new Set();
  if (jsonl && fs.existsSync(jsonl)) {
    for (const line of fs.readFileSync(jsonl, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); results.push(r); done.add(r.seed + '|' + r.name); } catch { }
    }
  }

  for (const seed of seeds) {
    for (const cfg of spec.configs) {
      if (done.has(seed + '|' + cfg.name)) continue;      // 断点续跑：跳过已完成
      const t0 = Date.now();
      const r = playGame(seed, cfg, { protocol, maxDrops, shapeMode });
      r.wallMs = Date.now() - t0;
      results.push(r);
      if (jsonl) fs.appendFileSync(jsonl, JSON.stringify(r) + '\n');
      process.stdout.write(`seed=${seed} ${String(cfg.name).padEnd(20)} score=${String(r.score).padStart(5)} drops=${String(r.drops).padStart(4)} max=${String(r.maxTier).padStart(2)} rev=${r.revives} wait=${r.waitAvgFrames.toFixed(1)}f ${r.ended} ${(r.wallMs / 1000).toFixed(0)}s\n`);
    }
  }

  if (outFile && outFile !== true) {
    fs.writeFileSync(outFile, JSON.stringify({ protocol, maxDrops, shapeMode, spec, seeds, results }, null, 2));
    process.stdout.write('wrote ' + outFile + '\n');
  }
}

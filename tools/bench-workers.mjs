/* ============================================================================
 *  bench-workers.mjs —— Worker 数量的扩展性（Node worker_threads 代理测试）
 *
 *  浏览器里 bot 用 Web Worker 池跑 planParallel；这里用同样的执行模型
 *  （按连续区间切片 → 各 Worker 独立执行 → 按序拼接）在 Node 里复现，
 *  用来回答「开几个 Worker 合适」。V8 引擎与浏览器相同，因此可作代理指标。
 *
 *  用法：node tools/bench-workers.mjs [档位 normal|deep] [Worker 数列表 1,2,4,6,8,12,16]
 * ========================================================================== */

import fs from 'node:fs';
import os from 'node:os';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

const FIXED = E.CFG.FIXED;
const SHAPES = JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8'));

/* ---------------------------------------------------------- Worker 端 ---- */
if (!isMainThread) {
  E.setShapes(JSON.parse(JSON.stringify(SHAPES)));
  parentPort.on('message', (m) => {
    const w = E.makeWorld({ rng: P.mulberry32(1) });
    E.adoptFromGame(w, m.state, null, m.state.nowMs);
    const results = P.STAGES[m.stage](w, m.opts, m.xs);
    parentPort.postMessage({ id: m.id, results });
  });
} else {
  /* ----------------------------------------------------------- 主线程 ---- */
  const which = process.argv[2] || 'normal';
  const counts = (process.argv[3] || '1,2,4,6,8,12,16').split(',').map(Number);
  const PROFILES = {
    deep:   { step: 6,  h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, refine: true, innerTop: 6, nextMode: 'known' },
    normal: { step: 8,  h1: 1.2, h2: 2.6, topK: 8,  lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' },
  };
  const opts = PROFILES[which];

  E.setShapes(JSON.parse(JSON.stringify(SHAPES)));
  function makeBoard(seed, drops) {
    const w = E.makeWorld({ rng: P.mulberry32(seed) });
    E.resetWorld(w, { rng: P.mulberry32(seed) });
    const rnd = P.mulberry32(seed + 3);
    let d = 0, guard = 0;
    while (d < drops && guard++ < drops * 4) {
      if (w.over && !E.revive(w)) break;
      E.moveAim(w, 30 + rnd() * 360);
      if (E.tryDrop(w)) d++;
      for (let k = 0; k < 34; k++) { E.update(w, FIXED); if (w.over) break; }
    }
    for (let k = 0; k < 240; k++) E.update(w, FIXED);
    return w;
  }
  const board = makeBoard(4242, 170);
  const snap = E.snapshotOf(board, 1000);

  /* 建一个 Worker 池（与 bot.js 的 makeExec 一样的切片规则） */
  function makePool(n) {
    const pool = [];
    for (let i = 0; i < n; i++) pool.push(new Worker(new URL(import.meta.url)));
    let nextId = 1;
    const waiters = new Map();
    for (const wk of pool) wk.on('message', (m) => { const r = waiters.get(m.id); waiters.delete(m.id); r(m); });
    const ask = (wk, msg) => new Promise((res) => { const id = nextId++; waiters.set(id, res); wk.postMessage({ ...msg, id }); });
    const exec = async (stage, xs) => {
      if (n <= 1 || xs.length <= 2) return (await ask(pool[0], { stage, state: snap, opts, xs })).results;
      const per = Math.ceil(xs.length / n);
      const chunks = [];
      for (let i = 0; i < xs.length; i += per) chunks.push(xs.slice(i, i + per));
      const parts = await Promise.all(chunks.map((c, i) => ask(pool[i], { stage, state: snap, opts, xs: c })));
      return parts.flatMap(p => p.results);
    };
    return { exec, close: () => Promise.all(pool.map(w => w.terminate())) };
  }

  const world = E.makeWorld({ rng: Math.random });
  E.adoptFromGame(world, snap, null, snap.nowMs);

  console.log(`档位 ${which}，盘面 ${board.balls.length} 颗，本机逻辑核 ${os.cpus().length}`);
  console.log('Worker 数 | 决策耗时 (中位数, 3 次) | 加速比 | 选中落点');
  let base = null;
  for (const n of counts) {
    const pool = makePool(n);
    await new Promise(r => setTimeout(r, 150));           // 等 Worker 启动
    const times = [];
    let last = null;
    for (let rep = 0; rep < 3; rep++) {
      const t0 = performance.now();
      last = await P.planParallel(world, opts, pool.exec);
      times.push(performance.now() - t0);
    }
    await pool.close();
    times.sort((a, b) => a - b);
    const med = times[1];
    if (base === null) base = med;
    console.log(`${String(n).padStart(8)} | ${med.toFixed(0).padStart(10)} ms            | ${(base / med).toFixed(2).padStart(5)}x | x=${last.x.toFixed(3)}`);
  }
}

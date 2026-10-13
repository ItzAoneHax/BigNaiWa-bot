/* ============================================================================
 *  worker.js —— 推演工作线程
 *
 *  主线程只把「当前盘面快照 + 决策参数」丢过来，这里负责：
 *    ① 重建世界（移植物理引擎）
 *    ② 搜落点（候选 → 推演 → 评估 → 期望搜索 → 细化）
 *    ③ 顺带决定「投掷时机」（现在丢 or 等安静）
 *    ④ 把 {x, delayFrames, ...} 回传
 *
 *  这样主线程一秒都不会被阻塞：页面照常渲染、水果照常滚，
 *  bot 在后台线程里慢慢算。
 * ========================================================================== */

import * as E from './engine.js';
import * as P from './planner.js';

let shapesReady = false;

self.onmessage = (e) => {
  const m = e.data;
  if (!m || typeof m !== 'object') return;

  if (m.type === 'init') {
    if (m.shapes && m.shapes.length) { E.setShapes(m.shapes); shapesReady = true; }
    self.postMessage({ type: 'ready', tiers: shapesReady ? m.shapes.length : 0 });
    return;
  }

  /* 延迟补偿：把盘面往前推 n 帧，返回推进后的快照（实时模式下用） */
  if (m.type === 'advance') {
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      P.advanceFrames(w, m.frames | 0);
      self.postMessage({ type: 'advance', id: m.id, ok: true, state: E.snapshotOf(w, w.now) });
    } catch (err) {
      self.postMessage({ type: 'advance', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
    return;
  }

  /* 单个搜索阶段（并行版把候选落点切片丢过来，各算各的） */
  if (m.type === 'stage') {
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      const fn = P.STAGES[m.stage];
      const results = fn(w, m.opts || {}, m.xs);
      self.postMessage({ type: 'stage', id: m.id, ok: true, results });
    } catch (err) {
      self.postMessage({ type: 'stage', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
    return;
  }

  if (m.type === 'plan') {
    const t0 = performance.now();
    try {
      const w = E.makeWorld({ rng: Math.random });
      E.adoptFromGame(w, m.state, null, m.state.nowMs);
      const dec = P.plan(w, m.opts || {});
      self.postMessage({
        type: 'plan', id: m.id, ok: true,
        result: {
          x: dec.x, value: dec.value, delayFrames: dec.delayFrames || 0,
          choice: dec.choice || 'now', candCount: dec.candCount,
          computeMs: performance.now() - t0,
        },
      });
    } catch (err) {
      self.postMessage({ type: 'plan', id: m.id, ok: false, error: String((err && err.stack) || err) });
    }
  }
};

/* ============================================================================
 *  bot.js —— 浏览器里让 AI 自动打「合成大奶娃」
 *
 *  架构（v3）：
 *
 *    主线程                                   Worker 线程
 *    ─────────────────────────────            ────────────────────────────
 *    自己驱动游戏时钟（与原版主循环等价）       收到盘面快照
 *      rAF 每帧：update(1/60) + render          重建世界（移植物理引擎）
 *      每帧：该出手了吗 / 要不要发起决策        搜落点 + 同时决定「投掷时机」
 *    需要决策 → 发快照 ────────────────────▶   推演 40+ 个候选落点
 *    ◀──────────────────── 回传 {x, delayFrames}
 *    到点就派发一次真实 pointerdown 出手
 *
 *  v3 相对 v2 的变化：
 *    · 灵动岛控制台（可拖动/折叠）：暂停、实时/快进、排行榜开关、自动复活、搜索强度
 *    · 一局结束后不再「整个脚本停掉」—— 你点重开，它自动接着打
 *    · 关闭脚本时把游戏交还给你（用等价的主循环继续驱动，页面照常能玩）
 * ========================================================================== */

import * as E from './engine.js';
import * as P from './planner.js';
import { createIsland, STRENGTH } from './hud.js';

const DEFAULTS = {
  mode: 'realtime',        // 'realtime'（跟着游戏节奏）| 'turbo'（快进刷分）
  sliceMs: 24,             // turbo 每片最多跑多久，让出主线程
  renderEvery: 6,          // turbo 每多少物理帧重绘一次
  autoRevive: true,        // 有复活币就用（币当资源花）
  blockLeaderboard: true,  // 拦截成绩自动提交
  seed: null,              // 给定 seed → 可复现随机数（turbo 刷分用）
  verbose: false,
  hud: true,               // 灵动岛
  useWorker: true,
  workers: 0,              // 推演用几个 Worker（0 = 自动：min(12, 核数-4)）
  think: {
    step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true,
    innerTop: 4,
    nextMode: 'known',     // 下一颗水果是已知的(state.next) → 当成两手连手棋来算
    budgetMs: 6000,
    timing: 'auto',        // 'auto' | 'now' | 'settle'
    quietSpeed: 60,
    maxWaitFrames: 180,
    waitPenaltyPerFrame: 0.02,
  },
};

const FIXED = E.CFG.FIXED;
const PREFS_KEY = 'danaiwa.bot.prefs.v1';

export function createBot(userOpts = {}) {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } })();
  const opts = {
    ...DEFAULTS, ...prefs, ...userOpts,
    think: { ...DEFAULTS.think, ...(prefs.think || {}), ...(userOpts.think || {}) },
  };

  const bot = {
    opts,
    running: false,        // 驱动循环在跑
    aiEnabled: true,       // AI 是否在决策/出手
    paused: false,         // 暂停（连游戏一起冻住）
    driverMode: null,      // 'realtime' | 'turbo'
    strength: prefs.strength || 'normal',
    DNW: null,
    S: null,
    worker: null,
    frame: 0,
    plan: null,
    inflight: null,
    reqId: 0,
    overHandled: false,
    awaitingRestart: false,
    island: null,
    log: [],
    stats: {
      games: [], drops: 0, planMs: 0, planN: 0, lastPlanMs: 0, lastCand: null,
      lastChoice: null, lastDelayFrames: 0, lastValue: null,
      simFrames: 0, maxTier: 0, revivesUsed: 0, blockedSubmits: 0, revivesLeft: 0,
      bestScore: 0, startedAt: 0, elapsed: 0, status: 'idle', error: null,
      workerReady: false, usingWorker: false, workerCount: 0,
      choices: { now: 0, settle: 0, quiet: 0 },
      gameStart: { drop: 0, plan: 0, planN: 0, revive: 0 },
    },
  };

  bot.fruitName = (t) => (E.FRUITS[t] ? E.FRUITS[t].name : String(t));
  bot.savePrefs = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        mode: opts.mode, blockLeaderboard: opts.blockLeaderboard, autoRevive: opts.autoRevive,
        strength: bot.strength, think: opts.think,
      }));
    } catch { }
  };

  function say(...a) {
    const line = a.join(' ');
    bot.log.push(line);
    if (bot.log.length > 400) bot.log.shift();
    if (opts.verbose) console.log('[bot]', line);
  }

  /* ------------------------------------------------------------ 排行榜拦截 */
  function hookBoard() {
    const b = window.DanaiwaBoard;
    if (!b || typeof b.onGameOver !== 'function') return !!b;
    if (b.__naiwaOwner === bot) return true;
    /* 反复注入新实例时，旧实例留下的钩子必须被接管 ——
       否则开关会切到已经死掉的那个 bot 对象上（踩过这个坑） */
    const orig = b.__naiwaOrig || b.onGameOver;
    b.__naiwaOrig = orig;
    b.onGameOver = function (score) {
      const live = b.__naiwaOwner;
      if (live) {
        live.stats.lastScore = score;
        if (live.opts.blockLeaderboard) {
          live.stats.blockedSubmits++;
          live.say('拦下成绩自动提交（灵动岛里可改成「允许上榜」）：', score);
          return;
        }
      }
      return orig.apply(this, arguments);
    };
    b.__naiwaOwner = bot;
    return true;
  }

  /* ------------------------------------------------------------- Worker 池 --
   * 每个阶段的候选落点互相独立，切片丢给多个 Worker 各算各的，合并时按原顺序拼接
   * —— 数值与单线程逐位一致（tools/verify-parallel.mjs 守这条线），只是快了好几倍。
   */
  let pool = [];
  const waiters = new Map();     // id → resolve
  let nextId = 1;

  function ask(worker, msg) {
    const id = nextId++;
    msg.id = id;
    return new Promise((resolve, reject) => {
      waiters.set(id, { resolve, reject, t0: performance.now() });
      worker.postMessage(msg);
      setTimeout(() => {
        const w = waiters.get(id);
        if (w) { waiters.delete(id); reject(new Error('worker 超时：' + msg.type)); }
      }, 60000);
    });
  }

  function onWorkerMessage(e) {
    const m = e.data || {};
    if (m.type === 'ready') { bot.stats.workerReady = true; return; }
    const w = waiters.get(m.id);
    if (!w) return;
    waiters.delete(m.id);
    if (m.ok === false) { say('Worker 报错：', m.error); bot.stats.error = m.error; w.reject(new Error(m.error)); return; }
    w.resolve(m);
  }

  function startWorkers() {
    if (!opts.useWorker || typeof Worker === 'undefined' || typeof Blob === 'undefined') return false;
    if (typeof WORKER_SOURCE !== 'string') return false;
    const hw = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    /* 默认 min(12, 核数-4)。实测（tools/bench-workers.mjs，24 逻辑核）：
       normal 档 6→8→12 个 Worker 的决策耗时 387→264→223 ms；deep 档 6→10→12 为 745→475→406 ms，
       16 个反而回升（调度与消息开销），所以封顶 12；留 4 个核给页面与游戏本体。 */
    const want = opts.workers > 0 ? opts.workers : Math.max(1, Math.min(12, hw - 4));
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'application/javascript' }));
      const shapes = window.SUIKA_PARTS || (window.NaiwaBot && window.NaiwaBot.EMBEDDED_SHAPES) || null;
      for (let i = 0; i < want; i++) {
        const w = new Worker(url);
        w.onmessage = onWorkerMessage;
        w.onerror = (e) => say('Worker onerror：', (e && e.message) || e);
        w.postMessage({ type: 'init', shapes });
        pool.push(w);
      }
      bot.stats.usingWorker = true;
      bot.stats.workerCount = pool.length;
      say(`Worker 池就绪：${pool.length} 个（推演并行度 ${pool.length}x）`);
      return true;
    } catch (e) {
      say('Worker 起不来，退回同步推演：', String(e));
      pool = [];
      return false;
    }
  }

  /* 分片执行器：把一个阶段的候选落点摊到池里的每个 Worker 上 */
  function makeExec(state, thinkOpts) {
    const n = pool.length;
    return async (stage, xs) => {
      if (n <= 1 || xs.length <= 2) {
        const r = await ask(pool[0], { type: 'stage', stage, state, opts: thinkOpts, xs });
        return r.results;
      }
      const chunks = [];
      const per = Math.ceil(xs.length / n);
      for (let i = 0; i < xs.length; i += per) chunks.push(xs.slice(i, i + per));
      const parts = await Promise.all(chunks.map((c, i) => ask(pool[i], { type: 'stage', stage, state, opts: thinkOpts, xs: c })));
      /* 注意：ask() 返回的是整条消息，结果在 .results 里（这里曾经漏取，导致多 Worker 直接崩） */
      const merged = [];
      for (const p of parts) for (const r of p.results) merged.push(r);
      return merged;
    };
  }

  function solveInline(snap, thinkOpts) {
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, snap, null, snap.nowMs);
    const t0 = performance.now();
    const dec = P.plan(w, thinkOpts || opts.think);
    return {
      x: dec.x, value: dec.value, delayFrames: dec.delayFrames || 0,
      choice: dec.choice || 'now', candCount: dec.candCount,
      computeMs: performance.now() - t0,
    };
  }

  /* ------------------------------------------------------------- 出手 ----- */
  function dropAt(x) {
    const S = bot.S;
    const canvas = document.getElementById('game');
    const stage = document.getElementById('stage');
    if (!canvas || !stage) return false;
    const rect = canvas.getBoundingClientRect();
    const ev = new PointerEvent('pointerdown', {
      clientX: rect.left + (x / E.CFG.W) * rect.width,
      clientY: rect.top + rect.height * 0.35,
      bubbles: true, cancelable: true,
      pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1,
    });
    stage.dispatchEvent(ev);
    if (S.ready) { S.aimX = x; bot.DNW.tryDrop(); }
    return !S.ready;
  }

  function tryRevive() {
    const S = bot.S;
    const btn = document.getElementById('reviveBtn');
    if (btn && !btn.hidden && btn.offsetParent !== null) { btn.click(); return true; }
    if (S.revives > 0) return bot.DNW.revive() === true;
    return false;
  }

  /* ------------------------------------------------------- 决策请求/应用 -- */
  bot.avgPlanMs = () => (bot.stats.planN ? bot.stats.planMs / bot.stats.planN : 0);

  async function runPlan(snap, thinkOpts) {
    let state = snap;
    /* 实时模式下 Worker 思考时游戏还在跑：先把盘面推到「这一手真正落下」的那一刻 */
    if (thinkOpts.latencyFrames > 0 && pool.length) {
      const adv = await ask(pool[0], { type: 'advance', state, frames: thinkOpts.latencyFrames });
      if (adv && adv.state) state = adv.state;
    }
    if (!pool.length) return solveInline(state, thinkOpts);
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, state, null, state.nowMs);
    return await P.planParallel(w, thinkOpts, makeExec(state, thinkOpts));
  }

  function requestPlan() {
    const S = bot.S;
    if (bot.inflight || !S.ready || S.over || !bot.aiEnabled) return;
    const id = ++bot.reqId;
    const snap = E.snapshotOf(S, performance.now());
    bot.inflight = { id, frame: bot.frame, t0: performance.now(), wall: performance.now() };
    const thinkOpts = bot.driverMode === 'realtime'
      ? { ...opts.think, latencyFrames: Math.round(bot.avgPlanMs() / 1000 * 60) }
      : opts.think;
    runPlan(snap, thinkOpts).then(
      (dec) => onPlanResult(id, dec),
      (err) => {
        if (bot.inflight && bot.inflight.id === id) bot.inflight = null;
        say('决策失败：', String(err && err.message || err));
        bot.stats.error = String(err && err.message || err);
      },
    );
  }

  function onPlanResult(id, result) {
    const inf = bot.inflight;
    if (!inf || inf.id !== id) return;
    bot.inflight = null;
    const wallMs = performance.now() - inf.t0;
    bot.stats.planMs += wallMs; bot.stats.planN++;
    bot.stats.lastPlanMs = Math.round(wallMs);
    bot.stats.lastChoice = result.choice;
    bot.stats.lastDelayFrames = result.delayFrames;
    bot.stats.lastValue = result.value;
    bot.stats.lastCand = result.candCount;
    const c = bot.stats.choices;
    if (result.choice === 'settle') c.settle++;
    else if (result.choice === 'quiet') c.quiet++;
    else c.now++;
    const delayFrames = Math.max(0, result.delayFrames | 0);
    bot.plan = {
      x: result.x,
      /* 两种驱动方式各用各的坐标系：
         实时模式走墙钟（游戏自己按 rAF 跑，1 帧 ≈ 16.7ms）
         快进模式走帧号（时钟由我们自己推） */
      dropAtMs: inf.wall + delayFrames * (1000 / 60),
      dropFrame: inf.frame + delayFrames,
      value: result.value, choice: result.choice,
      delayFrames, snapFrame: inf.frame,
    };
  }

  function planLifecycle() {
    const S = bot.S;
    if (S.over || !bot.aiEnabled) return;
    if (bot.plan && bot.frame >= bot.plan.dropFrame && S.ready) {
      const p = bot.plan;
      bot.plan = null;
      if (dropAt(p.x)) {
        bot.stats.drops++;
        if (opts.verbose) say(`#${bot.stats.drops} x=${p.x.toFixed(1)} 时机=${p.choice} 决策${bot.stats.lastPlanMs}ms 分数${S.score}`);
      }
    }
    if (!bot.plan && !bot.inflight && S.ready) requestPlan();
  }

  /* -------------------------------------------------------- 局面/生命期 --- */
  function trackStats() {
    const S = bot.S;
    for (const b of S.balls) if (b.tier > bot.stats.maxTier) bot.stats.maxTier = b.tier;
    bot.stats.revivesLeft = S.revives;
    if (S.score > bot.stats.bestScore) bot.stats.bestScore = S.score;
  }

  function maxSpeedOfGame() {
    let m = 0;
    for (const b of bot.S.balls) {
      const v = b.vx * b.vx + b.vy * b.vy;
      if (v > m) m = v;
    }
    return Math.sqrt(m);
  }

  function beginNewGame(reason) {
    const st = bot.stats;
    bot.plan = null; bot.inflight = null;
    bot.overHandled = false; bot.awaitingRestart = false;
    st.gameStart = { drop: st.drops, plan: st.planMs, planN: st.planN, revive: st.revivesUsed };
    st.maxTier = 0;
    st.status = 'running';
    say('新的一局开始（' + reason + '），接着打');
  }

  function finishGame(reason) {
    const S = bot.S, st = bot.stats, g0 = st.gameStart;
    const g = {
      score: S.score,
      drops: st.drops - g0.drop,
      maxTier: st.maxTier,
      revivesUsed: st.revivesUsed - g0.revive,
      planMsAvg: (st.planN - g0.planN) ? (st.planMs - g0.plan) / (st.planN - g0.planN) : 0,
      reason,
    };
    st.games.push(g);
    st.lastScore = g.score;
    st.status = 'waiting-restart';       // 不停止：等用户重开，脚本自动续打
    bot.awaitingRestart = true;
    say(`本局结束：${g.score} 分，${g.drops} 次投放，最大 ${bot.fruitName(g.maxTier)}，平均决策 ${g.planMsAvg.toFixed(0)}ms`);

    hookBoard();
    if (bot.DNW && typeof bot.DNW.settle === 'function') bot.DNW.settle();
  }

  function handleOver() {
    const S = bot.S;
    hookBoard();
    if (opts.autoRevive && S.revives > 0) {
      if (tryRevive()) {
        bot.stats.revivesUsed++;
        bot.overHandled = false;         // 复活成功 → 继续打
        say('用了一枚复活币（还剩 ' + S.revives + '）');
        return;
      }
    }
    finishGame('game-over');
  }

  /* 处理「结束 → 重开」「中途手动重开」两种情况 */
  function checkGameState() {
    const S = bot.S, st = bot.stats;
    if (S.over) {
      if (!bot.overHandled) { bot.overHandled = true; handleOver(); }
      return;
    }
    if (bot.awaitingRestart) { beginNewGame('重开'); return; }
    if (bot.overHandled) { bot.overHandled = false; return; }   // 复活回到对局
    if (S.balls.length === 0 && S.score === 0 && (st.drops - st.gameStart.drop) > 0) {
      beginNewGame('中途重开');
    }
  }

  /* ------------------------------------------------------------ 主循环 ---- */
  let last = 0, acc = 0;

  function stepFrame() {
    bot.frame++;
    bot.DNW.update(FIXED);
    bot.stats.simFrames++;
    checkGameState();
    planLifecycle();
    trackStats();
  }

  /* 实时模式：完全不碰页面时钟。游戏自己按 rAF 跑，我们只是「每隔几十毫秒看一眼」：
     该出手就出手，该想就想 —— 想的过程在 Worker 里，主线程一点都不卡。 */
  function realtimeTick() {
    if (!bot.running || bot.driverMode !== 'realtime') return;
    const S = bot.S, nowMs = performance.now();
    checkGameState();
    if (bot.aiEnabled && !S.over && !bot.paused) {
      if (bot.plan && nowMs >= bot.plan.dropAtMs && S.ready) {
        const p = bot.plan;
        bot.plan = null;
        if (dropAt(p.x)) {
          bot.stats.drops++;
          if (opts.verbose) say(`#${bot.stats.drops} x=${p.x.toFixed(1)} 时机=${p.choice} 决策${bot.stats.lastPlanMs}ms 分数${S.score}`);
        }
      }
      if (!bot.plan && !bot.inflight && S.ready) requestPlan();
    }
    trackStats();
    if (bot.island) bot.island.refresh();
  }

  function turboSlice() {
    if (!bot.running || bot.driverMode !== 'turbo') return;
    const deadline = performance.now() + opts.sliceMs;
    while (performance.now() < deadline) {
      if (bot.paused) break;
      if (bot.inflight) break;            // 等 Worker：一帧都不多跑，保证计划不过期
      stepFrame();
      if (bot.stats.simFrames % opts.renderEvery === 0) bot.DNW.render(FIXED);
    }
    if (bot.island) bot.island.refresh();
    if (!bot.running || bot.driverMode !== 'turbo') return;
    setTimeout(turboSlice, (bot.inflight || bot.paused) ? 8 : 0);
  }

  /* ------------------------------------------------------------- rAF ------
   * 游戏自己的主循环是一串「自我续排」的 requestAnimationFrame：
   *     function frame(now) { …update/render…; requestAnimationFrame(frame); }
   * 快进（turbo）要接管页面时钟，做法就是把这个函数换成不排队的空函数
   * —— 于是游戏的主循环在下一次回调之后就**断掉了**。
   *
   * 用户实测的 bug：从快进切回实时，只把 requestAnimationFrame 还原**不够**，
   * 那条链已经断了 —— 冷却不再递减、水果不再下落、S.ready 永远是 false，
   * 于是 bot 再也出不了手，看起来就是「切回实时直接卡死」。
   * 现在的做法：
   *   ① 劫持期间把所有排队的回调记下来（游戏主循环的下一环就在里面）；
   *   ② 切回来时把它们重新排上，等于把链接回游戏自己手里；
   *   ③ 万一一个都没记到（页面主循环本来就停着），退化成我们自己的等价主循环，
   *      照样不会冻住。
   * ------------------------------------------------------------------------ */
  let ownLoop = false;              // 我们自己替游戏推帧

  function hijackRaf() {
    if (bot._rafDisabled) return;
    bot._rafCaptured = [];
    window.requestAnimationFrame = function (cb) {
      if (typeof cb === 'function') bot._rafCaptured.push(cb);
      return 0;
    };
    bot._rafDisabled = true;
  }
  /* 返回「接回了几个回调」；0 = 没得接 */
  function unhijackRaf() {
    if (!bot._rafDisabled) return 0;
    window.requestAnimationFrame = bot._rafOrig;
    bot._rafDisabled = false;
    const pend = bot._rafCaptured || [];
    bot._rafCaptured = [];
    let resumed = 0;
    for (const cb of pend) { try { bot._rafOrig(cb); resumed++; } catch (e) { } }
    if (resumed) say('已把游戏自己的主循环接回（' + resumed + ' 个回调）');
    else startOwnLoop();
    return resumed;
  }

  /* 等价主循环：和 game.js 的 frame() 一样按墙钟累加、固定步长推物理 */
  function passiveFrame(t) {
    if (!bot.running || !ownLoop) return;
    if (!last) last = t;
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard < 5) { bot.DNW.update(FIXED); acc -= FIXED; guard++; }
    if (guard >= 5) acc = 0;
    bot.DNW.render(dt);
    bot._raf = bot._rafOrig(passiveFrame);
  }
  function startOwnLoop() {
    if (ownLoop || !bot.running) return;
    if (!bot._rafOrig) bot._rafOrig = window.requestAnimationFrame.bind(window);
    ownLoop = true; last = 0; acc = 0;
    bot._raf = bot._rafOrig(passiveFrame);
    say('页面主循环没在跑 → 由 bot 用等价主循环接管推帧');
  }
  function stopOwnLoop() {
    ownLoop = false;
    if (bot._raf != null && typeof cancelAnimationFrame === 'function') { try { cancelAnimationFrame(bot._raf); } catch (e) { } }
    bot._raf = null;
  }

  function startDriver(mode) {
    bot.driverMode = mode;
    last = 0; acc = 0;
    if (mode === 'turbo') setTimeout(turboSlice, 30);
    else if (mode === 'passive') startOwnLoop();
    else bot._timer = setInterval(realtimeTick, 30);
  }
  function stopDriver() {
    if (bot._timer) { clearInterval(bot._timer); bot._timer = null; }
    bot.driverMode = null;
  }

  /* ------------------------------------------------------------------------
   * 原地基准：用当前盘面跑一次完整决策，不落子、不影响对局。
   * 用于验证「并行 N 路 = 单路结果、但快 N 倍」。
   * ---------------------------------------------------------------------- */
  bot.benchDecision = async function (think = opts.think, n = null) {
    const want = n == null ? Math.max(1, pool.length) : Math.max(1, n | 0);
    const oldPool = pool;
    const oldWorkers = opts.workers;
    if (want !== oldPool.length) {
      for (const w of oldPool) { try { w.terminate(); } catch { } }
      pool = []; opts.workers = want;
      startWorkers();
      await new Promise(r => setTimeout(r, 150));       // 等池子热起来
    }
    const snap = E.snapshotOf(bot.S, performance.now());
    const w = E.makeWorld({ rng: Math.random });
    E.adoptFromGame(w, snap, null, snap.nowMs);
    const t0 = performance.now();
    const dec = await P.planParallel(w, { ...think, latencyFrames: 0 }, makeExec(snap, think));
    const ms = performance.now() - t0;

    if (want !== oldPool.length) {                       // 还原原来的池子
      for (const x of pool) { try { x.terminate(); } catch { } }
      pool = []; opts.workers = oldWorkers;
      if (oldPool.length) {
        for (const x of oldPool) { try { x.terminate(); } catch { } }
        startWorkers();
      }
    }
    return { x: dec.x, value: dec.value, candCount: dec.candCount, ms: Math.round(ms), workers: want };
  };

  /* ---------------------------------------------------------- 对外控制 ---- */
  bot.setPaused = (v) => { bot.paused = !!v; say(v ? '暂停' : '继续'); return bot; };
  bot.setMode = (m) => {
    if (opts.mode === m && bot.driverMode === m) return bot;
    opts.mode = m;
    if (bot.running) {
      stopDriver();
      if (m === 'turbo') {
        stopOwnLoop();               // 快进由 bot 自己推帧，别两边一起推
        hijackRaf();
      } else if (m === 'passive') {
        if (bot._rafDisabled) unhijackRaf();
        startOwnLoop();
      } else {
        /* 实时：必须把游戏自己的主循环接回来（用户报的「切回实时卡死」就在这一步），
           接不回来时 unhijackRaf() 内部会退化成我们自己推帧，同样不会冻住 */
        unhijackRaf();
      }
      startDriver(m);
    }
    say('模式切换为 ' + m);
    bot.savePrefs();
    return bot;
  };
  bot.restartGame = () => {
    bot.plan = null; bot.inflight = null;
    bot.overHandled = false; bot.awaitingRestart = false;
    bot.DNW.reset();
    beginNewGame('手动重开');
    return bot;
  };

  /* ------------------------------------------------------------ 生命周期 -- */
  function start() {
    if (bot.running) return bot;
    bot.DNW = window.__DNW__;
    if (!bot.DNW) { say('没找到 window.__DNW__'); bot.stats.status = 'error'; return bot; }
    bot.S = bot.DNW.state;

    if (opts.seed != null) {
      const orig = Math.random;
      Math.random = P.mulberry32(opts.seed);
      bot.stats.restoreRandom = () => { Math.random = orig; };
      say('Math.random 换成可复现随机数 seed=' + opts.seed);
    }
    E.setShapes(window.SUIKA_PARTS || (window.NaiwaBot && window.NaiwaBot.EMBEDDED_SHAPES));
    if (STRENGTH[bot.strength]) {
      const { label, ...preset } = STRENGTH[bot.strength];
      Object.assign(opts.think, preset);
    }
    hookBoard();
    startWorkers();

    if (!bot._rafOrig) bot._rafOrig = window.requestAnimationFrame.bind(window);
    /* 只有快进模式才接管页面时钟（让原版主循环自然停掉，否则一帧会走两遍物理）；
       实时模式完全不碰它 —— 页面上的其它脚本照常跑。 */
    if (opts.mode === 'turbo') hijackRaf();

    bot.running = true;
    bot.aiEnabled = true;
    bot.paused = false;
    /* 如果注入时这局已经结束了（比如上一局刚打完），
       就当作「等重开」，不要记一次 0 投放的假成绩 */
    if (bot.S.over) { bot.overHandled = true; bot.awaitingRestart = true; bot.stats.status = 'waiting-restart'; }
    else bot.stats.status = 'running';
    bot.stats.startedAt = Date.now();
    bot.stats.maxTier = 0;
    bot.stats.gameStart = { drop: bot.stats.drops, plan: bot.stats.planMs, planN: bot.stats.planN, revive: bot.stats.revivesUsed };
    bot.island = createIsland(bot);
    startDriver(opts.mode);
    say(`启动：mode=${opts.mode} worker=${bot.stats.usingWorker} 强度=${bot.strength}`);
    return bot;
  }

  /* 关闭脚本 ≠ 关掉游戏：AI 停手，但用等价的主循环继续驱动，页面照常能玩 */
  function stop(reason = 'manual') {
    bot.aiEnabled = false;
    bot.stats.status = reason === 'done' ? 'done' : 'stopped';
    bot.stats.elapsed = (Date.now() - bot.stats.startedAt) / 1000;
    if (bot.island) { bot.island.destroy(); bot.island = null; }
    for (const w of pool) { try { w.terminate(); } catch { } }
    pool = [];
    /* 快进模式是我们把游戏主循环停掉的：关掉 AI 后必须继续驱动它，
       否则游戏会永远冻住。实时模式则什么都不用做（游戏本来就是自己在跑）。 */
    if (bot.running && bot.driverMode === 'turbo') {
      stopDriver();
      /* 把游戏自己的主循环接回去；接不回来（本来就停着）才用等价主循环自己推帧 */
      if (unhijackRaf() === 0) startDriver('passive');
      else startDriver('realtime');
    } else if (bot.running) {
      stopDriver();
      startDriver('realtime');
    }
    say('AI 已停止，游戏交回给你（页面照常可玩）');
    if (bot.onFinish) try { bot.onFinish(bot.stats); } catch { }
    return bot;
  }

  bot.start = start;
  bot.stop = stop;
  bot.say = say;
  bot.frameNow = () => bot.frame;
  return bot;
}

/* 一行启动：window.NaiwaBot.run({...}) */
export function run(opts = {}) {
  const prev = window.__NAIWA_BOT__;
  if (prev && prev.running && prev.aiEnabled) {
    console.warn('[合成大奶娃 bot] 已经有一个在跑了，先 window.__NAIWA_BOT__.stop() 再开新的');
    return prev;
  }
  if (prev && prev.running) prev.stop('replaced');   // 之前 stop 过的实例，顺手收掉
  const bot = createBot(opts);
  window.__NAIWA_BOT__ = bot;
  bot.start();
  return bot;
}

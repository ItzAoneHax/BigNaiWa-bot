/* ============================================================================
 *  audit.js —— 测试用审计：把**真机对局**在移植引擎里逐帧重放，收集物理异常
 *
 *  为什么这么设计：要判断「模拟里本应碰撞却没有碰撞」，只有两条路能拿到真数据——
 *    ① 直接审计真机的物理：那是游戏自己的引擎，我们插不进去（只能读状态）；
 *    ② 审计我们自己的移植引擎：它平时跑在 Worker 的推演里，拿不到上下文；
 *    所以这里走 ③：**用当前真机状态起一个移植世界，跟着真机一帧一帧走**。
 *    于是任何「重放与真机不一致」「引擎内部出现了本该碰撞却没碰的配对」
 *    都会落在同一份日志里，而且天然带上了真机的上下文（第几手、第几帧、盘面）。
 *
 *  用法（页面控制台 / 灵动岛开关）：
 *    const A = window.__NAIWA_BOT__.audit;
 *    A.enable()        // 开始审计（会包装 __DNW__.update 计数，不动物理）
 *    A.stats()         // 看当前汇总
 *    copy(JSON.stringify(A.dump(), null, 2))   // 导出全部记录
 *    A.disable()
 *
 *  记录三类东西：
 *    mismatch —— 重放与真机对不上（球数 / 分数 / 坐标），附第一处分歧的细节
 *    engine   —— 引擎审计事件（missBroad 本应碰撞却没碰 / fast 穿隧金丝雀）
 *    board    —— 每次汇总时对真机盘面的「废料」统计（小果被困在大果之间）
 * ========================================================================== */

import * as E from './engine.js';

const REACH = 2.2;        // 同级伙伴「够得着」的判定：2.2 ×（两球半径和）
const SMALL_TIER = 3;     // 「小块」的定义：tier ≤ 3（葡萄/樱桃/橘子/柠檬）
const TOL = 0.001;        // 重放与真机的坐标容差（同引擎同 V8，理论上应当逐位相同）

function lcg(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export function createAudit(bot) {
  const rep = {
    on: false,
    startedAt: 0,
    replays: 0,             // 审计了多少次投放
    frames: 0,              // 重放了多少帧
    cleanFrames: 0,         // 与真机完全一致的帧
    mismatches: [],         // 重放 ≠ 真机
    engine: { missBroad: 0, fast: 0, samples: [] },
    boards: [],             // 盘面废料统计
    byTierPair: {},         // missBroad 按等级对计数
    notes: [],
  };
  let replay = null, frames = 0, evCursor = 0, aim0 = 0, stopUntilNextDrop = false;

  /* --- 包装真机的 update，拿到「真机走了几帧」 ---------------------------------
     ⚠️ 必须能「接管」旧实例留下的钩子：脚本重新粘贴后，新审计实例会看到
     DNW 上已经有包装函数；早先用一个布尔标记判断，结果新实例以为包装好了、
     实际调用的还是上一个（已停用）实例的钩子 —— frames 永远是 0（踩过）。
     现在用实例身份（rep）判断，不是我装的就重新装，并且只保存最原始的那个 update。 */
  function wrap() {
    const DNW = bot.DNW;
    if (!DNW || typeof DNW.update !== 'function') return false;
    if (DNW.__naiwaAuditOwner === rep) return true;
    const orig = DNW.__naiwaAuditOrig || DNW.update;
    DNW.__naiwaAuditOrig = orig;
    const fn = function () {
      const r = orig.apply(this, arguments);
      onFrame();
      return r;
    };
    DNW.__naiwaAuditOwner = rep;
    DNW.update = fn;
    return true;
  }

  /* --- 每次出手前调用：起一个与真机同状态的移植世界，并落同一颗 --------------- */
  function noteDrop(x) {
    if (!rep.on) return;
    wrap();
    const snap = E.snapshotOf(bot.S, performance.now());
    replay = E.adoptFromGame(E.makeWorld({ rng: lcg(0x5eed1234) }), snap, null, snap.nowMs);
    E.dropAt(replay, x);
    frames = 0; aim0 = x; stopUntilNextDrop = false;
    evCursor = E.AUDIT.events.length;
    rep.replays++;
    rep.notes.push({ kind: 'drop', at: Date.now(), x, balls: snap.balls.length, score: snap.score, pending: snap.pending });
    if (rep.notes.length > 400) rep.notes.shift();
  }

  /* --- 真机每走一帧，重放也跟着走一帧，然后对比 -------------------------------- */
  function onFrame() {
    if (!rep.on || !replay || stopUntilNextDrop) return;
    E.update(replay, E.CFG.FIXED);
    frames++; rep.frames++;

    /* 引擎审计事件（本应碰撞却没碰 / 穿隧金丝雀） */
    const evs = E.AUDIT.drain();
    for (const e of evs) {
      if (e.k === 'missBroad') {
        rep.engine.missBroad++;
        const key = Math.min(e.t[0], e.t[1]) + '-' + Math.max(e.t[0], e.t[1]);
        rep.byTierPair[key] = (rep.byTierPair[key] || 0) + 1;
        if (rep.engine.samples.length < 60) rep.engine.samples.push({ ...e, frame: frames, drop: rep.replays });
      } else if (e.k === 'fast') {
        rep.engine.fast++;
        if (e.tunnel) rep.engine.tunnel = (rep.engine.tunnel || 0) + 1;
        if (rep.engine.samples.length < 60) rep.engine.samples.push({ ...e, frame: frames, drop: rep.replays });
      }
    }
    evCursor = E.AUDIT.events.length;

    compare();
  }

  function compare() {
    const L = bot.S.balls, Rp = replay.balls;
    if (L.length !== Rp.length) {
      record('count', { live: L.length, sim: Rp.length, liveScore: bot.S.score, simScore: replay.score });
      stopUntilNextDrop = true;
      return;
    }
    let maxD = 0, worst = null, tierMismatch = null;
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = Rp[i];
      if (a.tier !== b.tier && !tierMismatch) tierMismatch = { i, live: a.tier, sim: b.tier };
      const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
      const d = dx > dy ? dx : dy;
      if (d > maxD) { maxD = d; worst = i; }
    }
    if (tierMismatch) {
      record('tier', { ...tierMismatch, liveScore: bot.S.score, simScore: replay.score, frame: frames });
      stopUntilNextDrop = true;
      return;
    }
    if (maxD > TOL) {
      const a = L[worst], b = Rp[worst];
      record('pos', {
        frame: frames, maxD, liveScore: bot.S.score, simScore: replay.score,
        worst: { tier: a.tier, live: [+a.x.toFixed(3), +a.y.toFixed(3)], sim: [+b.x.toFixed(3), +b.y.toFixed(3)] },
      });
      stopUntilNextDrop = true;
      return;
    }
    rep.cleanFrames++;
  }

  function record(kind, detail) {
    if (rep.mismatches.length >= 40) return;
    rep.mismatches.push({ kind, drop: rep.replays, frame: frames, aim: aim0, ...detail, at: new Date().toISOString() });
  }

  /* --- 盘面「废料」统计：本次要查的『大果之间塞满小块』 ----------------------- */
  function boardStats() {
    const balls = (bot.S.balls || []).filter(b => !b.dead);
    const big = balls.filter(b => b.tier > SMALL_TIER);
    let smallN = 0, lonely = 0, trapped = 0, lonelyDeep = 0;
    const lonelyList = [];
    for (const s of balls) {
      if (s.tier > SMALL_TIER) continue;
      smallN++;
      let partner = false;
      for (const o of balls) {
        if (o === s || o.tier !== s.tier) continue;
        const dx = o.x - s.x, dy = o.y - s.y;
        const reach = (o.r + s.r) * REACH;
        if (dx * dx + dy * dy < reach * reach) { partner = true; break; }
      }
      if (partner) continue;
      lonely++;
      /* 被压住：「上方有更大的球、且水平方向压在这颗上面」 */
      let covered = false;
      for (const o of big) {
        if (o.r < s.r * 1.2) continue;
        if (o.y > s.y - s.r * 0.4) continue;              // 必须在它上面
        if (Math.abs(o.x - s.x) > o.r) continue;          // 必须水平压着它
        covered = true; break;
      }
      if (covered) trapped++; else lonelyDeep++;
      if (lonelyList.length < 12) lonelyList.push({ tier: s.tier, x: Math.round(s.x), y: Math.round(s.y), covered });
    }
    const score = bot.S.score;
    const out = {
      at: new Date().toISOString(), drops: bot.S.drops, score,
      balls: balls.length, small: smallN, lonely, trapped, free: lonelyDeep,
      topY: Math.round(E.stackTop(bot.S)),
      lonelyList,
    };
    rep.boards.push(out);
    if (rep.boards.length > 120) rep.boards.shift();
    return out;
  }

  function stats() {
    const last = rep.boards[rep.boards.length - 1] || null;
    return {
      on: rep.on,
      mode: bot.driverMode,
      replays: rep.replays, frames: rep.frames, cleanFrames: rep.cleanFrames,
      cleanRate: rep.frames ? +(rep.cleanFrames / rep.frames * 100).toFixed(2) : null,
      mismatches: rep.mismatches.length,
      engine: { missBroad: rep.engine.missBroad, fast: rep.engine.fast, tunnel: rep.engine.tunnel || 0 },
      byTierPair: rep.byTierPair,
      board: last ? { drops: last.drops, balls: last.balls, small: last.small, lonely: last.lonely, trapped: last.trapped } : null,
    };
  }

  function dump() {
    return { version: 1, stats: stats(), mismatches: rep.mismatches, engineSamples: rep.engine.samples, boards: rep.boards, notes: rep.notes.slice(-80) };
  }

  return {
    /**
     * 开始审计。
     * ⚠️ 逐帧对齐只在**快进模式**下成立：实时模式里游戏用自己的 rAF 闭包推物理帧，
     *    我们从外面拦不到（包装 __DNW__.update 是拦不到它的，实测 frames 会是 0），
     *    所以默认会自动切到快进；想留在实时就传 { turbo: false }（此时只有盘面统计可用）。
     */
    enable(opts) {
      const wantTurbo = !(opts && opts.turbo === false);
      let switched = false;
      if (wantTurbo && bot.driverMode !== 'turbo') {
        try { bot.setMode('turbo'); switched = true; } catch { }
      }
      const ok = wrap();
      E.AUDIT.on = true; E.AUDIT.reset();
      rep.on = true; rep.startedAt = Date.now();
      bot.S && boardStats();
      return { wrapped: ok, mode: bot.driverMode, switchedToTurbo: switched, ...stats() };
    },
    disable() { rep.on = false; E.AUDIT.on = false; replay = null; return stats(); },
    noteDrop, stats, dump, boardStats,
    reset() {
      rep.replays = 0; rep.frames = 0; rep.cleanFrames = 0;
      rep.mismatches = []; rep.engine = { missBroad: 0, fast: 0, tunnel: 0, samples: [] };
      rep.byTierPair = {}; rep.boards = []; rep.notes = [];
      E.AUDIT.reset();
      return stats();
    },
    raw: rep,
  };
}

/* ============================================================================
 *  在页面里跑的校验脚本（由 tools/verify-engine.mjs 注入）
 *
 *  流程：
 *    1) 用游戏自己的 update(1/60) 驱动一局「脚本化对局」，记录逐帧球坐标
 *    2) 换成移植引擎（window.NaiwaBot.engine），用同一批落点、同一批水果重放
 *    3) 逐帧比对：球数、每个球的位置差、分数
 *
 *  这里不做任何加速、不做任何近似：两边都是 update(1/60)。
 * ========================================================================== */
window.__VERIFY__ = function verify(opts) {
  const o = Object.assign({ frames: 900, dropEvery: 30, sampleEvery: 5 }, opts || {});
  const DNW = window.__DNW__;
  const E = window.NaiwaBot.engine;
  const CFG = E.CFG;

  /* 测试必须独占时钟：页面上的 bot / 游戏自己的 rAF 主循环如果同时在推进物理，
     手动步进的「重放」就会和它打架，比出来的差异是假的。
     （第一次踩这个坑时，结论一度看起来像「移植引擎坏了」） */
  if (window.__NAIWA_BOT__ && window.__NAIWA_BOT__.running) window.__NAIWA_BOT__.stop('verify');
  const ORIG_RAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function () { return 0; };

  /* 时钟也必须独占：游戏的 landed 判定（performance.now() - bornAt > 900）用的是墙钟，
     而移植端用的是虚拟时钟 w.now。手动步进时墙钟流逝快慢不定（第一轮 JIT 未热时尤其明显），
     两边的 landed 会在不同的帧翻转，进而让判负时机分叉 —— 这不是物理本身的差异。
     解决办法：校验期间把 performance.now() 换成与物理步进同步推进的虚拟时钟，
     推进量与移植端 update() 里的 w.now += dt*1000 完全相同（都是 FIXED*1000）。 */
  const REAL_NOW = performance.now.bind(performance);
  let vt = 0;
  Object.defineProperty(performance, 'now', { value: () => vt, configurable: true });
  const tick = () => { vt += CFG.FIXED * 1000; };

  /* --- 落点序列（可复现） --- */
  const rnd = (() => { let a = 12345; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const xs = [];
  for (let i = 0; i < Math.ceil(o.frames / o.dropEvery) + 4; i++) xs.push(30 + rnd() * 360);

  function snap(S) {
    const arr = [];
    for (const b of S.balls) if (!b.dead) arr.push([b.tier, +b.x.toFixed(4), +b.y.toFixed(4), +b.vx.toFixed(3), +b.vy.toFixed(3)]);
    return arr;
  }

  /* ---------------- 第 1 程：真实游戏 ---------------- */
  vt = 0;
  DNW.reset();
  const rec = { snaps: [], tiers: [], nexts: [], score: 0, drops: 0 };
  for (let f = 0; f < o.frames; f++) {
    tick();
    DNW.update(CFG.FIXED);
    if (f > 0 && f % o.dropEvery === 0 && !DNW.state.over && DNW.state.ready) {
      rec.tiers.push(DNW.state.pending);
      rec.nexts.push(DNW.state.next);
      DNW.state.aimX = xs[rec.drops];
      DNW.tryDrop();
      rec.drops++;
    }
    if (f % o.sampleEvery === 0) rec.snaps.push(snap(DNW.state));
  }
  rec.score = DNW.state.score;
  rec.balls = DNW.state.balls.filter(b => !b.dead).length;

  /* ---------------- 第 2 程：移植引擎 ---------------- */
  vt = 0;
  DNW.reset();
  const w = E.makeWorld({ rng: Math.random });
  E.adoptFromGame(w, DNW.state, window.SUIKA_PARTS);   // 此时 performance.now() = 0，w.now 从 0 起步
  const rep = { snaps: [], score: 0, drops: 0 };
  let k = 0;
  for (let f = 0; f < o.frames; f++) {
    tick();
    E.update(w, CFG.FIXED);
    if (f > 0 && f % o.dropEvery === 0 && !w.over && w.ready) {
      w.pending = rec.tiers[k];
      w.next = rec.nexts[k];
      E.dropAt(w, xs[rep.drops]);
      rep.drops++; k++;
    }
    if (f % o.sampleEvery === 0) rep.snaps.push(snap(w));
  }
  rep.score = w.score;
  rep.balls = w.balls.filter(b => !b.dead).length;

  /* ---------------- 比对 ---------------- */
  let maxDx = 0, maxDy = 0, countMismatch = 0, firstDivergence = -1;
  const frames = Math.min(rec.snaps.length, rep.snaps.length);
  for (let i = 0; i < frames; i++) {
    const a = rec.snaps[i], b = rep.snaps[i];
    if (a.length !== b.length) { countMismatch++; if (firstDivergence < 0) firstDivergence = i * o.sampleEvery; continue; }
    for (let j = 0; j < a.length; j++) {
      if (a[j][0] !== b[j][0]) { countMismatch++; if (firstDivergence < 0) firstDivergence = i * o.sampleEvery; break; }
      const dx = Math.abs(a[j][1] - b[j][1]), dy = Math.abs(a[j][2] - b[j][2]);
      if (dx > maxDx) maxDx = dx;
      if (dy > maxDy) maxDy = dy;
      if ((dx > 0.001 || dy > 0.001) && firstDivergence < 0) firstDivergence = i * o.sampleEvery;
    }
  }

  window.requestAnimationFrame = ORIG_RAF;
  Object.defineProperty(performance, 'now', { value: REAL_NOW, configurable: true });

  return {
    frames: o.frames, drops: rec.drops,
    gameScore: rec.score, portScore: rep.score,
    gameBalls: rec.balls, portBalls: rep.balls,
    maxDx, maxDy, countMismatch, firstDivergence,
    samplesA: rec.snaps[Math.floor(frames / 2)].slice(0, 3),
    samplesB: rep.snaps[Math.floor(frames / 2)].slice(0, 3),
  };
};

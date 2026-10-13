/* ============================================================================
 *  jitter-probe.mjs —— 「挤压抖动」到底是不是精确极限环？
 *
 *  背景（用户反馈）：奶蛙被挤在中间时碰撞箱解算收敛不了，会一直小幅上下抖，
 *  速度永远降不到 runSettle 的 25 阈值以下 → 推演每次都跑满整个时间窗 → 思考变慢。
 *
 *  本工具回答三件事：
 *    ① 先用一个便宜的贪心策略把盘面堆到「底部挤满大果」（用户截图那种局面）；
 *    ② 在这种盘面上，速度会不会长期降不到阈值以下；
 *    ③ 这种抖动是否构成**精确周期**（状态逐位重复）—— 若成立，推演里就能安全跳过
 *       （结果逐位不变），这就是「不损失精度的加速」。
 *
 *  用法：node tools/jitter-probe.mjs [局数]
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));
const FIXED = E.CFG.FIXED;

const CAP = 96 * 16 + 8;
function snap(w, out) {
  let k = 0;
  out[k++] = w.balls.length;
  out[k++] = w.score;
  out[k++] = w.ready ? 1 : 0;
  out[k++] = w.cooldown;
  out[k++] = w.freeze;
  out[k++] = w.over ? 1 : 0;
  out[k++] = w.mergedMaxTier;
  for (let i = 0; i < w.balls.length; i++) {
    const b = w.balls[i];
    out[k++] = b.x; out[k++] = b.y; out[k++] = b.vx; out[k++] = b.vy;
    out[k++] = b.px; out[k++] = b.py; out[k++] = b.angle;
    out[k++] = b.contacts; out[k++] = b.sq; out[k++] = b.sqA;
    out[k++] = b.landed ? 1 : 0; out[k++] = b.dead ? 1 : 0;
    out[k++] = b.overTime; out[k++] = b.pcos; out[k++] = b.psin;
  }
  return k;
}
function same(a, b, n) {
  for (let i = 0; i < n; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/* 便宜贪心：每个候选落点跑 0.4s，取「合成得分 - 堆高惩罚」最好的一个 */
function greedyDrop(w, scratch) {
  const xs = P.candidateXs(w.pending, 14);
  let bestX = xs[0], bestV = -Infinity;
  for (const x of xs) {
    const s = E.cloneWorld(w, scratch);
    s.mergedMaxTier = -1;
    const before = s.score;
    E.dropAt(s, x);
    P.runSettle(s, 0.4, 0.3);
    const v = (s.score - before) * 2 - Math.max(0, 330 - E.stackTop(s)) * 0.5;
    if (v > bestV) { bestV = v; bestX = x; }
  }
  return bestX;
}

/* 堆到「底部挤满大果」：贪心投放，直到球数够多或该局结束 */
function buildTall(seed, maxDrops = 260, targetBalls = 26) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const scratch = E.makeWorld({ rng: P.mulberry32(seed) });
  let d = 0, revives = 0;
  while (d < maxDrops && w.balls.length < targetBalls) {
    if (w.over) {
      if (w.revives > 0) { E.revive(w); revives++; continue; }
      break;
    }
    let g = 0;
    while (!w.ready && g++ < 600 && !w.over) E.update(w, FIXED);
    if (w.over) continue;
    E.moveAim(w, greedyDrop(w, scratch));
    if (E.tryDrop(w)) d++;
    for (let k = 0; k < 30; k++) { E.update(w, FIXED); if (w.over) break; }
  }
  return { w, d, revives, scratch };
}

/* 观察一段推演：统计「还在动」的帧，并检测运动中是否出现逐位重复 */
function observe(w0, frames, label) {
  const w = E.cloneWorld(w0, E.makeWorld({ rng: w0.rng }));
  const RING = 16;
  const bufs = []; for (let i = 0; i < RING; i++) bufs.push(new Float64Array(CAP));
  const ring = [];
  let moving = 0, jitter = 0, quiet = 0, samples = 0;
  let firstCycle = -1, cyclePeriod = 0, streak = 0, bestStreak = 0, movingSamples = 0;

  for (let f = 0; f < frames; f++) {
    E.update(w, FIXED);
    if (w.over) { console.log(`    [${label}] 第 ${f} 帧判负`); break; }
    const sp = E.maxSpeed(w);
    if (sp < 25) quiet++; else { moving++; if (sp < 300) jitter++; }
    if ((f & 3) !== 3 || sp < 25) { if (sp < 25) { streak = 0; } continue; }

    const buf = bufs[samples % RING];
    const n = snap(w, buf);
    samples++; movingSamples++;
    const ent = { f, buf, n };
    ring.push(ent); if (ring.length > RING) ring.shift();
    let found = false;
    for (let m = 0; m < ring.length - 1; m++) {
      const old = ring[m];
      if (old.n === n && same(old.buf, buf, n)) {
        if (firstCycle < 0) { firstCycle = f; cyclePeriod = f - old.f; }
        found = true; break;
      }
    }
    if (found) { streak++; if (streak > bestStreak) bestStreak = streak; } else streak = 0;
  }
  const total = quiet + moving;
  console.log(`    [${label}] ${total} 帧：静止 ${quiet}，运动中 ${moving}（小幅抖动 ${jitter}，自由落体 ${moving - jitter}）`);
  console.log(`      运动中逐位重复：${firstCycle < 0 ? '未出现' : `第 ${firstCycle} 帧出现，周期 ${cyclePeriod} 帧，最长连续 ${bestStreak * 4} 帧`}` +
    `（运动中采样点 ${movingSamples}）`);
  return { quiet, moving, jitter, firstCycle, cyclePeriod, bestStreak };
}

const GAMES = Number(process.argv[2] || 2);
console.log('目标：堆出「底部挤满大果」的盘面，看抖动是否长期存在、是否精确周期\n');

for (let g = 0; g < GAMES; g++) {
  const seed = 4000 + g * 91;
  const { w, d, revives } = buildTall(seed);
  const hist = {};
  for (const b of w.balls) hist[b.tier] = (hist[b.tier] || 0) + 1;
  console.log(`局 ${g + 1}（seed=${seed}）：投放 ${d} 次，复活 ${revives}，${w.balls.length} 颗，分数 ${w.score}${w.over ? ' [判负]' : ''}`);
  console.log(`  层数：${Object.entries(hist).map(([t, c]) => `${E.FRUITS[t].name}×${c}`).join(' ')}`);

  /* 静止观察：不投放，看它能不能自己停下来 */
  observe(w, 600, '原地观察');

  /* 推演观察：模拟一次落点推演（投放 + 跑 2.6 秒） */
  for (const dropTier of [1, 3]) {
    const s = E.cloneWorld(w, E.makeWorld({ rng: w.rng }));
    s.pending = dropTier;
    for (const x of [90, 210, 330]) {
      const t = E.cloneWorld(s, E.makeWorld({ rng: w.rng }));
      E.dropAt(t, x);
      observe(t, 156, `投放 tier${dropTier} @x=${x}`);
    }
  }
}

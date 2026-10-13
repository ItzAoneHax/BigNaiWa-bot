/* ============================================================================
 *  verify-exact.mjs —— 逐位（Object.is）对拍：优化后的引擎/规划器 vs 冻结的参考副本
 *
 *  参考副本在 tools/ref/（engine-ref.js / planner-ref.js，是优化前的 src 原样拷贝）。
 *  任何「等价加速」都必须让下面两组测试一个比特都不差：
 *
 *    ① 引擎逐帧对拍：同一随机投放序列、同一随机数流，两个引擎各跑一局，
 *       每一帧比较每颗球的全部字段（含 Float32 的子圆坐标）和世界的全部字段。
 *       中途还会 clone 出两个副本分别继续跑，检验 cloneWorld/cloneBall 也逐位一致。
 *    ② 规划器对拍：同一批盘面（静止 + 正在运动中）→ searchBest / plan 的落点、
 *       评估值、候选排名、时机选择必须完全相同。
 *
 *  用法：node tools/verify-exact.mjs [--seeds 6] [--frames 1500] [--boards 3]
 * ========================================================================== */

import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';
import * as ER from './ref/engine-ref.js';
import * as PR from './ref/planner-ref.js';

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : Number(v);
}
const SEEDS = arg('seeds', 6);
const FRAMES = arg('frames', 1500);
const BOARDS = arg('boards', 3);

const SHAPES = JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8'));
E.setShapes(JSON.parse(JSON.stringify(SHAPES)));      // 各自一份，pack() 会往对象上挂 flat
ER.setShapes(JSON.parse(JSON.stringify(SHAPES)));
const FIXED = E.CFG.FIXED;

let fails = 0, checks = 0;
const bad = (msg) => { fails++; if (fails <= 25) console.log('  ❌ ' + msg); };

/* ----------------------------------------------------------- 逐位比较 ---- */
const BALL_NUM = ['x', 'y', 'vx', 'vy', 'px', 'py', 'r', 'tier', 'angle', 'mass', 'invMass', 'bornAt',
  'overTime', 'pvx', 'pvy', 'sq', 'sqA', 'rb', 'rbe', 'pcos', 'psin', 'contacts', 'np'];
const BALL_BOOL = ['landed', 'dead'];
const WORLD_NUM = ['score', 'pending', 'next', 'cooldown', 'aimX', 'flash', 'revives', 'reviveGiven',
  'freeze', 'now', 'drops', 'overAt', 'mergedMaxTier'];
const WORLD_BOOL = ['ready', 'over', 'danger'];

function diffWorld(A, B) {
  if (A.balls.length !== B.balls.length) return `球数 ${A.balls.length} vs ${B.balls.length}`;
  for (const k of WORLD_NUM) if (!Object.is(A[k], B[k])) return `world.${k}: ${A[k]} vs ${B[k]}`;
  for (const k of WORLD_BOOL) if (!Object.is(!!A[k], !!B[k])) return `world.${k}: ${A[k]} vs ${B[k]}`;
  for (let i = 0; i < A.balls.length; i++) {
    const a = A.balls[i], b = B.balls[i];
    for (const k of BALL_NUM) if (!Object.is(a[k], b[k])) return `ball#${i}.${k}: ${a[k]} vs ${b[k]}`;
    for (const k of BALL_BOOL) if (!Object.is(!!a[k], !!b[k])) return `ball#${i}.${k}: ${a[k]} vs ${b[k]}`;
    /* 注意：不比较 gen（合成代数）。它只写进 mergeTrace 做诊断，不参与物理、计分、决策；
       参考版的 cloneBall 不复制它，新版复制了，这里的差异是有意的、且与结果无关。 */
    for (const k of ['wx', 'wy', 'ws']) {
      if (a[k].length !== b[k].length) return `ball#${i}.${k} 长度 ${a[k].length} vs ${b[k].length}`;
      for (let j = 0; j < a[k].length; j++) {
        if (!Object.is(a[k][j], b[k][j])) return `ball#${i}.${k}[${j}]: ${a[k][j]} vs ${b[k][j]}`;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------ ① 引擎逐帧对拍 ---- */
function lockstep(seed, frames) {
  const A = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(A, { rng: P.mulberry32(seed) });
  const B = ER.makeWorld({ rng: PR.mulberry32(seed) });
  ER.resetWorld(B, { rng: PR.mulberry32(seed) });
  const xr = P.mulberry32(seed + 99);
  let drops = 0, revives = 0, merges = 0, frameChecks = 0;
  /* 奇数局开局送 2 枚复活币，让复活分支也被逐帧覆盖；两边都开合成轨迹记录 */
  if (seed % 2 === 1) { A.revives = 2; B.revives = 2; }
  A.mergeTrace = []; B.mergeTrace = [];

  /* 手工校验「逐帧状态」：每帧都比 */
  const stepBoth = (f) => {
    E.update(A, FIXED); ER.update(B, FIXED);
    checks++; frameChecks++;
    const d = diffWorld(A, B);
    if (d) { bad(`seed=${seed} 帧${f}: ${d}`); return false; }
    return true;
  };

  for (let f = 0; f < frames; f++) {
    if (A.over) {
      if (!(B.over)) { bad(`seed=${seed} 帧${f}: over 不一致`); return false; }
      if (A.revives > 0) { E.revive(A); ER.revive(B); revives++; }
      else { E.resetWorld(A, { rng: P.mulberry32(seed + f) }); ER.resetWorld(B, { rng: PR.mulberry32(seed + f) }); }
    }
    if (f > 0 && f % 22 === 0 && A.ready && !A.over) {
      const x = 30 + xr() * 360;
      E.dropAt(A, x); ER.dropAt(B, x); drops++;
    }
    if (!stepBoth(f)) return false;

    /* 中途 clone：两边各 clone 一份，换成独立的随机数流再往下跑，逐帧比 */
    if (f > 0 && f % 350 === 0) {
      const s = seed * 1000 + f;
      const cA = E.cloneWorld(A, E.makeWorld({ rng: P.mulberry32(s) }));
      const cB = ER.cloneWorld(B, ER.makeWorld({ rng: PR.mulberry32(s) }));
      cA.rng = P.mulberry32(s); cB.rng = PR.mulberry32(s);
      const d0 = diffWorld(cA, cB);
      if (d0) { bad(`seed=${seed} 帧${f} clone 后: ${d0}`); return false; }
      for (let k = 0; k < 90; k++) {
        if (k === 3 && !cA.over) { E.dropAt(cA, 200); ER.dropAt(cB, 200); }
        E.update(cA, FIXED); ER.update(cB, FIXED);
        checks++;
        const d = diffWorld(cA, cB);
        if (d) { bad(`seed=${seed} 帧${f} 的 clone 第${k}步: ${d}`); return false; }
      }
    }
  }
  /* 合成轨迹逐条比较（tier / 位置 / 是否神奶蛙奖励 / 发生的物理步号） */
  if (A.mergeTrace.length !== B.mergeTrace.length) { bad(`seed=${seed} 合成次数 ${A.mergeTrace.length} vs ${B.mergeTrace.length}`); return false; }
  for (let i = 0; i < A.mergeTrace.length; i++) {
    const p = A.mergeTrace[i], q = B.mergeTrace[i];
    for (const k of ['tier', 'x', 'y', 'bonus', 'step']) {
      if (!Object.is(p[k], q[k])) { bad(`seed=${seed} 第${i}次合成.${k}: ${p[k]} vs ${q[k]}`); return false; }
    }
  }
  const bonuses = A.mergeTrace.filter(e => e.bonus).length;
  return { drops, revives, frameChecks, merges: A.mergeTrace.length, bonuses, score: A.score, tierMax: Math.max(-1, ...A.balls.map(b => b.tier)) };
}

/* 确定性用例：两颗刚好接触的神奶蛙 → 一起炸掉，覆盖 +500 / 送币 / 130ms 定格分支 */
function bonusCase() {
  const A = E.makeWorld({ rng: P.mulberry32(5) });
  const B = ER.makeWorld({ rng: PR.mulberry32(5) });
  const T = E.MERGE_SCORE.length - 1;                     // 10 = 神奶蛙
  const R = E.FRUITS[T].r;
  A.balls.push(E.makeBall(A, 200, 600, T, 0, 0), E.makeBall(A, 200 + 2 * R - 0.5, 600, T, 0, 0));
  B.balls.push(ER.makeBall(B, 200, 600, T, 0, 0), ER.makeBall(B, 200 + 2 * R - 0.5, 600, T, 0, 0));
  A.mergeTrace = []; B.mergeTrace = [];
  for (let f = 0; f < 240; f++) {
    E.update(A, FIXED); ER.update(B, FIXED); checks++;
    const d = diffWorld(A, B);
    if (d) { bad(`神奶蛙合成用例 帧${f}: ${d}`); return false; }
  }
  const bonus = A.mergeTrace.filter(e => e.bonus).length;
  const bonusRef = B.mergeTrace.filter(e => e.bonus).length;
  if (bonus !== 1 || bonusRef !== 1 || A.score !== B.score || A.revives !== B.revives) {
    bad(`神奶蛙合成用例：奖励次数 ${bonus}/${bonusRef}，分数 ${A.score}/${B.score}，币 ${A.revives}/${B.revives}`);
    return false;
  }
  console.log(`  神奶蛙对撞用例：奖励 ${bonus} 次，分数 +${A.score}，送复活币 → 复活币 ${A.revives}，逐帧比较 240 帧 → ✅`);
  return true;
}

console.log(`① 引擎逐帧对拍：${SEEDS} 局 × ${FRAMES} 帧（每 22 帧投一颗，中途 clone 续跑）`);
let engineOk = bonusCase();
for (let s = 1; s <= SEEDS && engineOk; s++) {
  const r = lockstep(s, FRAMES);
  if (!r) { engineOk = false; break; }
  console.log(`  局 ${s}：投放 ${r.drops}，合成 ${r.merges} 次（神奶蛙奖励 ${r.bonuses}），复活 ${r.revives}，分数 ${r.score}，末局最大层 ${r.tierMax}，逐帧比较 ${r.frameChecks} 帧 → ✅`);
}

/* ------------------------------------------------------ ② 规划器对拍 ---- */
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
  return w;
}

/* 把同一份快照分别搬进两个引擎，保证起点逐位相同 */
function twin(snap) {
  const a = E.makeWorld({ rng: P.mulberry32(7) });
  E.adoptFromGame(a, snap, null, snap.nowMs);
  const b = ER.makeWorld({ rng: PR.mulberry32(7) });
  ER.adoptFromGame(b, snap, null, snap.nowMs);     // 不能 JSON 往返：会把 -0 / NaN 改掉
  return { a, b };
}

const PROFILE = { step: 8, h1: 1.2, h2: 2.6, topK: 8, lookahead: 2, refine: true, innerTop: 4, nextMode: 'known' };

/* 本地模拟并行执行器：与 bot.js 的 makeExec 一样把工作单元按连续区间切片，各片独立执行后按序拼接 */
function localExec(world, opts, slices) {
  return async (stage, xs) => {
    const fn = P.STAGES[stage];
    const chunks = [];
    for (let i = 0; i < xs.length; i += slices) chunks.push(xs.slice(i, i + slices));
    const parts = await Promise.all(chunks.map(c => Promise.resolve().then(() => fn(world, opts, c))));
    return parts.flat();
  };
}
const cmpRes = (tag, x, y, keys) => {
  for (const k of keys) {
    const p = x[k], q = y[k];
    if (Array.isArray(p)) { if (JSON.stringify(p) !== JSON.stringify(q)) return bad(`${tag}.${k}: ${JSON.stringify(p)} vs ${JSON.stringify(q)}`); continue; }
    if (!Object.is(p, q)) return bad(`${tag}.${k}: ${p} vs ${q}`);
  }
  return true;
};

console.log(`\n② 规划器对拍：${BOARDS} 个盘面（静止 searchBest + 运动中 plan 的 auto 时机）`);
let plannerOk = true;
for (let i = 0; i < BOARDS; i++) {
  const seed = 4200 + i * 61;
  const base = makeBoard(seed, 110 + i * 30);
  if (i % 2 === 1) base.revives = 2;          // 奇数盘面：推演中允许用币续命，覆盖复活分支

  /* 静止盘面：searchBest 全流程 */
  for (let k = 0; k < 240; k++) E.update(base, FIXED);
  const quietSnap = E.snapshotOf(base, 5000);
  const q = twin(quietSnap);
  const r1 = P.searchBest(q.a, PROFILE), r2 = PR.searchBest(q.b, PROFILE);
  const before = fails;
  cmpRes(`盘面${i + 1}[静止] searchBest`, r1, r2, ['x', 'value', 'candCount', 'ranked']);
  checks++;
  /* 并行入口：按不同切片粒度切（1 / 3 / 7 个一片），结果都必须与参考顺序版一致 */
  for (const slices of [1, 3, 7]) {
    const pp = await P.planParallel(q.a, PROFILE, localExec(q.a, PROFILE, slices));
    cmpRes(`盘面${i + 1}[静止] planParallel(切片${slices})`, pp, r2, ['x', 'value', 'candCount', 'ranked']);
    checks++;
  }
  if (fails === before) console.log(`  盘面 ${i + 1}（静止，${quietSnap.balls.length} 颗）：x=${r1.x.toFixed(4)} value=${r1.value.toFixed(6)} 候选 ${r1.candCount}；并行 1/3/7 片 → ✅`);
  else plannerOk = false;

  /* 运动中盘面：刚投下一颗，plan 的时机比较（auto）要走完整两遍 */
  const moving = makeBoard(seed, 110 + i * 30);
  if (i % 2 === 1) moving.revives = 2;
  E.moveAim(moving, 200); E.tryDrop(moving);
  for (let k = 0; k < 9; k++) E.update(moving, FIXED);
  const m = twin(E.snapshotOf(moving, 9000));
  const pa = P.plan(m.a, { ...PROFILE, timing: 'auto' }), pb = PR.plan(m.b, { ...PROFILE, timing: 'auto' });
  const b0 = fails;
  cmpRes(`盘面${i + 1}[运动] plan`, pa, pb, ['x', 'value', 'choice', 'delayFrames', 'candCount']);
  checks++;
  if (fails === b0) console.log(`  盘面 ${i + 1}（运动中）：时机=${pa.choice} x=${pa.x.toFixed(4)} delay=${pa.delayFrames} → ✅`);
  else plannerOk = false;
}

const ok = engineOk && plannerOk && fails === 0;
console.log(`\n${ok ? '✅ 全部逐位一致' : '❌ 存在差异'}（比较点 ${checks}，差异 ${fails}）`);
process.exit(ok ? 0 : 2);

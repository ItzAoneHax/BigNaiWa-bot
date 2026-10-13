/* 冒烟自测：几条「踩过的坑」的回归测试，跑得比自我对弈快得多 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../src/engine.js';
import * as P from '../src/planner.js';

E.setShapes(JSON.parse(fs.readFileSync(new URL('../src/shapes.json', import.meta.url), 'utf8')));

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✅ ' : '  ❌ ') + msg); if (!cond) fail++; };

/* 造一个盘面 */
function board(drops = 60, seed = 3) {
  const w = E.makeWorld({ rng: P.mulberry32(seed) });
  E.resetWorld(w, { rng: P.mulberry32(seed) });
  const rnd = P.mulberry32(seed + 1);
  for (let i = 0; i < drops; i++) {
    E.moveAim(w, 30 + rnd() * 360);
    E.tryDrop(w);
    for (let k = 0; k < 26; k++) { E.update(w, E.CFG.FIXED); if (w.over) break; }
    if (w.over) E.revive(w);
  }
  for (let k = 0; k < 200; k++) E.update(w, E.CFG.FIXED);
  return w;
}

console.log('① 权重表只写部分键，也必须给出有限值（回归：NaN / undefined 崩过一次）');
for (const weights of [{ bump: 0 }, { adj: 2.4, bump: 0 }, undefined]) {
  const w = board();
  const d = P.plan(w, { weights, step: 12, h1: 0.5, h2: 0.8, topK: 3, lookahead: 2, nextMode: 'known' });
  ok(Number.isFinite(d.x) && Number.isFinite(d.value), `weights=${JSON.stringify(weights)} → x=${d.x} value=${d.value}`);
}

console.log('② 评估函数在判负局面下必须返回数字（不是 undefined）');
{
  const w = board();
  const dead = E.cloneWorld(w, E.makeWorld({ rng: Math.random }));
  dead.over = true;
  const v = P.evaluate(dead, 0, { merge: 1 });
  ok(Number.isFinite(v), `evaluate(over=true, 部分权重) = ${v}`);
}

console.log('③ 推演不能污染真实世界（分数/球数/随机数状态）。');
{
  const w = board();
  const snap = { score: w.score, balls: w.balls.length, pending: w.pending, next: w.next };
  P.plan(w, { step: 12, h1: 0.5, h2: 0.8, topK: 3, lookahead: 2, nextMode: 'known' });
  ok(w.score === snap.score && w.balls.length === snap.balls && w.pending === snap.pending && w.next === snap.next,
    `score ${snap.score}→${w.score}, balls ${snap.balls}→${w.balls.length}`);
}

console.log('④ 引擎移植：同一世界同一操作必须可复现');
{
  const a = board(), b = E.cloneWorld(board(), E.makeWorld({ rng: Math.random }));
  const x = 123.4;
  E.dropAt(a, x); E.dropAt(b, x);
  for (let i = 0; i < 120; i++) { E.update(a, E.CFG.FIXED); E.update(b, E.CFG.FIXED); }
  let same = a.score === b.score && a.balls.length === b.balls.length;
  for (let i = 0; i < a.balls.length && same; i++) {
    same = a.balls[i].x === b.balls[i].x && a.balls[i].y === b.balls[i].y;
  }
  ok(same, `两次重放结果一致（score=${a.score}, balls=${a.balls.length}）`);
}

console.log(fail ? `\n❌ ${fail} 项失败` : '\n✅ 全部通过');
process.exit(fail ? 1 : 0);

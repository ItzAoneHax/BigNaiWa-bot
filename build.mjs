/* ============================================================================
 *  build.mjs —— 把 src/*.js 打成一个可以在浏览器控制台直接粘贴的单文件 bot
 *
 *  迷你打包器：按顺序把模块包进 IIFE，改写 import/export（没有第三方依赖）。
 *  产物：
 *    dist/naiwa-bot.js     —— 粘贴到控制台 / Tampermonkey 用
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');

function transform(code) {
  const names = new Set();
  let out = code;

  /* import * as X from './y.js'  →  const X = MODS['y'] */
  out = out.replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\/([\w.-]+)['"];?$/gm,
    (_, alias, mod) => `const ${alias} = MODS['${mod.replace(/\.js$/, '')}'];`);
  /* import { a, b } from './y.js' */
  out = out.replace(/^import\s+\{([^}]*)\}\s+from\s+['"]\.\/([\w.-]+)['"];?$/gm,
    (_, list, mod) => `const {${list}} = MODS['${mod.replace(/\.js$/, '')}'];`);
  /* export { a, b as c }; */
  out = out.replace(/^export\s*\{([^}]*)\};?$/gm, (_, list) => {
    for (const part of list.split(',')) {
      const t = part.trim();
      if (!t) continue;
      const m = /^(\w+)(?:\s+as\s+(\w+))?$/.exec(t);
      if (m) names.add(m[2] ? `${m[1]}: ${m[2]}` : m[1]);
    }
    return '';
  });
  /* export const/let/var/function/class NAME */
  out = out.replace(/^export\s+(const|let|var|function|class|async function)\s+(\w+)/gm,
    (_, kw, name) => { names.add(name); return `${kw} ${name}`; });

  if (/\bexport\b/.test(out)) {
    const bad = out.split('\n').filter(l => /\bexport\b/.test(l)).slice(0, 3);
    throw new Error('还有没处理的 export：\n' + bad.join('\n'));
  }
  return { code: out, names: [...names] };
}

function module(name, file) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const { code, names } = transform(src);
  return `MODS['${name}'] = (function () {\n${code}\nreturn { ${names.join(', ')} };\n})();\n`;
}

const shapes = fs.readFileSync(path.join(SRC, 'shapes.json'), 'utf8');

const distDir = path.join(ROOT, 'dist');
fs.mkdirSync(distDir, { recursive: true });

/* ---- Worker 版：引擎 + 规划器 + worker 入口，单独打成一个 JS 文本 ----
   （主线程用 Blob URL 起 Worker，所以这份代码要作为字符串嵌进主 bundle） */
const workerBundle = `(function () {
'use strict';
const MODS = {};
const EMBEDDED_SHAPES = ${shapes};
${module('engine', 'engine.js')}
${module('planner', 'planner.js')}
${module('worker', 'worker.js')}
})();`;
fs.writeFileSync(path.join(distDir, 'naiwa-worker.js'), workerBundle);

const bundle = `/* 合成大奶娃 · AI 自动打 —— 单文件版（由 build.mjs 生成，勿手改）
 *  用法：打开游戏页 → F12 控制台 → 粘贴本文件全部内容 → 回车
 *        window.NaiwaBot.run({ mode:'realtime' })        实时看它打（推演在 Worker 里，页面不卡）
 *        window.NaiwaBot.run({ mode:'turbo', seed:1 })   快进刷分
 */
(function () {
'use strict';
const MODS = {};
const EMBEDDED_SHAPES = ${shapes};
/* 推演跑在 Worker 里，主线程只负责驱动游戏和出手 —— 这份代码就是那个 Worker */
const WORKER_SOURCE = ${JSON.stringify(workerBundle)};
${module('engine', 'engine.js')}
${module('planner', 'planner.js')}
${module('hud', 'hud.js')}
${module('bot', 'bot.js')}
window.NaiwaBot = { engine: MODS['engine'], planner: MODS['planner'], hud: MODS['hud'],
                    createBot: MODS['bot'].createBot, run: MODS['bot'].run, EMBEDDED_SHAPES };
console.log('%c[合成大奶娃 bot] 已装载 —— window.NaiwaBot.run({mode:"realtime"}) 开始',
  'color:#e91e63;font-weight:bold');
})();
`;

const outFile = path.join(distDir, 'naiwa-bot.js');
fs.writeFileSync(outFile, bundle);
console.log('written', outFile, (bundle.length / 1024).toFixed(1) + ' KB');

/* Tampermonkey / 油猴脚本版：打开游戏页自动装载（默认不自动开始，免得吓一跳） */
const user = `// ==UserScript==
// @name         合成大奶娃 · AI 自动打
// @namespace    bignaiwa-bot
// @version      1.0.0
// @description  用移植物理做落点推演，自动把「合成大奶娃」打到高分
// @match        https://yhsome.github.io/BigNaiWa/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
${bundle}
/* 想直接开打就打开下面这行： */
// window.NaiwaBot.run({ mode: 'realtime' });
`;
fs.writeFileSync(path.join(distDir, 'naiwa-bot.user.js'), user);
console.log('written dist/naiwa-bot.user.js', (user.length / 1024).toFixed(1) + ' KB');

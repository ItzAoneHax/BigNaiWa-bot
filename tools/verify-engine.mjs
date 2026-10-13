/* ============================================================================
 *  verify-engine.mjs —— 证明「移植引擎 = 线上物理」
 *
 *  在同一个浏览器进程里：
 *    真实游戏 update(1/60) 跑 N 帧  →  移植引擎 update(1/60) 重放同样 N 帧
 *    比逐帧球坐标。差值应该是 0（同一个 V8、同一套浮点运算、同样的顺序）。
 *
 *  用法：node tools/verify-engine.mjs [--frames 1200]
 * ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = path.join(ROOT, 'site');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : (isNaN(Number(v)) ? v : Number(v));
}
const FRAMES = Number(arg('frames', 1200));
const ITER = Number(arg('iter', 3));
const HEADFUL = !!arg('headful', false);
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(SITE, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: !HEADFUL,
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
  defaultViewport: { width: 520, height: 1000 },
});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if (u.includes('leaderboard') || u.includes('sponsor')) return req.abort();
  if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:')) return req.abort();
  req.continue();
});
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('!!window.__DNW__', { timeout: 30000 });
await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'dist', 'naiwa-bot.js'), 'utf8') });
await page.addScriptTag({ path: path.join(ROOT, 'tools', 'verify-inpage.js') });

console.log(`跑 ${ITER} 轮，每轮 ${FRAMES} 帧（${(FRAMES / 60).toFixed(1)}s 对局时间，每 0.5s 落一颗）\n`);
let worst = 0, okCount = 0;
for (let i = 0; i < ITER; i++) {
  const r = await page.evaluate((frames) => window.__VERIFY__({ frames }), FRAMES + i * 120);
  const clean = r.maxDx === 0 && r.maxDy === 0 && r.countMismatch === 0 && r.gameScore === r.portScore && r.gameBalls === r.portBalls;
  if (clean) okCount++;
  worst = Math.max(worst, r.maxDx, r.maxDy);
  console.log(`第 ${i + 1} 轮：帧=${r.frames} 投放=${r.drops} 球数=${r.gameBalls}/${r.portBalls} 分数=${r.gameScore}/${r.portScore} ` +
    `最大偏差 dx=${r.maxDx.toExponential(2)} dy=${r.maxDy.toExponential(2)} 数量不一致=${r.countMismatch} 首次分歧帧=${r.firstDivergence}  → ${clean ? '✅ 完全一致' : '❌ 有差异'}`);
  if (!clean) {
    console.log('   真实前 3 颗：', JSON.stringify(r.samplesA));
    console.log('   移植前 3 颗：', JSON.stringify(r.samplesB));
  }
}
console.log(`\n结论：${okCount}/${ITER} 轮逐帧完全一致；最大坐标偏差 ${worst.toExponential(2)} px`);

await browser.close();
server.close();
process.exit(okCount === ITER ? 0 : 2);

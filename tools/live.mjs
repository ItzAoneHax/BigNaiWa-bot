/* ============================================================================
 *  live.mjs —— 用 Edge(headless) 打开真实游戏页，注入 bot，跑完整局并抓分数
 *
 *  默认加载本仓库 site/ 下的离线副本（和线上同一份文件），并拦截
 *  leaderboard.min.js —— 免得测试成绩污染公开排行榜。
 *  想打线上页面：--url https://yhsome.github.io/BigNaiWa/v1/
 *
 *  用法：
 *    node tools/live.mjs                          # 快进模式跑 1 局
 *    node tools/live.mjs --mode realtime --secs 90
 *    node tools/live.mjs --games 3 --seed 1 --shots 4
 *    node tools/live.mjs --url https://... --allow-leaderboard
 * ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return isNaN(Number(v)) ? v : Number(v);
}

const MODE = arg('mode', 'turbo');
const GAMES = Number(arg('games', 1));
const SEED = arg('seed', null);
const SHOTS = Number(arg('shots', 0));
const SECS = Number(arg('secs', 300));
const URL_OPT = arg('url', null);
const ALLOW_BOARD = !!arg('allow-leaderboard', false);
const HEADFUL = !!arg('headful', false);
const EDGE = arg('edge', process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
const THINK = arg('think', null);          // "step=8,h1=1.2,topK=8,lookahead=2"
const TAG = arg('tag', 'run');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(dir, url === '/' ? 'index.html' : url);
      if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404).end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const { server, port } = await serve(SITE);
const base = URL_OPT ? String(URL_OPT) : `http://127.0.0.1:${port}/`;
console.log('页面：', base, '| 模式：', MODE, '| 局数：', GAMES, ALLOW_BOARD ? '| 允许提交排行榜' : '| 已拦截排行榜脚本');

const browser = await puppeteer.launch({
  executablePath: String(EDGE),
  headless: !HEADFUL,
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--window-size=520,1000',
         '--disable-features=CalculateNativeWinOcclusion', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 520, height: 1000, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('[bot]') || t.includes('Error')) console.log('  [page]', t.slice(0, 220));
});
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 300)));

await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = req.url();
  const isBoard = u.includes('leaderboard') || (req.method() === 'POST' && !u.startsWith(base));
  if (isBoard && !ALLOW_BOARD) return req.abort();
  if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) return req.abort();
  req.continue();
});

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('!!window.__DNW__', { timeout: 30000 });
await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

const bundle = fs.readFileSync(path.join(ROOT, 'dist', 'naiwa-bot.js'), 'utf8');
await page.addScriptTag({ content: bundle });

const think = {};
if (THINK) for (const kv of String(THINK).split(',')) { const [k, v] = kv.split('='); think[k] = isNaN(Number(v)) ? v : Number(v); }
const WEIGHTS = arg('weights', null);
if (WEIGHTS) think.weights = JSON.parse(fs.readFileSync(String(WEIGHTS), 'utf8'));
console.log('决策参数：', JSON.stringify(think));

const shots = [];
const t0 = Date.now();

await page.evaluate(({ mode, games, seed, think, shots }) => {
  const b = window.NaiwaBot.run({
    mode, autoRestart: games > 1, maxGames: games,
    seed: seed === null ? null : seed,
    blockLeaderboard: !window.__ALLOW_BOARD__,
    think: Object.keys(think).length ? think : undefined,
    verbose: false,
  });
  window.__SHOT__ = () => b.stats;
  if (shots) b.shotPoints = shots;
  window.__BOT__ = b;
}, { mode: MODE, games: GAMES, seed: SEED, think, shots: SHOTS });

/* 轮询 */
let lastShots = 0;
const SNAP_EVERY = Number(arg('snapEvery', 0));
let lastSnap = 0;
while (true) {
  await sleep(1000);
  const st = await page.evaluate(() => ({
    status: window.__BOT__.stats.status,
    games: window.__BOT__.stats.games,
    score: window.__DNW__.state.score,
    drops: window.__BOT__.stats.drops,
    simFrames: window.__BOT__.stats.simFrames,
    err: window.__BOT__.stats.error,
  }));
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  process.stdout.write(`\r[${el}s] 状态=${st.status} 局数=${st.games.length} 当前分=${st.score} 投放=${st.drops} 物理帧=${st.simFrames}   `);
  if (SHOTS && st.games.length > lastShots && st.games.length <= SHOTS) {
    lastShots = st.games.length;
    const p = path.join(OUT, `shot-${TAG}-game${st.games.length}.png`);
    await page.screenshot({ path: p });
    shots.push(p);
  }
  if (SNAP_EVERY && el - lastSnap >= SNAP_EVERY) {
    lastSnap = el;
    const p = path.join(OUT, `snap-${TAG}-${String(el).padStart(4, '0')}s.png`);
    await page.screenshot({ path: p });
    shots.push(p);
  }
  if (st.err) { console.log('\n页面内报错：', st.err.slice(0, 800)); break; }
  if (st.status === 'done' || st.status === 'error') break;
  if ((Date.now() - t0) / 1000 > SECS) { console.log('\n超时收工'); await page.evaluate(() => window.__BOT__.stop('timeout')); break; }
}

const finalStats = await page.evaluate(() => ({ stats: window.__BOT__.stats, log: window.__BOT__.log.slice(-12) }));
if (SHOTS) {
  const p = path.join(OUT, `shot-${TAG}-final.png`);
  await page.screenshot({ path: p });
  shots.push(p);
}

console.log('\n\n局次结果：');
for (const g of finalStats.stats.games) {
  console.log(`  分数 ${String(g.score).padStart(6)}  投放 ${String(g.drops).padStart(4)}  最大水果 ${g.maxTier}  复活 ${g.revivesUsed}  平均决策 ${g.planMsAvg.toFixed(0)}ms`);
}
const scores = finalStats.stats.games.map(g => g.score);
if (scores.length) {
  const best = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`  合计：${scores.length} 局，最高 ${best}，平均 ${avg.toFixed(0)}，用时 ${finalStats.stats.elapsed.toFixed(0)}s，物理帧 ${finalStats.stats.simFrames}`);
}
console.log('最后日志：');
for (const l of finalStats.log) console.log('   ', l);
if (shots.length) console.log('截图：', shots.join('  '));

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(OUT, `live-${TAG}-${stamp}.json`);
fs.writeFileSync(outFile, JSON.stringify({ base, mode: MODE, think, stats: finalStats.stats, shots }, null, 2));
console.log('记录：', outFile);

await browser.close();
server.close();

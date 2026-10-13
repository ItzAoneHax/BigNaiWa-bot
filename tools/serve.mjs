/* ============================================================================
 *  serve.mjs —— 给「浏览器里现场演示」用的小静态服务
 *
 *  作用：把 dist/ 和 site/ 通过 http://127.0.0.1:8899 暴露出来，
 *        并且带上 CORS 头，这样游戏页（https 或 file）可以用
 *        fetch('http://127.0.0.1:8899/naiwa-bot.js') 拿到 bot 脚本再 eval。
 *
 *  用法：node tools/serve.mjs [port]
 * ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.argv[2] || 8899);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'site/index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    const head = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    };
    if (err) { res.writeHead(404, head).end('404'); return; }
    head['Content-Type'] = MIME[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, head).end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}/`));

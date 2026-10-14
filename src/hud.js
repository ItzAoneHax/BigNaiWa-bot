/* ============================================================================
 *  hud.js —— 页面上的「灵动岛」控制台
 *
 *  · 可拖动、可折叠：收起时只有一颗小胶囊（分数 + 状态灯）
 *  · 控制：暂停/继续、实时/快进、排行榜是否提交、自动复活、搜索强度、投掷时机
 *  · 全部就地生效，不需要重开页面
 * ========================================================================== */

const STRENGTH = {
  fast:   { label: '快',   step: 12, h1: 0.9, h2: 1.8, topK: 4,  lookahead: 1, innerTop: 3 },
  normal: { label: '标准', step: 8,  h1: 1.2, h2: 2.6, topK: 8,  lookahead: 2, innerTop: 4 },
  deep:   { label: '深',   step: 6,  h1: 1.6, h2: 3.4, topK: 12, lookahead: 2, innerTop: 6 },
};

const CSS = `
#naiwa-island{position:fixed;z-index:2147483000;font:12px/1.45 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:#f2f2f7;user-select:none;-webkit-user-select:none;touch-action:none}
#naiwa-island *{box-sizing:border-box}
#naiwa-island .ni-pill{display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;cursor:grab;
  background:rgba(18,18,24,.82);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:0 6px 22px rgba(0,0,0,.38), inset 0 0 0 1px rgba(255,255,255,.09);transition:transform .18s ease}
#naiwa-island .ni-pill:active{cursor:grabbing}
#naiwa-island .ni-emoji{font-size:14px}
#naiwa-island .ni-score{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.3px}
#naiwa-island .ni-sub{opacity:.6;font-size:11px}
#naiwa-island .ni-dot{width:8px;height:8px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84}
#naiwa-island.ni-paused .ni-dot{background:#ffcc00;box-shadow:0 0 8px #ffcc00}
#naiwa-island.ni-wait .ni-dot{background:#5ac8fa;box-shadow:0 0 8px #5ac8fa}
#naiwa-island.ni-thinking .ni-dot{background:#ff9f0a;box-shadow:0 0 8px #ff9f0a;animation:ni-pulse 1s infinite}
@keyframes ni-pulse{0%,100%{opacity:1}50%{opacity:.35}}
#naiwa-island .ni-panel{margin-top:8px;width:268px;padding:12px;border-radius:16px;
  background:rgba(18,18,24,.9);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);
  box-shadow:0 10px 34px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08);display:none}
#naiwa-island.ni-open .ni-panel{display:block}
#naiwa-island .ni-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0}
#naiwa-island .ni-label{opacity:.62;font-size:11px}
#naiwa-island .ni-val{font-variant-numeric:tabular-nums}
#naiwa-island .ni-seg{display:flex;background:rgba(255,255,255,.08);border-radius:9px;padding:2px;gap:2px}
#naiwa-island .ni-seg button{border:0;background:transparent;color:#e9e9f2;font:inherit;font-size:11px;padding:4px 9px;
  border-radius:7px;cursor:pointer;transition:background .15s}
#naiwa-island .ni-seg button.on{background:rgba(255,255,255,.22)}
#naiwa-island .ni-actions{display:flex;gap:6px;margin-top:10px}
#naiwa-island .ni-actions button{flex:1;border:0;border-radius:10px;padding:7px 0;font:inherit;font-size:11.5px;cursor:pointer;
  background:rgba(255,255,255,.12);color:#fff;transition:background .15s}
#naiwa-island .ni-actions button:hover{background:rgba(255,255,255,.2)}
#naiwa-island .ni-actions button.ni-danger{background:rgba(255,69,58,.24)}
#naiwa-island .ni-actions button.ni-primary{background:rgba(10,132,255,.34)}
#naiwa-island .ni-tip{margin-top:8px;font-size:10.5px;opacity:.5;line-height:1.5}
`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createIsland(bot) {
  const opts = bot.opts;
  if (!opts.hud) return null;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = el('div');
  root.id = 'naiwa-island';

  const pill = el('div', 'ni-pill');
  const emoji = el('span', 'ni-emoji', '🍉');
  const scoreEl = el('span', 'ni-score', '0');
  const subEl = el('span', 'ni-sub', '');
  const dot = el('span', 'ni-dot');
  pill.append(emoji, scoreEl, subEl, dot);

  const panel = el('div', 'ni-panel');

  /* ---- 状态行 ---- */
  const rowStat = el('div', 'ni-row');
  const statLabel = el('span', 'ni-label', '状态');
  const statVal = el('span', 'ni-val', '—');
  rowStat.append(statLabel, statVal);

  const rowInfo = el('div', 'ni-row');
  const infoVal = el('span', 'ni-val', '—');
  infoVal.style.fontSize = '11px';
  infoVal.style.opacity = '.72';
  rowInfo.append(infoVal);

  /* ---- 分段控件 ---- */
  function segment(label, options, get, set) {
    const row = el('div', 'ni-row');
    row.append(el('span', 'ni-label', label));
    const seg = el('div', 'ni-seg');
    const btns = options.map(o => {
      const b = el('button', null, o.label);
      b.onclick = (ev) => { ev.stopPropagation(); set(o.value); refresh(); bot.savePrefs && bot.savePrefs(); };
      seg.append(b);
      return { b, o };
    });
    row.append(seg);
    return { row, sync: () => { const cur = get(); for (const { b, o } of btns) b.classList.toggle('on', o.value === cur); } };
  }

  const segMode = segment('模式', [{ label: '实时', value: 'realtime' }, { label: '快进', value: 'turbo' }],
    () => opts.mode, (v) => bot.setMode(v));
  const segBoard = segment('排行榜', [{ label: '拦截提交', value: true }, { label: '允许上榜', value: false }],
    () => !!opts.blockLeaderboard, (v) => { opts.blockLeaderboard = v; });
  /* 「复活币打法」—— 语义：**不是**许不许用币（币由游戏结算、脚本照常点复活），
     而是危机时按哪种心态选落点：搏一把（手里有币 → 敢堆高换空间）or 保守（当没退路）。 */
  const segRevive = segment('复活币打法', [{ label: '搏一把', value: 'aggressive' }, { label: '保守', value: 'conservative' }],
    () => opts.reviveStyle || 'aggressive', (v) => { opts.reviveStyle = v; });
  const segStrength = segment('搜索', Object.keys(STRENGTH).map(k => ({ label: STRENGTH[k].label, value: k })),
    () => bot.strength || 'normal', (v) => { bot.strength = v; Object.assign(opts.think, STRENGTH[v]); });
  const segTiming = segment('投掷时机', [{ label: '每手算', value: 'auto' }, { label: '立刻', value: 'now' }, { label: '等稳', value: 'settle' }],
    () => opts.think.timing, (v) => { opts.think.timing = v; });

  /* ---- 动作 ---- */
  const actions = el('div', 'ni-actions');
  const btnPause = el('button', 'ni-primary', '暂停');
  btnPause.onclick = (ev) => { ev.stopPropagation(); bot.setPaused(!bot.paused); refresh(); };
  const btnNew = el('button', null, '重开一局');
  btnNew.onclick = (ev) => { ev.stopPropagation(); bot.restartGame(); refresh(); };
  const btnOff = el('button', 'ni-danger', '关闭脚本');
  btnOff.onclick = (ev) => { ev.stopPropagation(); bot.stop('manual'); };
  actions.append(btnPause, btnNew, btnOff);

  const tip = el('div', 'ni-tip', '拖动胶囊可换位置 · 点一下就展开/收起');
  panel.append(rowStat, rowInfo, segMode.row, segStrength.row, segTiming.row, segBoard.row, segRevive.row, actions, tip);
  root.append(pill, panel);
  document.body.appendChild(root);

  /* ---- 拖动 + 展开 ---- */
  const saved = (() => { try { return JSON.parse(localStorage.getItem('danaiwa.bot.pos') || 'null'); } catch { return null; } })();
  let px = saved && Number.isFinite(saved.x) ? saved.x : null;
  let py = saved && Number.isFinite(saved.y) ? saved.y : 10;
  if (px === null) px = Math.max(10, window.innerWidth / 2 - 90);
  const place = () => { root.style.left = px + 'px'; root.style.top = py + 'px'; };
  place();

  let dragging = false, moved = 0, sx = 0, sy = 0;
  pill.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; sx = e.clientX - px; sy = e.clientY - py;
    pill.setPointerCapture && pill.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const nx = e.clientX - sx, ny = e.clientY - sy;
    moved = Math.max(moved, Math.abs(nx - px) + Math.abs(ny - py));
    px = Math.max(4, Math.min(window.innerWidth - 60, nx));
    py = Math.max(4, Math.min(window.innerHeight - 30, ny));
    place();
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 4) root.classList.toggle('ni-open');
    try { localStorage.setItem('danaiwa.bot.pos', JSON.stringify({ x: px, y: py })); } catch { }
  });

  /* ---- 刷新 ---- */
  let lastTick = 0;
  function refresh(force) {
    const t = performance.now();
    if (!force && t - lastTick < 120) return;
    lastTick = t;
    const st = bot.stats, S = bot.S;
    if (!S) return;
    scoreEl.textContent = S.score;
    const thinking = !!bot.inflight;
    const paused = bot.paused;
    const waiting = st.status === 'waiting-restart';
    root.classList.toggle('ni-thinking', thinking && !paused);
    root.classList.toggle('ni-paused', paused);
    root.classList.toggle('ni-wait', waiting);
    subEl.textContent = paused ? '已暂停' : waiting ? '等重开' : thinking ? '思考中' : `${st.drops} 手`;
    statVal.textContent = paused ? '暂停' : waiting ? '本局结束，等你重开' : thinking ? 'Worker 推演中' : '对局进行中';
    infoVal.textContent =
      `决策 ${st.lastPlanMs}ms / 均 ${st.planN ? (st.planMs / st.planN).toFixed(0) : 0}ms　候选 ${st.lastCand || '—'}\n` +
      `时机 ${(opts.think.holdForQuiet === false || opts.think.timing === 'now') ? '立刻出手' : '等盘面安静'}${st.holdFrames ? '（本手已等 ' + st.holdFrames + ' 帧）' : ''}　复活币 ${st.revivesLeft ?? 0}\n` +
      `最高分 ${st.bestScore ?? S.best ?? 0}　本局最大 ${st.maxTier ? (bot.fruitName(st.maxTier)) : '—'}\n` +
      `推演并行 ${st.workerCount || 1}x　${st.usingWorker ? 'Worker 线程' : '主线程'}`;
    btnPause.textContent = paused ? '继续' : '暂停';
    for (const s of [segMode, segBoard, segRevive, segStrength, segTiming]) s.sync();
  }
  bot.hud = { refresh, root };

  return { root, refresh, destroy: () => { root.remove(); style.remove(); } };
}

export { STRENGTH };

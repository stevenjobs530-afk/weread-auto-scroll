(() => {
  'use strict';
  if (window.top !== window || document.getElementById('weread-auto-scroll')) return;
  const { speed, Motion, shortcut, NumberEntry, scrollPercent, stepSpeed } = globalThis.WeReadScrollCore;
  const host = document.createElement('div');
  host.id = 'weread-auto-scroll';
  host.style.cssText = 'position:fixed!important;left:6px!important;top:40vh!important;z-index:2147483647!important;display:block!important;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all:initial; color-scheme:light dark; }
      * { box-sizing:border-box; }
      .panel { --bg:rgba(245,250,247,.88); --ink:#253b30; --muted:#536a5b; --line:rgba(255,255,255,.85); --soft:rgba(255,255,255,.5); font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); width:48px; position:relative; }
      .panel.dark { --bg:rgba(29,42,35,.9); --ink:#f0f8f2; --muted:#bdcfc1; --line:rgba(255,255,255,.24); --soft:rgba(255,255,255,.09); }
      .glass { background:var(--bg); border:1px solid var(--line); box-shadow:inset 0 1px 0 #ffffff90,inset 0 -1px 0 #ffffff25,0 8px 28px #142d2426; backdrop-filter:blur(22px) saturate(150%); -webkit-backdrop-filter:blur(22px) saturate(150%); }
      .full { position:absolute; left:56px; top:0; width:min(276px,calc(100vw - 70px)); max-height:calc(100dvh - 16px); overflow-y:auto; padding:14px; border-radius:20px; }
      .panel.right .full { left:auto; right:56px; }
      header { display:flex; align-items:center; gap:6px; margin-bottom:12px; }
      .drag { flex:1; cursor:ns-resize; touch-action:none; user-select:none; font-weight:650; letter-spacing:.1px; padding:3px 0; }
      button { font:inherit; cursor:pointer; border:1px solid var(--line); border-radius:12px; padding:7px 10px; background:linear-gradient(160deg,var(--soft),transparent); color:var(--ink); box-shadow:inset 0 1px 0 #ffffff50,0 2px 5px #163c2010; transition:background .15s,box-shadow .15s; }
      button:hover { background:var(--soft); box-shadow:inset 0 1px 0 #ffffff90,0 3px 10px #163c2025; }
      @media(prefers-reduced-motion:reduce) { button { transition:none; } }
      @supports not (backdrop-filter:blur(1px)) { .glass { background:#f1f6f2; } .dark .glass { background:#23362a; } }
      @media(prefers-reduced-transparency:reduce) { .glass { backdrop-filter:none; background:#f1f6f2; } .dark .glass { background:#23362a; } }
      button:focus-visible,input:focus-visible { outline:2px solid #3f9565; outline-offset:3px; }
      .toggle { background:linear-gradient(145deg,#468664e8,#24573fe8); color:#fff; font-weight:600; min-width:78px; }
      .line { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      output { font-variant-numeric:tabular-nums; font-weight:650; }
      input { display:block; width:100%; margin:12px 0 5px; accent-color:#32774d; cursor:pointer; }
      .ends { color:var(--muted); font-size:11px; margin-bottom:12px; }
      .status { color:var(--muted); font-size:11px; max-width:120px; }
      .keys { color:var(--muted); font-size:11px; margin-top:10px; }
      details { max-height: min(360px, 45vh); overflow-y:auto; margin-top:8px; font-size:12px; color:var(--muted); }
      summary { cursor:pointer; padding:4px 0; }
      details p { margin:7px 0; }
      .layout-check { display:flex; align-items:center; gap:7px; margin:8px 0; }
      .layout-check input { width:auto; margin:0; }
      .layout-value { font-size:11px; font-variant-numeric:tabular-nums; }
      .layout-note { font-size:11px; }
      .entry { font-size:11px; color:var(--muted); }
      .mini { display:flex; flex-direction:column; align-items:center; gap:7px; width:48px; padding:8px 4px; border-radius:0 19px 19px 0; }
      .right .mini { border-radius:19px 0 0 19px; }
      .mini .drag { width:32px; text-align:center; padding:0; color:var(--muted); font-size:16px; }
      .mini button { width:36px; padding:6px 0; min-width:0; font-size:12px; }
      .mini .progress-toggle { font-weight:700; font-size:12px; border:0; box-shadow:none; background:transparent; padding:0; }
      .track { height:56px; width:4px; border-radius:4px; background:var(--soft); overflow:hidden; }
      .fill { width:100%; height:100%; background:linear-gradient(#7eb998,#2b7850); transform:scaleY(.01); transform-origin:bottom; }
      .collapsed .full { display:none; }
      .mini .rail-toggle { font-size:16px; }
      .mini .rail-speed { font-size:11px; }
      .entry:not(:empty) { margin-top:8px; }
    </style>
    <section class="panel collapsed" lang="zh-CN" aria-label="微信读书自动滚动">
      <div class="full glass" id="settings">
        <header><span class="drag" title="上下拖动；拖至另一侧可切换贴靠方向">⠿ 自动滚动</span><button class="collapse" aria-label="收起控制面板">−</button></header>
        <div class="line"><label for="speed">滚动速度</label><output for="speed">5 / 20</output></div>
        <input id="speed" aria-label="滚动速度" type="range" min="1" max="20" step="1" value="5">
        <div class="line ends"><span>慢</span><span>快</span></div>
        <div class="line"><button class="toggle" aria-pressed="false">开始</button><span class="status" role="status" aria-live="polite">准备就绪</span></div>
        <div class="keys">A 减速 · D 加速 · S／回车开始暂停</div>
        <details class="layout-settings"><summary>阅读区域调整</summary>
          <label class="layout-check"><input id="layout-enabled" type="checkbox">启用自定义版面</label>
          <div class="line"><label for="layout-width">阅读宽度</label><output class="layout-value" for="layout-width">85%</output></div>
          <input id="layout-width" type="range" aria-label="阅读宽度" min="50" max="95" step="1" value="85" disabled>
          <div class="line"><label for="layout-top">顶部留白</label><output class="layout-value" for="layout-top">40 像素</output></div>
          <input id="layout-top" type="range" aria-label="顶部留白" min="0" max="160" step="8" value="40" disabled>
          <p class="layout-note">宽度按当前窗口计算，两侧保留边距。减少顶部留白可多显示一些内容，章节仍向下滚动。调整时会暂停滚动。</p>
          <button id="layout-reset">恢复默认版面</button>
        </details>
        <details><summary>使用说明</summary><p>按 <b>S</b> 或 <b>回车键（Enter）</b>开始或暂停。拖动滑块，或直接输入 <b>1～20</b> 选择速度。</p><p>按 <b>A</b> 减慢 1 档，按 <b>D</b> 加快 1 档，范围为 1～20 档。例如当前 5 档，按一次 A 变成 4 档，再按变成 3 档。每按一次调整一档，长按不连发；W 未绑定功能。数字尚在等待时，会先应用数字再加减。调速不会改变开始／暂停状态。</p><p>想设为 <b>15 档</b>？先按 <b>1</b>，再在 <b>0.5 秒内</b>按 <b>5</b>。设置 <b>20 档</b>则依次按 <b>2</b>、<b>0</b>。</p><p>只按一个数字，等待 0.5 秒即可生效。单独按 <b>0</b>代表 10 档。输入后按 S 或回车，会立即应用当前数字并开始或暂停。超出范围的数字不会改变速度。</p><p>在搜索框、笔记等输入框中打字时，快捷键不会触发。若回车无反应，请先点击书页空白处。手动滚动、点击书页或切换窗口会自动暂停。</p><p>细条显示当前页面进度，点击百分比或齿轮展开设置。拖动点阵可上下移动，拖到另一侧可切换贴靠方向；点击「−」收起。到达章节末尾后会停止，请自行打开下一章。</p><p>展开「阅读区域调整」并启用自定义版面，可拓宽正文、减少顶部留白；点击「恢复默认版面」即可还原网站排版。版面偏好保存在本地。</p><p>微信读书自动滚动 · v1.4.2</p></details>
        <div class="entry" role="status" aria-live="polite"></div>
      </div>
      <div class="mini glass">
        <span class="drag" title="上下拖动；拖至另一侧可切换贴靠方向">⠿</span>
        <button class="progress-toggle" aria-label="阅读进度 1%，展开设置" aria-expanded="false" aria-controls="settings">1%</button>
        <div class="track" role="progressbar" aria-label="页面滚动进度" aria-valuemin="1" aria-valuemax="100" aria-valuenow="1"><div class="fill"></div></div>
        <button class="toggle rail-toggle" aria-label="开始滚动" aria-pressed="false">▶</button>
        <button class="rail-speed" aria-label="当前速度 5 档，展开设置" aria-expanded="false" aria-controls="settings">5档</button>
        <button class="expand" aria-label="展开控制面板" aria-expanded="false" aria-controls="settings">⚙</button>
      </div>
    </section>`;
  document.documentElement.append(host);
  const panel = root.querySelector('.panel');
  const slider = root.querySelector('#speed');
  const motion = new Motion();
  let level = 5, running = false, frame = 0, endSince = null, lastMaximum = null;
  let route = location.href, chapter = chapterKey(), position = null, moved = false, dockSide = 'left';
  const save = values => { try { chrome.storage.local.set(values).catch(() => {}); } catch {} };
  const numberEntry = new NumberEntry({
    apply: value => { level = value; update(); save({ speed: level }); },
    preview: value => { root.querySelector('.entry').textContent = value ? `正在输入：${value}…` : ''; root.querySelector('.rail-speed').textContent = value ? `${value}…` : `${level}档`; },
    invalid: () => { root.querySelector('.entry').textContent = '请输入 1～20 之间的速度。'; const button = root.querySelector('.rail-speed'); button.textContent = '1–20'; button.setAttribute('aria-label', '输入超出范围，请输入 1～20 之间的速度'); }
  });
  root.querySelectorAll('details').forEach(section => section.addEventListener('toggle', clamp));
  globalThis.WeReadLayout.mount(root, pause);
  function chapterKey() {
    return document.querySelector('.readerTopBar_title')?.textContent || document.title;
  }
  function update() {
    root.querySelector('output[for="speed"]').textContent = `${level} / 20`;
    root.querySelector('.rail-speed').textContent = `${level}档`;
    root.querySelector('.rail-speed').setAttribute('aria-label', `当前速度 ${level} 档，展开设置`);
    slider.value = level;
    slider.setAttribute('aria-valuetext', `第 ${level} 档，共 20 档，每秒 ${speed(level).toFixed(1)} 像素`);
    root.querySelectorAll('.toggle').forEach(button => {
      button.textContent = button.classList.contains('rail-toggle') ? (running ? 'Ⅱ' : '▶') : (running ? '暂停' : '开始');
      button.setAttribute('aria-label', running ? '暂停滚动' : '开始滚动');
      button.setAttribute('aria-pressed', String(running));
    });
  }
  function pause(message = '已暂停') {
    numberEntry.clear();
    running = false; cancelAnimationFrame(frame); endSince = null;
    root.querySelector('.status').textContent = message; update();
  }
  function inReader() { return location.pathname.startsWith('/web/reader/'); }
  function tick(time) {
    if (!running) return;
    if (document.hidden || !inReader() || location.href !== route || chapterKey() !== chapter) { pause(); return; }
    const scroll = document.scrollingElement;
    const maximum = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    if (lastMaximum !== maximum) { endSince = null; lastMaximum = maximum; }
    const next = motion.next(time, level, maximum);
    // Retain a floating-point position even when the browser rounds scrollTop.
    window.scrollTo({ top: next, left: window.scrollX, behavior: 'instant' });
    if (scroll.scrollTop >= maximum - 1) {
      if (endSince === null) endSince = time;
      if (time - endSince >= 900) { pause('本章已结束'); return; }
    } else endSince = null;
    frame = requestAnimationFrame(tick);
  }
  function toggle() {
    if (running) { pause(); return; }
    if (document.hidden || !inReader()) return;
    // Starting after a selection is allowed, but never clears the selection.
    route = location.href; chapter = chapterKey();
    motion.reset(document.scrollingElement.scrollTop); lastMaximum = null; endSince = null;
    running = true; root.querySelector('.status').textContent = '滚动中'; update();
    frame = requestAnimationFrame(tick);
  }
  root.querySelectorAll('.toggle').forEach(button => button.addEventListener('click', toggle));
  slider.addEventListener('input', () => { numberEntry.clear(); level = Number(slider.value); update(); save({ speed: level }); });
  function setExpanded(expanded) {
    panel.classList.toggle('collapsed', !expanded);
    root.querySelectorAll('[aria-controls="settings"]').forEach(button => button.setAttribute('aria-expanded', String(expanded)));
    root.querySelector('.expand').setAttribute('aria-label', expanded ? '收起控制面板' : '展开控制面板');
    clamp();
  }
  root.querySelector('.collapse').addEventListener('click', () => { setExpanded(false); root.querySelector('.expand').focus(); });
  root.querySelectorAll('[aria-controls="settings"]').forEach(button => button.addEventListener('click', () => setExpanded(panel.classList.contains('collapsed'))));
  const inside = event => event.composedPath().includes(host);
  const manual = event => { if (!inside(event)) { numberEntry.clear(); if (running) pause(); } };
  document.addEventListener('wheel', manual, { passive:true, capture:true });
  document.addEventListener('touchstart', manual, { passive:true, capture:true });
  document.addEventListener('pointerdown', manual, true);
  document.addEventListener('click', manual, true);
  document.addEventListener('keydown', event => {
    const path = event.composedPath();
    const elements = path.filter(node => node instanceof Element);
    const typing = elements.some(node => node.isContentEditable || node.matches('textarea, select, [role="textbox"], [role="searchbox"], [role="combobox"], input:not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])'));
    const interactive = elements.some(node => node.matches('button, a[href], summary, input, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"]'));
    const toggleFocused = elements.some(node => node.getRootNode() === root && node.matches('.toggle'));
    const action = inReader() && !document.hidden && !event.defaultPrevented ? shortcut(event, { typing, interactive, toggleFocused }) : null;
    if (typing || event.isComposing) numberEntry.clear();
    if (action !== null) {
      // Prevent Enter from also synthesizing a click on our focused toggle.
      event.preventDefault(); event.stopImmediatePropagation();
      if (action === 'toggle') { numberEntry.flush(); toggle(); }
      else if (action === 'slower' || action === 'faster') {
        numberEntry.flush();
        level = stepSpeed(level, action === 'slower' ? -1 : 1);
        update(); save({ speed: level });
      }
      else if (typeof action === 'number') numberEntry.push(action);
      return;
    }
    if (event.key === 'Escape' || (!inside(event) && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))) pause();
  }, true);
  document.addEventListener('selectionchange', () => {
    if (running && document.getSelection()?.toString()) pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => pause());
  document.addEventListener('focusin', event => { if (!inside(event)) numberEntry.clear(); }, true);
  window.addEventListener('pagehide', () => pause());
  function place(x, y) {
    const box = host.getBoundingClientRect();
    const left = dockSide === 'right' ? Math.max(0, innerWidth - box.width - 6) : 6;
    position = { x:left, y:Math.max(8, Math.min(y, innerHeight - box.height - 8)) };
    panel.classList.toggle('right', dockSide === 'right');
    host.style.setProperty('left', `${position.x}px`, 'important');
    host.style.setProperty('top', `${position.y}px`, 'important');
    host.style.setProperty('bottom', 'auto', 'important');
    const drawer = root.querySelector('.full');
    drawer.style.top = `${Math.min(0, Math.max(8, innerHeight - drawer.offsetHeight - 8) - position.y)}px`;
  }
  function clamp() { const box = host.getBoundingClientRect(); place(box.x, box.y); }
  root.querySelectorAll('.drag').forEach(handle => {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const box = host.getBoundingClientRect(); drag = { x:event.clientX-box.x, y:event.clientY-box.y };
      handle.setPointerCapture(event.pointerId); event.preventDefault();
    });
    handle.addEventListener('pointermove', event => { if (drag) { moved = true; dockSide = event.clientX > innerWidth / 2 ? 'right' : 'left'; place(event.clientX-drag.x, event.clientY-drag.y); } });
    const end = () => { if (drag) { drag = null; if (moved) save({ dockPosition: { side:dockSide, y:position.y } }); } };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  });
  window.addEventListener('resize', clamp);
  function theme() {
    let element = document.body, dark = matchMedia('(prefers-color-scheme: dark)').matches;
    while (element) {
      const color = getComputedStyle(element).backgroundColor;
      const numbers = color.match(/[\d.]+/g)?.map(Number);
      if (numbers && numbers.length >= 3 && (numbers.length < 4 || numbers[3] > .5)) {
        dark = numbers[0]*.2126 + numbers[1]*.7152 + numbers[2]*.0722 < 128; break;
      }
      element = element.parentElement;
    }
    panel.classList.toggle('dark', dark);
  }
  // Also covers SPA chapter changes and dynamically applied reader themes.
  setInterval(() => {
    const nextChapter = chapterKey();
    if (location.href !== route || nextChapter !== chapter) {
      route = location.href; chapter = nextChapter; pause('准备就绪');
    }
    host.style.setProperty('display', inReader() ? 'block' : 'none', 'important'); theme(); scheduleProgress();
  }, 400);
  try {
    chrome.storage.local.get(['speed','dockPosition']).then(saved => {
      if (!running && Number.isInteger(saved.speed) && saved.speed >= 1 && saved.speed <= 20) level = saved.speed;
      if (!moved && saved.dockPosition && Number.isFinite(saved.dockPosition.y)) { dockSide = saved.dockPosition.side === 'right' ? 'right' : 'left'; place(0, saved.dockPosition.y); }
      update();
    }).catch(() => {});
  } catch {}
  let progressFrame = null, lastProgress = null;
  function updateProgress() {
    progressFrame = null;
    const page = document.scrollingElement;
    if (!page) return;
    const percent = scrollPercent(page.scrollTop, page.scrollHeight, page.clientHeight);
    if (percent === lastProgress) return;
    lastProgress = percent;
    root.querySelector('.progress-toggle').textContent = `${percent}%`;
    root.querySelector('.progress-toggle').setAttribute('aria-label', `阅读进度 ${percent}%，展开设置`);
    root.querySelector('.track').setAttribute('aria-valuenow', String(percent));
    root.querySelector('.fill').style.transform = `scaleY(${percent / 100})`;
  }
  function scheduleProgress() {
    if (progressFrame === null && !document.hidden) progressFrame = requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', scheduleProgress, { passive:true });
  window.addEventListener('resize', scheduleProgress, { passive:true });
  document.addEventListener('load', scheduleProgress, true);
  document.addEventListener('visibilitychange', scheduleProgress);
  const progressObserver = new ResizeObserver(scheduleProgress);
  progressObserver.observe(document.documentElement);
  if (document.body) progressObserver.observe(document.body);
  // The existing 400 ms page check also catches absolute/lazy layout changes.
  theme(); update(); clamp(); scheduleProgress();
})();

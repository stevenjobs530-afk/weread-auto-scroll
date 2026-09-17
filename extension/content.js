(() => {
  'use strict';
  if (document.getElementById('weread-auto-scroll')) return;
  const { speed, Motion, shortcut, NumberEntry } = globalThis.WeReadScrollCore;
  const host = document.createElement('div');
  host.id = 'weread-auto-scroll';
  host.style.cssText = 'position:fixed!important;left:20px!important;bottom:20px!important;z-index:2147483647!important;display:block!important;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all:initial; color-scheme:light dark; }
      * { box-sizing:border-box; }
      .panel { --bg:#fff; --ink:#25322d; --muted:#64736b; --line:#dce5df; --soft:#eef5f0; font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); width:244px; max-width:calc(100vw - 16px); border:1px solid var(--line); border-radius:16px; box-shadow:0 6px 30px #0002; padding:12px; }
      .panel.dark { --bg:#242a27; --ink:#f1f5f2; --muted:#a9b8ae; --line:#46534b; --soft:#35463b; }
      header { display:flex; align-items:center; gap:6px; margin-bottom:12px; }
      .drag { flex:1; cursor:grab; touch-action:none; user-select:none; font-weight:650; letter-spacing:.1px; padding:3px 0; }
      button { font:inherit; cursor:pointer; border:0; border-radius:9px; padding:7px 10px; background:var(--soft); color:var(--ink); }
      button:focus-visible,input:focus-visible { outline:2px solid #3f9565; outline-offset:3px; }
      .toggle { background:#276644; color:#fff; font-weight:600; min-width:78px; }
      .line { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      output { font-variant-numeric:tabular-nums; font-weight:650; }
      input { display:block; width:100%; margin:12px 0 5px; accent-color:#32774d; cursor:pointer; }
      .ends { color:var(--muted); font-size:11px; margin-bottom:12px; }
      .status { color:var(--muted); font-size:11px; max-width:120px; }
      .keys { color:var(--muted); font-size:11px; margin-top:10px; }
      details { max-height: min(360px, 45vh); overflow-y:auto; margin-top:8px; font-size:12px; color:var(--muted); }
      summary { cursor:pointer; padding:4px 0; }
      details p { margin:7px 0; }
      .entry { font-size:11px; color:var(--muted); }
      .mini { display:none; align-items:center; gap:7px; }
      .collapsed { width:auto; padding:8px; }
      .collapsed .full { display:none; }
      .collapsed .mini { display:flex; }
    </style>
    <section class="panel" aria-label="WeRead Auto Scroll">
      <div class="full">
        <header><span class="drag" title="Drag to move">⠿ Auto Scroll</span><button class="collapse" aria-label="Collapse controls">−</button></header>
        <div class="line"><label for="speed">Reading speed</label><output for="speed">5 / 20</output></div>
        <input id="speed" aria-label="Reading speed" type="range" min="1" max="20" step="1" value="5">
        <div class="line ends"><span>Slow</span><span>Fast</span></div>
        <div class="line"><button class="toggle" aria-pressed="false">Start</button><span class="status" role="status" aria-live="polite">Ready to read</span></div>
        <div class="keys">Type 1–20 · Enter: start/pause</div>
        <details><summary>How to use</summary><p>Press <b>Enter</b> to start or pause. Use the slider or type a speed from <b>1 to 20</b>.</p><p>For <b>15</b>, press <b>1</b> then <b>5</b> within <b>half a second</b>. For <b>20</b>, press <b>2</b> then <b>0</b>.</p><p>A single digit applies after half a second. <b>0 alone</b> selects speed 10. Enter applies a pending number and starts/pauses. Invalid numbers keep your current speed.</p><p>Shortcuts are inactive while typing in a text field. Click the book margin if another control has keyboard focus. Scrolling pauses when you interact with the page or leave the tab.</p><p>Drag the dotted title to move this panel; use − to collapse it. At chapter end, open the next chapter yourself.</p><p>WeRead Auto Scroll · v1.2.0</p></details>
      </div>
      <div class="mini"><span class="drag" title="Drag to move">⠿</span><button class="toggle" aria-pressed="false">Start</button><button class="expand" aria-label="Expand controls">5 / 20 ↗</button></div>
      <div class="entry" role="status" aria-live="polite"></div>
    </section>`;
  document.documentElement.append(host);
  const panel = root.querySelector('.panel');
  const slider = root.querySelector('input');
  const motion = new Motion();
  let level = 5, running = false, frame = 0, endSince = null, lastMaximum = null;
  let route = location.href, chapter = chapterKey(), position = null, moved = false;
  const save = values => { try { chrome.storage.local.set(values).catch(() => {}); } catch {} };
  const numberEntry = new NumberEntry({
    apply: value => { level = value; update(); save({ speed: level }); },
    preview: value => { root.querySelector('.entry').textContent = value ? `Speed: ${value}…` : ''; },
    invalid: () => { root.querySelector('.entry').textContent = 'Choose a speed from 1 to 20.'; }
  });
  root.querySelector('details').addEventListener('toggle', clamp);
  function chapterKey() {
    return document.querySelector('.readerTopBar_title')?.textContent || document.title;
  }
  function update() {
    root.querySelector('output').textContent = `${level} / 20`;
    root.querySelector('.expand').textContent = `${level} / 20 ↗`;
    slider.value = level;
    slider.setAttribute('aria-valuetext', `${level} of 20, ${speed(level).toFixed(1)} pixels per second`);
    root.querySelectorAll('.toggle').forEach(button => {
      button.textContent = running ? 'Pause' : 'Start';
      button.setAttribute('aria-pressed', String(running));
    });
  }
  function pause(message = 'Paused') {
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
      if (time - endSince >= 900) { pause('Chapter finished.'); return; }
    } else endSince = null;
    frame = requestAnimationFrame(tick);
  }
  function toggle() {
    if (running) { pause(); return; }
    if (document.hidden || !inReader()) return;
    // Starting after a selection is allowed, but never clears the selection.
    route = location.href; chapter = chapterKey();
    motion.reset(document.scrollingElement.scrollTop); lastMaximum = null; endSince = null;
    running = true; root.querySelector('.status').textContent = 'Scrolling'; update();
    frame = requestAnimationFrame(tick);
  }
  root.querySelectorAll('.toggle').forEach(button => button.addEventListener('click', toggle));
  slider.addEventListener('input', () => { numberEntry.clear(); level = Number(slider.value); update(); save({ speed: level }); });
  root.querySelector('.collapse').addEventListener('click', () => { panel.classList.add('collapsed'); clamp(); });
  root.querySelector('.expand').addEventListener('click', () => { panel.classList.remove('collapsed'); clamp(); });
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
    position = { x:Math.max(8, Math.min(x, innerWidth - box.width - 8)), y:Math.max(8, Math.min(y, innerHeight - box.height - 8)) };
    host.style.setProperty('left', `${position.x}px`, 'important');
    host.style.setProperty('top', `${position.y}px`, 'important');
    host.style.setProperty('bottom', 'auto', 'important');
  }
  function clamp() { const box = host.getBoundingClientRect(); place(box.x, box.y); }
  root.querySelectorAll('.drag').forEach(handle => {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const box = host.getBoundingClientRect(); drag = { x:event.clientX-box.x, y:event.clientY-box.y };
      handle.setPointerCapture(event.pointerId); event.preventDefault();
    });
    handle.addEventListener('pointermove', event => { if (drag) { moved = true; place(event.clientX-drag.x, event.clientY-drag.y); } });
    const end = () => { if (drag) { drag = null; if (moved) save({ position }); } };
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
      route = location.href; chapter = nextChapter; pause('Ready to read');
    }
    host.style.setProperty('display', inReader() ? 'block' : 'none', 'important'); theme();
  }, 400);
  try {
    chrome.storage.local.get(['speed','position']).then(saved => {
      if (!running && Number.isInteger(saved.speed) && saved.speed >= 1 && saved.speed <= 20) level = saved.speed;
      if (!moved && saved.position && Number.isFinite(saved.position.x) && Number.isFinite(saved.position.y)) place(saved.position.x, saved.position.y);
      update();
    }).catch(() => {});
  } catch {}
  theme(); update();
})();

(() => {
  const defaults = { enabled: false, width: 85, top: 40 };
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      enabled: value.enabled === true,
      width: Math.max(50, Math.min(95, Number(value.width) || defaults.width)),
      top: Math.max(0, Math.min(160, Number.isFinite(Number(value.top)) ? Number(value.top) : defaults.top))
    };
  }
  function dimensions(viewport, percent) {
    const gutter = viewport >= 600 ? 64 : 12;
    const width = Math.max(0, Math.min(viewport * percent / 100, viewport - gutter * 2));
    return { width: Math.floor(width), left: Math.floor((viewport - width) / 2), gutter };
  }
  function css(viewport, settings) {
    if (!settings.enabled) return '';
    const { width, left } = dimensions(viewport, settings.width);
    return `
      .readerContent .app_content { width:${width}px!important; max-width:${width}px!important; min-width:0!important; margin-left:auto!important; margin-right:auto!important; }
      .readerContent .readerTopBar { width:${width}px!important; max-width:${width}px!important; min-width:0!important; box-sizing:border-box!important; left:50%!important; right:auto!important; transform:translateX(-50%)!important; }
      .readerContent .readerTopBar_inner { width:100%!important; max-width:100%!important; box-sizing:border-box!important; padding-left:16px!important; padding-right:16px!important; }
      .readerContent .readerTopBar_left { min-width:0!important; flex-shrink:1!important; overflow:hidden!important; }
      .readerContent .readerTopBar_title { min-width:0!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; }
      .readerContent .readerFooter { width:100%!important; max-width:100%!important; box-sizing:border-box!important; }
      .readerContent .readerFooter_button { max-width:calc(100% - 24px)!important; }
      .readerContent .readerChapterContent { margin-left:24px!important; margin-right:24px!important; min-width:0!important; }
      .readerContent .navBarOffset { height:0!important; padding-top:${72 + settings.top}px!important; }
      ${viewport >= 600 ? `.readerContent .readerControls { left:auto!important; right:${Math.max(8, left - 56)}px!important; margin-left:0!important; margin-right:0!important; transform:none!important; }` : ''}
    `;
  }
  function mount(root, pause) {
    let settings = { ...defaults }, changed = false, timer = null, previous = '';
    const style = document.createElement('style');
    style.id = 'weread-auto-scroll-layout';
    document.head.append(style);
    const enabled = root.querySelector('#layout-enabled');
    const width = root.querySelector('#layout-width');
    const top = root.querySelector('#layout-top');
    const widthValue = root.querySelector('[for="layout-width"].layout-value');
    const topValue = root.querySelector('[for="layout-top"].layout-value');
    function render() {
      enabled.checked = settings.enabled;
      width.value = settings.width; top.value = settings.top;
      widthValue.textContent = `${settings.width}%`;
      topValue.textContent = `${settings.top} 像素`;
      width.disabled = top.disabled = !settings.enabled;
    }
    function apply() {
      const active = location.pathname.startsWith('/web/reader/') && settings.enabled;
      const text = css(document.documentElement.clientWidth, { ...settings, enabled: active });
      if (text === previous) return;
      previous = text; style.textContent = text;
      // WeRead renders text to canvas; resizing must trigger its own reflow.
      window.dispatchEvent(new Event('resize'));
    }
    function save() { try { chrome.storage.local.set({ readerLayout: settings }).catch(() => {}); } catch {} }
    function change() {
      changed = true; pause();
      settings = normalize({ enabled: enabled.checked, width: width.value, top: top.value });
      render(); clearTimeout(timer); timer = setTimeout(() => { apply(); save(); }, 180);
    }
    enabled.addEventListener('change', change);
    width.addEventListener('input', change); top.addEventListener('input', change);
    root.querySelector('#layout-reset').addEventListener('click', () => {
      changed = true; pause(); clearTimeout(timer); settings = { ...defaults }; render(); apply(); save();
    });
    window.addEventListener('resize', apply);
    const observer = new MutationObserver(() => { if (!style.isConnected) document.head.append(style); apply(); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    render();
    try { chrome.storage.local.get('readerLayout').then(saved => {
      if (!changed) { settings = normalize(saved.readerLayout); render(); apply(); }
    }).catch(() => {}); } catch {}
  }
  globalThis.WeReadLayout = { defaults, normalize, dimensions, css, mount };
})();

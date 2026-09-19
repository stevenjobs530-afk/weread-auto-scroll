(() => {
  const speed = level => 5 * Math.pow(40, (Math.max(1, Math.min(20, Number(level) || 5)) - 1) / 19);
  class Motion {
    constructor() { this.reset(0); }
    reset(position) { this.position = position; this.time = null; }
    next(time, level, maximum) {
      if (this.time !== null) this.position += speed(level) * Math.max(0, Math.min(100, time - this.time)) / 1000;
      this.time = time;
      this.position = Math.min(maximum, this.position);
      return this.position;
    }
  }
  function shortcut(event, { typing = false, interactive = false, toggleFocused = false } = {}) {
    if (typing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null;
    if (event.key === 'Enter') {
      if (interactive && !toggleFocused) return null;
      return event.repeat ? 'consume' : 'toggle';
    }
    if (event.key?.toLowerCase() === 's') return event.repeat ? 'consume' : 'toggle';
    if (event.key?.toLowerCase() === 'a') return event.repeat ? 'consume' : 'slower';
    if (event.key?.toLowerCase() === 'd') return event.repeat ? 'consume' : 'faster';
    if (/^[0-9]$/.test(event.key)) return event.repeat ? 'consume' : Number(event.key);
    return null;
  }
  class NumberEntry {
    constructor({ apply, preview, invalid, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id) }) {
      Object.assign(this, { apply, preview, invalid, schedule, cancel });
      this.buffer = ''; this.timer = null;
    }
    clear() {
      if (this.timer !== null) this.cancel(this.timer);
      this.timer = null; this.buffer = ''; this.preview('');
    }
    push(digit) {
      if (this.timer !== null) this.cancel(this.timer);
      this.buffer += String(digit);
      this.preview(this.buffer);
      if (this.buffer.length === 2) this.flush();
      else this.timer = this.schedule(() => this.flush(), 500);
    }
    flush() {
      if (!this.buffer) return;
      const value = this.buffer === '0' ? 10 : Number(this.buffer);
      this.clear();
      if (value >= 1 && value <= 20) this.apply(value);
      else this.invalid();
    }
  }
  function scrollPercent(top, height, viewport) {
    const maximum = Math.max(0, height - viewport);
    if (maximum <= 1 || top >= maximum - 1) return 100;
    return Math.max(1, Math.min(99, Math.floor(Math.max(0, top) / maximum * 100)));
  }
  const stepSpeed = (level, delta) => Math.max(1, Math.min(20, level + delta));
  globalThis.WeReadScrollCore = { stepSpeed, speed, Motion, shortcut, NumberEntry, scrollPercent };
})();

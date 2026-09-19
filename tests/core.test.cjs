const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/scroll-core.js');
const { speed, Motion, shortcut, NumberEntry } = globalThis.WeReadScrollCore;
test('number shortcuts select levels 1–10 and Enter toggles', () => {
  for (let i=1;i<=9;i++) assert.equal(shortcut({key:String(i)}),i);
  assert.equal(shortcut({key:'0'}),0);
  assert.equal(shortcut({key:'Enter'}),'toggle');
});
test('typing, IME and modified shortcuts are left alone', () => {
  for (const key of ['0','5','Enter']) {
    assert.equal(shortcut({key},{typing:true}),null);
    for (const flag of ['isComposing','metaKey','ctrlKey','altKey','shiftKey']) assert.equal(shortcut({key,[flag]:true}),null);
    assert.equal(shortcut({key,keyCode:229}),null);
  }
});
test('held keys are consumed, and Enter preserves other controls', () => {
  assert.equal(shortcut({key:'Enter',repeat:true}),'consume');
  assert.equal(shortcut({key:'4',repeat:true}),'consume');
  assert.equal(shortcut({key:'Enter'},{interactive:true}),null);
  assert.equal(shortcut({key:'Enter'},{interactive:true,toggleFocused:true}),'toggle');
});
test('20 strictly increasing speeds, exact endpoints and reading default', () => {
  assert.equal(speed(1), 5); assert.equal(speed(20), 200);
  for (let i=2;i<=20;i++) assert.ok(speed(i)>speed(i-1));
  assert.ok(speed(5)>10 && speed(5)<12);
});
test('slow scrolling retains fractions consistently at 60 and 144 Hz', () => {
  for (const hz of [60, 144]) {
    const motion = new Motion(); motion.reset(100);
    for (let i=0;i<=hz*10;i++) motion.next(i*1000/hz, 1, 10000);
    assert.ok(Math.abs(motion.position-150)<.001);
  }
});
test('speed changes apply without jumping and ends clamp', () => {
  const motion = new Motion(); motion.next(0,1,1000);
  assert.equal(motion.next(100,1,1000),.5);
  assert.equal(motion.next(200,20,1000),20.5);
  assert.equal(motion.next(300,20,25),25);
});
test('long delayed frames never cause a catch-up jump; restart resets clock', () => {
  const motion = new Motion(); motion.next(0,20,10000);
  assert.equal(motion.next(10000,20,10000),20);
  motion.reset(500); assert.equal(motion.next(20000,20,10000),500);
});
test('manifest limits injection to reader and storage only', () => {
  const manifest = require('../extension/manifest.json');
  assert.deepEqual(manifest.permissions,['storage']);
  assert.deepEqual(manifest.content_scripts[0].matches,['https://weread.qq.com/web/reader/*']);
});
function entryFixture() {
  let task = null, applied = [], previews = [], invalid = 0;
  const entry = new NumberEntry({apply: v => applied.push(v), preview: v => previews.push(v), invalid: () => invalid++, schedule: (fn,ms) => {assert.equal(ms,500); task=fn; return 1;}, cancel: () => {task=null;}});
  return {entry,applied,previews,expire:()=>{const fn=task;task=null;fn?.();},errors:()=>invalid};
}
test('every level 1–20 is reachable with delayed single digits or fast pairs', () => {
  for(let i=1;i<=20;i++) {
    const f=entryFixture(); for(const digit of String(i)) f.entry.push(Number(digit));
    if(i<10) {assert.deepEqual(f.applied,[]); f.expire();}
    assert.deepEqual(f.applied,[i]); f.expire(); assert.deepEqual(f.applied,[i]);
  }
});
test('slow 1 then 5 produces separate levels; zero alone preserves speed 10', () => {
  const f=entryFixture(); f.entry.push(1); f.expire(); f.entry.push(5); f.expire();
  f.entry.push(0); f.expire(); assert.deepEqual(f.applied,[1,5,10]);
});
test('invalid pairs never apply an intermediate or out-of-range speed', () => {
  for(const digits of ['21','99','00']) {
    const f=entryFixture(); for(const d of digits) f.entry.push(Number(d));
    f.expire(); assert.deepEqual(f.applied,[]); assert.equal(f.errors(),1);
  }
});
test('cancel drops pending speed, Enter flush applies once', () => {
  const f=entryFixture(); f.entry.push(1); f.entry.clear(); f.expire(); assert.deepEqual(f.applied,[]);
  f.entry.push(8); f.entry.flush(); f.expire(); assert.deepEqual(f.applied,[8]);
});
require('../extension/reader-layout.js');
const layout = globalThis.WeReadLayout;
test('layout defaults do not change the site and malformed preferences are clamped', () => {
  assert.equal(layout.css(1010,layout.defaults),'');
  assert.deepEqual(layout.normalize(null),layout.defaults);
  assert.equal(layout.normalize({width:200,top:-20,enabled:true}).width,95);
  assert.equal(layout.normalize({width:20,top:999}).top,160);
});
test('reading width fits portrait, landscape, and narrow viewports', () => {
  for(const viewport of [320,480,600,900,1010,1600,2560]) {
    for(const percent of [50,85,95]) {
      const d=layout.dimensions(viewport,percent);
      assert.ok(d.width<=viewport-d.gutter*2);
      assert.ok(d.left>=d.gutter);
      assert.ok(d.width+d.left<=viewport-d.gutter);
    }
  }
  assert.equal(layout.dimensions(1010,85).width,858);
});
const { scrollPercent } = globalThis.WeReadScrollCore;
test('progress starts at 1 and reaches 100 only at the bottom', () => {
  assert.equal(scrollPercent(0,2000,1000),1);
  assert.equal(scrollPercent(500,2000,1000),50);
  assert.equal(scrollPercent(990,2000,1000),99);
  assert.equal(scrollPercent(1000,2000,1000),100);
  assert.equal(scrollPercent(-50,2000,1000),1);
  assert.equal(scrollPercent(1200,2000,1000),100);
});
test('short pages are complete and dynamic growth recalculates progress', () => {
  assert.equal(scrollPercent(0,800,1000),100);
  assert.equal(scrollPercent(0,1000,1000),100);
  assert.equal(scrollPercent(1000,2000,1000),100);
  assert.equal(scrollPercent(1000,3000,1000),50);
});
test('A/D speed steps stop at both boundaries and W/S stay unassigned', () => {
 const {stepSpeed}=globalThis.WeReadScrollCore;
 let level=5; const levels=[];
 for(let i=0;i<6;i++) {level=stepSpeed(level,-1);levels.push(level);}
 assert.deepEqual(levels,[4,3,2,1,1,1]);
 for(let i=0;i<25;i++) level=stepSpeed(level,1);
 assert.equal(level,20);
 for(const key of ['a','A']) assert.equal(shortcut({key}),'slower');
 for(const key of ['d','D']) assert.equal(shortcut({key}),'faster');
 for(const key of ['w','s']) assert.equal(shortcut({key}),null);
});
test('A/D respects editing, modifiers, IME and held-key guards', () => {
 for(const key of ['a','d']) {
  assert.equal(shortcut({key},{typing:true}),null);
  assert.equal(shortcut({key,repeat:true}),'consume');
  for(const flag of ['isComposing','ctrlKey','metaKey','altKey','shiftKey']) assert.equal(shortcut({key,[flag]:true}),null);
 }
});

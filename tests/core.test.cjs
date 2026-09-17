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

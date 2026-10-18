// motion.js registry: reduced motion makes NO animate() calls; skip() reports/finishes running work.
import assert from 'node:assert/strict';
let red = true, calls = 0;
globalThis.matchMedia = q => ({ matches: red && /reduce/.test(q) });
globalThis.requestAnimationFrame = f => setTimeout(() => f(performance.now()), 5); globalThis.cancelAnimationFrame = id => clearTimeout(id);
const { play, count, later, skip, cancelAll } = await import('./motion.js');
const mkAnim = () => { const l = {}; return { playState: 'running', addEventListener: (e, f) => { l[e] = f; }, finish() { this.playState = 'finished'; l.finish?.(); }, cancel() { this.playState = 'idle'; l.cancel?.(); } }; };
const el = () => ({ animate() { calls++; return mkAnim(); }, textContent: '' });
// reduced: no calls, final text immediately, skip false
assert.equal(play(el(), [{}, {}]), null); const t = el(); count(t, 1234, 0, 700, 300); assert.equal(t.textContent, '1.234'); assert.equal(skip(), false);
let ran = 0; later(() => ran++, 500); assert.equal(ran, 1); assert.equal(calls, 0);
// normal: skip completes and reports once
red = false; const a = play(el(), [{}, {}]); assert.ok(a); assert.equal(skip(), true); assert.equal(a.playState, 'finished'); assert.equal(skip(), false);
later(() => ran++, 5000); assert.equal(skip(), true); assert.equal(ran, 2); assert.equal(skip(), false);
const c = el(); count(c, 50, 0, 700, 0); assert.equal(skip(), true); assert.equal(c.textContent, '50'); assert.equal(skip(), false);
const d = el(); count(d, 9, 0, 40, 0); await new Promise(r => setTimeout(r, 120)); assert.equal(d.textContent, '9'); assert.equal(skip(), false); // natural end leaves nothing "running"
play(el(), [{}, {}]); cancelAll(); assert.equal(skip(), false);
console.log('motion selftest OK');

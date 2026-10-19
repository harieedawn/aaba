import assert from 'node:assert/strict';
import { baseOf, groupScore, rankGroups, personalPoints, studentNet, deltaSince } from './scoring.js';
import { plusMinus } from './format.js';

// The PREVIOUS implementation (category split), kept here only to prove identical totals.
function legacy(groupId, entries, categories) {
  const byCat = {}; let total = 0, plus = 0, minus = 0, pending = 0;
  for (const c of categories) { byCat[c.id] = c.base; total += c.base; }
  for (const e of entries) {
    if (e.groupId !== groupId) continue;
    if (e.status === 'pending') { pending += e.points; continue; }
    if (e.status !== 'ok') continue;
    total += e.points;
    if (e.points > 0) plus += e.points; else minus += e.points;
    if (e.cat in byCat) byCat[e.cat] += e.points;
  }
  return { total, byCat, plus, minus, pending };
}

const groups = [{ id: 'g1', name: 'Tổ 1' }, { id: 'g2', name: 'Tổ 2' }, { id: 'g3', name: 'Tổ 3' }, { id: 'g4', name: 'Tổ 4' }];
const E = (groupId, points, cat, status = 'ok', extra = {}) => ({ groupId, studentId: null, cat, points, status, at: 1000, ...extra });

// --- baseOf
assert.equal(baseOf({ baseScore: 150, categories: [{ base: 1 }] }), 150);
assert.equal(baseOf({ baseScore: 0, categories: [{ base: 50 }] }), 0);           // 0 is a valid base
assert.equal(baseOf({ categories: [{ id: 'a', base: 50 }, { id: 'b', base: 50 }, { id: 'c', base: 0 }] }), 100); // legacy 50+50+0
assert.equal(baseOf({ baseScore: 'x', categories: [{ base: 30 }, { base: 20 }] }), 50);
assert.equal(baseOf({ baseScore: NaN, categories: [] }), 100);
assert.equal(baseOf({}), 100); assert.equal(baseOf(null), 100); assert.equal(baseOf(undefined), 100);
assert.equal(baseOf(120), 120);

// --- legacy config (no baseScore) gives identical totals on a random fixture of 200 entries
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const legacyCfg = { categories: [{ id: 'noiquy', base: 50 }, { id: 'hoctap', base: 50 }, { id: 'phongtrao', base: 0 }] };
const cats = ['noiquy', 'hoctap', 'phongtrao'], sts = ['ok', 'ok', 'ok', 'pending', 'void'];
const fixture = Array.from({ length: 200 }, () => E(groups[Math.floor(rnd() * 4)].id, Math.round((rnd() - 0.55) * 120), cats[Math.floor(rnd() * 3)], sts[Math.floor(rnd() * 5)]));
for (const g of groups) {
  const a = legacy(g.id, fixture, legacyCfg.categories), b = groupScore(g.id, fixture, legacyCfg);
  assert.equal(b.total, a.total); assert.equal(b.plus, a.plus); assert.equal(b.minus, a.minus); assert.equal(b.pending, a.pending);
  assert.equal(groupScore(g.id, fixture, { ...legacyCfg, baseScore: 100 }).total, a.total); // baseScore=100 equals legacy
  assert.equal(groupScore(g.id, fixture, 100).total, a.total);                               // plain number
  assert.equal('byCat' in b, false);
}
const ra = groups.map(g => ({ id: g.id, t: legacy(g.id, fixture, legacyCfg.categories).total }));
assert.deepEqual(rankGroups(groups, fixture, legacyCfg).map(r => r.total).sort(), ra.map(r => r.t).sort());

// --- baseScore variants
const entries = [
  E('g1', -20, 'a'), E('g1', 8, 'b'), E('g1', 5, 'b', 'pending'), E('g1', -50, 'a', 'void'),
  E('g2', 8, 'b', 'ok', { studentId: 's1' }), E('g2', -20, 'a', 'ok', { studentId: 's1' }),
  E('g3', -20, 'a'), E('g3', 8, 'b'),
  E('g4', -900, 'c'),
];
const s100 = groupScore('g1', entries, { baseScore: 100 });
assert.equal(s100.total, 100 - 20 + 8);                       // pending + void ignored
assert.equal(s100.pending, 5); assert.equal(s100.plus, 8); assert.equal(s100.minus, -20);
assert.equal(groupScore('g1', entries, { baseScore: 0 }).total, -12);
assert.equal(groupScore('g1', entries, { baseScore: 150 }).total, 138);
assert.equal(groupScore('g1', [], { baseScore: 150 }).total, 150);   // empty week = base
assert.equal(groupScore('g4', entries, { baseScore: 100 }).total, -800); // below zero allowed
assert.equal(groupScore('g1', [E('g1', 99, 'a', 'void'), E('g1', 7, 'a', 'pending')], 100).total, 100);

// --- ranking, ties
const r = rankGroups(groups, entries, { baseScore: 100 });
assert.deepEqual(r.map(x => x.group.id), ['g1', 'g2', 'g3', 'g4']);
assert.deepEqual(r.map(x => x.rank), [1, 1, 1, 4]);           // g1,g2,g3 all 88; ties share rank
assert.equal(r[3].total, -800);
assert.equal(rankGroups(groups, [], { baseScore: 0 }).every(x => x.rank === 1), true);

// --- sub-line
assert.equal(plusMinus({ plus: 8, minus: -20 }), 'Cộng +8 · Trừ \u221220');
assert.equal(plusMinus({ plus: 0, minus: -5 }), 'Cộng +0 · Trừ \u22125');
assert.equal(plusMinus({ plus: 0, minus: 0 }), 'Chưa có ghi điểm');

assert.equal(personalPoints('s1', entries), -12);
assert.equal(studentNet(entries).get('s1'), -12);
assert.equal(deltaSince('g1', entries, 500), -12);
assert.equal(deltaSince('g1', entries, 2000), 0);
console.log('scoring selftest OK');

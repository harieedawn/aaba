import assert from 'node:assert/strict';
import { groupScore, rankGroups, personalPoints, deltaSince, cycleSummary } from './scoring.js';

const cats = [{ id: 'a', base: 100 }, { id: 'b', base: 200 }, { id: 'c', base: 50 }];
const groups = [{ id: 'g1', name: 'Tổ 1' }, { id: 'g2', name: 'Tổ 2' }, { id: 'g3', name: 'Tổ 3' }, { id: 'g4', name: 'Tổ 4' }];
const E = (groupId, points, cat, status = 'ok', extra = {}) => ({ cycleId: 'c1', groupId, studentId: null, cat, points, status, at: 1000, ...extra });
const entries = [
  E('g1', -20, 'a'), E('g1', 8, 'b'), E('g1', 5, 'b', 'pending'), E('g1', -50, 'a', 'void'),
  E('g2', 8, 'b', 'ok', { studentId: 's1' }), E('g2', -20, 'a', 'ok', { studentId: 's1' }),
  E('g3', -20, 'a'), E('g3', 8, 'b'),
  E('g4', -900, 'c'),
  E('g1', 99, 'a', 'ok', { cycleId: 'c0' }),
];

const s1 = groupScore('g1', entries, cats, 'c1');
assert.equal(s1.total, 350 - 20 + 8); // pending + void + other cycle ignored
assert.equal(s1.pending, 5);
assert.deepEqual(s1.byCat, { a: 80, b: 208, c: 50 });
assert.equal(s1.plus, 8); assert.equal(s1.minus, -20);
assert.equal(groupScore('g1', entries, cats).total, 350 - 20 + 8 + 99); // no cycle filter

const r = rankGroups(groups, entries, cats, 'c1');
assert.deepEqual(r.map(x => x.group.id), ['g1', 'g2', 'g3', 'g4']);
assert.deepEqual(r.map(x => x.rank), [1, 1, 1, 4]); // g1,g2,g3 all 338; ties share rank
assert.equal(r[3].total, 350 - 900); // negative totals allowed
assert.equal(personalPoints('s1', entries, 'c1'), -12);
const cur = entries.filter(e => e.cycleId === 'c1');
assert.equal(deltaSince('g1', cur, 500), -12);
assert.equal(deltaSince('g1', cur, 2000), 0);
const sum = cycleSummary(groups, entries, cats, 'c1');
assert.equal(sum.length, 4); assert.equal(sum[0].groupId, 'g1');
console.log('scoring selftest OK');

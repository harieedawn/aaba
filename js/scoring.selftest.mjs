import assert from 'node:assert/strict';
import { groupScore, rankGroups, personalPoints, studentNet, deltaSince } from './scoring.js';

const cats = [{ id: 'a', base: 100 }, { id: 'b', base: 200 }, { id: 'c', base: 50 }];
const groups = [{ id: 'g1', name: 'Tổ 1' }, { id: 'g2', name: 'Tổ 2' }, { id: 'g3', name: 'Tổ 3' }, { id: 'g4', name: 'Tổ 4' }];
const E = (groupId, points, cat, status = 'ok', extra = {}) => ({ groupId, studentId: null, cat, points, status, at: 1000, ...extra });
const entries = [
  E('g1', -20, 'a'), E('g1', 8, 'b'), E('g1', 5, 'b', 'pending'), E('g1', -50, 'a', 'void'),
  E('g2', 8, 'b', 'ok', { studentId: 's1' }), E('g2', -20, 'a', 'ok', { studentId: 's1' }),
  E('g3', -20, 'a'), E('g3', 8, 'b'),
  E('g4', -900, 'c'),
];

const s1 = groupScore('g1', entries, cats);
assert.equal(s1.total, 350 - 20 + 8); // pending + void ignored
assert.equal(s1.pending, 5);
assert.deepEqual(s1.byCat, { a: 80, b: 208, c: 50 });
assert.equal(s1.plus, 8); assert.equal(s1.minus, -20);
assert.equal(groupScore('g1', [], cats).total, 350); // empty week = base

const r = rankGroups(groups, entries, cats);
assert.deepEqual(r.map(x => x.group.id), ['g1', 'g2', 'g3', 'g4']);
assert.deepEqual(r.map(x => x.rank), [1, 1, 1, 4]); // g1,g2,g3 all 338; ties share rank
assert.equal(r[3].total, 350 - 900); // negative totals allowed
assert.equal(personalPoints('s1', entries), -12);
assert.equal(studentNet(entries).get('s1'), -12);
assert.equal(deltaSince('g1', entries, 500), -12);
assert.equal(deltaSince('g1', entries, 2000), 0);
console.log('scoring selftest OK');

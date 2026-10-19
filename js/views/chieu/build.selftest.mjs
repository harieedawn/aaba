import assert from 'node:assert/strict';
import { buildSlides } from './build.js';

const config = { className: '11A3', school: 'THPT Trần Quốc Toản', categories: [{ id: 'a', name: 'Nội quy', base: 100 }, { id: 'b', name: 'Học tập', base: 100 }, { id: 'c', name: 'Phong trào', base: 100 }] };
const mk = n => Array.from({ length: n }, (_, i) => ({ id: 'g' + (i + 1), name: 'Tổ ' + (i + 1), color: 'blue', order: i + 1 }));
const students = [];
for (const g of mk(8)) for (let s = 1; s <= 3; s++) students.push({ id: `s_${g.id}_${s}`, groupId: g.id, name: `HS ${g.id}.${s}` });
let id = 0;
const E = o => ({ id: 'e' + ++id, groupId: 'g1', studentId: null, ruleName: 'Nói chuyện riêng', points: -2, status: 'ok', cat: 'a', ...o });
const run = (entries, groups = mk(4)) => buildSlides({ entries, groups, students, config, weekLabel: 'T7 17/10 → T6 23/10', isCurrent: false });
const types = sl => sl.map(s => s.type).join(',');

// 1. empty week: title + 4 tổ (empty) + finale, no Nổi bật; all tied at rank 1
let sl = run([]);
assert.equal(types(sl), 'title,group,group,group,group,finale');
assert.deepEqual(sl.slice(1, 5).map(s => s.group.name), ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4']);
assert.ok(sl.slice(1, 5).every(s => s.empty && s.lines.length === 0 && !s.star && s.pending === 0));
assert.equal(sl[0].className, '11A3'); assert.equal(sl[0].weekLabel, 'T7 17/10 → T6 23/10');
let fin = sl[5];
assert.equal(fin.tie, true); assert.equal(fin.first.length, 4); assert.equal(fin.steps.length, 2); assert.equal(fin.steps[0].kind, 'hero'); assert.equal(fin.steps[1].kind, 'board');
assert.match(fin.steps[0].line, /đồng hạng nhất tuần$/);

// 2. one tổ empty (g3 has nothing)
sl = run([E({ groupId: 'g1', studentId: 's_g1_1', ruleName: 'Phát biểu', points: 5, cat: 'b' }), E({ groupId: 'g2' }), E({ groupId: 'g4', points: -3 })]);
assert.equal(types(sl), 'title,group,group,group,group,top,finale');
assert.deepEqual(sl.slice(1, 5).map(s => s.empty), [false, false, true, false]);
assert.equal(sl[1].star.name, 'HS g1.1'); assert.equal(sl[1].plusSum, 5); assert.equal(sl[1].minusSum, 0);

// 3. ties share rank; reveal from last place; single winner wording
sl = run([E({ groupId: 'g1', points: 10 }), E({ groupId: 'g2', points: -5 }), E({ groupId: 'g3', points: -5 }), E({ groupId: 'g4', points: -9 })]);
fin = sl.at(-1);
assert.deepEqual(fin.rows.map(r => [r.group.name, r.rank]), [['Tổ 2', 2], ['Tổ 3', 2], ['Tổ 4', 4]]);
assert.deepEqual(fin.steps.map(s => s.kind), ['row', 'row', 'row', 'hero', 'board']);
assert.deepEqual(fin.steps.slice(0, 3).map(s => s.rows[0].group.name), ['Tổ 4', 'Tổ 3', 'Tổ 2']);
assert.equal(fin.steps[3].line, 'Tổ 1 xếp hạng nhất tuần'); assert.equal(fin.tie, false);
assert.equal(fin.first[0].total, 310); // legacy config (categories 100+100+100, no baseScore) -> base 300, as before
assert.deepEqual([fin.first[0].plus, fin.first[0].minus], [10, 0]); assert.equal('cats' in fin.first[0], false);
{ const row = fin.board.find(r => r.group.id === 'g4'); assert.deepEqual([row.total, row.plus, row.minus], [291, 0, 9]); } // minus = magnitude
{ const mkc = c => buildSlides({ entries: [E({ groupId: 'g1', points: 10 }), E({ groupId: 'g2', points: -5 })], groups: mk(4), students, config: c, weekLabel: '', isCurrent: false }).at(-1).board.map(r => r.total);
  assert.deepEqual(mkc({ ...config, baseScore: 100 }), [110, 100, 100, 95]);   // baseScore wins over categories
  assert.deepEqual(mkc({ ...config, baseScore: 0 }), [10, 0, 0, -5]);          // base 0, below zero
  assert.deepEqual(mkc({ ...config, baseScore: 150 }), [160, 150, 150, 145]); }
sl = run([E({ groupId: 'g2', points: 4 }), E({ groupId: 'g3', points: 4 })]);
assert.equal(sl.at(-1).steps.at(-2).line, 'Tổ 2 · Tổ 3 đồng hạng nhất tuần'); assert.deepEqual(sl.at(-1).steps.at(-2).lines, ['Tổ 2 đồng hạng nhất tuần', 'Tổ 3 đồng hạng nhất tuần']);

// 4. voided / pending excluded
const es = [
  E({ groupId: 'g1', ruleName: 'Đi muộn', points: -4, status: 'void' }), E({ groupId: 'g1', ruleName: 'Gương mẫu', points: 9, studentId: 's_g1_2', status: 'void' }),
  E({ groupId: 'g1', ruleName: 'Phát biểu', points: 5, studentId: 's_g1_3', status: 'pending' }), E({ groupId: 'g1', ruleName: 'Mất trật tự', points: -1 }),
];
sl = run(es);
assert.equal(sl[1].pending, 1); assert.equal(sl[1].plusCount, 0); assert.equal(sl[1].minusCount, 1);
assert.deepEqual(sl[1].lines.map(l => l.ruleName), ['Mất trật tự']); assert.equal(sl[1].star, null);
assert.equal(sl.at(-1).rows.concat(sl.at(-1).first).find(r => r.group.id === 'g1').total, 299);
assert.deepEqual(sl.find(s => s.type === 'top').rules, [{ name: 'Mất trật tự', count: 1 }]);
assert.equal(sl.find(s => s.type === 'top').students.length, 0);
assert.equal(types(run([E({ status: 'void' }), E({ status: 'pending', points: 3 })])), 'title,group,group,group,group,finale'); // no Nổi bật

// 5. lines: grouping, sort by |points|, ×count, names only on + lines, max 5 + "more"
const many = [];
for (let r = 1; r <= 7; r++) many.push(E({ ruleName: 'Luật ' + r, points: -r }));
many.push(E({ ruleName: 'Luật 1', points: -1 }), E({ ruleName: 'Giơ tay', points: 2, studentId: 's_g1_1' }), E({ ruleName: 'Giơ tay', points: 2, studentId: 's_g1_2' }), E({ ruleName: 'Giơ tay', points: 2, studentId: 's_g1_1' }));
const g1 = run(many)[1];
assert.equal(g1.lines.length, 6); assert.equal(g1.more, 2); assert.equal(g1.density, 'compact');
assert.deepEqual(g1.lines.map(l => l.ruleName), ['Luật 7', 'Giơ tay', 'Luật 6', 'Luật 5', 'Luật 4', 'Luật 3']);
const tay = g1.lines[1]; assert.equal(tay.count, 3); assert.equal(tay.points, 6); assert.deepEqual(tay.names, ['HS g1.1', 'HS g1.2']);
assert.ok(g1.lines.filter(l => l.sign < 0).every(l => l.names.length === 0));
assert.deepEqual([g1.plusCount, g1.minusCount, g1.plusSum, g1.minusSum], [3, 8, 6, 29]);
assert.equal(g1.star.name, 'HS g1.1'); assert.equal(g1.star.net, 4);

// 6. Nổi bật: top 3 deduction rules by count, top 3 students net > 0 (never students for deductions)
const tp = run([
  ...[1, 2, 3].map(() => E({ ruleName: 'A', points: -1 })), ...[1, 2].map(() => E({ ruleName: 'B', points: -1, studentId: 's_g1_1' })),
  E({ ruleName: 'C', points: -1 }), E({ ruleName: 'D', points: -1 }),
  E({ groupId: 'g2', ruleName: 'X', points: 7, studentId: 's_g2_1' }), E({ groupId: 'g3', ruleName: 'X', points: 5, studentId: 's_g3_1' }),
  E({ groupId: 'g4', ruleName: 'X', points: 3, studentId: 's_g4_1' }), E({ groupId: 'g4', ruleName: 'X', points: 1, studentId: 's_g4_2' }),
]).find(s => s.type === 'top');
assert.deepEqual(tp.rules.map(r => r.name), ['A', 'B', 'C']); assert.deepEqual(tp.rules.map(r => r.count), [3, 2, 1]);
assert.deepEqual(tp.students.map(s => [s.name, s.net, s.group.name]), [['HS g2.1', 7, 'Tổ 2'], ['HS g3.1', 5, 'Tổ 3'], ['HS g4.1', 3, 'Tổ 4']]);
assert.equal(tp.students.some(s => s.name === 'HS g1.1'), false);
assert.equal(run([E({ ruleName: 'Q', points: -1 })]).find(s => s.type === 'top').students.length, 0); // only rules half

// 7. 4 and 8 groups (numeric order, 10 after 2), 8 groups: 7 non-first rows + hero
sl = run([E({ groupId: 'g1', points: 3 })], mk(4));
assert.equal(sl.filter(s => s.type === 'group').length, 4); assert.equal(sl.at(-1).steps.length, 5);
const g8 = [...mk(8)].reverse(); g8.forEach(g => delete g.order); g8.push({ id: 'g10', name: 'Tổ 10', color: 'teal' });
sl = run([E({ groupId: 'g1', points: 3 }), E({ groupId: 'g8', points: -2 })], g8);
assert.deepEqual(sl.filter(s => s.type === 'group').map(s => s.group.name), ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Tổ 5', 'Tổ 6', 'Tổ 7', 'Tổ 8', 'Tổ 10']);
assert.equal(sl.at(-1).steps.length, 10); assert.equal(sl.at(-1).rows.length, 8); assert.equal(sl.at(-1).rows.at(-1).group.name, 'Tổ 8');
assert.equal(run([], []).length, 1); // no groups: title only

// 8. density (<=3 large, 4-5 medium, 6 compact) and current week (isCurrent/daysLeft)
const lin = n => Array.from({ length: n }, (_, i) => E({ ruleName: 'R' + i, points: -1 }));
assert.deepEqual([0, 3, 4, 5, 6, 9].map(n => run(lin(n))[1].density), ['large', 'large', 'medium', 'medium', 'compact', 'compact']);
const cur = (entries, daysLeft, groups = mk(4)) => buildSlides({ entries, groups, students, config, weekLabel: 'x', isCurrent: true, daysLeft });
sl = cur([E({ groupId: 'g1', points: 5 })], 3);
assert.equal(sl[0].tag, 'Tạm tính · còn 3 ngày'); assert.equal(sl[0].isCurrent, true);
assert.equal(sl.at(-1).steps.at(-2).line, 'Tổ 1 đang dẫn đầu (tạm tính)');
assert.equal(cur([], 0)[0].tag, 'Tạm tính · hôm nay chốt tuần');
assert.equal(cur([], 2).at(-1).steps.at(-2).line, 'Tổ 1 · Tổ 2 · Tổ 3 · Tổ 4 đồng hạng dẫn đầu (tạm tính)');
assert.equal(run([])[0].tag, ''); assert.match(run([E({ groupId: 'g1', points: 5 })]).at(-1).steps.at(-2).line, /xếp hạng nhất tuần$/);
for (const n of [2, 4, 8]) { const f = run([E({ groupId: 'g1', points: 2 })], mk(n)).at(-1); assert.equal(f.first.length + f.rows.length, n); assert.equal(f.steps.length, n + 1); assert.deepEqual(f.steps.map(s => s.kind), [...Array(n - 1).fill('row'), 'hero', 'board']); assert.equal(f.steps.at(-1).rows.length, n); assert.equal(f.board.length, n); assert.equal(f.board[0].rank, 1); } // 2/4/8 groups (1 tie-free winner)
console.log('chieu build selftest OK');

// 9. podium layout: order 4th…1st left→right, ties share a height level, rank 1 tallest, 2/4/8 groups
import { podiumLayout } from './build.js';
const pod = (n, extra = []) => run([E({ groupId: 'g1', points: 20 }), ...extra], mk(n)).at(-1).cols;
for (const n of [2, 4, 8]) {
  const c = pod(n, [E({ groupId: 'g2', points: -1 }), E({ groupId: 'g3', points: -2 }), E({ groupId: 'g4', points: -3 }), E({ groupId: 'g5', points: -4 }), E({ groupId: 'g6', points: -5 }), E({ groupId: 'g7', points: -6 }), E({ groupId: 'g8', points: -7 })].filter(e => +e.groupId.slice(1) <= n));
  assert.equal(c.length, n); assert.equal(c.at(-1).rank, 1); assert.equal(c.at(-1).h, 1);
  assert.ok(c.every((x, i) => i === 0 || x.rank <= c[i - 1].rank)); assert.ok(c.every((x, i) => i === 0 || x.h >= c[i - 1].h));
  assert.ok(c.every(x => x.h >= 0.35 && x.h <= 1));
}
const tc = pod(4, [E({ groupId: 'g2', points: -5 }), E({ groupId: 'g3', points: -5 }), E({ groupId: 'g4', points: -9 })]);
assert.deepEqual(tc.map(x => [x.group.name, x.rank]), [['Tổ 4', 4], ['Tổ 2', 2], ['Tổ 3', 2], ['Tổ 1', 1]]);
assert.equal(tc[1].h, tc[2].h); assert.ok(tc[0].h < tc[1].h && tc[1].h < tc[3].h);
const allTie = run([], mk(3)).at(-1).cols; assert.ok(allTie.length === 3 && allTie.every(x => x.h === 1 && x.rank === 1));
assert.equal(podiumLayout([{ rank: 1, group: { id: 'a' } }], []).length, 1);
// 10. finale steps with ties: n_nonwinning rows + hero + board; board lists every tổ, rank-sorted, ties share rank; heights ~ total (min .35)
for (const n of [2, 4, 8]) { const f = run([E({ groupId: 'g1', points: 5 }), E({ groupId: 'g2', points: 5 })], mk(n)).at(-1); assert.equal(f.first.length, 2); assert.equal(f.steps.length, n - 2 + 2); assert.equal(f.board.length, n); assert.ok(f.board.every((r, i) => i === 0 || r.rank >= f.board[i - 1].rank)); assert.equal(f.board[0].rank, f.board[1].rank); }
const ph = pod(4, [E({ groupId: 'g2', points: -200 })]); assert.equal(ph.at(-1).h, 1); assert.equal(ph.find(x => x.group.name === 'Tổ 2').h, 0.35);
assert.equal(run([], mk(2)).at(-1).isCurrent, false);
console.log('podium selftest OK');

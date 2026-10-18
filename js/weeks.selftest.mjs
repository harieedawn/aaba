import assert from 'node:assert/strict';
import * as W from './weeks.js';
const vn = (y, m, d, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s) - W.OFF; // VN wall clock -> ms
const key = t => W.weekKey(W.weekStart(t));

// boundary: Fri 23:59:59 vs Sat 00:00:00 (2026-10-23 is Friday)
assert.equal(key(vn(2026, 10, 23, 23, 59, 59)), '2026-10-17');
assert.equal(key(vn(2026, 10, 24, 0, 0, 0)), '2026-10-24');
assert.equal(key(vn(2026, 10, 23, 23, 59, 59) + 999), '2026-10-17');
// Saturday = day 1, Sunday and Monday belong to the week begun the previous Saturday
assert.equal(key(vn(2026, 10, 17, 0, 0, 0)), '2026-10-17');
assert.equal(key(vn(2026, 10, 18, 12)), '2026-10-17'); // Sunday
assert.equal(key(vn(2026, 10, 19, 8)), '2026-10-17');  // Monday
assert.equal(key(vn(2026, 10, 22, 8)), '2026-10-17');  // Thursday
// range / label / keys
const s = W.weekStart(vn(2026, 10, 20));
assert.equal(s, vn(2026, 10, 17));
assert.deepEqual(W.weekRange(s), [s, vn(2026, 10, 24)]);
assert.equal(W.label(s), 'T7 17/10 → T6 23/10');
assert.equal(W.label(W.weekStart(vn(2026, 10, 24, 5))), 'T7 24/10 → T6 30/10');
assert.equal(W.keyToStart('2026-10-17'), s);
assert.equal(W.keyToStart('2026-10-18'), null); // not a Saturday
assert.equal(W.keyToStart('abc'), null);
assert.equal(W.noonOf('2026-10-10'), vn(2026, 10, 10, 12));
assert.equal(W.isoDate(vn(2026, 10, 10, 23, 59)), '2026-10-10');
// daysLeft
assert.equal(W.daysLeft(vn(2026, 10, 17, 9)), 6);
assert.equal(W.daysLeft(vn(2026, 10, 18, 9)), 5);
assert.equal(W.daysLeft(vn(2026, 10, 19, 9)), 4);
assert.equal(W.daysLeft(vn(2026, 10, 22, 9)), 1);
assert.equal(W.daysLeft(vn(2026, 10, 23, 9)), 0);
// year boundary: Sat 27/12/2025 .. Fri 2/1/2026
assert.equal(key(vn(2026, 1, 1, 10)), '2025-12-27');
assert.equal(W.label(W.weekStart(vn(2026, 1, 1))), 'T7 27/12 → T6 2/1');
assert.equal(key(vn(2026, 1, 3, 0)), '2026-01-03');
assert.equal(W.monthOfWeek(vn(2025, 12, 27)).key, '2026-01'); // Friday 2/1/2026
// week spanning two months: Sat 26/9 .. Fri 2/10/2026 belongs to October
assert.equal(W.monthOfWeek(vn(2026, 9, 26)).key, '2026-10');
const oct = W.weeksOfMonth('2026-10').map(W.weekKey);
assert.deepEqual(oct, ['2026-09-26', '2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24']); // Fridays 2,9,16,23,30
assert.equal(W.weekKey(W.weeksOfMonth('2026-09').at(-1)), '2026-09-19'); // Friday 25/9 is last of Sept
assert.deepEqual(W.weeksOfMonth('2026-02').map(W.weekKey), ['2026-01-31', '2026-02-07', '2026-02-14', '2026-02-21']);
// months
assert.equal(W.addMonths('2026-01', -2), '2025-11');
assert.equal(W.addMonths('2026-11', 2), '2027-01');
const l3 = W.last3Months('2026-10');
assert.deepEqual(l3.months, ['2026-08', '2026-09', '2026-10']);
assert.ok(l3.weeks.length <= 14 && l3.weeks.length >= 12);
assert.ok(l3.weeks.every((w, i, a) => i === 0 || w > a[i - 1]));
// every instant of 100 weeks maps to exactly one week range containing it
for (let t = vn(2025, 12, 1); t < vn(2027, 10, 1); t += 3 * 36e5 + 1234) {
  const st = W.weekStart(t), [a, b] = W.weekRange(st);
  assert.ok(a <= t && t < b); assert.equal(W.weekStart(a), a); assert.equal(W.weekStart(b - 1), a); assert.equal(W.weekStart(b), b);
}
console.log('weeks selftest OK (TZ=' + (process.env.TZ || 'default') + ')');

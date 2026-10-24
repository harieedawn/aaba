// node notes.selftest.mjs : dates.js, layout.js, subjects/css contrast (AA) in both themes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { todayKey, addDays, diffDays, fmtDay, relText, keyToDate, isKey } from './js/notes/dates.js';
import { layoutSlots, resetMine } from './js/notes/layout.js';
import { SUBJECTS, contrast, textOn, noteStyle } from './js/notes/subjects.js';

assert.equal(fmtDay('2026-10-28'), 'T4 28/10'); assert.equal(fmtDay('2026-10-17'), 'T7 17/10'); assert.equal(fmtDay('2026-11-01'), 'CN 1/11');
assert.equal(addDays('2026-10-31', 1), '2026-11-01'); assert.equal(addDays('2026-01-01', -1), '2025-12-31'); assert.equal(addDays('2026-10-24', 0), '2026-10-24');
assert.equal(diffDays('2026-10-24', '2026-10-26'), 2); assert.equal(diffDays('2026-10-26', '2026-10-24'), -2); assert.equal(diffDays('2026-02-28', '2026-03-01'), 1);
assert.deepEqual([0, 1, 2, 7, -1, -2, -5].map(relText), ['Hôm nay', 'Ngày mai', 'Còn 2 ngày', 'Còn 7 ngày', 'Hôm qua', '2 ngày trước', '5 ngày trước']);
assert.ok(isKey('2026-02-28') && !isKey('2026-02-30') && !isKey('x') && !isKey(null));
assert.equal(keyToDate('2026-10-24').toISOString(), '2026-10-24T05:00:00.000Z'); assert.equal(keyToDate('bad'), null);
assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);

const n = (id, at, slot) => ({ id, at, slot });
let r = layoutSlots({ classNotes: [], mine: [], cols: 4 });
assert.equal(r.length, 8); assert.ok(r.every(s => s.kind === 'empty')); // >= 6 slots, whole rows
r = layoutSlots({ classNotes: [n('b', 2), n('a', 1)], mine: [n('m1', 5, 0), n('m2', 6, 1), n('m3', 7, 9)], cols: 2 });
assert.deepEqual(r.slice(0, 2).map(s => s.note.id), ['a', 'b']); // class by `at`, first slots
assert.deepEqual(r.slice(2, 4).map(s => s.note.id), ['m1', 'm2']); // colliding personal notes flow to next free slot
assert.equal(r[9].note.id, 'm3'); assert.equal(r.length % 2, 0);
for (const cols of [2, 3, 4]) for (let c = 0; c < 9; c++) for (let m = 0; m < 6; m++) {
  const out = layoutSlots({ classNotes: Array.from({ length: c }, (_, i) => n('c' + i, i)), mine: Array.from({ length: m }, (_, i) => n('p' + i, i, i)), cols });
  assert.equal(out.length % cols, 0); assert.ok(out.length >= 6); assert.ok(out.filter(s => !s.note).length >= 2);
  assert.equal(out.filter(s => s.note).length, c + m);
}
assert.deepEqual(resetMine({ classNotes: [n('a', 1), n('b', 2)], mine: [n('y', 9, 0), n('x', 3, 5)] }), [{ id: 'x', slot: 2 }, { id: 'y', slot: 3 }]);

const css = readFileSync(new URL('./css/notes.css', import.meta.url), 'utf8');
const [light, dark] = [css.split(':root[data-theme=dark]')[0], css.split(':root[data-theme=dark]')[1].split('}')[0]];
const get = (src, id) => [new RegExp(`--sub-${id}:(#[0-9A-Fa-f]{6})`).exec(src)?.[1], new RegExp(`--sub-${id}-fg:(#[0-9A-Fa-f]{6})`).exec(src)?.[1]];
for (const s of SUBJECTS) for (const [theme, src] of [['light', light], ['dark', dark]]) {
  const [bg, fg] = get(src, s.id); assert.ok(bg && fg, `${s.id} ${theme} tokens`);
  assert.ok(contrast(bg, fg) >= 4.5, `${s.id} ${theme} contrast ${contrast(bg, fg).toFixed(2)}`);
  if (theme === 'light') assert.equal(bg.toUpperCase(), s.hex, `${s.id} hex matches css`);
}
for (const s of SUBJECTS) assert.ok(contrast(s.hex, textOn(s.hex)) >= 4.5, 'custom text ' + s.id);
assert.ok(contrast('#808080', textOn('#808080')) >= 4.5 && contrast('#777777', textOn('#777777')) >= 4.5);
assert.equal(noteStyle({ subject: 'toan', color: '#c62828' }).cls, 'nbs-toan'); assert.equal(noteStyle({ subject: 'toan', color: '#123456' }).cls, 'nbs-custom');
console.log('notes selftest OK');

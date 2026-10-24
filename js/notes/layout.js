// Notes slot layout (pure, no DOM). Class notes take the first slots (by `at`); personal notes sit at their saved slot,
// or at the next free slot when it is taken. Whole rows only, >= minSlots slots, >= 2 free slots.
const byAt = (a, b) => (a.at - b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function layoutSlots({ classNotes = [], mine = [], cols = 2, minSlots = 6 } = {}) {
  cols = Math.max(1, cols | 0);
  const cells = new Map();
  [...classNotes].sort(byAt).forEach((n, i) => cells.set(i, { note: n, kind: 'class' }));
  [...mine].sort((a, b) => ((a.slot | 0) - (b.slot | 0)) || byAt(a, b)).forEach(n => {
    let s = Math.max(0, n.slot | 0);
    while (cells.has(s)) s++;
    cells.set(s, { note: n, kind: 'mine' });
  });
  let top = 0;
  for (const k of cells.keys()) top = Math.max(top, k + 1);
  const total = Math.ceil(Math.max(minSlots, top, cells.size + 2) / cols) * cols;
  return Array.from({ length: total }, (_, slot) => {
    const c = cells.get(slot);
    return c ? { slot, note: c.note, kind: c.kind } : { slot, note: null, kind: 'empty' };
  });
}

// Personal notes re-flowed into the free slots after the class notes, by creation order -> [{id, slot}]
export function resetMine({ classNotes = [], mine = [] } = {}) {
  const taken = new Set(classNotes.map((_, i) => i));
  let s = 0;
  return [...mine].sort(byAt).map(n => { while (taken.has(s)) s++; taken.add(s); return { id: n.id, slot: s }; });
}

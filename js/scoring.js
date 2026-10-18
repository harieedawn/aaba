// Pure scoring, week model. No DOM, no cycle. Entries passed in must already be of the week being scored
// (a week is the unit; every tổ restarts from categories[].base). Only status 'ok' counts; 'pending' is reported separately.
export function groupScore(groupId, entries, categories) {
  const byCat = {};
  let total = 0, plus = 0, minus = 0, pending = 0;
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

// Sorted by total desc, ties share a rank (1,1,3), tie-break display by name.
export function rankGroups(groups, entries, categories) {
  const rows = groups.map(group => ({ group, ...groupScore(group.id, entries, categories) }));
  rows.sort((a, b) => b.total - a.total || a.group.name.localeCompare(b.group.name, 'vi'));
  rows.forEach((r, i) => { r.rank = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
  return rows;
}

export function personalPoints(studentId, entries) {
  let s = 0;
  for (const e of entries) if (e.studentId === studentId && e.status === 'ok') s += e.points;
  return s;
}

// Net points per student (status ok only) -> Map(studentId -> points)
export function studentNet(entries) {
  const m = new Map();
  for (const e of entries) if (e.studentId && e.status === 'ok') m.set(e.studentId, (m.get(e.studentId) || 0) + e.points);
  return m;
}

export function deltaSince(groupId, entries, sinceMs) {
  let s = 0;
  for (const e of entries) if (e.groupId === groupId && e.status === 'ok' && e.at >= sinceMs) s += e.points;
  return s;
}

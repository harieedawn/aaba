// Pure scoring. No DOM. Entries passed in should already be of the cycle being scored
// (or pass cycleId to filter). Only status 'ok' counts; 'pending' is reported separately.
const inCycle = (e, cycleId) => cycleId == null || e.cycleId === cycleId;

export function groupScore(groupId, entries, categories, cycleId) {
  const byCat = {};
  let total = 0, plus = 0, minus = 0, pending = 0;
  for (const c of categories) { byCat[c.id] = c.base; total += c.base; }
  for (const e of entries) {
    if (e.groupId !== groupId || !inCycle(e, cycleId)) continue;
    if (e.status === 'pending') { pending += e.points; continue; }
    if (e.status !== 'ok') continue;
    total += e.points;
    if (e.points > 0) plus += e.points; else minus += e.points;
    if (e.cat in byCat) byCat[e.cat] += e.points;
  }
  return { total, byCat, plus, minus, pending };
}

// Sorted by total desc, ties share a rank (1,1,3), tie-break display by name.
export function rankGroups(groups, entries, categories, cycleId) {
  const rows = groups.map(group => ({ group, ...groupScore(group.id, entries, categories, cycleId) }));
  rows.sort((a, b) => b.total - a.total || a.group.name.localeCompare(b.group.name, 'vi'));
  rows.forEach((r, i) => { r.rank = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
  return rows;
}

export function personalPoints(studentId, entries, cycleId) {
  let s = 0;
  for (const e of entries) if (e.studentId === studentId && e.status === 'ok' && inCycle(e, cycleId)) s += e.points;
  return s;
}

export function deltaSince(groupId, entries, sinceMs) {
  let s = 0;
  for (const e of entries) if (e.groupId === groupId && e.status === 'ok' && e.at >= sinceMs) s += e.points;
  return s;
}

export function cycleSummary(groups, entries, categories, cycleId) {
  return rankGroups(groups, entries, categories, cycleId).map(r => ({ groupId: r.group.id, total: r.total, byCat: r.byCat }));
}

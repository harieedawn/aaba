// Trình chiếu: PURE slide builder (no DOM). buildSlides({entries,groups,students,config,weekLabel,isCurrent,daysLeft}) -> slides[].
// Only status 'ok' counts; 'pending' is only counted per tổ; 'void' is never shown.
import { rankGroups, studentNet } from '../../scoring.js';

const vi = (a, b) => String(a).localeCompare(String(b), 'vi');
const num = g => { const m = /\d+/.exec(g.name || ''); return m ? +m[0] : Infinity; };
export const orderGroups = gs => [...gs].sort((a, b) => (a.order ?? num(a)) - (b.order ?? num(b)) || vi(a.name, b.name));
export const tempTag = n => (n > 0 ? `Tạm tính · còn ${n} ngày` : 'Tạm tính · hôm nay chốt tuần');
const gref = g => ({ id: g.id, name: g.name, color: g.color || 'slate' });

function groupSlide(g, entries, sm, net) {
  const mine = entries.filter(e => e.groupId === g.id && e.status !== 'void');
  const ok = mine.filter(e => e.status === 'ok' && e.points), pending = mine.filter(e => e.status === 'pending').length;
  const pos = ok.filter(e => e.points > 0), neg = ok.filter(e => e.points < 0);
  const by = new Map();
  for (const e of ok) {
    const k = (e.points > 0 ? '+' : '-') + e.ruleName, l = by.get(k) || { ruleName: e.ruleName, sign: e.points > 0 ? 1 : -1, count: 0, points: 0, names: [] };
    l.count++; l.points += e.points;
    const n = e.points > 0 && e.studentId && sm.get(e.studentId)?.name;
    if (n && !l.names.includes(n)) l.names.push(n);
    by.set(k, l);
  }
  const all = [...by.values()].sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || b.count - a.count || vi(a.ruleName, b.ruleName));
  const lines = all.slice(0, 6), density = lines.length <= 3 ? 'large' : lines.length <= 5 ? 'medium' : 'compact';
  const best = [...net].filter(([id, v]) => v > 0 && sm.get(id)?.groupId === g.id)
    .map(([id, v]) => ({ name: sm.get(id).name, net: v })).sort((a, b) => b.net - a.net || vi(a.name, b.name))[0] || null;
  return {
    type: 'group', group: gref(g), plusCount: pos.length, minusCount: neg.length,
    plusSum: pos.reduce((s, e) => s + e.points, 0), minusSum: Math.abs(neg.reduce((s, e) => s + e.points, 0)),
    lines, density, more: all.length - lines.length, star: best, pending, empty: ok.length === 0,
  };
}

function topSlide(entries, groups, sm, net) {
  const gm = new Map(groups.map(g => [g.id, g])), use = new Map();
  for (const e of entries) if (e.status === 'ok' && e.points < 0 && gm.has(e.groupId)) {
    const u = use.get(e.ruleName) || { name: e.ruleName, count: 0, points: 0 };
    u.count++; u.points += Math.abs(e.points); use.set(e.ruleName, u);
  }
  const rules = [...use.values()].sort((a, b) => b.count - a.count || b.points - a.points || vi(a.name, b.name)).slice(0, 3).map(u => ({ name: u.name, count: u.count }));
  const students = [...net].filter(([id, v]) => v > 0 && sm.get(id) && gm.has(sm.get(id).groupId))
    .map(([id, v]) => ({ name: sm.get(id).name, group: gref(gm.get(sm.get(id).groupId)), net: v }))
    .sort((a, b) => b.net - a.net || vi(a.name, b.name)).slice(0, 3);
  return rules.length || students.length ? { type: 'top', rules, students } : null;
}

// Podium columns left→right = last place … 1st; h = total / highest total (min 0.35, so ties share a height).
export function podiumLayout(first, rest) {
  const all = [...first, ...rest], ranks = [...new Set(all.map(r => r.rank))], mx = Math.max(0, ...all.map(r => r.total || 0));
  return all.map((r, i) => ({ r, i })).sort((a, b) => b.r.rank - a.r.rank || a.i - b.i)
    .map(({ r }) => ({ ...r, level: ranks.indexOf(r.rank), h: mx > 0 ? +Math.min(1, Math.max(0.35, (r.total || 0) / mx)).toFixed(3) : 1 }));
}

function finaleSlide(groups, entries, cats, isCurrent) {
  const rows = rankGroups(groups, entries, cats).map(r => ({
    rank: r.rank, group: gref(r.group), total: r.total, cats: cats.map(c => ({ name: c.name, value: r.byCat[c.id] })),
  }));
  const first = rows.filter(r => r.rank === 1), rest = rows.filter(r => r.rank !== 1);
  const tie = first.length > 1, names = first.map(r => r.group.name).join(' · ');
  const one = n => (isCurrent ? (tie ? `${n} đồng hạng dẫn đầu (tạm tính)` : `${n} đang dẫn đầu (tạm tính)`) : (tie ? `${n} đồng hạng nhất tuần` : `${n} xếp hạng nhất tuần`)), line = one(names);
  // steps: non-winning rows from last place up to 2nd, ONE hero step (winner / tied winners, line inside each card), ONE board step (full ranking)
  const steps = [...[...rest].reverse().map(r => ({ kind: 'row', rows: [r] })), { kind: 'hero', rows: first, tie, line, lines: first.map(r => one(r.group.name)) }, { kind: 'board', rows }];
  return { type: 'finale', isCurrent, rows: rest, first, tie, steps, board: rows, cols: podiumLayout(first, rest) };
}

export function buildSlides({ entries = [], groups = [], students = [], config = {}, weekLabel = '', isCurrent = false, daysLeft = 0 }) {
  const gs = orderGroups(groups), sm = new Map(students.map(s => [s.id, s])), net = studentNet(entries), cats = config.categories || [];
  const out = [{ type: 'title', title: 'Tổng kết tuần', weekLabel, isCurrent, daysLeft, tag: isCurrent ? tempTag(daysLeft) : '', className: config.className || '', school: config.school || '' }];
  for (const g of gs) out.push(groupSlide(g, entries, sm, net));
  const top = topSlide(entries, gs, sm, net);
  if (top) out.push(top);
  if (gs.length) out.push(finaleSlide(gs, entries, cats, isCurrent));
  return out;
}

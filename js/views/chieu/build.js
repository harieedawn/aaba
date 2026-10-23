// Trình chiếu: PURE slide builder (no DOM). buildSlides({entries,groups,students,config,weekLabel,isCurrent,daysLeft}) -> slides[].
// Only status 'ok' counts; 'pending' is only counted per tổ; 'void' is never shown.
import { rankGroups, studentNet } from '../../scoring.js';

const vi = (a, b) => String(a).localeCompare(String(b), 'vi');
const num = g => { const m = /\d+/.exec(g.name || ''); return m ? +m[0] : Infinity; };
export const orderGroups = gs => [...gs].sort((a, b) => (a.order ?? num(a)) - (b.order ?? num(b)) || vi(a.name, b.name));
export const tempTag = n => (n > 0 ? `Tạm tính · còn ${n} ngày` : 'Tạm tính · hôm nay chốt tuần');
const gref = g => ({ id: g.id, name: g.name, color: g.color || 'slate' });

// one recorded entry, as shown in the detail modal (data already loaded for the slide; no extra reads)
const evOf = (e, sm) => ({ name: (e.studentId && sm.get(e.studentId)?.name) || 'Cả tổ', rule: e.ruleName, points: e.points, at: e.at || 0, by: e.byName || '' });
const byAt = (a, b) => b.at - a.at;

function groupSlide(g, entries, sm, net) {
  const mine = entries.filter(e => e.groupId === g.id && e.status !== 'void');
  const ok = mine.filter(e => e.status === 'ok' && e.points), pending = mine.filter(e => e.status === 'pending').length;
  const pos = ok.filter(e => e.points > 0), neg = ok.filter(e => e.points < 0);
  const by = new Map();
  for (const e of ok) {
    const k = (e.points > 0 ? '+' : '-') + e.ruleName, l = by.get(k) || { ruleName: e.ruleName, sign: e.points > 0 ? 1 : -1, count: 0, points: 0, names: [], items: [] };
    l.count++; l.points += e.points; l.items.push(evOf(e, sm));
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

// "Hay bị trừ" + "Bạn nổi bật": two slides, each skipped (null) when it has nothing to show.
function topSlides(entries, groups, sm) {
  const gm = new Map(groups.map(g => [g.id, g])), ok = entries.filter(e => e.status === 'ok' && e.points && gm.has(e.groupId));
  const agg = (list, keyOf, mk) => {
    const m = new Map();
    for (const e of list) { const k = keyOf(e); if (k == null) continue; const u = m.get(k) || { ...mk(e, k), count: 0, total: 0, items: [] }; u.count++; u.total += Math.abs(e.points); u.items.push(evOf(e, sm)); m.set(k, u); }
    return [...m.values()].map(u => ({ ...u, items: u.items.sort(byAt) }));
  };
  const stu = (e, id) => { const st = sm.get(id); return { id, name: st.name, group: gref(gm.get(st.groupId)) }; };
  const inG = e => e.studentId && sm.get(e.studentId) && gm.has(sm.get(e.studentId).groupId) ? e.studentId : null;
  const cmp = (a, b) => b.total - a.total || b.count - a.count || vi(a.name, b.name);
  const neg = ok.filter(e => e.points < 0), pos = ok.filter(e => e.points > 0);
  let minus = null, plus = null;
  if (neg.length) {
    const gs = agg(neg, e => e.groupId, e => ({ group: gref(gm.get(e.groupId)), name: gm.get(e.groupId).name })).sort(cmp);
    minus = {
      type: 'minus', total: neg.reduce((t, e) => t + Math.abs(e.points), 0), count: neg.length, groups: gs, topGroup: gs[0].group.id,
      students: agg(neg, inG, stu).sort(cmp).slice(0, 5),
      rules: agg(neg, e => e.ruleName, e => ({ name: e.ruleName })).sort((a, b) => b.count - a.count || b.total - a.total || vi(a.name, b.name)).slice(0, 3),
    };
  }
  if (pos.length) {
    const st = agg(pos, inG, stu), students = [...st].sort(cmp).slice(0, 5);
    if (students.length) plus = {
      type: 'plus', total: pos.reduce((t, e) => t + e.points, 0), count: pos.length, students,
      // "most improved" needs a previous week (not loaded here); most-active = most separate + records, only when someone has 2+
      active: st.filter(u => u.count >= 2).sort((a, b) => b.count - a.count || cmp(a, b)).slice(0, 3),
    };
  }
  return [minus, plus];
}

// Podium columns left→right = last place … 1st; h = total / highest total (min 0.35, so ties share a height).
export function podiumLayout(first, rest) {
  const all = [...first, ...rest], ranks = [...new Set(all.map(r => r.rank))], mx = Math.max(0, ...all.map(r => r.total || 0));
  return all.map((r, i) => ({ r, i })).sort((a, b) => b.r.rank - a.r.rank || a.i - b.i)
    .map(({ r }) => ({ ...r, level: ranks.indexOf(r.rank), h: mx > 0 ? +Math.min(1, Math.max(0.35, (r.total || 0) / mx)).toFixed(3) : 1 }));
}

function finaleSlide(groups, entries, config, isCurrent) {
  const rows = rankGroups(groups, entries, config).map(r => ({
    rank: r.rank, group: gref(r.group), total: r.total, plus: r.plus, minus: Math.abs(r.minus),
  }));
  const first = rows.filter(r => r.rank === 1), rest = rows.filter(r => r.rank !== 1);
  const tie = first.length > 1, names = first.map(r => r.group.name).join(' · ');
  const one = n => (isCurrent ? (tie ? `${n} đồng hạng dẫn đầu (tạm tính)` : `${n} đang dẫn đầu (tạm tính)`) : (tie ? `${n} đồng hạng nhất tuần` : `${n} xếp hạng nhất tuần`)), line = one(names);
  // steps: non-winning rows from last place up to 2nd, ONE hero step (winner / tied winners, line inside each card), ONE board step (full ranking)
  const steps = [...[...rest].reverse().map(r => ({ kind: 'row', rows: [r] })), { kind: 'hero', rows: first, tie, line, lines: first.map(r => one(r.group.name)) }, { kind: 'board', rows }];
  return { type: 'finale', isCurrent, rows: rest, first, tie, steps, board: rows, cols: podiumLayout(first, rest) };
}

export function buildSlides({ entries = [], groups = [], students = [], config = {}, weekLabel = '', isCurrent = false, daysLeft = 0 }) {
  const gs = orderGroups(groups), sm = new Map(students.map(s => [s.id, s])), net = studentNet(entries);
  const out = [{ type: 'title', title: 'Tổng kết tuần', weekLabel, isCurrent, daysLeft, tag: isCurrent ? tempTag(daysLeft) : '', className: config.className || '', school: config.school || '' }];
  for (const g of gs) out.push(groupSlide(g, entries, sm, net));
  for (const t of topSlides(entries, gs, sm)) if (t) out.push(t);
  if (gs.length) out.push(finaleSlide(gs, entries, config, isCurrent));
  return out;
}

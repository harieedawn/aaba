// Tổ detail: one score (+ cộng/trừ), members with personal net points, this week's entries (live).
import { h } from '../ui/dom.js';
import { rankGroups, personalPoints } from '../scoring.js';
import { fmtNum, fmtPts, plusMinus } from '../format.js';
import { emptyState, pageHeader, live, entryRow, entrySheet, weekSrc } from '../ui/components.js';
import { stagger } from '../ui/anim.js';
import { titleNames } from '../titles.js';

const amt = n => h('span', { class: 'amt ' + (n > 0 ? 'pos' : n < 0 ? 'neg' : '') }, fmtPts(n));

export default function group({ params }) {
  const id = params[0], body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'entries'], (S, first) => {
    const g = S.groups.find(x => x.id === id);
    if (!g) return [pageHeader('Không tìm thấy tổ', { back: '#/' }), emptyState({ icon: 'x', title: 'Không tìm thấy tổ', text: 'Tổ này không tồn tại hoặc đã bị xóa.', action: { label: 'Về xếp hạng', href: '#/' } })];
    const r = rankGroups(S.groups, S.entries, S.config).find(x => x.group.id === id);
    const mine = S.entries.filter(e => e.groupId === id);
    const sm = new Map(S.students.map(s => [s.id, s]));
    const members = S.students.filter(s => s.groupId === id)
      .map(s => ({ s, pts: personalPoints(s.id, S.entries) }))
      .sort((a, b) => b.pts - a.pts || a.s.name.localeCompare(b.s.name, 'vi'));
    const recent = mine.filter(e => e.status !== 'void').sort((a, b) => b.at - a.at);
    const open = e => entrySheet(e, { group: g, student: sm.get(e.studentId) });
    const out = [
      pageHeader(g.name, { back: '#/', sub: 'Điểm tuần này' }),
      h('section', { class: `card g-hero g-${g.color}` },
        h('div', { class: 'hero-rank' }, `Hạng ${r.rank}`),
        h('div', { class: 'g-total' }, fmtNum(r.total)),
        h('div', { class: 'hero-today' }, `${plusMinus(r)}${r.pending ? ` · ${fmtPts(r.pending)} chờ xác nhận` : ''}`)),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Thành viên')),
        members.length ? members.map(({ s, pts }) => h('div', { class: 'mem' },
          h('div', { class: 'mem-name' }, h('div', null, s.name), titleNames(s, S.config.titles) && h('div', { class: 'mem-title muted' }, titleNames(s, S.config.titles))),
          amt(pts)))
          : emptyState({ icon: 'user', title: 'Chưa có thành viên' })),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Điểm trong tuần này')),
        recent.length ? recent.map(e => entryRow(e, { group: g, student: sm.get(e.studentId), onOpen: open }))
          : emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm của tổ sẽ hiện ở đây.' })),
    ];
    if (first) queueMicrotask(() => stagger(body.children));
    return out;
  }, { src: { entries: weekSrc } });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}

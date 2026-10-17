// Tổ detail: breakdown per category, members with personal net points, this vòng's entries.
import { h } from '../ui/dom.js';
import { rankGroups, personalPoints } from '../scoring.js';
import { fmtNum, fmtPts } from '../format.js';
import { dot, chip, emptyState, pageHeader, live, entryRow, entrySheet } from '../ui/components.js';
import { stagger } from '../ui/anim.js';

const sum = a => a.reduce((t, e) => t + e.points, 0);

export default function group({ params }) {
  const id = params[0], body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'entries'], (S, first) => {
    const g = S.groups.find(x => x.id === id);
    if (!g) return [pageHeader('Không tìm thấy tổ', { back: '#/' }), emptyState({ icon: 'x', title: 'Không tìm thấy tổ', text: 'Tổ này không tồn tại hoặc đã bị xóa.', action: { label: 'Về xếp hạng', href: '#/' } })];
    const cats = S.config.categories, cid = S.config.currentCycleId;
    const r = rankGroups(S.groups, S.entries, cats, cid).find(x => x.group.id === id);
    const mine = S.entries.filter(e => e.groupId === id), ok = mine.filter(e => e.status === 'ok');
    const titles = new Map((S.config.titles || []).map(t => [t.id, t.name]));
    const sm = new Map(S.students.map(s => [s.id, s]));
    const members = S.students.filter(s => s.groupId === id && s.active !== false)
      .map(s => ({ s, pts: personalPoints(s.id, S.entries, cid) }))
      .sort((a, b) => b.pts - a.pts || a.s.name.localeCompare(b.s.name, 'vi'));
    const recent = [...mine].sort((a, b) => b.at - a.at);
    const open = e => entrySheet(e, { group: g, student: sm.get(e.studentId) });
    const out = [
      pageHeader(g.name, { back: '#/', sub: `Hạng ${r.rank} trong lớp` }),
      h('section', { class: `card g-${g.color}` },
        h('div', { class: 'g-head' }, dot(g.color), h('div', { class: 'g-total' }, fmtNum(r.total)), h('span', { class: 'muted' }, 'điểm')),
        h('div', { class: 'g-stats' }, chip(`${fmtPts(r.plus)} cộng`, 'pos'), chip(`${fmtPts(r.minus)} trừ`, 'neg'), r.pending ? chip(`${fmtPts(r.pending)} chờ duyệt`, 'warn') : null)),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Theo mảng')),
        cats.map(c => {
          const es = ok.filter(e => e.cat === c.id);
          return h('div', { class: 'cat-row' }, h('div', null, h('div', { class: 'cat-name' }, c.name),
            h('div', { class: 'cat-sub muted' }, `Gốc ${c.base}`, chip(fmtPts(sum(es.filter(e => e.points > 0))), 'pos'), chip(fmtPts(sum(es.filter(e => e.points < 0))), 'neg'))),
            h('div', { class: 'cat-val' }, fmtNum(r.byCat[c.id])));
        })),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Thành viên')),
        members.length ? members.map(({ s, pts }) => h('div', { class: 'mem' },
          h('div', { class: 'mem-name' }, h('div', null, s.name), s.titleId && titles.get(s.titleId) && h('div', { class: 'mem-title muted' }, titles.get(s.titleId))),
          chip(fmtPts(pts), pts > 0 ? 'pos' : pts < 0 ? 'neg' : '')))
          : emptyState({ icon: 'user', title: 'Chưa có thành viên' })),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Điểm trong vòng này')),
        recent.length ? recent.map(e => entryRow(e, { group: g, student: sm.get(e.studentId), onOpen: open }))
          : emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm của tổ sẽ hiện ở đây.' })),
    ];
    if (first) queueMicrotask(() => stagger(body.children));
    return out;
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}

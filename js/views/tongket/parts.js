// Tổng kết: shared pieces (entry line, per-tổ expandable detail).
import { h } from '../../ui/dom.js';
import { fmtPts, fmtNum, fmtDate } from '../../format.js';
import { WD_SHORT, dowOf } from '../../weeks.js';
import { chip, entrySheet, dot } from '../../ui/components.js';
import { studentNet } from '../../scoring.js';

const sign = n => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
// ctx: {gm, sm, readOnly}
export function entryLine(e, ctx) {
  const who = e.studentId ? ctx.sm.get(e.studentId)?.name || 'Học sinh đã xoá' : 'Cả tổ';
  const sub = [who, e.qty > 1 ? `${e.qty} × ${fmtPts(e.unit)}` : '', `báo: ${e.byName}`].filter(Boolean).join(' · ');
  const open = () => entrySheet(e, { group: ctx.gm.get(e.groupId), student: ctx.sm.get(e.studentId), readOnly: ctx.readOnly });
  return h('div', { class: 'tk-e pressable' + (e.status === 'void' ? ' is-void' : ''), role: 'button', tabindex: '0', onclick: open,
    onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } } },
  h('span', { class: 'tk-d' }, WD_SHORT[dowOf(e.at)], h('br'), fmtDate(e.at)),
  h('div', { class: 'tk-m' },
    h('div', { class: 'tk-n' }, e.ruleName, ' ', e.status === 'pending' && chip('chờ xác nhận', 'warn'), ...(ctx.tags?.(e) || [])),
    h('div', { class: 'muted tk-s' }, sub)),
  h('span', { class: 'amt ' + sign(e.points) }, fmtPts(e.points)));
}

// r: ranked row {group,total,...}; entries = all entries of the week
export function groupDetail(r, entries, students, ctx) {
  const mine = entries.filter(e => e.groupId === r.group.id).sort((a, b) => a.at - b.at);
  const live = mine.filter(e => e.status !== 'void'), voided = mine.filter(e => e.status === 'void');
  const net = studentNet(entries);
  const members = students.filter(s => s.groupId === r.group.id).map(s => [s, net.get(s.id) || 0]).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name, 'vi'));
  const pend = live.filter(e => e.status === 'pending').length;
  return h('details', { class: `tk-g card g-${r.group.color}` },
    h('summary', null, dot(r.group.color), h('b', null, r.group.name), h('span', { class: 'grow' }),
      h('span', { class: 'muted' }, `${live.length} dòng${pend ? `, ${pend} chờ` : ''}`), h('b', { class: 'tk-tot' }, fmtNum(r.total))),
    h('div', { class: 'tk-body' },
      live.length ? live.map(e => entryLine(e, ctx)) : h('p', { class: 'muted' }, 'Không có điểm nào trong tuần.'),
      voided.length > 0 && h('details', { class: 'tk-void' }, h('summary', { class: 'muted' }, `Đã thu hồi (${voided.length})`),
        voided.map(e => h('div', { class: 'tk-vr' }, entryLine(e, ctx), h('div', { class: 'muted tk-s tk-why' }, `Lý do: ${e.voidReason || '—'}`))),
        ctx.voidExtra?.(voided)),
      h('div', { class: 'tk-h' }, 'Thành viên'),
      members.length ? members.map(([s, p]) => h('div', { class: 'tk-mem' }, h('span', null, s.name), h('span', { class: 'amt ' + sign(p) }, fmtPts(p)))) : h('p', { class: 'muted' }, 'Tổ chưa có học sinh.')));
}

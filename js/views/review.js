// Duyệt: pending queue (oldest first). Approve, or reject = void with a required reason.
import { h } from '../ui/dom.js';
import * as store from '../data/store.js';
import { fmtPts } from '../format.js';
import { chip, emptyState, pageHeader, live, entryRow, reasonSheet } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { getSession, can } from '../session.js';
import { stagger } from '../ui/anim.js';

export default function review() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'entries'], (S, first) => {
    const gm = new Map(S.groups.map(g => [g.id, g])), sm = new Map(S.students.map(s => [s.id, s]));
    const pend = S.entries.filter(e => e.status === 'pending').sort((a, b) => a.at - b.at);
    const out = [pageHeader('Duyệt điểm', { sub: pend.length ? `${pend.length} điểm đang chờ` : null })];
    if (!pend.length) out.push(emptyState({ icon: 'check', title: 'Không có gì cần duyệt', text: 'Điểm cộng do tổ trưởng ghi sẽ hiện ở đây.' }));
    for (const e of pend) {
      const own = !can('approve', { entry: e });
      const approve = h('button', { class: 'btn', type: 'button', disabled: own, onclick: async ev => {
        ev.target.disabled = true;
        try { await store.approveEntry(e.id); toast(`Đã duyệt ${fmtPts(e.points)} cho ${gm.get(e.groupId)?.name || ''}`); }
        catch (err) { ev.target.disabled = false; toast(err.message); }
      } }, 'Duyệt');
      const reject = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => reasonSheet({ title: 'Từ chối điểm này?',
        text: `${e.ruleName}: ${fmtPts(e.points)} điểm sẽ bị hủy và không được tính.`, label: 'Từ chối',
        onSubmit: async r => { await store.voidEntry(e.id, r); toast('Đã từ chối'); } }) }, 'Từ chối');
      out.push(h('section', { class: 'card rv' }, entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId) }),
        h('div', { class: 'rule-note muted' }, `Người ghi: ${e.byName}`, e.note ? `. Ghi chú: ${e.note}` : ''),
        own && chip('Do bạn ghi, cần người khác duyệt', 'warn'), h('div', { class: 'row-btns' }, reject, approve)));
    }
    if (first) queueMicrotask(() => stagger(body.children));
    return out;
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}

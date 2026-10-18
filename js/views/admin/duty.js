// Admin: duty schedule (tổ trực nhật by ISO week): auto round-robin + manual edit.
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { weekKey, startOfWeek, fmtDate } from '../../format.js';
import { selectInput, arow } from '../../ui/form.js';

const WEEK = 7 * 864e5;
// Pure: {weekKey:{groupId}} for n weeks from `from`, cycling tổ in order starting at index `start`.
export function roundRobin(groups, from = Date.now(), n = 8, start = 0) {
  const gs = [...groups].sort((a, b) => (a.order || 0) - (b.order || 0)), out = {};
  if (gs.length) for (let i = 0; i < n; i++) out[weekKey(startOfWeek(from) + i * WEEK + 864e5)] = { groupId: gs[(start + i) % gs.length].id };
  return out;
}
export default function dutyView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['groups', 'duty'], S => {
    const groups = [...S.groups].sort((a, b) => (a.order || 0) - (b.order || 0)), now = Date.now(), cur = startOfWeek(now);
    const dm = new Map(S.duty.map(d => [d.id, d.groupId]));
    const weeks = Array.from({ length: 8 }, (_, i) => cur + i * WEEK);
    const auto = async () => {
      const idx = Math.max(0, groups.findIndex(g => g.id === dm.get(weekKey(cur + 864e5))));
      for (const [k, v] of Object.entries(roundRobin(groups, now, 8, idx))) await store.saveDoc('duty', k, v);
      toast('Đã xếp lịch xoay vòng 8 tuần');
    };
    return [
      h('div', { class: 'sec-actions' }, h('button', { class: 'btn', type: 'button', disabled: !groups.length, onclick: auto }, 'Tự động xoay vòng')),
      h('p', { class: 'muted' }, 'Xoay vòng bắt đầu từ tổ đang trực tuần này (hoặc tổ đầu tiên) và lặp lại theo thứ tự tổ.'),
      h('section', { class: 'card' }, weeks.map((w, i) => {
        const k = weekKey(w + 864e5);
        const sel = selectInput([{ value: '', label: 'Chưa xếp' }, ...groups.map(g => ({ value: g.id, label: g.name }))], dm.get(k) || '',
          { 'aria-label': 'Tổ trực ' + k, style: { width: '140px', flex: 'none' } });
        sel.addEventListener('change', async () => { sel.value ? await store.saveDoc('duty', k, { groupId: sel.value }) : await store.deleteDoc('duty', k); });
        return arow({ name: i ? `Tuần ${k.slice(-2)}` : `Tuần ${k.slice(-2)} (này)`, sub: `${fmtDate(w)} – ${fmtDate(w + 6 * 864e5)}`, actions: [sel] });
      })),
    ];
  });
  return { el: body, destroy: stop };
}

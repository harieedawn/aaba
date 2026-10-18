// Admin: close đợt (confirm with ranking preview).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live, dot } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { rankGroups } from '../../scoring.js';
import { fmtNum, cycleInfo } from '../../format.js';
import { confirmSheet } from '../../ui/form.js';

export default function cycleView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'entries', 'cycles'], S => {
    const cid = S.config.currentCycleId, cyc = S.cycles.find(c => c.id === cid);
    if (!cyc) return h('p', { class: 'muted' }, 'Chưa có đợt nào.');
    const info = cycleInfo(cyc, S.config.cycleWeeks), ranked = rankGroups(S.groups, S.entries, S.config.categories, cid);
    const pend = S.entries.filter(e => e.status === 'pending').length;
    const list = h('div', null, ranked.map(r => h('div', { class: 'mem' }, h('span', { class: 'rank' }, r.rank), dot(r.group.color), h('div', { class: 'mem-name' }, r.group.name), h('strong', null, fmtNum(r.total)))));
    const flow = () => confirmSheet({ title: `Tổng kết đợt ${cyc.n}?`, label: `Tổng kết đợt ${cyc.n}`,
      text: `Sẽ kết thúc đợt này (đợt ${cyc.n}), lưu bảng xếp hạng, bắt đầu đợt mới (đợt ${cyc.n + 1}) và tính lại điểm. Không hoàn tác được.`,
      extra: h('div', null, list.cloneNode(true), pend ? h('div', { class: 'form-err' }, `Còn ${pend} điểm chờ xác nhận. Điểm này sẽ không được tính nếu chưa xác nhận.`) : null),
      onConfirm: async () => { await store.closeCycle(); toast(`Đã tổng kết đợt ${cyc.n}, bắt đầu đợt ${cyc.n + 1}`); } });
    return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, `Đợt ${cyc.n}`)),
      h('p', { class: 'muted', style: { marginBottom: '12px' } }, `Tuần ${info.week}/${info.weeks}. Mỗi đợt kéo dài ${info.weeks} tuần, hết đợt sẽ tổng kết và tính lại điểm.`), list,
      pend ? h('div', { class: 'form-err', style: { margin: '12px 0' } }, `Còn ${pend} điểm chờ xác nhận.`) : null,
      h('button', { class: 'btn btn-danger', type: 'button', style: { marginTop: '12px' }, onclick: flow }, `Tổng kết đợt ${cyc.n}…`));
  });
  return { el: body, destroy: stop };
}

// Admin-only extras of Tổng kết week detail.
import { h } from '../../ui/dom.js';
import { can } from '../../session.js';
import { isoDate, friday } from '../../weeks.js';
import { setDraft } from '../../ui/draft.js';
import { purgeAllBtn } from '../purge.js';

export function adminExtras({ start, isCurrent }) {
  return { voidExtra: purgeAllBtn,
    top: can('backdate') ? h('button', { class: 'btn btn-ghost tk-add', type: 'button',
      onclick: () => { setDraft({ date: isoDate(isCurrent ? Date.now() : friday(start)) }); location.hash = '#/ghi'; } }, 'Thêm điểm vào tuần này') : null };
}

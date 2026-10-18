// "Xoá tất cả đã thu hồi (n)": staff only, confirm sheet, deletes in chunks via act().
import { h } from '../ui/dom.js';
import * as store from '../data/store.js';
import { confirmSheet } from '../ui/form.js';
import { act } from '../ui/act.js';
import { toast } from '../ui/toast.js';
import { can } from '../session.js';

export function purgeAllBtn(list) {
  const n = list.length;
  if (!n || !can('purge', { entry: { status: 'void' } })) return null;
  return h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet({
    title: `Xoá tất cả đã thu hồi (${n})?`, label: `Xoá hẳn ${n} dòng`,
    text: `Xoá vĩnh viễn ${n} dòng này? Không khôi phục được. Điểm của các tổ không thay đổi vì các dòng này đã thu hồi.`,
    onConfirm: async () => {
      let done = 0;
      for (let i = 0; i < n; i += 20) {
        const chunk = list.slice(i, i + 20);
        if (await act(() => store.purgeEntries(chunk)) === undefined) throw new Error(`Mới xoá ${done}/${n} dòng, hãy thử lại.`);
        done += chunk.length;
      }
      toast(`Đã xoá hẳn ${n} dòng`);
    } }) }, `Xoá tất cả đã thu hồi (${n})`);
}

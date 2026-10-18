// Thể lệ: rules by category with point chips and notes.
import { h } from '../ui/dom.js';
import { emptyState, pageHeader, live } from '../ui/components.js';
import { can } from '../session.js';
import { stagger } from '../ui/anim.js';
import { fmtPts } from '../format.js';

const SCOPE = { student: 'Học sinh', group: 'Cả tổ', both: 'Học sinh hoặc cả tổ' };

export default function rules() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'rules'], (S, first) => {
    const admin = can('edit');
    const out = [pageHeader('Thể lệ', { sub: 'Điểm cộng, trừ theo từng nhóm' })];
    for (const c of S.config.categories) {
      const rs = S.rules.filter(r => r.cat === c.id && r.active !== false).sort((a, b) => a.order - b.order);
      out.push(h('section', { class: 'card' },
        h('div', { class: 'sec-h' }, h('h2', null, c.name), h('span', { class: 'muted', style: { fontSize: '13px' } }, `Điểm khởi đầu ${c.base}`)),
        rs.length ? rs.map(r => h('div', { class: 'rule' },
          h('div', { class: 'rule-main' }, h('div', null, r.name),
            h('div', { class: 'rule-note muted' }, [SCOPE[r.scope], r.perUnit && 'Theo số lượng', admin && r.assumed && 'tạm tính'].filter(Boolean).join(' · ')),
            r.note && h('div', { class: 'rule-note muted' }, r.note)),
          h('span', { class: 'amt ' + (r.points > 0 ? 'pos' : 'neg') }, fmtPts(r.points))))
          : emptyState({ icon: 'book', title: 'Chưa có thể lệ', text: 'Nhóm này chưa có tiêu chí nào.' })));
    }
    if (first) queueMicrotask(() => stagger(body.children));
    return out;
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}
